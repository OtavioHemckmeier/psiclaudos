import { useState } from "react";

const snapIvResultDomains = [
  { key: "inattention", label: "Desatenção", description: "Avalia dificuldades de concentração e organização." },
  { key: "hyperactivity_impulsivity", label: "Hiperatividade/Impulsividade", description: "Avalia agitação, inquietude e atitudes impulsivas." },
  { key: "opposition_defiance", label: "Oposição/Desafio", description: "Avalia comportamentos desafiadores e de oposição a regras." },
];

function snapIvClassification(score: number, opposition: boolean) {
  const firstCutoff = opposition ? 8 : 13;
  const secondCutoff = opposition ? 14 : 18;
  const thirdCutoff = opposition ? 19 : 23;
  if (score < firstCutoff) return "Sintomas Não Significativos";
  if (score < secondCutoff) return "Sintomas Leves";
  if (score < thirdCutoff) return "Sintomas Moderados";
  return "Sintomas Graves";
}

export function SnapIvResults({
  result,
  answers,
  summary,
  disabled,
  onSummaryChange,
  onSave,
}: {
  result: Record<string, unknown>;
  answers: Record<string, unknown>;
  summary: string;
  disabled: boolean;
  onSummaryChange: (value: string) => void;
  onSave: () => void;
}) {
  const [view, setView] = useState<"table" | "chart">("table");
  const [selectedForm, setSelectedForm] = useState(1);
  const forms = [...new Set(Object.keys(result)
    .map((fieldId) => fieldId.match(/^snap_iv_form_(\d+)_(?:inattention|hyperactivity_impulsivity|opposition_defiance)_score$/)?.[1])
    .filter((formNumber): formNumber is string => Boolean(formNumber))
    .map(Number))].sort((first, second) => first - second);
  if (forms.length === 0) forms.push(1);
  const formNumber = forms.includes(selectedForm) ? selectedForm : forms[0];
  const prefix = `snap_iv_form_${formNumber}`;
  const respondentLabels: Record<string, string> = {
    self: "Autorelato",
    mother: "Mãe",
    father: "Pai",
    teacher: "Professor",
  };
  const respondentValue = String(answers[`${prefix}_respondent`] ?? "");
  const respondent = (respondentLabels[respondentValue] ?? respondentValue) || `Formulário ${formNumber}`;
  const rows = snapIvResultDomains.map((domain) => {
    const scoreValue = result[`${prefix}_${domain.key}_score`] ?? (formNumber === 1 ? result[`${domain.key}_score`] : undefined);
    const numericScore = Number(scoreValue);
    const classification = result[`${prefix}_${domain.key}_classification`] ?? (formNumber === 1 ? result[`${domain.key}_classification`] : undefined);
    const classificationLabel = typeof classification === "string" && classification.trim()
      ? classification
      : scoreValue !== undefined && Number.isFinite(numericScore)
        ? snapIvClassification(numericScore, domain.key === "opposition_defiance")
        : "Sem classificação";
    const normalizedClassification = classificationLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const classificationLevel = normalizedClassification.includes("nao significativo") ? "none"
      : normalizedClassification.includes("leve") ? "mild"
        : normalizedClassification.includes("moderado") ? "moderate"
          : normalizedClassification.includes("grave") ? "severe" : "unknown";
    return {
      ...domain,
      score: scoreValue === undefined || !Number.isFinite(numericScore) ? null : numericScore,
      classificationLabel,
      classificationLevel,
    };
  });

  return (
    <div className="snapiv-results">
      {forms.length > 1 && (
        <div className="tab-list snapiv-results-tabs" role="tablist" aria-label="Resultados por formulário">
          {forms.map((number) => (
            <button
              key={number}
              type="button"
              role="tab"
              aria-selected={formNumber === number}
              className={formNumber === number ? "active" : ""}
              onClick={() => setSelectedForm(number)}
            >
              Formulário {number}
            </button>
          ))}
        </div>
      )}
      <div className="asrs-result-view-toggle" role="group" aria-label="Visualização dos resultados">
        <button className={view === "table" ? "active" : ""} type="button" onClick={() => setView("table")}>☷ Tabela</button>
        <button className={view === "chart" ? "active" : ""} type="button" onClick={() => setView("chart")}>▦ Gráfico</button>
      </div>
      {view === "table" ? (
        <div className="snapiv-results-table result-table-wrap">
          <table className="result-table">
            <thead><tr><th>Itens</th><th>Pontuação</th><th>Classificação</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.score ?? "—"}</td>
                  <td>{row.classificationLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="snapiv-results-chart" role="img" aria-label={`Gráfico das pontuações do SNAP-IV para ${respondent}`}>
          <h3>SNAP-IV ({respondent})</h3>
          <div className="snapiv-chart-legend" aria-hidden="true">
            <span><i className="snapiv-chart-key none" /> Sintomas Não Significativos</span>
            <span><i className="snapiv-chart-key mild" /> Sintomas Leves</span>
            <span><i className="snapiv-chart-key moderate" /> Sintomas Moderados</span>
            <span><i className="snapiv-chart-key severe" /> Sintomas Graves</span>
          </div>
          <div className="snapiv-chart-body">
            <div className="snapiv-chart-axis" aria-hidden="true">
              {Array.from({ length: 28 }, (_, index) => 27 - index).map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <div className="snapiv-chart-bars">
              {rows.map((row) => (
                <div className="snapiv-chart-column" key={row.key}>
                  <div className="snapiv-chart-bar-area">
                    {row.score !== null && (
                      <div
                        className={`snapiv-chart-bar ${row.classificationLevel}`}
                        style={{ height: `${Math.max(0, Math.min(row.score, 27)) / 27 * 100}%` }}
                      >
                        <strong>{row.score}</strong>
                      </div>
                    )}
                  </div>
                  <strong>{row.label}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <p className="snapiv-results-caption">
        {snapIvResultDomains.map((domain) => <span key={domain.key}><strong>{domain.label}:</strong> {domain.description}</span>)}
      </p>
      <p className="snapiv-results-source">
        Classificação por faixas sugeridas no <a href="https://capp.ucsf.edu/sites/g/files/tkssra5836/f/SNAP-IV-26-item-Teacher-and-Parent-rating-scale.pdf" target="_blank" rel="noreferrer">guia de pontuação SNAP-IV 26 itens</a>.
      </p>
      <div className="snapiv-results-interpretation">
        <label htmlFor="snapiv-result-summary">Interpretação dos Resultados</label>
        <textarea
          id="snapiv-result-summary"
          disabled={disabled}
          value={summary}
          onChange={(event) => onSummaryChange(event.target.value)}
          placeholder="Apresente a interpretação dos resultados da avaliação, articulando os dados obtidos e as observações clínicas."
          rows={10}
        />
        <button type="button" disabled={disabled} onClick={onSave}>Salvar</button>
      </div>
    </div>
  );
}
