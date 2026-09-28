# Formatação do laudo

O PDF é a referência visual da exportação para Google Docs. Os dados são obtidos do snapshot do laudo, respeitando a seleção de capítulos, tabelas e gráficos.

| Elemento | Padrão |
| --- | --- |
| Página | A4: 595,28 × 841,89 pt |
| Margens do conteúdo | Superior 136 pt; inferior 94 pt; laterais 72 pt |
| Corpo | 10 pt, justificado; entrelinha aproximada de 117,3% no Docs para reproduzir o acréscimo de 2 pt do PDF |
| Título | 17 pt, negrito, centralizado |
| Seções | 12 pt; identificação e análise dos resultados em 13 pt |
| Base conceitual | 9,5 pt |
| Tabelas | Indicadores nas colunas e resultados na linha seguinte, cabeçalho verde-claro, recuos internos de 2 pt e altura mínima compacta, largura total de 451,28 pt |
| Gráficos | Largura de 451,28 pt, mesma escala, cores, legendas e proporções do PDF |
| Assinatura | Centralizada, com nome em negrito e data em 9 pt |
| Cabeçalho e rodapé | Nome e registro no cabeçalho; contatos no rodapé; capa sem esses elementos repetidos |

A interpretação profissional aparece depois das tabelas e gráficos, como no PDF. Os textos continuam editáveis; os gráficos são imagens, com uma representação em tabela como alternativa quando a inserção da imagem falha.

Os parágrafos vazios de inserção recebem espaçamento zerado antes de novos blocos e tabelas. Isso impede que herdem os 358 pt usados na capa. O parágrafo separador criado pelo Google antes da tabela usa fonte de 1 pt e permanece junto à tabela, evitando um vão entre a legenda e as células.

## Limites de equivalência

O PDF usa Helvetica. O Docs usa Arial como aproximação compatível; isso não representa identidade tipográfica. A [API do Google Docs](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents#WeightedFontFamily) só aceita fontes do catálogo do Docs/Google Fonts e renderiza nomes desconhecidos em Arial. As diferenças de métricas e de paginação podem alterar as quebras de linha e de página.

A marca gráfica do cabeçalho e os campos automáticos “Página X de Y” do PDF ainda não são reproduzidos na exportação para Docs. A capa usa uma seção própria para separar as margens e os cabeçalhos do restante do documento.

## Conferência

Além da checagem TypeScript, conferir uma exportação autorizada no Google com e sem capa, títulos longos, múltiplos instrumentos e textos de várias páginas. Comparar o PDF original com o PDF baixado do Docs. As verificações locais dos pedidos à API não substituem essa conferência visual no Google.
