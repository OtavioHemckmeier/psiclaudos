#!/usr/bin/env bash

set -euo pipefail

api_base="${API_BASE:-http://localhost:8080/api}"
suffix="$(date +%s%N)"
temp_dir="${TMPDIR:-/tmp}/laudo-e2e-$suffix"
mkdir -p "$temp_dir"

json_value() {
  local path="$1"
  node -e '
    const fs = require("fs");
    const path = process.argv[1].split(".");
    let value = JSON.parse(fs.readFileSync(0, "utf8"));
    for (const part of path) value = value[part];
    if (value === undefined || value === null) process.exit(1);
    process.stdout.write(String(value));
  ' "$path"
}

wait_for_api() {
  for _ in $(seq 1 30); do
    if curl -fsS "$api_base/health/ready" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  echo "A API não ficou disponível em $api_base." >&2
  return 1
}

register() {
  local organization="$1"
  local email="$2"
  curl -fsS -H 'Content-Type: application/json' \
    --data "{\"organizationName\":\"$organization\",\"name\":\"Teste E2E\",\"email\":\"$email\",\"password\":\"SenhaTeste123\"}" \
    "$api_base/auth/register"
}

wait_for_api

session_a="$(register "Organização E2E A" "e2e-a-$suffix@example.test")"
token_a="$(printf '%s' "$session_a" | json_value 'accessToken')"
patient="$(curl -fsS -H "Authorization: Bearer $token_a" -H 'Content-Type: application/json' --data '{"name":"Paciente de teste E2E"}' "$api_base/patients")"
patient_id="$(printf '%s' "$patient" | json_value 'id')"
evaluation="$(curl -fsS -H "Authorization: Bearer $token_a" -H 'Content-Type: application/json' --data "{\"patientId\":\"$patient_id\",\"title\":\"Fluxo E2E\"}" "$api_base/evaluations")"
evaluation_id="$(printf '%s' "$evaluation" | json_value 'id')"
instruments="$(curl -fsS "$api_base/instruments")"
version_id="$(printf '%s' "$instruments" | json_value '0.versions.0.id')"
application="$(curl -fsS -H "Authorization: Bearer $token_a" -H 'Content-Type: application/json' --data "{\"instrumentVersionId\":\"$version_id\"}" "$api_base/evaluations/$evaluation_id/applications")"
application_id="$(printf '%s' "$application" | json_value 'id')"

curl -fsS -X PATCH -H "Authorization: Bearer $token_a" -H 'Content-Type: application/json' --data '{"answers":{"item_1":"often"}}' "$api_base/evaluations/applications/$application_id/answers" >/dev/null
curl -fsS -X POST -H "Authorization: Bearer $token_a" "$api_base/evaluations/applications/$application_id/calculate" >/dev/null
long_summary="$(node -e 'process.stdout.write("Síntese técnica de validação para documento longo. ".repeat(900))')"
summary_payload="$(node -e 'process.stdout.write(JSON.stringify({ summary: process.argv[1] }))' "$long_summary")"
curl -fsS -X PATCH -H "Authorization: Bearer $token_a" -H 'Content-Type: application/json' --data "$summary_payload" "$api_base/evaluations/applications/$application_id/summary" >/dev/null
curl -fsS -X POST -H "Authorization: Bearer $token_a" "$api_base/evaluations/applications/$application_id/review" >/dev/null
curl -fsS -X POST -H "Authorization: Bearer $token_a" "$api_base/evaluations/applications/$application_id/lock" >/dev/null
report="$(curl -fsS -X POST -H "Authorization: Bearer $token_a" "$api_base/reports/evaluations/$evaluation_id")"
report_id="$(printf '%s' "$report" | json_value 'id')"
curl -fsS -H "Authorization: Bearer $token_a" "$api_base/reports/$report_id/preview" -o "$temp_dir/report.pdf"
head -c 4 "$temp_dir/report.pdf" | grep -q '%PDF'
node -e 'const fs = require("fs"); const pages = (fs.readFileSync(process.argv[1]).toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length; if (pages < 2) process.exit(1);' "$temp_dir/report.pdf"

session_b="$(register "Organização E2E B" "e2e-b-$suffix@example.test")"
token_b="$(printf '%s' "$session_b" | json_value 'accessToken')"
isolation_status="$(curl -sS -o "$temp_dir/isolation.json" -w '%{http_code}' -H "Authorization: Bearer $token_b" "$api_base/patients/$patient_id")"
test "$isolation_status" = "404"

role_status="$(curl -sS -o "$temp_dir/role.json" -w '%{http_code}' -X POST -H "Authorization: Bearer $token_a" -H 'Content-Type: application/json' --data '{}' "$api_base/instruments/publish")"
test "$role_status" = "403"

echo "E2E aprovado: autenticação, paciente, avaliação, PDF, isolamento e autorização."
