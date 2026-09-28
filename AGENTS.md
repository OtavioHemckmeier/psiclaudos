# Instruções para agentes neste projeto

Este arquivo se aplica ao repositório inteiro. Leia `CHECKLIST_INSTRUMENTOS.md` e `docs/ARQUITETURA_INSTRUMENTOS.md` antes de adicionar ou alterar um instrumento. Neste projeto, pedidos como “adicionar um laudo” podem significar um novo instrumento, uma variante/formulário ou apenas um modelo de documento. Use o contexto para identificar o escopo; pergunte somente pelos dados clínicos ou direitos de uso que faltarem. Continue o trabalho independente da resposta, mas não libere cálculos ou textos clínicos sem evidência.

## Princípio de segurança clínica

- O sistema auxilia a correção e a redação; o profissional habilitado revisa e assume a interpretação e a conclusão. Nunca transforme um ponto de corte, rastreamento ou classificação em diagnóstico automático.
- Não invente itens, traduções, normas, pontos de corte, inversões, fórmulas, classificações, referências ou afirmações clínicas. Não copie material protegido para o código ou para a conversa sem autorização para a modalidade de uso pretendida.
- Diferencie explicitamente: página informativa, registro de resultado externo, correção automática, aplicação digital e inclusão no PDF/Google Docs. A liberação de uma modalidade não libera as outras.
- Se faltar manual, tabela normativa, licença, caso de referência ou validação profissional, documente o bloqueio e implemente apenas estrutura neutra ou funcionalidade marcada como indisponível. Não deixe um resultado provisório parecer validado.

## Processo obrigatório para novo instrumento ou formulário

1. **Delimitar a versão.** Identifique código único, nome, edição, idioma/adaptação, formulário, respondente, público, faixa etária, contexto, modalidade de aplicação e finalidade. Registre isso em `docs/instruments/<codigo>.md` usando `docs/instruments/TEMPLATE.md`.
2. **Conferir fontes e uso.** Consulte manual e material de correção da edição exata, autorização/licença para reprodução e uso digital, publicações primárias pertinentes e situação atual no SATEPSI quando aplicável. Registre URL ou arquivo, edição, páginas, data da consulta e o que foi efetivamente verificado. Consulte as fontes oficiais atuais do CFP para avaliação psicológica e documentos escritos; não presuma que uma regra antiga continua vigente.
3. **Especificar antes de codificar.** Na ficha do instrumento, trace cada questão/campo, alternativa, escore bruto, recodificação, domínio, fórmula, norma, ponto de corte, faixa/classificação e texto de interpretação até sua fonte. Defina como tratar respostas ausentes, inválidas, formulários parciais, múltiplos respondentes, limites inclusivos, idade e grupo normativo. Separe observação calculada, inferência clínica e texto que exige autoria profissional.
4. **Obter referência independente.** Reúna casos corrigidos sem dados pessoais, idealmente fornecidos pelo manual ou pelo profissional responsável. Registre entradas e saídas esperadas antes de implementar a regra. Quando houver divergência entre fontes, pare a regra afetada, documente a divergência e peça decisão técnica; não escolha um valor por aproximação.
5. **Implementar de ponta a ponta.** Adicione configuração e metadados versionados no catálogo (`apps/api/src/catalog/`), validação de entradas na API (`apps/api/src/evaluations/instrument-answers.ts`), regras no contrato/motor existente, página informativa e card no web, formulário, visualização dos resultados e conteúdo de laudo em `apps/api/src/reports/instrument-report.ts`. Reutilize os componentes comuns e crie exceções por código de instrumento somente quando o esquema comum não representar a regra ou a apresentação.
6. **Manter os destinos consistentes.** Pontuações, rótulos, unidades, classificações, notas de interpretação e referências devem concordar entre tela, PDF e Google Docs. A exportação usa a estrutura compartilhada de `instrument-report.ts`. Preserve no snapshot do laudo o conteúdo, a apresentação e as tabelas usados; não recalcule um laudo antigo com regras novas.
7. **Validar e revisar.** Teste casos de referência, cada formulário/respondente, limites exatos dos cortes, respostas faltantes/inválidas, normas e casos extremos. Verifique o resultado da API, a tela e um PDF gerado; confira também o caminho do Google Docs quando a integração estiver disponível. Compare valores e textos com a ficha de especificação. Registre revisão do profissional habilitado, ajustes, versão e data antes de marcar qualquer modalidade como pronta.

Pontos de partida oficiais para a conferência, sujeitos a atualização: [SATEPSI no CFP](https://site.cfp.org.br/servicos/avaliacoes-de-testes-psicologicos/) e [orientações do CFP sobre documentos escritos](https://site.cfp.org.br/publicada-nova-resolucao-sobre-elaboracao-de-documentos-escritos/). Verifique a norma vigente e a edição efetivamente usada em cada solicitação.

## Regras de implementação

- Use `instrument.code` para selecionar comportamento; `name` é para exibição. Mantenha o motor de regras genérico em `packages/rule-engine`; não espalhe cálculos clínicos por componentes React ou renderizadores PDF/Docs.
- Valide entradas na API, mesmo quando o formulário web as restringe. Resposta inválida, vazia ou fora da escala não pode virar zero silenciosamente. Preserve escore bruto, escore convertido, classificação e rastreio da regra em campos distintos quando aplicável.
- Uma mudança em itens, regras, normas, faixas ou interpretação requer nova identificação de versão e testes de regressão. Não sobrescreva versão publicada vinculada a aplicações; confira o comportamento do seed em `apps/api/src/catalog/catalog.service.ts`.
- Mantenha avisos de limites de uso próximos aos resultados. Textos automáticos devem descrever somente o que a regra validada suporta. Conclusão, recomendações individualizadas e diagnóstico dependem da avaliação e revisão profissional.
- Não use dados identificáveis de pacientes em fixtures, testes, screenshots, logs ou documentação. Testes de referência devem conter dados sintéticos ou devidamente desidentificados.

## Critério de entrega

- Atualize `CHECKLIST_INSTRUMENTOS.md` e a ficha do instrumento com o que foi concluído, o que ainda depende de fonte/licença/revisão e a evidência da validação. Não marque `[x]` sem evidência.
- Execute ao menos testes específicos da regra e validação, `npm test`, checagem de tipos e build dos pacotes alterados quando possível. Se uma integração externa não puder ser exercitada, declare a limitação e não afirme que ela foi validada.
- Na resposta final, informe versão e modalidade implementadas, fontes usadas, cálculos e saídas conferidos, testes executados e pendências para publicação clínica.
