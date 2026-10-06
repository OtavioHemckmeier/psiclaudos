const authors = "Swanson, JM, Schuck, S., Porter, MM, Carlson, C., Hartman, CA, Sergeant, JA, Clevenger, W., Wasdell, M., McCleary, R., Lakes, K., & Wigal, T";
const domains = ["Desatenção", "Hiperatividade/impulsividade", "Oposição/desafio"];

export function SnapIvCard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="platform-test-card">
      <div className="platform-test-card-top">
        <span className="platform-test-icon">SN</span>
        <span className="platform-test-category">TDAH</span>
      </div>
      <h3>SNAP-IV</h3>
      <p>Questionário para Sintomas de TDAH e TDO</p>
      <div className="platform-test-tags">
        <span>Crianças e adolescentes</span>
        <span>26 itens</span>
        <span>Questionário para pais/professores</span>
      </div>
      <div className="platform-test-card-footer">
        <span>Rastreamento comportamental</span>
        <button className="secondary small" onClick={onOpen}>Ver teste</button>
      </div>
    </article>
  );
}

export function SnapIvPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="platform-test-page">
      <button className="back-link" onClick={onBack}>Voltar para testes da plataforma</button>
      <article className="panel platform-test-hero">
        <div className="platform-test-hero-mark">SN</div>
        <div>
          <span className="section-kicker">TDAH</span>
          <h2>SNAP-IV</h2>
          <p>Questionário para Sintomas de TDAH e TDO</p>
        </div>
        <span className="platform-use-badge">Instrumento não privativo de psicólogos</span>
      </article>
      <div className="platform-test-layout">
        <article className="panel platform-test-main">
          <span className="section-kicker">Sobre o SNAP-IV</span>
          <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
          <h3>O que é o SNAP-IV?</h3>
          <p>O SNAP-IV é uma escala para pais e professores baseada em descrições de sintomas de TDAH e de comportamentos opositores.</p>
          <p>A versão de 26 itens reúne 18 itens de TDAH e 8 de oposição/desafio. Como circulam versões com diferentes quantidades de itens, a interpretação deve corresponder exatamente ao formulário aplicado.</p>
          <div className="platform-domain-list">
            {domains.map((domain) => <span key={domain}>{domain}</span>)}
          </div>
          <h3>Para que serve</h3>
          <p>Rastrear frequência de comportamentos de desatenção, hiperatividade/impulsividade e oposição em ambientes cotidianos.</p>
          <h3>Público destinado</h3>
          <p>Crianças e adolescentes avaliados por pais, responsáveis e/ou professores que conheçam seu comportamento.</p>
          <h3>Como o instrumento funciona</h3>
          <ol className="platform-steps">
            <li><strong>Sintomas de TDAH</strong><span>Nove itens de desatenção e nove de hiperatividade/impulsividade.</span></li>
            <li><strong>Oposição/desafio</strong><span>Oito itens adicionais na versão de 26 itens.</span></li>
            <li><strong>Informantes</strong><span>Formulários paralelos permitem comparar casa e escola.</span></li>
          </ol>
          <h3>O que ajuda a observar</h3>
          <div className="platform-observation-grid">
            <div><strong>Frequência</strong><span>Quanto cada comportamento ocorre segundo o informante.</span></div>
            <div><strong>Contextos</strong><span>Semelhanças e diferenças entre ambientes.</span></div>
            <div><strong>Padrão sintomático</strong><span>Distribuição entre desatenção, hiperatividade e oposição.</span></div>
          </div>
          <h3>Onde pode ser utilizado</h3>
          <div className="platform-observation-grid">
            <div><strong>Escola</strong><span>Observação de comportamento em demandas acadêmicas.</span></div>
            <div><strong>Clínica infantil</strong><span>Triagem e qualificação das queixas.</span></div>
            <div><strong>Acompanhamento</strong><span>Monitoramento estruturado com cautela metodológica.</span></div>
          </div>
          <h3>O que investigar além do resultado</h3>
          <ul className="platform-checklist">
            <li>Os comportamentos são inadequados ao nível de desenvolvimento?</li>
            <li>Há sintomas e prejuízo em mais de um ambiente?</li>
            <li>Aprendizagem, sono, ansiedade, trauma e ambiente foram investigados?</li>
          </ul>
          <h3>Disponibilidade na plataforma</h3>
          <p>O formulário digital registra as respostas de pais/responsáveis ou professores e apresenta a soma por domínio. A soma é descritiva e não substitui normas, critérios de interpretação ou conferência profissional.</p>
          <p>Os enunciados foram configurados com base no formulário fornecido. A versão, a correção e as condições de uso devem ser conferidas pelo profissional responsável antes do uso clínico.</p>
          <h3>Importante sobre a interpretação</h3>
          <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
        </article>
        <aside className="platform-test-aside">
          <article className="panel">
            <span className="section-kicker">Resumo do instrumento</span>
            <dl className="platform-summary">
              <div><dt>Itens</dt><dd>26</dd></div>
              <div><dt>Público</dt><dd>Crianças e adolescentes</dd></div>
              <div><dt>Formato</dt><dd>Questionário para pais/professores</dd></div>
              <div><dt>Finalidade</dt><dd>Rastreamento comportamental</dd></div>
              <div><dt>Domínios</dt><dd>3</dd></div>
              <div><dt>Faixa etária</dt><dd>Crianças e adolescentes</dd></div>
              <div><dt>Categoria</dt><dd>TDAH</dd></div>
              <div><dt>Autores</dt><dd>{authors}</dd></div>
              <div><dt>Uso profissional</dt><dd>Instrumento não privativo de psicólogos</dd></div>
            </dl>
          </article>
          <article className="panel platform-reference-card">
            <span className="section-kicker">Referências bibliográficas</span>
            <p>Swanson, J. M. et al. SNAP rating scale e versões SNAP-IV. Literatura técnica da versão utilizada.</p>
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5795025/" target="_blank" rel="noreferrer">Estudo psicométrico da SNAP-IV em amostra escolar</a>
          </article>
        </aside>
      </div>
    </section>
  );
}
