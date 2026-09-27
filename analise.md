# Sistema de Avaliações e Laudos Psicológicos

## 1. Visão geral

Desenvolver uma plataforma para psicólogos realizarem avaliações, aplicarem instrumentos/questionários, calcularem resultados conforme regras previamente configuradas e gerarem documentos psicológicos a partir dessas informações.

O sistema deve funcionar como uma ferramenta de apoio ao profissional.

O sistema:

- coleta e organiza informações;
- disponibiliza formulários;
- executa regras matemáticas e lógicas previamente configuradas;
- apresenta resultados estruturados;
- permite que o psicólogo escreva sua interpretação;
- monta o documento final;
- permite exportação para DOCX/PDF.

O sistema **não deve emitir diagnóstico automaticamente**.

A interpretação clínica, conclusão, revisão e assinatura do documento são responsabilidade do profissional.

---

# 2. Conceito central

A arquitetura deve separar três elementos:

**Paciente → Avaliação/Laudo → Instrumentos**

Exemplo:

Paciente:
João da Silva

Avaliação:
Avaliação psicológica realizada em setembro/2026

Instrumentos utilizados:

- ASRS-18
- outro instrumento
- entrevista
- anamnese
- observação clínica

O **laudo não deve ser o responsável pelos cálculos dos instrumentos**.

Cada instrumento deve possuir sua própria configuração de:

- formulário;
- campos;
- respostas;
- regras;
- cálculos;
- classificações;
- resultados;
- visualizações.

O laudo apenas consome esses resultados.

---

# 3. Princípio de arquitetura

Um instrumento deve ser tratado como uma configuração declarativa.

Não criar lógica semelhante a:

```javascript
if (teste === 'ASRS18') {
   // cálculo específico
}
```

O desejável é:

```text
Instrumento
 ├── versão
 ├── formulário
 ├── campos
 ├── opções
 ├── regras
 ├── cálculos
 ├── resultados
 └── configuração de apresentação
```

Dessa maneira novos instrumentos poderão ser cadastrados sem necessidade de desenvolver todo o sistema novamente.

---

# 4. Cadastro de paciente

O sistema deverá possuir cadastro de pacientes.

Dados possíveis:

- nome completo;
- CPF;
- data de nascimento;
- sexo/gênero, quando necessário para determinado instrumento;
- telefone;
- e-mail;
- profissão;
- escolaridade;
- observações;
- dados adicionais configuráveis.

Os dados devem possuir controle de acesso e trilha de auditoria.

---

# 5. Avaliação

Uma avaliação representa um processo realizado pelo profissional.

Exemplo:

```text
Avaliação
Paciente: João da Silva
Profissional: Dra. Maria
Data de início: 10/09/2026
Status: Em andamento
```

Possíveis status:

```text
RASCUNHO
EM_ANDAMENTO
AGUARDANDO_REVISAO
FINALIZADO
CANCELADO
```

A avaliação poderá possuir diversos instrumentos.

Exemplo:

```text
Avaliação 123

├── ASRS-18
├── Instrumento XYZ
├── Anamnese
└── Entrevista
```

---

# 6. Instrumentos

Um instrumento representa um teste, escala, questionário ou formulário utilizado dentro da avaliação.

Estrutura conceitual:

```json
{
  "id": "asrs18",
  "nome": "ASRS-18",
  "tipo": "QUESTIONARIO",
  "versao": "1.0",
  "status": "ATIVO"
}
```

Cada instrumento deverá possuir obrigatoriamente uma versão.

---

# 7. Versionamento dos instrumentos

Esta é uma regra crítica.

Depois que uma versão de determinado instrumento começar a ser utilizada em uma avaliação, sua configuração não poderá ser alterada retroativamente.

Exemplo:

```text
ASRS-18
v1.0
v1.1
v2.0
```

Uma avaliação realizada utilizando v1.0 sempre deverá manter:

- formulário v1.0;
- respostas;
- regras v1.0;
- cálculos v1.0;
- classificações v1.0.

Mesmo que posteriormente o administrador publique uma v2.0.

Portanto:

```text
InstrumentDefinition
InstrumentVersion
```

devem ser entidades separadas.

A versão utilizada deverá ficar congelada na avaliação.

---

# 8. Fonte das regras

Cada instrumento poderá possuir informações sobre a origem das regras utilizadas.

Exemplo:

```json
{
  "source": "Manual do instrumento",
  "version": "2026",
  "notes": "Configuração baseada na documentação autorizada"
}
```

O objetivo é permitir auditoria sobre de onde vieram:

- perguntas;
- pesos;
- tabelas;
- pontos de corte;
- fórmulas;
- classificações.

O sistema não deve inventar regras clínicas.

As regras deverão ser cadastradas com base na documentação válida/licenciada do instrumento.

---

# 9. Formulário configurável

Cada versão do instrumento possui um formulário.

Exemplo:

```text
ASRS-18

Parte A
1. Pergunta...
2. Pergunta...
3. Pergunta...

Parte B
7. Pergunta...
8. Pergunta...
...
```

Cada campo poderá possuir:

```json
{
  "id": "q1",
  "type": "single_choice",
  "label": "Pergunta 1",
  "required": true
}
```

Tipos inicialmente suportados:

```text
TEXT
TEXTAREA
NUMBER
DATE
BOOLEAN
SINGLE_CHOICE
MULTIPLE_CHOICE
SCALE
```

Posteriormente poderão existir outros.

---

# 10. Opções de resposta

Cada pergunta poderá possuir opções.

Exemplo conceitual:

```json
{
  "field": "q1",
  "options": [
    {
      "value": "never",
      "label": "Nunca"
    },
    {
      "value": "rarely",
      "label": "Raramente"
    },
    {
      "value": "sometimes",
      "label": "Às vezes"
    },
    {
      "value": "often",
      "label": "Frequentemente"
    }
  ]
}
```

IMPORTANTE:

O texto acima serve apenas como exemplo estrutural.

Os valores e regras reais de instrumentos devem ser cadastrados conforme sua documentação oficial/autorizada.

---

# 11. Motor de regras

O coração do sistema deverá ser um motor genérico de regras.

Uma resposta passa por uma sequência de regras até produzir um resultado.

Fluxo:

```text
Respostas brutas
      ↓
Pontuação dos itens
      ↓
Agregações
      ↓
Cálculos
      ↓
Classificações
      ↓
Resultado estruturado
```

---

# 12. Tipos de regra

O motor deve suportar inicialmente os seguintes operadores.

## SCORE_ITEM

Transforma determinada resposta em valor/pontuação.

Exemplo conceitual:

```json
{
  "type": "SCORE_ITEM",
  "field": "q1",
  "mapping": {
    "A": 0,
    "B": 0,
    "C": 1,
    "D": 1
  },
  "output": "q1_score"
}
```

Resultado:

```text
q1_score = 1
```

---

## SUM

Soma vários valores.

```json
{
  "type": "SUM",
  "inputs": [
    "q1_score",
    "q2_score",
    "q3_score"
  ],
  "output": "parte_a_total"
}
```

---

## COUNT

Conta quantos elementos atendem determinada condição.

Exemplo:

```json
{
  "type": "COUNT",
  "inputs": [
    "q1_score",
    "q2_score",
    "q3_score"
  ],
  "condition": {
    "operator": ">=",
    "value": 1
  },
  "output": "parte_a_count"
}
```

---

## FORMULA

Permite fórmulas matemáticas.

Exemplo:

```json
{
  "type": "FORMULA",
  "expression": "(score_total / score_max) * 100",
  "output": "percentage"
}
```

As fórmulas não devem permitir execução arbitrária de código.

Criar uma DSL ou parser matemático controlado.

---

## RANGE

Transforma um valor em uma classificação.

Exemplo:

```json
{
  "type": "RANGE",
  "input": "score_total",
  "ranges": [
    {
      "min": 0,
      "max": 10,
      "result": "FAIXA_A"
    },
    {
      "min": 11,
      "max": 20,
      "result": "FAIXA_B"
    }
  ],
  "output": "classification"
}
```

---

## LOOKUP_TABLE

Permite consultar tabelas normativas.

Exemplo:

```text
Entrada:

pontuação = 35
idade = 29
sexo = X

↓

Tabela normativa

↓

Percentil = ...
Classificação = ...
```

Configuração conceitual:

```json
{
  "type": "LOOKUP_TABLE",
  "table": "normative_table_01",
  "inputs": {
    "score": "total_score",
    "age": "patient.age"
  },
  "output": "normative_result"
}
```

---

## CONDITIONAL

Executa lógica condicional.

```json
{
  "type": "CONDITIONAL",
  "condition": {
    "field": "score",
    "operator": ">=",
    "value": 10
  },
  "then": "result_a",
  "else": "result_b",
  "output": "result"
}
```

---

# 13. Pipeline de regras

As regras devem possuir ordem explícita de execução.

Exemplo:

```text
1 SCORE_ITEM q1 → q1_score
2 SCORE_ITEM q2 → q2_score
3 SCORE_ITEM q3 → q3_score

4 SUM q1_score + q2_score + q3_score
      ↓
  total_score

5 RANGE total_score
      ↓
  classification
```

Tecnicamente:

```json
[
  {
    "order": 1,
    "type": "SCORE_ITEM"
  },
  {
    "order": 2,
    "type": "SUM"
  },
  {
    "order": 3,
    "type": "RANGE"
  }
]
```

---

# 14. Dependências entre regras

Uma regra poderá consumir o resultado de outra.

Exemplo:

```text
Q1
 ↓
q1_score ─┐
          │
Q2        ├── SUM → total_score
 ↓        │
q2_score ─┘
                ↓
              RANGE
                ↓
        classification
```

O sistema deverá validar dependências antes de publicar a versão do instrumento.

Deve impedir:

- referência para variável inexistente;
- dependência circular;
- duplicidade de output;
- regra sem entrada obrigatória.

---

# 15. Resultado estruturado

Após executar todas as regras, o sistema deverá salvar um objeto estruturado.

Não salvar somente texto.

Exemplo:

```json
{
  "instrument": "ASRS-18",
  "version": "1.0",
  "domains": {
    "part_a": {
      "score": 2,
      "classification": "Dentro do esperado"
    },
    "part_b": {
      "score": 0,
      "classification": "Dentro do esperado"
    }
  }
}
```

No exemplo de documento discutido anteriormente, o ASRS-18 possuía resultados separados entre Parte A e Parte B. Essa estrutura deve poder ser reproduzida de maneira configurável.

---

# 16. Snapshot do resultado

Quando determinada aplicação do instrumento for concluída, salvar:

```text
instrumentVersion
answers
ruleVersion
calculatedResult
calculatedAt
```

O resultado não deve ser recalculado automaticamente no futuro utilizando novas regras.

Caso seja necessário recalcular:

```text
Reprocessar resultado
```

deve ser uma operação explícita e auditada.

---

# 17. Execução do instrumento

Fluxo:

```text
Psicólogo seleciona paciente
          ↓
Cria avaliação
          ↓
Adiciona instrumento
          ↓
Sistema carrega versão publicada
          ↓
Profissional responde/preenche formulário
          ↓
Salva respostas
          ↓
Finaliza instrumento
          ↓
Motor executa regras
          ↓
Resultado estruturado
```

---

# 18. Estados da aplicação do instrumento

Sugestão:

```text
NOT_STARTED
IN_PROGRESS
CALCULATED
REVIEWED
LOCKED
```

Depois de `LOCKED`, respostas não poderão ser alteradas sem ação explícita de reabertura.

Toda reabertura deve gerar auditoria.

---

# 19. Separação entre cálculo e interpretação

Este conceito é fundamental.

O sistema possui:

```text
RESULTADO OBJETIVO
```

e:

```text
INTERPRETAÇÃO PROFISSIONAL
```

como informações distintas.

Exemplo:

```text
Resultado calculado:

Parte A
Pontuação: 2
Classificação: Dentro do esperado

Parte B
Pontuação: 0
Classificação: Dentro do esperado
```

Depois haverá um campo separado:

```text
Interpretação do profissional:

[textarea]
```

O sistema não deverá transformar automaticamente a classificação de determinado instrumento em diagnóstico.

---

# 20. Observações e conclusão

A avaliação poderá possuir campos profissionais editáveis.

Exemplo:

```text
Descrição da demanda

Procedimentos

Análise

Interpretação dos resultados

Conclusão

Encaminhamentos

Observações finais
```

Esses campos são preenchidos pelo profissional.

Eles não são resultados matemáticos do motor.

---

# 21. Templates de documento

O sistema deverá possuir templates configuráveis para gerar o documento final.

Exemplo de estrutura:

```text
IDENTIFICAÇÃO

{{patient.name}}
{{patient.birthDate}}

DEMANDA

{{evaluation.demand}}

PROCEDIMENTOS

{{evaluation.procedures}}

RESULTADOS

{{instrument.asrs18.results}}

INTERPRETAÇÃO DOS RESULTADOS

{{evaluation.interpretation}}

CONCLUSÃO

{{evaluation.conclusion}}
```

---

# 22. DocumentModel

Não gerar DOCX diretamente a partir das entidades do banco.

Criar primeiro um modelo intermediário.

Exemplo:

```json
{
  "patient": {},
  "professional": {},
  "evaluation": {},
  "instruments": [],
  "sections": []
}
```

Fluxo:

```text
Banco de dados
      ↓
DocumentModel
      ↓
Template
      ↓
DOCX
      ↓
PDF
```

Isso desacopla o sistema de geração de arquivos.

---

# 23. Blocos dinâmicos

O template poderá possuir componentes como:

```text
TEXT
TABLE
RESULT_TABLE
IMAGE
CHART
PAGE_BREAK
SIGNATURE
```

Exemplo:

```json
{
  "type": "RESULT_TABLE",
  "instrument": "asrs18",
  "columns": [
    "domain",
    "score",
    "classification"
  ]
}
```

---

# 24. Gráficos

Alguns instrumentos poderão gerar gráficos.

O gráfico deverá consumir exclusivamente o resultado estruturado.

Exemplo:

```text
Resultado estruturado
      ↓
ChartConfig
      ↓
Imagem
      ↓
Documento
```

Nunca fazer o gerador de documentos recalcular o instrumento.

---

# 25. Geração do documento

O processo deve ser:

```text
Avaliação
      ↓
Buscar paciente
      ↓
Buscar profissional
      ↓
Buscar instrumentos
      ↓
Buscar snapshots dos resultados
      ↓
Buscar textos profissionais
      ↓
Montar DocumentModel
      ↓
Aplicar template
      ↓
Gerar DOCX
      ↓
Opcionalmente gerar PDF
```

---

# 26. Revisão antes da emissão

Antes de emitir a versão final:

```text
[ ] Revisei os dados do paciente

[ ] Revisei os instrumentos utilizados

[ ] Revisei os resultados apresentados

[ ] Revisei interpretação e conclusão

[ ] Confirmo a emissão deste documento
```

Somente após confirmação o documento poderá ser marcado como final.

---

# 27. Documento final imutável

Quando finalizado:

```text
Documento Final
revision: 1
generatedAt: ...
generatedBy: ...
hash: ...
```

O arquivo emitido deve ficar armazenado.

Caso alguma alteração seja necessária posteriormente:

```text
Revisão 2
```

e não simplesmente sobrescrever a versão anterior.

---

# 28. Auditoria

Registrar ações importantes.

Exemplos:

```text
PATIENT_CREATED
PATIENT_UPDATED

EVALUATION_CREATED

INSTRUMENT_STARTED
ANSWER_UPDATED
INSTRUMENT_CALCULATED
INSTRUMENT_REOPENED

DOCUMENT_GENERATED
DOCUMENT_FINALIZED
DOCUMENT_DOWNLOADED
```

Registrar:

```text
userId
timestamp
event
entity
entityId
metadata
```

---

# 29. Administração dos instrumentos

Deverá existir uma área administrativa para configurar instrumentos.

Exemplo:

```text
Instrumentos

ASRS-18
 ├── Versão 1.0
 │    ├── Formulário
 │    ├── Regras
 │    ├── Resultados
 │    └── Preview
 │
 └── Versão 2.0
```

---

# 30. Ciclo de vida de uma versão

Uma versão poderá ter:

```text
DRAFT
PUBLISHED
ARCHIVED
```

### DRAFT

Pode ser alterada livremente.

### PUBLISHED

Não pode mais ter suas regras alteradas.

Para mudar algo:

```text
Criar nova versão
```

### ARCHIVED

Não poderá ser utilizada em novas avaliações, mas avaliações antigas continuam tendo acesso.

---

# 31. Testes das regras

Antes de publicar um instrumento deverá existir uma área de simulação.

Exemplo:

```text
Entrada:

Q1 = ...
Q2 = ...
Q3 = ...

Executar
```

Sistema mostra:

```text
q1_score = X
q2_score = X

part_a_score = X

classification = X
```

Isso é extremamente importante para validar instrumentos antes de colocá-los em produção.

---

# 32. Explicabilidade do cálculo

O sistema deverá conseguir apresentar ao profissional como determinado resultado foi obtido.

Exemplo:

```text
Parte A = 4

Composição:

Q1 → 1
Q2 → 1
Q3 → 0
Q4 → 1
Q5 → 1

Total = 4
```

Esse detalhamento pode não aparecer no laudo, mas deverá estar disponível internamente.

---

# 33. Engine independente

Idealmente desenvolver:

```text
RuleEngine
```

com uma interface semelhante a:

```typescript
RuleEngine.execute({
    instrumentVersion,
    answers,
    patientContext
})
```

Retornando:

```typescript
{
    outputs,
    trace,
    errors,
    warnings
}
```

---

# 34. Trace das regras

Além do resultado, armazenar opcionalmente o trace.

Exemplo:

```json
[
  {
    "rule": "score_q1",
    "input": "frequentemente",
    "output": 1
  },
  {
    "rule": "sum_part_a",
    "inputs": [1, 0, 1, 0, 0, 0],
    "output": 2
  }
]
```

Isso facilita:

- auditoria;
- identificação de erros;
- suporte;
- validação de instrumentos.

---

# 35. Regra customizada

A maior parte dos instrumentos deve funcionar usando operadores genéricos.

Porém deve existir possibilidade futura de uma regra especial.

Exemplo:

```text
CUSTOM_RULE
```

Essa regra deve apontar para implementação controlada pelo backend.

Exemplo:

```json
{
  "type": "CUSTOM_RULE",
  "handler": "instrument_xyz_special_calculation"
}
```

Essa opção deve ser exceção.

A prioridade sempre deve ser utilizar o motor declarativo.

---

# 36. Estrutura sugerida das principais entidades

## Patient

```text
_id
organizationId
name
document
birthDate
metadata
createdAt
updatedAt
```

## Evaluation

```text
_id
organizationId
patientId
professionalId
status
demand
procedures
analysis
interpretation
conclusion
referrals
createdAt
finalizedAt
```

## InstrumentDefinition

```text
_id
code
name
description
```

## InstrumentVersion

```text
_id
instrumentId
version
status
source
formSchema
rules
outputSchema
createdAt
publishedAt
```

## InstrumentApplication

```text
_id
evaluationId
instrumentVersionId
status
answers
result
ruleTrace
startedAt
calculatedAt
reviewedAt
lockedAt
```

## DocumentTemplate

```text
_id
name
version
template
status
```

## GeneratedDocument

```text
_id
evaluationId
templateId
revision
file
hash
generatedAt
generatedBy
```

---

# 37. Multiempresa / SaaS

A plataforma deverá ser preparada para SaaS.

Toda entidade pertencente a uma clínica/profissional deverá possuir:

```text
organizationId
```

Não permitir que usuários de organizações diferentes acessem os mesmos pacientes ou avaliações.

---

# 38. Perfis de acesso

Sugestão inicial:

```text
ADMIN_PLATFORM
ADMIN_ORGANIZATION
PSYCHOLOGIST
ASSISTANT
```

O profissional responsável pela avaliação deverá ser claramente registrado.

---

# 39. Segurança e privacidade

Por se tratar de informações sensíveis, prever:

- autenticação;
- autorização por organização;
- controle de acesso;
- auditoria;
- criptografia em trânsito;
- proteção de arquivos;
- backup;
- política de retenção;
- controle de download;
- logs sem exposição indevida de informações clínicas.

Evitar registrar respostas e informações sensíveis em logs técnicos comuns.

---

# 40. Regra de responsabilidade profissional

O produto deverá deixar clara a separação:

### O sistema faz

- armazenamento;
- coleta;
- aplicação de regras configuradas;
- cálculos;
- organização;
- apresentação;
- geração documental.

### O profissional faz

- escolha dos instrumentos;
- análise;
- interpretação;
- avaliação clínica;
- conclusão;
- diagnóstico, quando aplicável;
- encaminhamento;
- revisão;
- assinatura.

Portanto uma classificação calculada pelo sistema não deve automaticamente gerar frases conclusivas como:

```text
"O paciente possui..."
```

---

# 41. Inteligência Artificial

IA poderá ser adicionada posteriormente como ferramenta auxiliar.

Por exemplo:

```text
Sugestão de organização do texto
Resumo das informações coletadas
Correção textual
Sugestão de redação
```

Mas o conteúdo deve aparecer como sugestão editável.

Nunca:

```text
IA → diagnóstico → laudo automaticamente finalizado
```

Fluxo correto:

```text
IA
 ↓
Sugestão
 ↓
Profissional revisa
 ↓
Profissional modifica/aceita
 ↓
Documento
```

---

# 42. ASRS-18 como primeiro instrumento

Utilizar o ASRS-18 inicialmente como prova de conceito da arquitetura.

A configuração deverá demonstrar:

```text
Instrumento
    ↓
Formulário

Parte A
Parte B

    ↓

Respostas

    ↓

SCORE_ITEM / COUNT / SUM

    ↓

Resultados Parte A
Resultados Parte B

    ↓

Classificações

    ↓

Resultado estruturado

    ↓

Tabela do documento
```

IMPORTANTE:

Não criar valores, pontos de corte ou regras clínicas fictícias.

Todas as regras reais deverão ser parametrizadas posteriormente com base na documentação válida do instrumento.

O exemplo serve para validar a arquitetura.

---

# 43. Tela da avaliação

Sugestão:

```text
Paciente: João da Silva
Avaliação: Avaliação Neuropsicológica

-------------------------------------------------

Dados Gerais

Instrumentos

[✓] ASRS-18
    Resultado disponível
    [Ver respostas]
    [Ver resultado]

[ ] Instrumento XYZ
    Em andamento

-------------------------------------------------

Interpretação

[ textarea ]

Conclusão

[ textarea ]

-------------------------------------------------

[Visualizar documento]

[Finalizar avaliação]
```

---

# 44. Tela do instrumento

```text
ASRS-18
Versão 1.0

Parte A

Pergunta 1
( ) ...
( ) ...
( ) ...

Pergunta 2
...

Parte B
...

[Salvar]

[Calcular resultado]
```

Depois:

```text
RESULTADO

Parte A

Pontuação: X
Classificação: Y

Parte B

Pontuação: X
Classificação: Y

[Ver cálculo detalhado]

[Confirmar revisão]
```

---

# 45. Tela administrativa de configuração

A configuração poderá utilizar abas:

```text
Informações

Formulário

Regras

Resultados

Template de apresentação

Testes

Versões
```

Na aba regras:

```text
1. SCORE_ITEM
q1 → q1_score

2. SCORE_ITEM
q2 → q2_score

3. SUM
q1_score + q2_score → part_a_score

4. RANGE
part_a_score → part_a_classification
```

---

# 46. Validações na publicação

Não permitir publicar versão contendo:

- campo referenciado inexistente;
- regra inválida;
- output duplicado;
- dependência circular;
- tabela normativa inexistente;
- variável obrigatória sem origem;
- template referenciando resultado inexistente.

Executar uma validação completa antes de publicar.

---

# 47. Objetivo arquitetural

O principal objetivo da implementação deve ser permitir que futuramente seja possível cadastrar:

```text
Instrumento A
Instrumento B
Instrumento C
Instrumento D
```

sem alterar a estrutura central do sistema.

A diferença entre instrumentos deverá estar principalmente em:

```text
formSchema
rules
tables
outputs
presentation
```

e não em código específico espalhado pela aplicação.

---

# 48. Primeiro MVP

O primeiro MVP pode conter:

1. Autenticação.

2. Cadastro de profissionais.

3. Cadastro de pacientes.

4. Avaliações.

5. Cadastro administrativo de instrumento.

6. Versionamento do instrumento.

7. Formulário dinâmico.

8. Motor de regras com:

```text
SCORE_ITEM
SUM
COUNT
RANGE
CONDITIONAL
FORMULA
```

9. Resultado estruturado.

10. Aplicação do ASRS-18 como primeiro caso de teste.

11. Campos de interpretação/conclusão.

12. Template de documento.

13. Geração DOCX.

14. Conversão/exportação PDF.

15. Finalização/revisão.

16. Auditoria básica.

---

# 49. Não implementar no primeiro momento

Evitar aumentar o escopo inicialmente com:

- prontuário médico completo;
- agenda;
- financeiro;
- teleconsulta;
- marketplace;
- diagnóstico por IA;
- dezenas de instrumentos simultaneamente;
- editor extremamente complexo de documentos.

Primeiro validar o fluxo:

```text
Paciente
  ↓
Avaliação
  ↓
Instrumento
  ↓
Formulário
  ↓
Motor de regras
  ↓
Resultado
  ↓
Interpretação profissional
  ↓
Laudo
  ↓
DOCX/PDF
```

---

# 50. Critério principal de sucesso

Considere a arquitetura correta quando um novo instrumento puder ser criado predominantemente assim:

```text
Cadastrar instrumento
        ↓
Cadastrar versão
        ↓
Criar formulário
        ↓
Criar regras
        ↓
Definir resultados
        ↓
Testar
        ↓
Publicar
```

sem precisar criar uma nova tela e uma nova rotina de cálculo específica para cada instrumento.

A regra central do projeto é:

**o formulário coleta os dados, o motor de regras calcula, o resultado estruturado armazena o resultado, o psicólogo interpreta e o gerador de documentos apenas apresenta essas informações.**