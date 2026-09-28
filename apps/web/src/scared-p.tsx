const domains = ["Pânico/somático", "Ansiedade generalizada", "Separação", "Ansiedade social", "Evitação escolar"];
const respondentLabels: Record<string, string> = { mother: "Mãe", father: "Pai", caregiver: "Cuidador(a)" };

const resultDomains = [
  { id: "total", label: "Escore total", maximum: 82, cutoff: 25 },
  { id: "panic_somatic", label: "Pânico/somático", maximum: 26, cutoff: 7 },
  { id: "generalized_anxiety", label: "Ansiedade generalizada", maximum: 18, cutoff: 9 },
  { id: "separation_anxiety", label: "Separação", maximum: 16, cutoff: 5 },
  { id: "social_anxiety", label: "Ansiedade social", maximum: 14, cutoff: 8 },
  { id: "school_avoidance", label: "Evitação escolar", maximum: 8, cutoff: 3 },
];

export function ScaredPResults({ result, summary, disabled, onSummaryChange, onSave }: {
  result: Record<string, unknown>;
  summary: string;
  disabled: boolean;
  onSummaryChange: (value: string) => void;
  onSave: () => void;
}) {
  const formNumbers = [...new Set(Object.keys(result)
    .map((field) => field.match(/^scared_p_form_(\d+)_total$/)?.[1])
    .filter((number): number is string => Boolean(number))
    .map(Number))].sort((first, second) => first - second);

  return (
    <>
      {formNumbers.map((formNumber) => {
        const prefix = `scared_p_form_${formNumber}`;
        const respondent = String(result[`${prefix}_respondent`] ?? "");
        const respondentLabel = respondentLabels[respondent] ?? respondent;
        return (
          <div key={formNumber}>
            <h3>Formulário {formNumber} — {respondentLabel}</h3>
            <div className="result result-table-wrap">
              <table className="result-table">
                <thead><tr><th>Indicador</th><th>Pontuação</th><th>Ponto de atenção</th></tr></thead>
                <tbody>{resultDomains.map((domain) => {
                  const scoreField = domain.id === "total" ? `${prefix}_total` : `${prefix}_${domain.id}_score`;
                  const screenField = domain.id === "total" ? `${prefix}_total_screen` : `${prefix}_${domain.id}_screen`;
                  return (
                    <tr key={domain.id}>
                      <td>{domain.label}</td>
                      <td>{String(result[scoreField] ?? "—")}/{domain.maximum}</td>
                      <td>≥ {domain.cutoff} — {String(result[screenField] ?? "—")}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p>Os pontos de atenção são indicadores de rastreamento, não diagnósticos. Confira a versão em português adotada antes do uso clínico.</p>
      <label>Revise o resultado e escreva sua síntese
        <textarea disabled={disabled} value={summary} onChange={(event) => onSummaryChange(event.target.value)} rows={5} />
      </label>
      <button className="secondary" disabled={disabled} onClick={onSave}>Salvar síntese</button>
    </>
  );
}

export function ScaredPCard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="platform-test-card">
      <div className="platform-test-card-top">
        <span className="platform-test-icon">SP</span>
        <span className="platform-test-category">Ansiedade</span>
      </div>
      <h3>SCARED-P</h3>
      <p>Inventário de Ansiedade Infantil — Versão Pais</p>
      <div className="platform-test-tags">
        <span>Crianças e adolescentes</span>
        <span>41 itens</span>
        <span>Questionário para pais/cuidadores</span>
      </div>
      <div className="platform-test-card-footer">
        <span>Rastreamento de ansiedade</span>
        <button className="secondary small" onClick={onOpen}>Ver teste</button>
      </div>
    </article>
  );
}

export function ScaredPPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="platform-test-page">
      <button className="back-link" onClick={onBack}>← Voltar para testes da plataforma</button>
      <article className="panel platform-test-hero">
        <div className="platform-test-hero-mark">SP</div>
        <div>
          <span className="section-kicker">Ansiedade</span>
          <h2>SCARED-P</h2>
          <p>Inventário de Ansiedade Infantil — Versão Pais</p>
        </div>
        <span className="platform-use-badge">Instrumento não privativo de psicólogos</span>
      </article>
      <div className="platform-test-layout">
        <article className="panel platform-test-main">
          <span className="section-kicker">Sobre o SCARED-P</span>
          <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
          <h3>O que é o SCARED-P?</h3>
          <p>A forma para pais do SCARED registra a frequência de sinais ansiosos observados em crianças e adolescentes.</p>
          <p>Ela cobre os mesmos grandes domínios da forma infantil e permite comparar perspectivas. Diferenças entre informantes podem refletir sintomas internos ou comportamentos específicos de cada contexto.</p>
          <div className="platform-domain-list">{domains.map((domain) => <span key={domain}>{domain}</span>)}</div>
          <h3>Para que serve</h3>
          <p>Rastrear sintomas ansiosos a partir da observação de pais ou cuidadores e complementar o autorrelato e a entrevista.</p>
          <h3>Público destinado</h3>
          <p>Pais ou cuidadores de crianças e adolescentes dentro das faixas usadas pela adaptação adotada e que conheçam o comportamento da pessoa avaliada.</p>
          <h3>Como o instrumento funciona</h3>
          <ol className="platform-steps">
            <li><strong>41 itens</strong><span>O informante relata como a criança se sentiu nos últimos três meses.</span></li>
            <li><strong>Cinco fatores</strong><span>O escore total é complementado por perfis de sintomas.</span></li>
          </ol>
          <h3>O que ajuda a observar</h3>
          <div className="platform-observation-grid">
            <div><strong>Sintomas físicos e pânico</strong><span>Sensações corporais e medo intenso.</span></div>
            <div><strong>Preocupação e separação</strong><span>Ansiedade generalizada e medo de afastamento.</span></div>
            <div><strong>Contextos sociais e escolares</strong><span>Ansiedade social e evitação da escola.</span></div>
          </div>
          <h3>Onde pode ser utilizado</h3>
          <div className="platform-observation-grid">
            <div><strong>Clínica infantil</strong><span>Triagem e qualificação das queixas ansiosas.</span></div>
            <div><strong>Acompanhamento</strong><span>Registro estruturado de mudanças, quando tecnicamente indicado.</span></div>
            <div><strong>Pesquisa</strong><span>Mensuração padronizada de sintomas.</span></div>
          </div>
          <h3>O que investigar além do resultado</h3>
          <ul className="platform-checklist">
            <li>Há prejuízo, duração e contexto compatíveis com relevância clínica?</li>
            <li>Criança e cuidador divergem em quais situações?</li>
            <li>Condições médicas, desenvolvimento e eventos recentes foram investigados?</li>
          </ul>
          <h3>Como a plataforma utiliza este teste</h3>
          <p>A plataforma registra as 41 respostas da versão pais e calcula o escore total e os cinco domínios. Os pontos de atenção seguem a ficha original e não equivalem a diagnóstico.</p>
          <p>Os enunciados em português foram fornecidos para esta configuração; sua correspondência com uma adaptação validada não foi verificada. Antes do uso clínico, o profissional deve conferir os itens, os pontos de corte e as normas da versão adotada.</p>
          <h3>Importante sobre a interpretação</h3>
          <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
        </article>
        <aside className="platform-test-aside">
          <article className="panel">
            <span className="section-kicker">Resumo do instrumento</span>
            <dl className="platform-summary">
              <div><dt>Itens</dt><dd>41</dd></div>
              <div><dt>Público</dt><dd>Crianças e adolescentes</dd></div>
              <div><dt>Formato</dt><dd>Questionário para pais/cuidadores</dd></div>
              <div><dt>Finalidade</dt><dd>Rastreamento de ansiedade</dd></div>
              <div><dt>Domínios</dt><dd>5</dd></div>
              <div><dt>Faixa etária</dt><dd>Crianças e adolescentes</dd></div>
              <div><dt>Categoria</dt><dd>Ansiedade</dd></div>
              <div><dt>Autores</dt><dd>B. Birmaher, S. Khetarpal, D. Brent, M. Cully, L. Balach, J. Kaufman e S. M. Neer</dd></div>
              <div><dt>Uso profissional</dt><dd>Instrumento não privativo de psicólogos</dd></div>
            </dl>
          </article>
          <article className="panel platform-reference-card">
            <span className="section-kicker">Referências bibliográficas</span>
            <a href="https://pubmed.ncbi.nlm.nih.gov/9100430/" target="_blank" rel="noreferrer">Birmaher, B. et al. The Screen for Child Anxiety Related Emotional Disorders (SCARED): scale construction and psychometric characteristics. JACAAP, 1997.</a>
            <a href="https://pubmed.ncbi.nlm.nih.gov/10517055/" target="_blank" rel="noreferrer">Birmaher, B. et al. Psychometric properties of the SCARED: a replication study. JACAAP, 1999.</a>
            <a href="https://pediatricbipolar.pitt.edu/sites/default/files/assets/SCAREDParentVersion_1.19.18_0.pdf" target="_blank" rel="noreferrer">Universidade de Pittsburgh · Formulário e guia de pontuação da versão pais (41 itens)</a>
          </article>
        </aside>
      </div>
    </section>
  );
}
