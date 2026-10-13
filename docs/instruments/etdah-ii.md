# Ficha do instrumento: ETDAH-II (versão para professores)

## Identificação e escopo

| Campo | Valor |
| --- | --- |
| Código, edição e versão da configuração | `ETDAH-II` — Escala do TDAH em Contexto Escolar, Versão para Professores, 3. ed., Pearson Clinical Brasil, 2021. Configuração `3ed-2021-registro-externo-v1`. |
| Idioma e adaptação | Português brasileiro (instrumento brasileiro). |
| Formulário, respondente e público | Escala de observação respondida por professores; alunos de 6 a 18 anos. Um formulário por professor (até 10). |
| Finalidade e contexto de uso | Caracterizar o perfil de dificuldades percebidas na escola (atenção, hiperatividade/impulsividade, aprendizagem, comportamento social). Não é diagnóstico. |
| Modalidades solicitadas | Página informativa; preenchimento por itens (DT, D, DP, CP, C, CT) ou por pontos brutos por fator; percentil, classificação e escore Z por grupo de referência; tabela e gráfico no laudo. |
| Responsável pela validação profissional | Pendente. |
| Estado de cada modalidade | Página informativa: disponível. **Registro de resultado externo** por professor (pontos brutos por fator; percentil, classificação e escore Z transcritos do manual) e exportação factual: disponíveis. Preenchimento item a item, inversões e cálculo normativo automático: **bloqueados**. |

## Fontes e direitos de uso

| Fonte primária/manual, edição e página | Regra ou conteúdo sustentado | Permissão/modalidade | Data da conferência |
| --- | --- | --- | --- |
| Texto informativo enviado pelo solicitante | Nome, autoria, público, 46 itens, quatro fatores e número de itens por fator (15/12/13/6), alternativas DT–CT, grupos de referência (população geral; sexo × rede de ensino), uso por professor, referências. | Texto informativo fornecido. | 2026-10-06 |
| Telas de referência enviadas | Layout: abas por formulário, respondente, tabela de referência, tabela Fator / Resultado bruto / Percentil / Classificação, escore Z, gráfico de percentis com faixa média. | Usadas só como referência de interface; um exemplo não define normas. | 2026-10-06 |
| [Hogrefe — página do ETDAH-II](https://hogrefe.com.br/escala-do-transtorno-de-deficit-de-atenc-o-hiperatividade-em-contexto-escol.html) | Apresentação comercial, autoria, público e aplicação (fonte secundária). | Não comprova reprodução de itens nem uso digital. | Não aberta nesta implementação |
| Manual técnico (Benczik, 3. ed., 2021) | Itens de cada fator, itens invertidos, pontuação das alternativas, tabelas raw→percentil por grupo, média/DP para escore Z, faixas de classificação, faixa "média" do gráfico. | **Pendente.** | Pendente |
| SATEPSI | Situação do instrumento. | Pendente de consulta registrada. | Pendente |

**Bloqueios:** sem o manual, não foram implementados a composição dos fatores, as inversões, o mapeamento das alternativas DT–CT para pontos, as tabelas normativas, o escore Z calculado, as faixas de classificação nem a faixa média do gráfico. Os enunciados dos 46 itens não são reproduzidos.

## Especificação do formulário e cálculo

| Campo/itens | Entrada e valores válidos | Transformação/fórmula | Saída | Fonte |
| --- | --- | --- | --- | --- |
| `etdah_ii_form_N_respondent` | Texto, 1–80 caracteres; obrigatório se o formulário foi iniciado. Não usar nome do professor quando não for necessário (ex.: "Professora de Língua Portuguesa"). | — | Mesmo campo | Plataforma |
| `etdah_ii_form_N_reference_group` | `general`, `female_private`, `female_public`, `male_private`, `male_public`; obrigatório. | — | Mesmo campo | Texto do solicitante |
| `..._{fator}_raw` (4 fatores) | Inteiro de 0 a itens × 6 (limite de sanidade; o intervalo exato depende do manual). Obrigatório. | Conversão para número. | Pontos brutos | Protocolo impresso |
| `..._{fator}_percentile` | Opcional; número de 0 a 100. | — | Percentil transcrito | Tabela normativa do manual (pelo profissional) |
| `..._{fator}_classification` | Opcional; texto até 60 caracteres. | — | Classificação transcrita | Manual (pelo profissional) |
| `..._{fator}_z` | Opcional; número de −10 a 10 (aceita vírgula). | — | Escore Z transcrito | Manual (pelo profissional) |
| Formulário não iniciado | Sem nenhum valor além de `_enabled`. | Ignorado. | Não entra no resultado. | Plataforma |
| Nenhum formulário preenchido / campo inválido | — | A API recusa o registro com mensagem do campo. Nada vira zero. | Erro 400 | Plataforma |

Não há regras no motor nesta versão (`rules: []`): a API valida e registra os valores.

## Resultados e laudo

| Resultado exibido | Regra e condição | Texto/nota permitido | Tela | PDF | Google Docs |
| --- | --- | --- | --- | --- | --- |
| Tabela por professor | Formulários completos. | Fator, pontos brutos, percentil, classificação (+ escore Z se informado); "—" para não informado. | Disponível | Disponível | Disponível (não exercitado) |
| Nota da tabela | Sempre que houver tabela. | Valores normativos transcritos pelo profissional; a plataforma não calcula normas. | Disponível | Disponível | Disponível (não exercitado) |
| Gráfico de percentis (0–100) | Somente com percentis transcritos. | Sem faixa "média" até a conferência do manual. | Disponível | Disponível | Disponível (não exercitado) |
| Cálculo normativo automático | — | — | Bloqueado | Bloqueado | Bloqueado |

## Casos de referência

| Caso sem dados pessoais | Entradas | Resultado esperado | Fonte | Teste automatizado |
| --- | --- | --- | --- | --- |
| Registro de um professor | Pontos brutos 27/35/54/29, grupo Masculino (Público) | Valores numéricos registrados; opcionais ausentes | Sintético | `etdah-ii-config.spec.ts` |
| Valores transcritos | Percentil 20, classificação "Inferior", Z "-1,0" | 20 / "Inferior" / −1 | Sintético | `etdah-ii-config.spec.ts` |
| Limites e inválidos | 0 e 36 aceitos; −1, decimal, acima do limite, percentil > 100, Z > 10, campos faltantes recusados | — | Regra da plataforma | `etdah-ii-config.spec.ts` |
| Conversão normativa | Pendente | Pendente | Manual | Pendente |

## Revisão e liberação

| Item | Registro |
| --- | --- |
| Comparação com casos de referência | Apenas registro e validação; sem norma. |
| Conferência de formulário, resultado, PDF e Google Docs | Conferência técnica da tela e do PDF; Google Docs não exercitado. |
| Profissional responsável e data da aprovação | Pendente. |
| Versão e modalidades liberadas | Nenhuma liberação clínica. |
| Pendências e bloqueios | Manual (fatores × itens, inversões, pontuação DT–CT, tabelas por grupo, média/DP, faixas), SATEPSI, licença de uso digital, revisão profissional. Com as tabelas, implementar regra de consulta normativa por grupo no motor. |
