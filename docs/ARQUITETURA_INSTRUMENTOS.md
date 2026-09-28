# Arquitetura dos instrumentos

Para adicionar um novo instrumento ou formulário, siga `AGENTS.md`, `CHECKLIST_INSTRUMENTOS.md` e a ficha em `docs/instruments/TEMPLATE.md` antes de liberar cálculos ou exportações.

Cada instrumento tem um código estável (`ASRS-18`, `SNAP-IV`, `SCARED-C`, `SCARED-P`) e uma versão publicada. O formulário, as regras de pontuação, o resultado e a apresentação são dados dessa versão; a aplicação guarda as respostas e o resultado calculado.

## Onde alterar

| Responsabilidade | Local |
| --- | --- |
| Questões, campos, regras, saídas e apresentação | `apps/api/src/catalog/*-config.ts` e `instrument-config.ts` |
| Publicação das versões | `apps/api/src/catalog/catalog.service.ts` |
| Validação e preparação das respostas | `apps/api/src/evaluations/instrument-answers.ts` |
| Motor de cálculo comum | `packages/rule-engine/src/index.ts` |
| Conteúdo clínico e tabelas para exportação | `apps/api/src/reports/instrument-report.ts` |
| Renderização PDF e Google Docs | `apps/api/src/reports/reports.service.ts` |
| Controle de campos no formulário | `apps/web/src/instrument-field.tsx` |
| Resultado visual do SNAP-IV | `apps/web/src/snap-iv-results.tsx` |
| Páginas informativas específicas | `apps/web/src/snap-iv.tsx`, `scared-c.tsx`, `scared-p.tsx` |

Ao adicionar um instrumento, defina primeiro o formulário e as regras, depois o conteúdo informativo, a validação específica se necessária, e por fim o conteúdo do laudo. Use o código do instrumento para selecionar regras; o nome é apenas para exibição. Os dois formatos de exportação recebem a mesma estrutura de textos, tabelas e gráficos. Os relatórios novos guardam essa estrutura no snapshot para manter o conteúdo usado na geração do PDF quando um Google Docs for criado mais tarde.

O seed dos instrumentos clínicos não sobrescreve versões que já possuem aplicações. Se a configuração mudar, ele registra um aviso e mantém a versão em uso; para disponibilizar as novas questões ou regras, atualize o identificador de versão do instrumento e publique a nova versão. Versões sem aplicações podem ser atualizadas pelo seed durante o desenvolvimento.
