# Checklist de implementação dos instrumentos

Escopo: instrumentos solicitados para uso real. Implementar e validar um instrumento ou formulário por vez. A ordem abaixo é uma proposta de trabalho; o ASRS-18 vem primeiro porque já possui configuração no projeto.

Um cadastro no catálogo não significa que a aplicação digital ou a correção automática esteja liberada. A edição, as condições de uso e a validação devem ser confirmadas para cada modalidade.

## Fila de trabalho

Marcar como concluído somente após cumprir os critérios de liberação deste documento.

- [ ] 01. ASRS-18 — revisar a configuração existente.
- [~] 02. SNAP-IV — formulário de 26 itens configurado com informante pais/responsáveis ou professor(a); somas por domínio disponíveis, aguardando conferência profissional da versão e critérios de interpretação.
- [ ] 03. SCARED — crianças/adolescentes.
- [ ] 04. SCARED — pais.
- [ ] 05. BAI — confirmar edição.
- [ ] 06. BDI — confirmar edição, incluindo se será BDI-II.
- [ ] 07. CDI — confirmar edição.
- [ ] 08. MASC — confirmar edição.
- [ ] 09. ETDAH — definir edição e formulários solicitados; abrir um item por formulário antes da implementação.
- [ ] 10. CBCL/6–18 — confirmar edição, adaptação e regras utilizadas.
- [ ] 11. SRS — adulto, autorrelato; confirmar edição.
- [ ] 12. SRS — adulto, heterorrelato; confirmar edição.
- [ ] 13. SRS — idade escolar; confirmar edição e grupos normativos.
- [ ] 14. SRS — pré-escolar; confirmar edição.
- [ ] 15. FDT — confirmar edição.
- [ ] 16. RAVLT — confirmar edição.
- [ ] 17. BPA — confirmar se BPA ou BPA-2.
- [ ] 18. WISC — confirmar edição.
- [ ] 19. WAIS — confirmar edição.

## Etapas obrigatórias por instrumento ou formulário

Copiar esta seção para o registro do instrumento ao iniciar seu trabalho.

### 1. Identificação e material

- [ ] Registrar nome, código único, edição, idioma e adaptação utilizada.
- [ ] Identificar formulário, respondente, público e critérios de elegibilidade.
- [ ] Definir o responsável pela validação profissional.
- [ ] Receber fonte oficial e material de correção autorizado.
- [ ] Registrar condições de uso e permissões para a modalidade pretendida.
- [ ] Conferir situação e modalidade no SATEPSI quando aplicável, registrando fonte e data da consulta.
- [ ] Escolher o escopo: registro de resultados externos, correção de respostas e/ou aplicação digital.
- [ ] Receber exemplos corrigidos sem dados pessoais e um modelo de resultado esperado.

### 2. Especificação

- [ ] Definir campos, opções, unidades, obrigatoriedade e limites válidos.
- [ ] Definir regras para respostas ausentes ou inválidas.
- [ ] Mapear itens, subescalas, etapas e regras condicionais previstas no manual.
- [ ] Documentar cálculos e tabelas normativas necessários, quando aplicáveis.
- [ ] Definir como selecionar e registrar o grupo normativo utilizado.
- [ ] Definir tabelas, gráficos, referências e textos apresentados no resultado e no laudo.
- [ ] Identificar extensões necessárias no formulário ou motor de regras.

### 3. Implementação

- [ ] Cadastrar metadados e variante sem liberar funcionalidades ainda não validadas.
- [ ] Implementar formulário ou entrada de resultados externos conforme o escopo.
- [ ] Implementar validação de entradas também na API.
- [ ] Implementar regras e conversões previstas no escopo aprovado.
- [ ] Registrar origem dos resultados, versão das regras e normas utilizadas.
- [ ] Integrar resultados à revisão profissional e ao bloqueio da aplicação.
- [ ] Integrar tabelas, gráficos pertinentes e textos às exportações oferecidas.
- [ ] Preservar versões utilizadas em avaliações anteriores.

### 4. Validação e liberação

- [ ] Comparar os resultados com os casos de referência fornecidos.
- [ ] Testar limites, respostas inválidas, dados ausentes e seleção de normas quando aplicável.
- [ ] Verificar que aplicações bloqueadas não podem ser alteradas sem reabertura registrada.
- [ ] Conferir formulário, resultado e laudo com o profissional responsável.
- [ ] Registrar correções solicitadas e concluir os ajustes.
- [ ] Registrar responsável, data, versão e evidência da aprovação.
- [ ] Liberar somente as modalidades aprovadas.

## Primeiro instrumento: ASRS-18

Situação inicial: existe configuração no código, mas este checklist não a considera homologada para uso real.

### Preparação

- [ ] Confirmar versão, adaptação e método de correção pretendidos.
- [ ] Confirmar fonte e condições de uso digital; substituir o estado de licença em preparação por informação verificada.
- [ ] Definir o profissional que validará o instrumento.
- [ ] Reunir casos corrigidos e resultado esperado.

### Ajustes identificados no projeto

- [ ] Resolver a divergência entre a página explicativa, que descreve partes de 6 e 12 itens, e a configuração, que organiza dois domínios de 9 itens.
- [ ] Conferir enunciados, ordem, alternativas e mapeamento das respostas com a fonte adotada.
- [ ] Conferir contagens, classificações, limites e faixa exibida no gráfico com o método aprovado.
- [ ] Validar as opções recebidas pela API antes de calcular; impedir que entradas inválidas sejam tratadas como zero.
- [ ] Impedir que a rotina de carga sobrescreva uma versão já utilizada em avaliações.
- [ ] Conferir textos e referências na tela e nas exportações.
- [ ] Cumprir todas as etapas de validação e liberação acima.

## Preparação compartilhada

Executar conforme necessário para o instrumento em andamento, evitando antecipar todos os cálculos dos demais.

- [ ] Generalizar detalhes do catálogo hoje específicos do ASRS-18.
- [ ] Separar família, variante e edição, com códigos únicos.
- [ ] Separar disponibilidade de catálogo, registro externo, correção e aplicação digital.
- [ ] Definir campos para informante e contexto da aplicação quando necessários.
- [ ] Implementar consulta normativa e rastreabilidade quando exigidas pelo primeiro instrumento que as utilizar.
- [ ] Distinguir resultados externos de resultados calculados pelo sistema.

## Registro de conclusão

| Instrumento/formulário | Edição e versão da configuração | Modalidade liberada | Responsável pela validação | Data | Evidência |
| --- | --- | --- | --- | --- | --- |
| A preencher após aprovação | — | — | — | — | — |

## Relação com a preparação para produção

A aprovação de um instrumento não conclui a preparação operacional. Segurança, backup, recuperação, privacidade e publicação continuam acompanhados em [PENDENCIAS.md](PENDENCIAS.md).

## Atualização

- Usar `[ ]` para pendente e `[x]` apenas para concluído com evidência.
- Registrar bloqueios indicando o material ou a decisão que falta.
- Ao concluir um instrumento, atualizar a fila e o registro de conclusão antes de iniciar o próximo.
