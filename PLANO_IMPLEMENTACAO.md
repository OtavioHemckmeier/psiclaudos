# Plano de Implementação — Plataforma de Correção Psicológica

## Status atual

- [x] Fase 0 — estrutura de validação do instrumento criada.
- [x] Fase 1 — fundação técnica do monorepo concluída.
- [ ] Fase 0 — instrumento real autorizado e configurado.
- [ ] Fase 1 — pipeline de CI configurado.
- [~] Fase 2 — autenticação e isolamento SaaS (núcleo concluído; complementos pendentes).
- [~] Fase 3 — pacientes (CRUD e isolamento concluídos; auditoria/testes pendentes).
- [~] Fase 4 — catálogo e versionamento do instrumento (validação estrutural concluída; testes oficiais pendentes).
- [~] Fase 5 — motor de regras integrado à API (backend concluído; validações avançadas pendentes).
- [x] Fase 6 — avaliações e aplicação do instrumento (fluxo inicial concluído; casos oficiais pendentes).
- [~] Fase 7 — relatório em PDF (geração, histórico e auditoria locais concluídos; armazenamento de produção pendente).
- [~] Fase 8 — segurança, privacidade e eliminação (auditoria e cabeçalhos básicos concluídos; hardening pendente).
- [~] Fase 9 — homologação e lançamento (interface inicial e builds concluídos; homologação pendente).

O checklist será atualizado conforme cada entrega for concluída. Itens que dependem de autorização externa permanecerão pendentes até haver documentação válida.

## 1. Objetivo do MVP

Construir uma aplicação web SaaS para psicólogos cadastrarem pacientes, preencherem um instrumento, obterem sua correção automatizada e gerarem um PDF de resultados.

O produto será uma ferramenta de apoio. O sistema poderá produzir pontuações, classificações, tabelas, gráficos e uma síntese descritiva revisável, mas não emitirá diagnóstico nem substituirá a análise profissional.

### Fluxo principal

```text
Psicólogo entra no sistema
        ↓
Cadastra ou seleciona um paciente
        ↓
Cria uma avaliação
        ↓
Seleciona o instrumento disponível
        ↓
Preenche os dados necessários
        ↓
Sistema valida e executa a correção
        ↓
Psicólogo revisa resultados e síntese
        ↓
Sistema gera o PDF
```

## 2. Escopo confirmado

### Incluído no MVP

- [x] Aplicação web responsiva em React.
- [x] API em NestJS.
- [x] Autenticação de usuários.
- [x] Cadastro da organização e do psicólogo.
- [x] Cadastro e gerenciamento de pacientes.
- [x] Criação e acompanhamento de avaliações.
- [x] Um único instrumento inicial demonstrativo.
- [x] Formulário preenchido somente pelo psicólogo.
- [x] Catálogo de instrumentos controlado pela plataforma.
- [x] Motor genérico de regras.
- [x] Resultado estruturado e rastreável.
- [x] Síntese descritiva revisável.
- [ ] Tabelas e gráficos definidos pelo instrumento.
- [x] Geração direta de PDF.
- [x] Histórico básico de PDFs gerados.
- [x] Auditoria das ações importantes.
- [x] Isolamento de dados por organização.
- [ ] Solicitação de encerramento e eliminação de dados conforme a política de retenção aplicável.

### Fora do MVP

- [ ] Aplicação de instrumentos diretamente pelo paciente.
- [ ] Editor visual de instrumentos para organizações.
- [ ] Catálogo com vários instrumentos.
- [ ] Geração de DOCX.
- [ ] Assinatura eletrônica ou digital.
- [ ] Diagnóstico automático.
- [ ] Geração automática de laudo psicológico.
- [ ] Inteligência artificial generativa.
- [ ] Agenda, financeiro, prontuário completo ou teleconsulta.
- [ ] Aplicativo móvel nativo.

## 3. Decisões técnicas propostas

### Monorepositório

```text
apps/
  web/        React + TypeScript + Vite
  api/        NestJS + TypeScript
packages/
  contracts/  DTOs, schemas e tipos compartilhados
  rule-engine/ motor de regras isolado
  ui/         componentes compartilhados, se necessário
infra/
  docker/
docs/
```

### Tecnologias

- Frontend: React, TypeScript, Vite, React Router e TanStack Query.
- Formulários: React Hook Form com validação por schema.
- Backend: NestJS com API REST.
- Banco: MongoDB.
- ORM: Prisma.
- Contratos e validação: Zod nos schemas compartilhados e validação de entrada no backend.
- Autenticação: access token de curta duração e refresh token seguro.
- PDF: template HTML/CSS renderizado no backend com Playwright/Chromium.
- Gráficos: configuração declarativa e renderização em SVG ou imagem para o PDF.
- Arquivos: armazenamento compatível com S3; armazenamento local apenas em desenvolvimento.
- Testes: Vitest no frontend e no motor; Jest/Supertest na API; Playwright para fluxos críticos.
- Ambiente local: Docker Compose para MongoDB e serviços auxiliares.

## 4. Modelo funcional

### Entidades principais

#### Organization

- `id`
- `name`
- `status`
- `createdAt`
- `updatedAt`

#### User

- `id`
- `organizationId`
- `name`
- `email`
- `passwordHash`
- `role`
- `professionalRegistration`
- `status`
- `createdAt`
- `updatedAt`

#### Patient

- `id`
- `organizationId`
- `name`
- `document`
- `birthDate`
- `gender`
- `education`
- `metadata`
- `createdAt`
- `updatedAt`
- `deletedAt`

#### Evaluation

- `id`
- `organizationId`
- `patientId`
- `professionalId`
- `title`
- `status`
- `notes`
- `createdAt`
- `completedAt`
- `deletedAt`

#### InstrumentDefinition

- `id`
- `code`
- `name`
- `description`
- `category`
- `status`

#### InstrumentVersion

- `id`
- `instrumentId`
- `version`
- `status`
- `sourceMetadata`
- `licenseMetadata`
- `formSchema`
- `rules`
- `outputSchema`
- `presentationSchema`
- `contentHash`
- `createdAt`
- `publishedAt`

#### InstrumentApplication

- `id`
- `organizationId`
- `evaluationId`
- `instrumentVersionId`
- `status`
- `answers`
- `result`
- `ruleTrace`
- `professionalSummary`
- `startedAt`
- `calculatedAt`
- `reviewedAt`
- `lockedAt`

#### GeneratedReport

- `id`
- `organizationId`
- `evaluationId`
- `revision`
- `snapshot`
- `storageKey`
- `hash`
- `generatedBy`
- `generatedAt`

#### AuditEvent

- `id`
- `organizationId`
- `userId`
- `event`
- `entityType`
- `entityId`
- `metadata`
- `createdAt`

## 5. Regras invariáveis

- [x] Toda consulta de dados clínicos exige `organizationId` do usuário autenticado.
- [x] Uma organização nunca acessa dados de outra organização.
- [x] Apenas versões `PUBLISHED` podem iniciar novas aplicações.
- [x] Uma versão publicada nunca pode ser alterada.
- [x] Alterações no instrumento exigem uma nova versão.
- [x] A aplicação mantém referência exata à versão utilizada.
- [x] O resultado calculado é armazenado como snapshot.
- [x] O PDF utiliza o snapshot e nunca recalcula o instrumento.
- [ ] Reprocessamentos são explícitos e auditados.
- [x] Respostas bloqueadas não podem ser editadas sem reabertura auditada.
- [x] A síntese automática não pode afirmar diagnóstico.
- [ ] Logs técnicos não podem conter respostas ou informações clínicas sensíveis.
- [ ] Exclusões respeitam retenções legais antes da destruição definitiva.

## 6. Estados do sistema

### Avaliação

```text
DRAFT → IN_PROGRESS → COMPLETED
   └───────────────→ CANCELLED
```

### Aplicação do instrumento

```text
NOT_STARTED → IN_PROGRESS → CALCULATED → REVIEWED → LOCKED
                                ↑                    │
                                └──── REOPENED ─────┘
```

### Versão do instrumento

```text
DRAFT → PUBLISHED → ARCHIVED
```

## 7. Motor de regras

### Operadores do MVP

- [x] `SCORE_ITEM`: converte uma resposta em pontuação.
- [x] `SUM`: soma valores produzidos anteriormente.
- [x] `COUNT`: conta valores que atendem a uma condição.
- [x] `RANGE`: classifica um valor por faixas.
- [x] `CONDITIONAL`: escolhe um resultado a partir de uma condição.
- [x] `FORMULA`: executa expressão matemática usando parser seguro.

### Validação antes da publicação

- [ ] Validar o schema do formulário.
- [x] Validar identificadores únicos de campos e regras.
- [x] Rejeitar referência a campo ou resultado inexistente.
- [x] Rejeitar outputs duplicados.
- [x] Detectar dependências circulares.
- [ ] Validar tipos das entradas e saídas.
- [x] Rejeitar operadores desconhecidos.
- [x] Rejeitar código executável nas fórmulas.
- [x] Validar o schema do resultado.
- [ ] Validar referências usadas na apresentação e no PDF.
- [ ] Executar casos de teste obrigatórios do instrumento.

### Retorno do motor

```typescript
type RuleEngineResult = {
  outputs: Record<string, unknown>;
  trace: RuleTraceItem[];
  errors: RuleMessage[];
  warnings: RuleMessage[];
};
```

## 8. Conteúdo do PDF

- [x] Identificação do paciente com dados mínimos necessários.
- [ ] Identificação do profissional responsável.
- [x] Nome e versão do instrumento.
- [x] Data da aplicação/correção.
- [x] Resultados estruturados.
- [ ] Tabelas configuradas para o instrumento.
- [ ] Gráficos configurados para o instrumento.
- [x] Síntese descritiva revisada pelo psicólogo.
- [ ] Referência técnica permitida do instrumento.
- [x] Aviso de que o documento é apoio à avaliação e não constitui diagnóstico automático.
- [x] Código ou hash para identificação da versão gerada.

O PDF será gerado diretamente; não haverá DOCX no MVP.

## 9. Fases de implementação

### Fase 0 — Validação do produto e do instrumento

- [ ] Escolher formalmente o primeiro instrumento.
- [ ] Confirmar autorização de uso e reprodução digital.
- [ ] Confirmar se a modalidade informatizada é permitida.
- [ ] Obter manual, regras, tabelas e referências válidas.
- [ ] Definir quais dados serão inseridos pelo psicólogo.
- [ ] Definir os resultados esperados.
- [ ] Definir exemplos oficiais para validar os cálculos.
- [ ] Aprovar o nome comercial do PDF de resultados.
- [ ] Validar textos e avisos com profissional de Psicologia.
- [ ] Validar política de retenção e eliminação com orientação jurídica.

**Critério de conclusão:** especificação do primeiro instrumento aprovada, documentada e legalmente utilizável.

### Fase 1 — Fundação do projeto

- [x] Criar monorepositório.
- [x] Configurar gerenciador de pacotes e workspaces.
- [x] Criar aplicação React.
- [x] Criar aplicação NestJS.
- [x] Criar pacote de contratos compartilhados.
- [x] Configurar TypeScript e validação de código.
- [x] Configurar variáveis de ambiente.
- [x] Criar Docker Compose com MongoDB.
- [x] Configurar Prisma e schema inicial.
- [x] Configurar testes unitários e de integração.
- [ ] Criar pipeline básico de CI.
- [x] Documentar inicialização local.

**Critério de conclusão:** frontend, API, banco e testes iniciam localmente com um único comando documentado.

### Fase 2 — Autenticação e isolamento SaaS

- [x] Implementar organização.
- [x] Implementar usuário psicólogo.
- [x] Implementar login e logout.
- [ ] Implementar renovação de sessão.
- [ ] Implementar recuperação de senha.
- [x] Implementar autorização por papel.
- [x] Criar contexto obrigatório de organização.
- [x] Impedir consultas sem filtro de organização.
- [ ] Registrar eventos de autenticação relevantes.
- [ ] Criar testes de isolamento entre organizações.

**Critério de conclusão:** usuários autenticados acessam somente os dados de sua organização.

### Fase 3 — Pacientes

- [x] Criar paciente.
- [x] Listar e pesquisar pacientes.
- [x] Visualizar paciente.
- [x] Editar paciente.
- [x] Arquivar paciente.
- [x] Solicitar eliminação de paciente.
- [x] Validar duplicidade conforme regras definidas.
- [x] Registrar criação, edição, arquivamento e solicitação de eliminação.
- [ ] Criar testes de autorização e validação.

**Critério de conclusão:** o psicólogo gerencia pacientes sem vazamento de dados entre organizações.

### Fase 4 — Catálogo e versionamento do instrumento

- [x] Criar entidades de definição e versão.
- [x] Criar formato dos schemas declarativos.
- [ ] Criar importador interno de configuração JSON.
- [ ] Validar a configuração importada.
- [x] Criar publicação imutável de versão.
- [x] Criar arquivamento de versão.
- [x] Calcular hash do conteúdo publicado.
- [x] Criar comando de seed do instrumento demonstrativo.
- [ ] Criar testes de imutabilidade.

**Critério de conclusão:** uma configuração válida pode ser publicada e não pode mais ser alterada.

### Fase 5 — Motor de regras

- [x] Implementar representação do contexto de execução.
- [x] Implementar ordenação e dependências.
- [x] Implementar `SCORE_ITEM`.
- [x] Implementar `SUM`.
- [x] Implementar `COUNT`.
- [x] Implementar `RANGE`.
- [x] Implementar `CONDITIONAL`.
- [x] Implementar `FORMULA` com parser matemático restrito.
- [x] Implementar trace detalhado.
- [x] Implementar erros e avisos estruturados.
- [x] Criar testes unitários para os operadores implementados.
- [x] Criar testes de dependência circular e referências inválidas.
- [ ] Criar testes com casos completos do instrumento.

**Critério de conclusão:** todos os casos oficiais de validação produzem exatamente os resultados esperados.

### Fase 6 — Avaliações e aplicação do instrumento

- [x] Criar avaliação para um paciente.
- [x] Adicionar o instrumento publicado.
- [x] Congelar a versão utilizada.
- [x] Renderizar formulário dinâmico no React.
- [x] Implementar salvamento parcial.
- [x] Validar respostas no backend.
- [x] Executar cálculo no backend.
- [x] Salvar resultado e trace como snapshot.
- [x] Exibir resultado calculado no frontend.
- [x] Exibir detalhamento do cálculo na API.
- [x] Permitir revisão da síntese descritiva.
- [x] Confirmar revisão e bloquear aplicação.
- [x] Implementar reabertura auditada.

**Critério de conclusão:** o psicólogo completa o fluxo do instrumento sem cálculos manuais fora do sistema.

### Fase 7 — Relatório em PDF

- [x] Definir o `ReportModel` intermediário.
- [x] Criar template inicial de PDF.
- [x] Montar relatório exclusivamente a partir de snapshots.
- [ ] Renderizar gráficos para impressão.
- [x] Gerar PDF diretamente no backend.
- [x] Calcular hash do arquivo.
- [x] Armazenar arquivo localmente com acesso privado pela API.
- [x] Criar revisão incremental a cada nova geração.
- [x] Permitir download somente por usuário autorizado.
- [x] Registrar geração e download na auditoria.
- [ ] Testar paginação, fontes, tabelas e quebras de página.

**Critério de conclusão:** o PDF é reproduzível, legível e contém os mesmos dados revisados na aplicação.

### Fase 8 — Segurança, privacidade e eliminação

- [ ] Garantir TLS nos ambientes publicados.
- [ ] Proteger tokens e cookies.
- [x] Aplicar rate limiting nas rotas sensíveis.
- [x] Configurar cabeçalhos de segurança.
- [ ] Validar upload e download, se houver anexos.
- [ ] Criptografar backups e armazenamento de arquivos.
- [ ] Remover dados clínicos de logs e ferramentas de erro.
- [x] Implementar trilha de auditoria protegida contra edição comum.
- [ ] Definir prazos de retenção por tipo de registro.
- [ ] Implementar fila de expurgo definitivo.
- [ ] Implementar exportação de dados do titular.
- [ ] Registrar execução e resultado da eliminação.
- [ ] Produzir termos de uso e política de privacidade.
- [ ] Executar revisão de segurança antes da produção.

**Critério de conclusão:** controles de acesso, retenção e eliminação estão documentados, testados e auditáveis.

### Fase 9 — Qualidade e lançamento

- [ ] Testar o fluxo completo em navegadores suportados.
- [x] Testar layout responsivo.
- [ ] Testar acessibilidade básica por teclado e leitor de tela.
- [ ] Executar testes de isolamento multiempresa.
- [ ] Executar testes de cálculos com casos aprovados.
- [ ] Executar testes de geração de PDF.
- [ ] Validar backup e restauração.
- [ ] Configurar monitoramento sem dados sensíveis.
- [ ] Configurar alertas operacionais.
- [x] Criar base para ambiente de homologação.
- [ ] Realizar homologação com psicólogo responsável.
- [ ] Corrigir bloqueadores encontrados na homologação.
- [ ] Publicar a primeira versão do MVP.

**Critério de conclusão:** fluxo principal aprovado em homologação e disponível em produção com monitoramento e backup.

## 10. Telas do MVP

- [x] Login.
- [ ] Recuperação de senha.
- [x] Visão inicial com avaliações recentes.
- [x] Lista de pacientes.
- [x] Cadastro/edição de paciente.
- [ ] Detalhes do paciente.
- [x] Lista de avaliações.
- [x] Criação da avaliação.
- [x] Detalhes da avaliação.
- [x] Formulário do instrumento.
- [x] Resultado e memória de cálculo.
- [x] Revisão da síntese.
- [x] Visualização do relatório.
- [x] Histórico e download dos PDFs.
- [ ] Perfil do psicólogo e organização.
- [ ] Solicitação de encerramento da conta.

## 11. API inicial

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/logout

GET    /me
PATCH  /me

GET    /patients
POST   /patients
GET    /patients/:id
PATCH  /patients/:id
DELETE /patients/:id

GET    /evaluations
POST   /evaluations
GET    /evaluations/:id
PATCH  /evaluations/:id

GET    /instruments
GET    /instruments/:code/active-version

POST   /evaluations/:evaluationId/applications
GET    /applications/:id
PATCH  /applications/:id/answers
POST   /applications/:id/calculate
PATCH  /applications/:id/summary
POST   /applications/:id/review
POST   /applications/:id/lock
POST   /applications/:id/reopen

POST   /evaluations/:id/reports
GET    /evaluations/:id/reports
GET    /reports/:id/download
```

## 12. Estratégia do primeiro instrumento

### Durante o desenvolvimento

- [x] Criar instrumento demonstrativo sem conteúdo clínico protegido.
- [ ] Cobrir todas as capacidades necessárias do motor.
- [ ] Criar casos de teste com entradas e saídas conhecidas.
- [ ] Validar formulário, cálculo, trace, resultado e PDF.

### Para uso real

- [ ] Selecionar o instrumento definitivo.
- [ ] Registrar titular dos direitos e licença.
- [ ] Registrar situação e modalidade permitida no SATEPSI, quando aplicável.
- [ ] Obter autorização necessária para reprodução ou correção digital.
- [ ] Configurar somente dados, regras e textos autorizados.
- [ ] Revisar a configuração com profissional habilitado.
- [ ] Criar bateria de casos oficiais de validação.
- [ ] Publicar a versão somente após aprovação formal.

O ASRS-18 poderá ser o primeiro instrumento real, mas não deverá ser disponibilizado em produção sem a autorização aplicável.

## 13. Definição de pronto

Uma funcionalidade será considerada pronta quando:

- [ ] requisitos e critérios de aceite estiverem atendidos;
- [ ] autorização por organização estiver validada;
- [x] validações existirem no frontend e no backend;
- [ ] testes automatizados relevantes estiverem passando;
- [ ] eventos sensíveis estiverem auditados;
- [x] mensagens de erro forem compreensíveis;
- [ ] dados sensíveis não aparecerem em logs;
- [ ] documentação técnica necessária estiver atualizada;
- [ ] revisão de código estiver concluída;
- [ ] funcionalidade estiver validada no ambiente de homologação.

## 14. Ordem recomendada de execução

```text
Validação do instrumento
        ↓
Fundação técnica
        ↓
Autenticação e organizações
        ↓
Pacientes
        ↓
Catálogo e versionamento
        ↓
Motor de regras
        ↓
Avaliações e formulário
        ↓
Resultados e síntese
        ↓
PDF
        ↓
Segurança e privacidade
        ↓
Homologação e lançamento
```

## 15. Pendências antes de iniciar o instrumento real

- [ ] Confirmar se o primeiro instrumento será o ASRS-18.
- [ ] Obter autorização de uso digital do instrumento escolhido.
- [ ] Receber a documentação técnica e os casos de validação.
- [ ] Definir o nome oficial do PDF gerado pelo produto.
- [ ] Definir identidade visual inicial.
- [ ] Definir provedor de hospedagem e região dos dados.
- [ ] Definir política comercial e limites de uso posteriormente, sem bloquear o desenvolvimento do núcleo.
