const domains = ["Pânico/somático", "Ansiedade generalizada", "Separação", "Ansiedade social", "Evitação escolar"];

export function ScaredCCard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="platform-test-card">
      <div className="platform-test-card-top">
        <span className="platform-test-icon">SC</span>
        <span className="platform-test-category">Ansiedade</span>
      </div>
      <h3>SCARED-C</h3>
      <p>Inventário de Ansiedade Infantil — Versão Criança</p>
      <div className="platform-test-tags">
        <span>Crianças e adolescentes</span>
        <span>41 itens</span>
        <span>Autorrelato</span>
      </div>
      <div className="platform-test-card-footer">
        <span>Rastreamento de ansiedade</span>
        <button className="secondary small" onClick={onOpen}>Ver teste</button>
      </div>
    </article>
  );
}

export function ScaredCPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="platform-test-page">
      <button className="back-link" onClick={onBack}>Voltar para testes da plataforma</button>
      <article className="panel platform-test-hero">
        <div className="platform-test-hero-mark">SC</div>
        <div>
          <span className="section-kicker">Ansiedade</span>
          <h2>SCARED-C</h2>
          <p>Inventário de Ansiedade Infantil — Versão Criança</p>
        </div>
        <span className="platform-use-badge">Instrumento não privativo de psicólogos</span>
      </article>
      <div className="platform-test-layout">
        <article className="panel platform-test-main">
          <span className="section-kicker">Sobre o SCARED-C</span>
          <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
          <h3>O que é o SCARED-C?</h3>
          <p>O SCARED é um questionário de rastreamento de sintomas de ansiedade em crianças e adolescentes, disponível em formas paralelas para a criança e para os pais.</p>
          <p>A versão de 41 itens organiza sinais em cinco dimensões. Pontuações elevadas indicam necessidade de investigação clínica, não um diagnóstico automático de transtorno de ansiedade.</p>
          <div className="platform-domain-list">{domains.map((domain) => <span key={domain}>{domain}</span>)}</div>
          <h3>Para que serve</h3>
          <p>Identificar a intensidade e o padrão de sintomas ansiosos e apoiar entrevista, avaliação e acompanhamento clínico.</p>
          <h3>Público destinado</h3>
          <p>Crianças e adolescentes com capacidade de compreender a versão de autorrelato e dentro das faixas usadas pela adaptação adotada.</p>
          <p>Na ficha original, recomenda-se explicar as perguntas para crianças de 8 a 11 anos ou permitir que respondam com um adulto disponível para dúvidas.</p>
          <h3>Como o instrumento funciona</h3>
          <ol className="platform-steps">
            <li><strong>41 itens</strong><span>Sintomas são avaliados por frequência em linguagem acessível, considerando os últimos três meses.</span></li>
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
          <p>A plataforma registra as 41 respostas e calcula o escore total e os cinco domínios da versão criança. Os pontos de atenção seguem a ficha original e não equivalem a diagnóstico.</p>
          <p>Os enunciados em português são uma tradução operacional da ficha original em inglês, não a adaptação brasileira validada. Antes do uso clínico, o profissional deve conferir os itens, os pontos de corte e as normas da versão adotada.</p>
          <h3>Importante sobre a interpretação</h3>
          <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
        </article>
        <aside className="platform-test-aside">
          <article className="panel">
            <span className="section-kicker">Resumo do instrumento</span>
            <dl className="platform-summary">
              <div><dt>Itens</dt><dd>41</dd></div>
              <div><dt>Público</dt><dd>Crianças e adolescentes</dd></div>
              <div><dt>Formato</dt><dd>Autorrelato</dd></div>
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
            <a href="https://www.pediatricbipolar.pitt.edu/sites/default/files/assets/SCAREDChildVersion_1.19.18.pdf" target="_blank" rel="noreferrer">Universidade de Pittsburgh · Formulário e guia de pontuação da versão criança (41 itens)</a>
          </article>
        </aside>
      </div>
    </section>
  );
}
