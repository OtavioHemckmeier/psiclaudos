# Plano de Evolução — Cadastros, Laudos e Telas

Este plano transforma a estrutura atual em um fluxo semelhante às telas de referência, preservando a regra central: **Paciente → Laudo/Avaliação → Instrumentos**.

## Como usar

- Marcar `[x]` ao concluir e validar um item.
- Usar `[~]` para itens iniciados e registrar uma observação curta logo abaixo.
- Não iniciar uma fase que dependa de dados ou telas ainda inexistentes.
- Cada item de backend deve ter validação de autorização por organização.

## Fase 1 — Fundação de navegação e interface

- [x] Definir o mapa de rotas: Dashboard, Pacientes, Laudos, Perfil, Configurações e Editor de Laudo.
- [x] Migrar a navegação atual por âncoras para rotas persistentes.
  - URLs com hash foram usadas nesta etapa para preservar o deploy estático atual; a migração para rotas do servidor pode ocorrer quando houver React Router.
- [ ] Criar layout-base com menu lateral, barra superior e área de conteúdo.
- [ ] Criar componentes reutilizáveis: página, cartão, tabela, filtro, paginação, abas, modal, status e botão de ação.
- [ ] Definir tokens visuais para cores, tipografia, espaçamento, bordas e estados.
- [ ] Padronizar estados de carregamento, vazio, erro e confirmação de salvamento.
- [ ] Garantir navegação responsiva por teclado e em telas pequenas.

**Critério de aceite:** cada área principal pode ser aberta diretamente por URL e mantém o layout consistente.

## Fase 2 — Cadastro e ficha completa do paciente

### Modelo de dados e API

- [x] Definir campos tipados do paciente: nome, CPF, nascimento, gênero, telefone, e-mail, escolaridade e plano de saúde.
- [x] Definir campos de responsáveis: nome e telefone para responsável 1 e 2.
- [x] Criar estrutura de endereço: CEP, cidade, estado, rua, bairro, número e complemento.
- [x] Definir notas clínicas administrativas separadas dos demais dados cadastrais.
- [x] Criar validações e máscaras para CPF, telefone, CEP e data.
- [x] Criar migração/estratégia para preservar registros existentes em `metadata`.
- [x] Registrar auditoria para criação, edição, arquivamento e alteração de anotações.
  - O histórico de alterações é exibido na aba de anotações da ficha do paciente.

### Telas

- [x] Criar tela de listagem de pacientes com busca, filtro, paginação e botão “Novo paciente”.
- [x] Exibir colunas mínimas: criado em, nome, telefone e ações.
- [x] Criar formulário de novo paciente com validação dos campos obrigatórios.
- [x] Criar ficha do paciente com cabeçalho contendo nome e idade calculada.
- [x] Criar aba “Dados” para visualizar e editar o cadastro.
- [x] Criar aba “Endereço” para visualizar e editar endereço.
- [x] Criar aba “Laudos” com histórico, testes utilizados, status e ações.
- [x] Criar aba “Anotações” com edição explícita e histórico/auditoria quando aplicável.
- [x] Criar ação segura para arquivar paciente, com confirmação.

**Critério de aceite:** é possível cadastrar, localizar, editar e consultar todo o histórico de um paciente sem sair da ficha.

## Fase 3 — Perfil profissional e organização

- [x] Expandir dados do profissional: telefone, CPF/CNPJ, CRP, especialidades e apresentação profissional.
- [x] Permitir múltiplas especialidades com seleção controlada.
- [~] Criar gestão de assinatura/rodapé para documentos, incluindo armazenamento seguro de imagem quando houver.
  - Assinatura textual já aparece no PDF; o envio de imagem permanece pendente.
- [~] Criar dados da organização: nome, logo, contato e informações que podem aparecer no documento.
  - Nome, e-mail e telefone estão disponíveis e o nome aparece no PDF; logo permanece pendente.
- [ ] Criar tela de Perfil com abas “Perfil”, “Senha” e “Assinatura”.
- [ ] Criar tela de Configurações da organização, respeitando permissões.
- [ ] Revisar quais papéis podem editar dados da organização e do catálogo.

**Critério de aceite:** os dados profissionais e institucionais necessários ao documento final são configuráveis e auditáveis.

## Fase 4 — Laudos: listagem e criação

### Modelo de dados e API

- [x] Acrescentar à avaliação/laudo: solicitante, finalidade, descrição da demanda, anamnese, conclusão e encaminhamento.
- [ ] Definir status claros: rascunho, em andamento, aguardando revisão, finalizado e cancelado.
- [ ] Registrar datas de início, atualização, conclusão e responsável pela revisão.
- [~] Criar endpoints específicos para salvar cada capítulo do laudo.
  - O endpoint de atualização do laudo já salva os capítulos; a separação por capítulo será feita junto ao editor.
- [ ] Garantir que somente usuários da mesma organização acessem ou alterem o laudo.

### Telas

- [~] Criar tela de listagem de laudos com busca, filtros de status/período e paginação.
  - Busca e filtro por status estão disponíveis; filtros por período e paginação ainda serão adicionados.
- [ ] Exibir colunas: data, paciente, testes, status e ações.
- [x] Criar ação “Novo laudo” a partir da lista e a partir da ficha do paciente.
- [~] Criar fluxo de criação que selecione paciente, título/tipo e profissional responsável.
  - Paciente e título estão implementados; tipo e profissional responsável serão incluídos no editor.
- [ ] Criar ações de abrir, editar, duplicar quando permitido, cancelar e consultar detalhes.

**Critério de aceite:** um profissional cria e encontra um laudo pelo paciente, período, status ou teste aplicado.

## Fase 5 — Editor modular do laudo

- [x] Criar cabeçalho persistente com paciente, idade na data da avaliação, status e “Exportar laudo”.
- [x] Criar navegação lateral por capítulos iniciais: Identificação, Descrição da Demanda e Anamnese.
- [x] Criar navegação lateral por capítulos finais: Conclusão e Encaminhamento.
- [x] Criar campo de identificação: autoria, solicitante e finalidade.
- [x] Criar capítulo “Descrição da Demanda” com texto orientado.
- [x] Criar capítulo “Anamnese” com blocos: história/desenvolvimento, contexto familiar, histórico médico e fatores psicossociais.
- [x] Criar capítulos “Conclusão” e “Encaminhamento”.
- [~] Implementar salvamento por capítulo, indicador de alteração pendente e confirmação de sucesso/erro.
  - Cada capítulo é salvo separadamente e exibe confirmação; o indicador de alteração pendente permanece pendente.
- [ ] Impedir edição de laudos finalizados sem fluxo de reabertura auditado.
- [ ] Validar a obrigatoriedade dos capítulos antes de finalizar.

**Critério de aceite:** o profissional monta o documento navegando pelos capítulos e não perde conteúdo ao alternar entre telas.

## Fase 6 — Testes dentro do laudo

### Seleção e organização

- [x] Exibir no editor a seção “Testes” com as aplicações já vinculadas ao laudo.
- [x] Criar ação “Adicionar teste” com seleção entre versões publicadas do catálogo.
- [x] Permitir múltiplos testes por laudo.
- [x] Impedir a criação acidental de aplicações duplicadas para a mesma versão, conforme regra definida.
- [x] Exibir estado de cada teste: não iniciado, em preenchimento, calculado, revisado e bloqueado.
- [x] Manter a versão exata do instrumento vinculada à aplicação.

### Preenchimento e resultado

- [x] Renderizar todos os tipos de campo previstos: texto, texto longo, número, data, booleano, escolha simples, múltipla escolha e escala.
- [x] Implementar validação de campos obrigatórios antes do cálculo.
- [x] Criar abas “Teste”, “Resultados” e “Detalhes” para cada instrumento.
- [~] Exibir resultados em tabela configurada pela versão do instrumento.
  - A interface agora apresenta uma tabela de resultados estruturados; colunas declarativas do instrumento serão aplicadas na próxima etapa.
- [ ] Exibir gráficos configurados pelo instrumento, com alternativa textual acessível.
- [ ] Criar campo de interpretação dos resultados, revisável pelo profissional.
- [ ] Implementar salvar, calcular, revisar, bloquear e reabrir com feedback visual.
- [ ] Exibir rastreabilidade de versão e cálculo para o profissional autorizado.

**Critério de aceite:** o laudo contém vários testes e cada um pode ser preenchido, calculado, revisado e consultado separadamente.

## Fase 7 — Catálogo e administração de instrumentos

- [ ] Criar tela administrativa de catálogo de testes disponíveis.
- [ ] Exibir código, nome, categoria, versão e status de publicação.
- [ ] Criar fluxo para publicar nova versão sem alterar aplicações existentes.
- [ ] Exibir origem, licença e documentação da regra para usuários autorizados.
- [ ] Criar validação estrutural da configuração antes da publicação.
- [ ] Criar testes de regressão para cálculos e classificações oficiais de cada instrumento autorizado.
- [ ] Restringir a gestão do catálogo ao papel administrativo apropriado.

**Critério de aceite:** uma nova versão é publicada de forma controlada e aplicações antigas continuam reproduzíveis.

## Fase 8 — Documento e exportação

- [ ] Definir template de documento com identidade da organização e dados profissionais.
- [~] Incluir capítulos textuais, testes, tabelas, gráficos, interpretação e conclusão no snapshot do PDF.
  - Capítulos textuais, testes, tabelas e interpretação são incluídos; gráficos dependem da configuração visual do instrumento.
- [ ] Criar visualização prévia antes da exportação.
- [x] Exibir histórico de revisões e downloads do documento.
- [ ] Validar que PDF utiliza snapshots, sem recalcular resultados históricos.
- [ ] Avaliar e aprovar a necessidade de exportação em DOCX/Word.
- [ ] Implementar DOCX somente se o template e os requisitos de edição estiverem definidos.
- [ ] Validar paginação, quebras, acessibilidade e impressão do documento.

**Critério de aceite:** o PDF reproduz fielmente o laudo revisado e possui rastreabilidade da revisão gerada.

## Fase 9 — Dashboard e acabamento operacional

- [ ] Criar indicadores: laudos disponíveis/no plano, laudos criados, pacientes cadastrados e testes aplicados.
- [ ] Criar gráfico de histórico de laudos por período.
- [ ] Criar bloco de últimos laudos com acesso rápido aos detalhes.
- [ ] Definir se informações de plano/assinatura fazem parte do escopo comercial.
- [ ] Revisar responsividade das tabelas e do editor em dispositivos menores.
- [ ] Revisar textos, mensagens de erro e terminologia clínica com profissional responsável.
- [ ] Executar testes de fluxo completo: paciente → laudo → testes → revisão → PDF.
- [ ] Executar teste de isolamento entre organizações para todas as novas rotas.

**Critério de aceite:** o fluxo principal é claro, responsivo e validado ponta a ponta.

## Dependências externas obrigatórias

- [ ] Definir quais instrumentos serão efetivamente disponibilizados.
- [ ] Confirmar licença, titularidade e autorização de reprodução digital de cada instrumento.
- [ ] Obter manual, tabelas normativas, regras e casos oficiais autorizados.
- [ ] Validar cada regra e texto de saída com profissional habilitado.
- [ ] Validar conteúdo do documento e assinatura com responsável técnico.
- [ ] Validar requisitos legais, retenção, privacidade e armazenamento antes de produção.

## Ordem sugerida de execução

1. Fase 1 — Navegação e componentes.
2. Fase 2 — Pacientes.
3. Fase 4 — Laudos e listagem.
4. Fase 5 — Editor de capítulos.
5. Fase 6 — Testes e resultados.
6. Fase 3 — Perfil e organização, antes do template final.
7. Fases 7 e 8 — Catálogo e documento.
8. Fase 9 — Dashboard, validação e acabamento.
