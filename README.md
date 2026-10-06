# Plataforma de Correção Psicológica

Monorepo inicial para a plataforma de apoio à correção de instrumentos psicológicos.

## Estrutura

- `apps/web`: aplicação React.
- `apps/api`: API NestJS.
- `packages/contracts`: tipos e contratos compartilhados.
- `packages/rule-engine`: motor de regras independente.
- `docs/ARQUITETURA_INSTRUMENTOS.md`: mapa do cadastro, cálculo e exportação dos instrumentos.
- `infra/docker`: serviços locais.
- `PLANO_IMPLEMENTACAO.md`: plano e checklists do projeto.

## Requisitos

- Node.js 20.20 ou superior.
- npm 10 ou superior.
- Docker e Docker Compose.

## Execução completa com Docker

```bash
cp .env.example .env
docker compose --env-file .env -f infra/docker/docker-compose.yml up --build
```

Abra `http://localhost:8080`. O Nginx encaminha `/api` para a API; o MongoDB fica disponível na porta `27017` para desenvolvimento local.

Se a porta `8080` já estiver ocupada:

```bash
WEB_PORT=8081 docker compose --env-file .env -f infra/docker/docker-compose.yml up --build -d
```

Nesse caso, abra `http://localhost:8081`.

Na primeira execução, crie o usuário inicial pela API:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"organizationName":"Minha clínica","name":"Seu nome","email":"voce@exemplo.com","password":"troque-esta-senha"}'
```

O Compose local usa MongoDB sem autenticação externa e replica set para simplificar o desenvolvimento. Antes de publicar, configure autenticação interna, secrets gerenciados e uma política de backup adequada.

Para executar em segundo plano:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml up --build -d
```

Para acompanhar os logs:

```bash
docker compose -f infra/docker/docker-compose.yml logs -f api web mongodb
```

Para parar os containers, preservando os dados:

```bash
docker compose -f infra/docker/docker-compose.yml down
```

Para parar e remover também os volumes locais:

```bash
docker compose -f infra/docker/docker-compose.yml down -v
```

## Desenvolvimento em containers com atualização automática

```bash
cp -n .env.example .env
```

Execute os comandos abaixo nesta ordem. Mantenha API e web em terminais separados:

```bash
npm run dev:infra
```

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Acesse `http://localhost:5173`. `dev:infra` inicia o MongoDB e espera o replica set ficar pronto. `dev:api` prepara o schema, preenche datas ausentes de avaliações antigas e inicia a API em `http://localhost:3000`; `dev:web` inicia o Vite com `/api` encaminhado para o container da API. Os arquivos do repositório são montados nos containers: ao editar o web, o navegador atualiza automaticamente; ao editar a API, o TypeScript recompila e o Node reinicia. Não é necessário reconstruir as imagens para alterações no código.

Ao mudar dependências, rode `docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.dev.yml run --rm --no-deps api-dev npm ci` e o mesmo comando com `web-dev` no lugar de `api-dev`. Depois reinicie os containers de desenvolvimento.

Para parar os containers de desenvolvimento, pressione `Ctrl+C` nos terminais da API e do web. Para parar o MongoDB, use `docker compose -f infra/docker/docker-compose.yml stop mongodb`.

Se preferir executar API e web diretamente na máquina, rode `npm install`, depois `npm run dev:infra`, `npm run dev:api:local` e `npm run dev:web:local`.

O instrumento incluído nesta etapa é apenas demonstrativo e não contém conteúdo clínico protegido.

## Exportação para Google Docs

No Google Cloud Console, crie um cliente OAuth 2.0 do tipo **Aplicação Web**, habilite as APIs Google Docs e Google Drive e cadastre a URL de redirecionamento da API. Em seguida, configure no `.env`:

```bash
GOOGLE_OAUTH_CLIENT_ID=seu-client-id
GOOGLE_OAUTH_CLIENT_SECRET=seu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://seu-dominio/api/reports/google-docs/callback
```

Ao escolher **Google Docs** no menu de exportação, o profissional autoriza sua conta Google e recebe um documento editável com o conteúdo, as tabelas de resultados e gráficos em PNG. Cada gráfico apresenta legenda, escala, resultado observado e faixa esperada; a imagem é enviada temporariamente ao Drive e excluída após sua inserção no documento.

## Release e imagens Docker

```bash
npm run release
```

O comando roda a partir do `master` atualizado e com a árvore limpa. Ele usa o `standard-version` para calcular a versão pelos commits (`feat` → minor, `fix` → patch), atualizar o `CHANGELOG.md`, criar o commit `chore(release)` e a tag `vX.Y.Z`, e enviar branch e tag para o GitHub.

Cada push no `master`, push de tag `v*` ou execução manual dispara [`.github/workflows/docker-publish.yml`](./.github/workflows/docker-publish.yml). Após build, testes e checagem de tipos, ele publica no GitHub Container Registry:

- `ghcr.io/otaviohemckmeier/psiclaudos-api:vX.Y.Z` e `:latest`
- `ghcr.io/otaviohemckmeier/psiclaudos-web:vX.Y.Z` e `:latest`

Cada imagem também recebe a tag `sha-<commit completo>`. No push de branch, essa é a versão usada para o deploy; tags de release continuam disponíveis como `vX.Y.Z`.

Opções úteis: `npm run release -- --dry-run` (só mostra o que faria), `--release-as minor|major|1.0.0` e `--first-release` (cria a tag da versão atual sem incrementar). O workflow também pode ser executado manualmente em **Actions → Docker Publish**.

Após publicar as duas imagens, o workflow faz deploy automático nesta VPS pelo runner self-hosted com labels `linux`, `x64`, `deploy` e `psiclaudos`. O runner precisa estar registrado no repositório e ter acesso ao Docker Swarm manager. Ele atualiza `psiclaudos_api` e `psiclaudos_web` usando o digest das imagens daquele commit, preservando secrets, volumes, redes e regras do Traefik configurados na stack existente. Os deploys são serializados, esperam a convergência dos serviços e verificam o web e a saúde da API pelos dois domínios através do Traefik. Falhas de atualização acionam rollback do serviço afetado e são reportadas pelo pipeline.

Endereços de produção:

- Web: https://psiclaudos.hemck.com.br
- API: https://psiclaudos-api.hemck.com.br/api

O banco e os PDFs persistem entre deploys. Como a API aplica `prisma db push` ao iniciar, mudanças de schema precisam ser compatíveis com rollback da imagem; o rollback não desfaz mudanças de banco.

Para baixar imagens manualmente no servidor:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <usuario> --password-stdin   # token com read:packages
docker pull ghcr.io/otaviohemckmeier/psiclaudos-api:vX.Y.Z
docker pull ghcr.io/otaviohemckmeier/psiclaudos-web:vX.Y.Z
```

Requisitos de execução das imagens:

- **API** (porta 3000): `DATABASE_URL` (MongoDB com replica set), `NODE_ENV=production`, `JWT_SECRET` e `JWT_REFRESH_SECRET` fortes, `WEB_ORIGIN` e, se usar Google Docs, as variáveis `GOOGLE_OAUTH_*`. Ao iniciar, ela aplica `prisma db push` e o backfill. Monte um volume persistente em `/app/storage` (PDFs dos laudos).
- **Web** (porta 80): nginx com o front e proxy de `/api/` para a API. O endereço interno da API vem de `API_UPSTREAM` (padrão `http://api:3000`); o nome precisa resolver na rede do container quando o nginx sobe.
