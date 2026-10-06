# Ficha do instrumento: BDI-II-BR

## Identificação e escopo

| Campo | Valor |
| --- | --- |
| Código, edição e versão da configuração | `BDI-II` — *Beck Depression Inventory – Second Edition*, adaptação brasileira. Configuração `br-registro-escore-bruto-v1`. |
| Idioma e adaptação | Português brasileiro. Referência informada pelo solicitante: Werlang, B. S. G.; Gorenstein, C.; Argimon, I. I. L. & Wang, Y. P. (2010), Casapsi. Ano, autoria e edição do manual devem ser conferidos no exemplar. |
| Formulário, respondente e público | Autorrelato; "a partir de 10 anos", conforme informado pelo solicitante. Faixa etária e normas por idade pendentes de conferência no manual. |
| Finalidade e contexto de uso | Mensurar a gravidade de sintomas depressivos e apoiar avaliação e acompanhamento. Não substitui entrevista diagnóstica. |
| Modalidades solicitadas (registro, correção, aplicação digital, exportação) | Página informativa, registro da pontuação de cada item transcrita do caderno impresso, escore bruto total e exportação factual. A plataforma **não** reproduz os enunciados do caderno. |
| Responsável pela validação profissional | Pendente. |
| Estado de cada modalidade | Página informativa, registro de pontuações, escore bruto e exportação factual: disponíveis. Classificação de gravidade, domínios e interpretação automática: **bloqueados**. |

## Fontes e direitos de uso

| Fonte primária/manual, edição e página | Regra ou conteúdo sustentado | Permissão/modalidade | Data da conferência |
| --- | --- | --- | --- |
| Pedido do solicitante (texto da página informativa) | Nome, autores, 21 itens, autorrelato, público, categoria, uso restrito a psicólogos, dois domínios declarados (cognitivo-afetivo e somático), período de duas semanas, referência bibliográfica. | Texto informativo fornecido pelo solicitante. | 2026-10-05 |
| Telas de referência enviadas pelo solicitante | Títulos curtos dos 21 itens, na ordem 1–21, e pontuação de 0 a 3 por item. | Somente títulos dos sintomas; nenhum enunciado do caderno foi reproduzido. | 2026-10-05 |
| SATEPSI | Situação "Favorável" **informada pelo solicitante**; não conferida no portal nesta implementação. | Pendente de consulta registrada (data e número do registro). | Pendente |
| Manual técnico da adaptação brasileira | Pontuação dos itens 16 e 18 (alternativas a/b), pontos de corte, normas, domínios e tratamento de respostas ausentes. | Pendente. | Pendente |

**Bloqueios:** sem o manual, a classificação de gravidade, a composição dos domínios e as normas não foram implementadas. O caso das telas de referência (37 → "nível grave") não foi usado como regra: um único exemplo não define as faixas.

## Especificação do formulário e cálculo

| Campo/itens | Entrada e valores válidos | Transformação/fórmula | Saída | Fonte e página |
| --- | --- | --- | --- | --- |
| `bdi_ii_1` … `bdi_ii_21` | Pontuação do item transcrita do caderno: `0`, `1`, `2` ou `3`; todos obrigatórios. Itens 16 e 18: o caderno usa alternativas com letras (1a/1b, 2a/2b, 3a/3b); registra-se o número. | `SCORE_ITEM` 0→0 … 3→3. | `bdi_ii_item_N_score` (intermediário) | Telas de referência; regra das letras a conferir no manual. |
| Escore bruto total | 21 respostas válidas. | Soma dos 21 valores; intervalo matemático 0–63. | `bdi_ii_total_raw` | Estrutura informada pelo solicitante. |
| Item 9 (pensamentos ou desejos suicidas) | Mesmo campo `bdi_ii_9`. | Sem transformação. | `bdi_ii_item_9_score`, exibido somente na tela com aviso quando ≥ 1. | Texto do solicitante: respostas sobre morte ou ideação suicida exigem avaliação clínica imediata. |
| Domínios, normas e classificação | Pendente. | Não implementada. | Não implementada. | Manual pendente. |
| Respostas ausentes e inválidas | A API recusa o cálculo se algum item estiver vazio ou fora de 0–3. | — | Erro de validação. | Regra conservadora da plataforma até o manual definir outra. |

## Resultados e laudo

| Resultado exibido | Regra e condição | Texto/nota permitido | Tela | PDF | Google Docs |
| --- | --- | --- | --- | --- | --- |
| Página informativa | Conteúdo do solicitante, sem enunciados do caderno. | Características gerais e aviso das modalidades bloqueadas. | Disponível | — | — |
| Escore bruto total | 21 respostas válidas. | "Pontuação total N / 63"; classificação "Não disponível". | Disponível | Snapshot factual | Snapshot factual |
| Aviso do item 9 | `bdi_ii_item_9_score ≥ 1`. | Indica a pontuação do item e orienta avaliar o risco conforme o protocolo profissional. | Disponível | Não incluído | Não incluído |
| Domínios, normas e classificação | Sem regra verificada. | Apenas aviso de indisponibilidade. | Bloqueado | Bloqueado | Bloqueado |

## Casos de referência

| Caso sem dados pessoais | Entradas | Resultado esperado | Fonte/conferência independente | Teste automatizado |
| --- | --- | --- | --- | --- |
| Mínimo | 21 itens = 0 | Total 0 | Aritmética da soma | `bdi-ii-config.spec.ts` |
| Máximo | 21 itens = 3 | Total 63 | Aritmética da soma | `bdi-ii-config.spec.ts` |
| Tela de referência (sintético) | Pontuações das telas enviadas | Total 37 | Valor exibido na tela de referência | `bdi-ii-config.spec.ts` |
| Classificação no limite dos cortes | Pendente | Pendente | Manual | Pendente |

## Revisão e liberação

| Item | Registro |
| --- | --- |
| Comparação com casos de referência | Somente escore bruto (soma). |
| Conferência de formulário, resultado, PDF e Google Docs | Conferência técnica da tela e do PDF; Google Docs não exercitado (integração não configurada no ambiente). |
| Ajustes solicitados | Corrigida a "Finalidade: Sintomas de ansiedade" e o exemplo "queixa ansiosa" do texto recebido para sintomas depressivos. |
| Profissional responsável e data da aprovação | Pendente. |
| Versão e modalidades liberadas | Nenhuma liberação clínica. |
| Pendências e bloqueios | Manual (faixas de gravidade, normas, domínios, itens 16/18), consulta ao SATEPSI, licença de uso digital, revisão profissional. |
