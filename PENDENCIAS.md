# Pendências do Projeto

Este arquivo controla somente o que ainda falta para sair do MVP demonstrativo e chegar a uma versão homologada para uso profissional.

## Status rápido

- [x] Stack React + NestJS + MongoDB funcionando.
- [x] Ambiente Docker funcionando.
- [x] Autenticação e isolamento por organização.
- [x] Cadastro de pacientes e avaliações.
- [x] Instrumento demonstrativo centralizado.
- [x] Correção, revisão e bloqueio da aplicação.
- [x] Geração, histórico e download de PDF.
- [x] Auditoria básica.
- [~] MVP demonstrativo local.
- [ ] MVP homologado.
- [ ] Versão pronta para produção.

## Próximas entregas técnicas

- [x] Criar tela de perfil do psicólogo e da organização.
- [x] Criar tela de detalhes completos do paciente.
- [~] Implementar recuperação de senha.
  - Fluxo de token seguro em desenvolvimento; envio transacional depende da definição do provedor de e-mail.
- [x] Implementar renovação de sessão com refresh token.
- [x] Adicionar paginação e filtros para pacientes e avaliações.
  - Busca e filtros também estão disponíveis no painel web.
- [x] Adicionar estados de carregamento, vazio e erro em todas as telas.
- [x] Implementar tratamento global de sessão expirada.
- [x] Criar testes E2E do fluxo: login → paciente → avaliação → PDF.
  - Script Docker exercita o fluxo completo e valida que a prévia retornada é um PDF.
- [x] Criar testes de isolamento entre organizações.
  - O fluxo E2E confirma que uma segunda organização recebe `404` ao acessar o paciente da primeira.
- [x] Criar testes de autorização por papel.
  - O fluxo E2E confirma que um psicólogo não pode publicar instrumentos do catálogo central.

## Relatórios e interface

- [x] Exibir histórico de PDFs no workspace.
- [x] Testar paginação, fontes e quebras de página em documentos longos.
  - O E2E gera uma síntese longa e valida automaticamente que o PDF possui mais de uma página.
- [x] Adicionar visualização prévia do PDF no navegador.
- [x] Renderizar tabelas configuráveis pelo instrumento.
  - O PDF usa `presentationSchema.tables` da versão do instrumento e possui uma tabela de fallback para resultados simples.
- [x] Renderizar gráficos configuráveis pelo instrumento.
  - O PDF usa `presentationSchema.charts` com gráfico de barras; o instrumento demonstrativo contém uma configuração ativa.
- [x] Validar acessibilidade por teclado.
  - Navegação por Tab e atalho para conteúdo principal foram verificados no navegador; controles receberam nomes acessíveis.
- [x] Validar contraste e leitura em telas pequenas.
  - Auditoria Lighthouse mobile atingiu 98/100 em acessibilidade após ajuste de contraste e do layout responsivo.
- [ ] Homologar layout em Chrome, Firefox e Safari.

## Segurança e operação

- [x] Cabeçalhos básicos de segurança.
- [x] Rate limiting básico.
- [x] Verificação de integridade dos PDFs por hash.
- [ ] Configurar TLS no ambiente publicado.
- [x] Usar cookies seguros ou estratégia equivalente para tokens.
  - O refresh token é enviado apenas em cookie `httpOnly`; API não o expõe no JSON e o frontend renova a sessão usando `credentials: include`.
- [~] Configurar backup automático do MongoDB.
  - Script manual com checksum criado em `scripts/backup-mongodb.sh`; falta agendá-lo e enviar o resultado para armazenamento criptografado no ambiente publicado.
- [~] Testar restauração de backup.
  - Script protegido por confirmação criado em `scripts/restore-mongodb.sh`; falta executar e registrar o teste em homologação.
- [ ] Criptografar backups e arquivos armazenados.
- [~] Configurar monitoramento sem dados clínicos sensíveis.
  - Endpoints de vida e prontidão e healthcheck do container estão disponíveis; falta conectar o provedor de monitoramento.
- [~] Configurar alertas operacionais.
  - Critérios e métricas mínimas estão documentados; falta configurar os canais e limites no provedor escolhido.
- [~] Revisar logs para garantir ausência de dados clínicos.
  - Política operacional inicial documentada; falta revisão com os logs reais do ambiente de homologação.

## Privacidade e ciclo de vida

- [~] Definir prazos de retenção por tipo de registro.
  - Modelo de decisão criado em `docs/RETENCAO_DADOS.md`; os prazos dependem de aprovação jurídica e do responsável técnico.
- [x] Implementar solicitação de exportação de dados.
- [x] Implementar fila de eliminação definitiva.
  - Solicitações de encerramento criam uma fila persistida, consultável pelo titular e rastreada em auditoria; a execução continua bloqueada até a definição formal de retenção.
- [ ] Registrar execução e resultado da eliminação.
- [x] Criar fluxo de encerramento da conta.
- [ ] Redigir política de privacidade.
- [ ] Redigir termos de uso.
- [ ] Validar documentos com orientação jurídica.

## Instrumento real

- [ ] Escolher formalmente o primeiro instrumento.
- [ ] Confirmar titularidade e licença de uso.
- [ ] Confirmar autorização para reprodução digital.
- [ ] Confirmar situação e modalidade aplicável no SATEPSI, quando pertinente.
- [ ] Receber manual, regras, tabelas e referências oficiais.
- [ ] Definir os dados que serão preenchidos pelo psicólogo.
- [ ] Criar casos oficiais de entrada e saída.
- [ ] Validar cálculo com profissional habilitado.
- [ ] Revisar textos e avisos do PDF.
- [ ] Publicar a versão real somente após aprovação formal.

## Homologação e lançamento

- [ ] Preparar ambiente de homologação separado.
- [ ] Executar fluxo completo com psicólogo responsável.
- [ ] Registrar problemas encontrados na homologação.
- [ ] Corrigir bloqueadores.
- [ ] Validar backup e restauração.
- [ ] Aprovar critérios de aceite do MVP.
- [ ] Definir provedor e região dos dados.
- [ ] Publicar a primeira versão do MVP.

## Regra de atualização

Ao concluir uma tarefa, trocar `[ ]` por `[x]`. Para tarefas iniciadas, usar `[~]` e adicionar uma observação curta logo abaixo do item.

## Ciclo concluído: operação e qualidade

- [x] 1. Criar endpoint de vida da API (`/api/health/live`).
- [x] 2. Criar endpoint de prontidão com verificação do MongoDB (`/api/health/ready`).
- [x] 3. Configurar healthcheck da API no Docker Compose.
- [x] 4. Criar workflow de CI para build, testes e lint.
- [x] 5. Criar script de backup compactado do MongoDB.
- [x] 6. Gerar checksum SHA-256 para cada backup criado.
- [x] 7. Criar script de restauração com confirmação explícita.
- [x] 8. Documentar o procedimento seguro de backup e restauração.
- [x] 9. Documentar critérios de logs, alertas, TLS e monitoramento sem dados sensíveis.
- [x] 10. Criar modelo para a decisão formal de retenção de dados.
