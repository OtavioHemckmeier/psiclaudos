# Migração do cadastro de pacientes

Os campos novos do paciente são opcionais no MongoDB. A aplicação do schema com `prisma db push` é aditiva: nenhum registro existente é removido ou regravado.

## Preservação dos registros atuais

- O campo legado `metadata` permanece intacto em todos os pacientes.
- Os novos campos tipados (`phone`, `email`, `education`, endereço, responsáveis e anotações) permanecem vazios até serem preenchidos ou migrados.
- O CPF continua normalizado somente com dígitos; a checagem de duplicidade permanece restrita à organização ativa.

## Migração assistida recomendada

1. Fazer backup validado do MongoDB.
2. Executar `npm --workspace apps/api run db:push` com `DATABASE_URL` configurada.
3. Identificar chaves conhecidas em `metadata` antes de copiá-las para os campos tipados.
4. Executar a cópia somente em ambiente de homologação e validar uma amostra com o responsável clínico.
5. Registrar a execução, a versão do script e a quantidade de registros alterados em auditoria operacional.

Não eliminar `metadata` durante a primeira migração. A remoção só deve ser considerada após validar os dados convertidos e definir retenção formal.
