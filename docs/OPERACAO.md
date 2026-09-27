# Operação local e publicada

## Endpoints de saúde

- `GET /api/health/live`: confirma que o processo da API está ativo.
- `GET /api/health/ready`: confirma que a API consegue comunicar com o MongoDB.

O Docker usa o endpoint de prontidão para verificar o container da API. Monitore apenas código HTTP, disponibilidade, tempo de resposta e uso de recursos. Não envie documentos, respostas de instrumentos, nomes de pacientes, tokens ou corpos de requisição ao serviço de monitoramento.

## Avaliações anteriores ao campo `updatedAt`

Ao iniciar a API, a rotina `db:backfill:evaluations` preenche `updatedAt` das avaliações antigas que não possuem esse campo, copiando o `createdAt` original. Ela não altera avaliações já atualizadas e pode ser executada novamente com `npm --workspace apps/api run db:backfill:evaluations`. Faça backup antes de aplicar a migração em um banco já existente.

## Backup do MongoDB

Com os containers em execução, crie um backup com:

```bash
./scripts/backup-mongodb.sh
```

O arquivo compactado e seu checksum SHA-256 são criados em `backups/` (ou no diretório definido por `BACKUP_DIR`). Esse diretório contém dados sensíveis: mantenha-o fora do repositório, em armazenamento criptografado e com acesso restrito.

Para automatizar no ambiente publicado, execute esse script em agendador gerenciado ou `cron`, envie o arquivo para um cofre criptografado e configure retenção de acordo com a decisão jurídica. A automação e a criptografia do destino ainda são responsabilidades da infraestrutura de publicação.

## Restauração controlada

Teste primeiro em homologação, nunca no banco publicado. O comando abaixo confere o checksum quando ele estiver disponível e substitui os dados do banco `laudo`:

```bash
./scripts/restore-mongodb.sh --confirm backups/laudo-AAAAMMDDTHHMMSSZ.archive.gz
```

Após restaurar, valide login, paciente, avaliação e visualização de PDF. Registre data, responsável, origem do backup e resultado do teste sem incluir dados clínicos.

## Teste E2E

Com o ambiente Docker iniciado, execute o fluxo automatizado de autenticação, paciente, avaliação, PDF, isolamento entre organizações e autorização por papel:

```bash
API_BASE=http://localhost:8081/api ./scripts/test-e2e.sh
```

O script cria exclusivamente dados técnicos descartáveis, identificados como teste E2E. Ele também é executado pelo workflow de CI, inclui uma síntese longa e confirma que o PDF possui mais de uma página.

## Logs, alertas e TLS

- Configure TLS no proxy ou balanceador antes de expor o sistema publicamente.
- Mantenha logs estruturados apenas com metadados técnicos e identificadores mínimos; não registre senhas, tokens, respostas, documentos ou conteúdo de PDFs.
- Crie alertas para indisponibilidade do endpoint de prontidão, erros 5xx, uso de disco, falha de backup e validade do certificado TLS.
- Restrinja o acesso aos logs e revise periodicamente permissões e retenção.
