import type { ReactNode } from "react";

const domains = ["Cognitivo-afetivo", "Somático"];

export function BdiIICard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="platform-test-card">
      <div className="platform-test-card-top">
        <span className="platform-test-icon">BD</span>
        <span className="platform-test-category">Depressão</span>
      </div>
      <h3>BDI-II</h3>
      <p>Inventário de Depressão de Beck — Segunda Edição</p>
      <div className="platform-test-tags">
        <span>A partir de 10 anos</span>
        <span>21 itens</span>
        <span>Autorrelato</span>
      </div>
      <div className="platform-test-card-footer">
        <span>Sintomas depressivos</span>
        <button className="secondary small" onClick={onOpen}>Ver informações</button>
      </div>
    </article>
  );
}

export function BdiIIPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="platform-test-page">
      <button className="back-link" onClick={onBack}>Voltar para testes da plataforma</button>
      <article className="panel platform-test-hero">
        <div className="platform-test-hero-mark">BD</div>
        <div>
          <span className="section-kicker">Depressão</span>
          <h2>BDI-II</h2>
          <p>Inventário de Depressão de Beck — Segunda Edição</p>
        </div>
        <span className="platform-use-badge">Restrito a psicólogos</span>
      </article>
      <div className="platform-test-layout">
        <article className="panel platform-test-main">
          <span className="section-kicker">Sobre o BDI-II</span>
          <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
          <h3>O que é o BDI-II?</h3>
          <p>O Inventário de Depressão de Beck — segunda edição reúne 21 grupos de afirmações sobre sintomas depressivos nas duas semanas anteriores.</p>
          <p>O escore ajuda a estimar gravidade, mas não substitui entrevista diagnóstica. Respostas relacionadas a morte ou ideação suicida exigem avaliação clínica imediata conforme o protocolo profissional.</p>
          <div className="platform-domain-list">
            {domains.map((domain) => <span key={domain}>{domain}</span>)}
          </div>
          <h3>Para que serve</h3>
          <p>Mensurar a gravidade de sintomas depressivos em adolescentes e adultos e apoiar avaliação e acompanhamento.</p>
          <h3>Público destinado</h3>
          <p>Pessoas a partir de 10 anos, conforme as normas da adaptação brasileira utilizada.</p>
          <h3>Como o instrumento funciona</h3>
          <ol className="platform-steps">
            <li><strong>21 itens</strong><span>Cada sintoma recebe uma classificação de intensidade.</span></li>
            <li><strong>Escore total</strong><span>A soma é interpretada com pontos de referência e normas da edição.</span></li>
          </ol>
          <h3>O que ajuda a observar</h3>
          <Grid items={[
            ["Humor e cognições", "Tristeza, pessimismo, culpa e autocrítica."],
            ["Funcionamento", "Interesse, energia, sono, apetite e concentração."],
            ["Risco", "Um item aborda pensamentos ou desejos relacionados à morte."],
          ]} />
          <h3>Onde pode ser utilizado</h3>
          <Grid items={[
            ["Clínica", "Quantificação complementar da queixa depressiva."],
            ["Avaliação", "Integração com entrevista e diagnóstico diferencial."],
            ["Acompanhamento", "Comparação longitudinal quando apropriada."],
          ]} />
          <h3>O que investigar além do resultado</h3>
          <ul className="platform-checklist">
            <li>Há ideação suicida ou necessidade de avaliação de risco imediata?</li>
            <li>Luto, doença e fatores situacionais foram diferenciados?</li>
            <li>Duração, prejuízo e curso sustentam as hipóteses clínicas?</li>
          </ul>
          <h3>Como a plataforma utiliza este teste</h3>
          <p>A aplicação é feita no caderno impresso. A plataforma registra a pontuação de cada item (0 a 3), transcrita pelo profissional, e calcula o escore bruto total, de 0 a 63. Os enunciados do caderno não são reproduzidos.</p>
          <p>A classificação de gravidade, os domínios e as normas ficam indisponíveis até a conferência do manual técnico da adaptação brasileira. A correção informatizada apoia o registro e a elaboração do laudo, mas deve ser conferida com o manual, as normas adequadas ao perfil avaliado e as condições efetivas da aplicação.</p>
          <h3>Importante sobre a interpretação</h3>
          <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
        </article>
        <aside className="platform-test-aside">
          <article className="panel">
            <span className="section-kicker">Resumo do instrumento</span>
            <dl className="platform-summary">
              <div><dt>Itens</dt><dd>21</dd></div>
              <div><dt>Público</dt><dd>A partir de 10 anos</dd></div>
              <div><dt>Formato</dt><dd>Autorrelato</dd></div>
              <div><dt>Finalidade</dt><dd>Sintomas depressivos</dd></div>
              <div><dt>Domínios declarados</dt><dd>2*</dd></div>
              <div><dt>Faixa etária</dt><dd>A partir de 10 anos</dd></div>
              <div><dt>Categoria</dt><dd>Depressão</dd></div>
              <div><dt>Situação no SATEPSI</dt><dd>Favorável (a conferir)</dd></div>
              <div><dt>Autores</dt><dd>Aaron T. Beck, Robert A. Steer e Gregory K. Brown</dd></div>
              <div><dt>Uso profissional</dt><dd>Restrito a psicólogos</dd></div>
            </dl>
            <p className="platform-summary-note">* A plataforma apresenta somente o escore bruto total; domínios, classificação e interpretação automática estão indisponíveis nesta versão.</p>
          </article>
          <article className="panel platform-reference-card">
            <span className="section-kicker">Referências bibliográficas</span>
            <p>Werlang, B. S. G.; Gorenstein, C.; Argimon, I. I. L. & Wang, Y. P. (2010). Inventário de Depressão de Beck (BDI-II). São Paulo: Casapsi Livraria e Editora.</p>
            <a href="https://satepsi.cfp.org.br/testesfavoraveis.cfm" target="_blank" rel="noreferrer">SATEPSI · Consulta de testes psicológicos favoráveis</a>
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
