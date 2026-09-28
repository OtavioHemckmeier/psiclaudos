# Plataforma de Correção Psicológica

Monorepo inicial para a plataforma de apoio à correção de instrumentos psicológicos.

## Estrutura

- `apps/web`: aplicação React.
- `apps/api`: API NestJS.
- `packages/contracts`: tipos e contratos compartilhados.
- `packages/rule-engine`: motor de regras independente.
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
