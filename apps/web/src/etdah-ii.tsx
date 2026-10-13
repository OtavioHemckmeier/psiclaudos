import { useState, type ReactNode } from "react";

/*
 * ETDAH-II (versão para professores) — registro de resultado externo.
 * Os fatores, os grupos de referência e os limites espelham apps/api/src/catalog/etdah-ii-config.ts;
 * a API revalida tudo. Nenhum percentil, classificação ou escore Z é calculado aqui.
 */
export const etdahIIFactors = [
  { id: "attention", label: "Atenção", items: 15 },
  { id: "hyperactivity_impulsivity", label: "Hiperatividade/Impulsividade", items: 12 },
  { id: "learning", label: "Aprendizagem", items: 13 },
  { id: "social_behavior", label: "Comportamento Social", items: 6 },
];

const referenceGroups = [
  { value: "general", label: "População geral" },
  { value: "female_private", label: "Feminino (Particular)" },
  { value: "female_public", label: "Feminino (Público)" },
  { value: "male_private", label: "Masculino (Particular)" },
  { value: "male_public", label: "Masculino (Público)" },
];

const FORM_COUNT = 10;
const formPrefix = (formNumber: number) => `etdah_ii_form_${formNumber}`;

type Answers = Record<string, unknown>;

const filledFormNumbers = (values: Answers, suffix: RegExp = /_(?:respondent|raw)$/) =>
  [...new Set(Object.entries(values)
    .filter(([key, value]) => suffix.test(key) && value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key]) => Number(key.match(/^etdah_ii_form_(\d+)_/)?.[1]))
    .filter((number) => Number.isFinite(number) && number > 0))].sort((first, second) => first - second);

const display = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "—";
  return typeof value === "number" ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : String(value);
};

export function EtdahIIForm({ answers, onChange, disabled }: {
  answers: Answers;
  onChange: (update: (current: Answers) => Answers) => void;
  disabled: boolean;
}) {
  const [formCount, setFormCount] = useState(() =>
    Math.max(1, ...filledFormNumbers(answers, /_(?:enabled|respondent|reference_group|raw|percentile|classification|z)$/)));
  const [active, setActive] = useState(1);
  const prefix = formPrefix(active);
  const value = (field: string) => String(answers[`${prefix}_${field}`] ?? "");
  const set = (field: string, next: string) => onChange((current) => ({ ...current, [`${prefix}_${field}`]: next }));

  return (
    <div className="etdah-form">
      <div className="tab-list snapiv-form-tabs etdah-form-tabs" role="tablist" aria-label="Formulários por professor">
        {Array.from({ length: formCount }, (_, index) => index + 1).map((formNumber) => (
          <button
            key={formNumber}
            type="button"
            role="tab"
            aria-selected={active === formNumber}
            className={active === formNumber ? "active" : ""}
            onClick={() => setActive(formNumber)}
          >
            Formulário {formNumber}
          </button>
        ))}
        {!disabled && formCount < FORM_COUNT && (
          <button
            type="button"
            onClick={() => {
              const next = formCount + 1;
              setFormCount(next);
              setActive(next);
              onChange((current) => ({ ...current, [`${formPrefix(next)}_enabled`]: true }));
            }}
          >
            + Adicionar professor
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            className="scared-clear-form"
            onClick={() => onChange((current) => Object.fromEntries(
              Object.entries(current).filter(([key]) => !key.startsWith(`${prefix}_`) || key.endsWith("_enabled")),
            ))}
          >
            Limpar formulário
          </button>
        )}
      </div>

      <div className="etdah-identification">
        <label>
          Professor respondente
          <input
            disabled={disabled}
            maxLength={80}
            placeholder="Ex.: Professora de Língua Portuguesa"
            value={value("respondent")}
            onChange={(event) => set("respondent", event.target.value)}
          />
        </label>
        <label>
          Tabela de referência
          <select disabled={disabled} value={value("reference_group")} onChange={(event) => set("reference_group", event.target.value)}>
            <option value="">Selecione</option>
            {referenceGroups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
        </label>
        <label>
          Preenchimento
          <select disabled value="factors" aria-describedby="etdah-entry-note">
            <option value="factors">Pontos brutos por fator</option>
          </select>
        </label>
      </div>
      <p className="field-help" id="etdah-entry-note">
        O preenchimento item a item (DT, D, DP, CP, C, CT) e o cálculo automático de percentil, classificação e escore Z ficam
        disponíveis após a conferência do manual. Transcreva esses valores da tabela normativa do grupo selecionado.
      </p>

      <div className="result result-table-wrap etdah-factor-table">
        <table className="result-table">
          <thead>
            <tr><th>Fator</th><th>Pontos brutos</th><th>Percentil</th><th>Classificação</th><th>Escore Z</th></tr>
          </thead>
          <tbody>
            {etdahIIFactors.map((factor) => {
              const maximum = factor.items * 6;
              return (
                <tr key={factor.id}>
                  <td>{factor.label}<small>{factor.items} itens</small></td>
                  <td>
                    <input
                      type="number" inputMode="numeric" min={0} max={maximum} step={1} required disabled={disabled}
                      aria-label={`${factor.label} — pontos brutos`}
                      value={value(`${factor.id}_raw`)}
                      onChange={(event) => set(`${factor.id}_raw`, event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" inputMode="decimal" min={0} max={100} disabled={disabled}
                      aria-label={`${factor.label} — percentil (manual)`}
                      value={value(`${factor.id}_percentile`)}
                      onChange={(event) => set(`${factor.id}_percentile`, event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      maxLength={60} disabled={disabled}
                      aria-label={`${factor.label} — classificação (manual)`}
                      value={value(`${factor.id}_classification`)}
                      onChange={(event) => set(`${factor.id}_classification`, event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" inputMode="decimal" min={-10} max={10} step={0.01} disabled={disabled}
                      aria-label={`${factor.label} — escore Z (manual)`}
                      value={value(`${factor.id}_z`)}
                      onChange={(event) => set(`${factor.id}_z`, event.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EtdahIIResults({ result, summary, disabled, onSummaryChange, onSave }: {
  result: Answers;
  summary: string;
  disabled: boolean;
  onSummaryChange: (value: string) => void;
  onSave: () => void;
}) {
  const [view, setView] = useState<"table" | "chart">("table");
  const forms = filledFormNumbers(result, /_raw$/);
  return (
    <>
      <div className="asrs-result-view-toggle" role="group" aria-label="Visualização dos resultados">
        <button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Tabela</button>
        <button type="button" className={view === "chart" ? "active" : ""} onClick={() => setView("chart")}>Gráfico</button>
      </div>
      {forms.map((formNumber) => {
        const prefix = formPrefix(formNumber);
        const group = referenceGroups.find((option) => option.value === result[`${prefix}_reference_group`])?.label ?? "—";
        const hasZ = etdahIIFactors.some((factor) => `${prefix}_${factor.id}_z` in result);
        const percentiles = etdahIIFactors
          .map((factor) => ({ label: factor.label, value: Number(result[`${prefix}_${factor.id}_percentile`]) }))
          .filter((item) => Number.isFinite(item.value));
        return (
          <section className="etdah-result" key={formNumber}>
            <h3>Formulário {formNumber} — {display(result[`${prefix}_respondent`])} <small>Referência: {group}</small></h3>
            {view === "table" ? (
              <div className="result result-table-wrap">
                <table className="result-table">
                  <thead><tr><th>Fator</th><th>Pontos brutos</th><th>Percentil</th><th>Classificação</th>{hasZ && <th>Escore Z</th>}</tr></thead>
                  <tbody>{etdahIIFactors.map((factor) => {
                    const field = `${prefix}_${factor.id}`;
                    return (
                      <tr key={factor.id}>
                        <td>{factor.label}</td>
                        <td>{display(result[`${field}_raw`])}</td>
                        <td>{display(result[`${field}_percentile`])}</td>
                        <td>{display(result[`${field}_classification`])}</td>
                        {hasZ && <td>{display(result[`${field}_z`])}</td>}
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : percentiles.length ? (
              <PercentileChart title={`Formulário ${formNumber}`} values={percentiles} />
            ) : (
              <p className="muted">Sem percentis transcritos para este formulário.</p>
            )}
          </section>
        );
      })}
      <p>Pontos brutos apurados no protocolo. Percentil, classificação e escore Z foram transcritos da tabela normativa do manual; a plataforma não calcula normas nesta versão. O perfil não estabelece diagnóstico.</p>
      <label>Revise o resultado e escreva sua síntese
        <textarea disabled={disabled} value={summary} onChange={(event) => onSummaryChange(event.target.value)} rows={5} />
      </label>
      <button className="secondary" disabled={disabled} onClick={onSave}>Salvar síntese</button>
    </>
  );
}

function PercentileChart({ title, values }: { title: string; values: Array<{ label: string; value: number }> }) {
  return (
    <div className="etdah-chart" role="img" aria-label={`${title}: percentil por fator — ${values.map((item) => `${item.label} ${item.value}`).join(", ")}`}>
      <div className="etdah-chart-scale" aria-hidden="true">
        {[0, 20, 40, 60, 80, 100].map((tick) => <span key={tick} style={{ left: `${tick}%` }}>{tick}</span>)}
      </div>
      {values.map((item) => (
        <div className="etdah-chart-row" key={item.label} aria-hidden="true">
          <span className="etdah-chart-label">{item.label}</span>
          <span className="etdah-chart-track">
            <span className="etdah-chart-bar" style={{ width: `${Math.max(0, Math.min(item.value, 100))}%` }} />
          </span>
          <strong>{item.value.toLocaleString("pt-BR")}</strong>
        </div>
      ))}
    </div>
  );
}

export function EtdahIICard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="platform-test-card">
      <div className="platform-test-card-top">
        <span className="platform-test-icon">ET</span>
        <span className="platform-test-category">TDAH</span>
      </div>
      <h3>ETDAH-II</h3>
      <p>Escala do TDAH em Contexto Escolar — Versão para Professores</p>
      <div className="platform-test-tags">
        <span>6 a 18 anos</span>
        <span>46 itens</span>
        <span>Respondida por professores</span>
      </div>
      <div className="platform-test-card-footer">
        <span>TDAH no contexto escolar</span>
        <button className="secondary small" onClick={onOpen}>Ver informações</button>
      </div>
    </article>
  );
}

export function EtdahIIPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="platform-test-page">
      <button className="back-link" onClick={onBack}>Voltar para testes da plataforma</button>
      <article className="panel platform-test-hero">
        <div className="platform-test-hero-mark">ET</div>
        <div>
          <span className="section-kicker">TDAH</span>
          <h2>ETDAH-II</h2>
          <p>Escala do Transtorno de Déficit de Atenção/Hiperatividade em Contexto Escolar — Versão para Professores</p>
        </div>
        <span className="platform-use-badge">Respondida por professores</span>
      </article>
      <div className="platform-test-layout">
        <article className="panel platform-test-main">
          <span className="section-kicker">Sobre o ETDAH-II</span>
          <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
          <h3>O que é o ETDAH-II?</h3>
          <p>O ETDAH-II reúne a observação do professor sobre manifestações de TDAH e dificuldades associadas no ambiente escolar. Seus 46 itens compõem quatro fatores e ajudam a organizar a investigação do funcionamento do aluno nas atividades e nos relacionamentos.</p>
          <p>O perfil ganha significado quando relacionado a exemplos concretos: quais atividades exigem mais apoio, em que situações surgem dificuldades e como elas afetam a experiência escolar. Diferenças entre professores também ajudam a explorar a influência do contexto.</p>
          <div className="platform-domain-list">
            {etdahIIFactors.map((factor) => <span key={factor.id}>{factor.label}</span>)}
          </div>
          <h3>Para que serve</h3>
          <p>Caracterizar o perfil de dificuldades percebidas na escola e apoiar a investigação de seus efeitos sobre a participação, o desempenho e os relacionamentos do aluno.</p>
          <h3>Público destinado</h3>
          <p>Crianças e adolescentes de 6 a 18 anos. O professor é o informante sobre os comportamentos observados no ambiente escolar.</p>
          <h3>Como o instrumento funciona</h3>
          <ol className="platform-steps">
            <li><strong>Atenção</strong><span>15 itens sobre o funcionamento atencional na rotina escolar. Na investigação, explore a manutenção do foco, a organização e a conclusão de atividades.</span></li>
            <li><strong>Hiperatividade/Impulsividade</strong><span>12 itens sobre atividade motora e controle de impulsos. Relacione o resultado às situações em que a inquietação ou a precipitação interferem na participação em sala.</span></li>
            <li><strong>Aprendizagem</strong><span>13 itens sobre dificuldades acadêmicas percebidas pelo professor. Aprofunde a análise com produções escolares e avaliação das habilidades de leitura, escrita e matemática.</span></li>
            <li><strong>Comportamento Social</strong><span>6 itens sobre o funcionamento social na escola. Investigue a convivência com colegas e professores, a participação em grupo e os contextos dos conflitos.</span></li>
          </ol>
          <h3>O que ajuda a observar</h3>
          <Grid items={[
            ["Observação do cotidiano escolar", "Acrescenta à avaliação informações sobre situações que podem não aparecer durante o atendimento individual."],
            ["Perfil por área", "A leitura conjunta dos fatores ajuda a formular perguntas sobre como atenção, comportamento, aprendizagem e relações sociais se articulam."],
            ["Comparação entre professores", "Registros separados permitem explorar diferenças entre disciplinas, demandas das tarefas e oportunidades de observação de cada professor."],
          ]} />
          <h3>Onde pode ser utilizado</h3>
          <Grid items={[
            ["Investigação de queixas escolares", "Organiza o relato docente para aprofundar queixas de distração, inquietação, rendimento ou dificuldades de convivência."],
            ["Integração clínica e escolar", "Oferece uma perspectiva a ser relacionada à entrevista, à história de desenvolvimento, ao relato familiar e à observação do aluno."],
            ["Planejamento de apoio", "Ajuda a definir quais dificuldades investigar e quais situações acompanhar em conjunto com a escola e a família."],
          ]} />
          <h3>O que investigar além do resultado</h3>
          <ul className="platform-checklist">
            <li>Em quais disciplinas, tipos de tarefa e momentos da rotina as dificuldades aparecem com maior intensidade?</li>
            <li>O que muda entre os relatos dos professores quanto às exigências da atividade, ao apoio oferecido e ao tempo de convivência com o aluno?</li>
            <li>As dificuldades acadêmicas aparecem de forma ampla ou se concentram em leitura, escrita ou matemática?</li>
            <li>Quais prejuízos concretos são observados na autonomia, na realização das atividades e nas relações com colegas e professores?</li>
            <li>Há manifestações semelhantes em casa ou em outros ambientes, e como elas se relacionam com a história de desenvolvimento?</li>
            <li>Sono, ansiedade, humor ou dificuldades específicas de aprendizagem podem contribuir para o perfil observado?</li>
            <li>Em quais situações o aluno participa melhor, e quais apoios já favorecem seu desempenho e sua convivência?</li>
          </ul>
          <h3>Como a plataforma utiliza este teste</h3>
          <p>Identifique cada professor respondente e registre seu formulário separadamente, com a tabela de referência adotada (população geral ou grupo por sexo e rede de ensino). Informe os pontos brutos de cada fator apurados no protocolo e transcreva do manual o percentil, a classificação e, se desejar, o escore Z.</p>
          <p>O preenchimento item a item e o cálculo automático de percentil, classificação e escore Z ficam disponíveis somente após a conferência do manual técnico (composição dos fatores, inversões e tabelas normativas). A tabela exportada para o laudo reúne os fatores, os pontos brutos, os percentis e as classificações de cada professor.</p>
          <h3>Importante sobre a interpretação</h3>
          <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
        </article>
        <aside className="platform-test-aside">
          <article className="panel">
            <span className="section-kicker">Resumo do instrumento</span>
            <dl className="platform-summary">
              <div><dt>Itens</dt><dd>46</dd></div>
              <div><dt>Público</dt><dd>6 a 18 anos</dd></div>
              <div><dt>Formato</dt><dd>Escala de observação respondida por professores</dd></div>
              <div><dt>Finalidade</dt><dd>TDAH no contexto escolar</dd></div>
              <div><dt>Domínios</dt><dd>4</dd></div>
              <div><dt>Faixa etária</dt><dd>6 a 18 anos</dd></div>
              <div><dt>Categoria</dt><dd>TDAH</dd></div>
              <div><dt>Autora</dt><dd>Edyleine Bellini Peroni Benczik</dd></div>
            </dl>
            <p className="platform-summary-note">Nesta versão, percentil, classificação e escore Z são transcritos pelo profissional a partir do manual.</p>
          </article>
          <article className="panel platform-reference-card">
            <span className="section-kicker">Referências bibliográficas</span>
            <p>BENCZIK, Edyleine Bellini Peroni. ETDAH-II: Escala do Transtorno de Déficit de Atenção/Hiperatividade em Contexto escolar: Versão para professores. 3. ed. São Paulo: Pearson Clinical Brasil, 2021.</p>
            <a href="https://hogrefe.com.br/escala-do-transtorno-de-deficit-de-atenc-o-hiperatividade-em-contexto-escol.html" target="_blank" rel="noreferrer">Hogrefe. ETDAH-II — apresentação do instrumento, autoria, público-alvo e aplicação.</a>
            <a href="https://www.cdc.gov/adhd/diagnosis/index.html" target="_blank" rel="noreferrer">CDC. Diagnosing ADHD — integração de informantes, contextos e condições que podem explicar os sintomas.</a>
          </article>
        </aside>
      </div>
    </section>
  );
}

function Grid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="platform-observation-grid">
      {items.map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}
    </div>
  );
}
