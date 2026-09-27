#!/usr/bin/env bash
set -euo pipefail

./node_modules/.bin/tsc -p apps/api/tsconfig.json --watch &
compiler_pid=$!
trap 'kill "$compiler_pid" 2>/dev/null || true' EXIT

cd apps/api
npm run start:dev
