const domains = ["Sintomas subjetivos", "Sintomas somáticos"];

export function BaiCard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="platform-test-card">
      <div className="platform-test-card-top">
        <span className="platform-test-icon">BA</span>
        <span className="platform-test-category">Ansiedade</span>
      </div>
      <h3>BAI</h3>
      <p>Inventário de Ansiedade de Beck</p>
      <div className="platform-test-tags">
        <span>A partir de 18 anos</span>
        <span>21 itens</span>
        <span>Autorrelato</span>
      </div>
      <div className="platform-test-card-footer">
        <span>Sintomas de ansiedade</span>
        <button className="secondary small" onClick={onOpen}>Ver informações</button>
      </div>
    </article>
  );
}

export function BaiPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="platform-test-page">
      <button className="back-link" onClick={onBack}>Voltar para testes da plataforma</button>
      <article className="panel platform-test-hero">
        <div className="platform-test-hero-mark">BA</div>
        <div>
          <span className="section-kicker">Ansiedade</span>
          <h2>BAI</h2>
          <p>Inventário de Ansiedade de Beck</p>
        </div>
        <span className="platform-use-badge">Restrito a psicólogos</span>
      </article>
      <div className="platform-test-layout">
        <article className="panel platform-test-main">
          <span className="section-kicker">Sobre o BAI</span>
          <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
          <h3>O que é o BAI?</h3>
          <p>O Inventário de Ansiedade de Beck reúne 21 sintomas comuns de ansiedade e solicita a intensidade percebida no período indicado pela versão.</p>
          <p>O escore expressa gravidade sintomática, não diagnóstico. Sintomas físicos também podem ter causas médicas, farmacológicas ou situacionais que precisam ser investigadas.</p>
          <div className="platform-domain-list">
            {domains.map((domain) => <span key={domain}>{domain}</span>)}
          </div>
          <h3>Para que serve</h3>
          <p>Mensurar a intensidade de sintomas ansiosos e apoiar avaliação clínica e acompanhamento.</p>
          <h3>Público destinado</h3>
          <p>Adultos a partir de 18 anos, conforme as normas da adaptação brasileira utilizada.</p>
          <h3>Como o instrumento funciona</h3>
          <ol className="platform-steps">
            <li><strong>21 itens</strong><span>Cada sintoma recebe uma classificação de intensidade.</span></li>
            <li><strong>Escore total</strong><span>A soma é interpretada com pontos de referência e normas da edição.</span></li>
          </ol>
          <h3>O que ajuda a observar</h3>
          <div className="platform-observation-grid">
            <div><strong>Experiência subjetiva</strong><span>Medo, nervosismo e dificuldade de relaxar.</span></div>
            <div><strong>Manifestações físicas</strong><span>Sensações autonômicas e corporais associadas.</span></div>
            <div><strong>Gravidade atual</strong><span>Intensidade no intervalo temporal solicitado.</span></div>
          </div>
          <h3>Onde pode ser utilizado</h3>
          <div className="platform-observation-grid">
            <div><strong>Clínica</strong><span>Quantificação complementar da queixa ansiosa.</span></div>
            <div><strong>Avaliação</strong><span>Integração com entrevista e diagnóstico diferencial.</span></div>
            <div><strong>Acompanhamento</strong><span>Comparação longitudinal quando apropriada.</span></div>
          </div>
          <h3>O que investigar além do resultado</h3>
          <ul className="platform-checklist">
            <li>Condições médicas ou substâncias explicam sintomas físicos?</li>
            <li>Há prejuízo funcional e padrão persistente?</li>
          </ul>
          <h3>Como a plataforma utiliza este teste</h3>
          <p>Esta página apresenta as características gerais da edição identificada. A aplicação, a correção informatizada e a inclusão em laudos permanecem indisponíveis até a conferência do manual técnico, das normas adequadas ao perfil avaliado e das condições de uso digital.</p>
          <h3>Importante sobre a interpretação</h3>
          <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
        </article>
        <aside className="platform-test-aside">
          <article className="panel">
            <span className="section-kicker">Resumo do instrumento</span>
            <dl className="platform-summary">
              <div><dt>Itens</dt><dd>21</dd></div>
              <div><dt>Público</dt><dd>A partir de 18 anos</dd></div>
              <div><dt>Formato</dt><dd>Autorrelato</dd></div>
              <div><dt>Finalidade</dt><dd>Sintomas de ansiedade</dd></div>
              <div><dt>Domínios declarados</dt><dd>2*</dd></div>
              <div><dt>Faixa etária</dt><dd>A partir de 18 anos</dd></div>
              <div><dt>Categoria</dt><dd>Ansiedade</dd></div>
              <div><dt>Situação no SATEPSI</dt><dd>Desfavorável desde 2018</dd></div>
              <div><dt>Autores</dt><dd>Aaron T. Beck, Robert A. Steer e Jurema Alcides Cunha</dd></div>
              <div><dt>Uso profissional</dt><dd>Restrito a psicólogos</dd></div>
            </dl>
            <p className="platform-summary-note">A plataforma apresenta somente o escore bruto desta versão; classificação e interpretação automática estão indisponíveis.</p>
          </article>
          <article className="panel platform-reference-card">
            <span className="section-kicker">Referências bibliográficas</span>
            <a href="https://repositorio.usp.br/directbitstream/1f803f9b-4f44-4706-ad2f-a45e5c7a1335/002997016.pdf" target="_blank" rel="noreferrer">Cunha, J. A. Manual da versão em português das Escalas Beck. São Paulo: Casa do Psicólogo, 2001.</a>
            <a href="https://satepsi.cfp.org.br/testesdesfavoraveis.cfm" target="_blank" rel="noreferrer">SATEPSI · Consulta de testes psicológicos desfavoráveis</a>
          </article>
        </aside>
      </div>
    </section>
  );
}
