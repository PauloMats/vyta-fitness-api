# Frontend Brief: Importacao Assistida de Aluno

Use este texto como briefing de implementacao no frontend do VYTA.

## Objetivo

Implementar um fluxo de importacao assistida de aluno via PDF de outra plataforma, em 4 etapas:

1. upload do PDF
2. processamento
3. revisao assistida
4. confirmacao

O fluxo nao deve salvar automaticamente no backend sem revisao manual.

## Contexto

API base:

- `http://localhost:3000/api/v1`

Novo modulo backend:

- `student-imports`

Endpoints esperados:

- `POST /student-imports`
- `GET /student-imports`
- `GET /student-imports/:id`
- `GET /student-imports/:id/preview`
- `PATCH /student-imports/:id/mapping`
- `POST /student-imports/:id/confirm`

Auth:

- apenas `TRAINER` e `ADMIN`

## Pontos de entrada na UI

Adicionar CTA nos seguintes lugares:

- menu de acoes extras: `Importar aluno`
- tela de nova avaliacao:
  - texto sugerido: `Ja tem aluno cadastrado em outra plataforma? Reaproveite as informacoes no VYTA.`
- opcionalmente na area de alunos:
  - botao `Importar PDF`

## Fluxo de 4 etapas

### Etapa 1. Upload

Tela/componente:

- drag and drop
- seletor de arquivo
- aceitar apenas `.pdf`
- mostrar nome do arquivo e tamanho
- botao `Analisar PDF`

Estados:

- idle
- uploading
- upload error

Regras:

- exibir mensagem clara se o arquivo nao for PDF
- exibir mensagem clara se o upload falhar
- permitir reenvio

### Etapa 2. Processamento

Tela/componente:

- stepper ou progress state
- loading com mensagens curtas:
  - `Enviando arquivo`
  - `Extraindo dados`
  - `Interpretando treino e avaliacao`
  - `Preparando revisao`

Comportamento:

- ao sucesso, navegar para a etapa de revisao
- ao erro, mostrar feedback amigavel com opcao de tentar de novo

### Etapa 3. Revisao assistida

Tela principal com abas:

- `Aluno`
- `Avaliacao`
- `Treino`
- `Exercicios`
- `Pendencias`

Cada campo importado deve mostrar:

- valor sugerido
- indicador visual de confianca
- possibilidade de editar

Legenda de confianca:

- alta: verde
- media: amarelo
- baixa: vermelho

Bloco `Aluno`:

- nome
- email
- telefone
- data de nascimento
- peso atual
- altura atual
- peso alvo
- limitacoes

Bloco `Avaliacao`:

- data da avaliacao
- tipo
- vitals
- circunferencias
- dobras
- composicao corporal

Bloco `Treino`:

- titulo do plano
- objetivo
- dias do plano
- exercicios por dia
- sets/reps/rest

Bloco `Exercicios`:

- lista dos exercicios detectados
- mostrar:
  - nome bruto vindo do PDF
  - exercicio sugerido do VYTA
  - confianca
  - status
- permitir remapeamento manual via autocomplete da biblioteca de exercicios

Bloco `Pendencias`:

- lista de warnings e erros de parse
- destacar o que precisa preenchimento manual antes da confirmacao

## Etapa 4. Confirmacao

Tela final deve permitir:

- criar novo aluno
- ou vincular a aluno existente
- criar avaliacao
- criar plano de treino
- definir se a avaliacao entra como `DRAFT` ou `COMPLETED`
- revisar resumo final antes de confirmar

Resumo final esperado:

- campos reconhecidos
- campos pendentes
- exercicios auto-mapeados
- exercicios com revisao manual
- o que sera criado no backend

Botao final:

- `Confirmar importacao`

## Tipagem esperada

Criar tipos alinhados ao contrato do backend.

Exemplo:

```ts
type ImportField<T> = {
  value: T | null;
  confidence: number;
  sourceText?: string;
  sourcePage?: number;
  editable: boolean;
};

type StudentImportPreview = {
  student: Record<string, ImportField<any>>;
  assessment: Record<string, any>;
  workoutPlan: Record<string, any>;
  issues: Array<{
    fieldPath: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    message: string;
  }>;
  summary: {
    recognizedFields: number;
    pendingFields: number;
    autoMatchedExercises: number;
    manualReviewExercises: number;
    unmatchedExercises: number;
  };
};
```

## React Query / estado

Criar query/mutation keys:

- `studentImports.list`
- `studentImports.detail`
- `studentImports.preview`
- `studentImports.create`
- `studentImports.updateMapping`
- `studentImports.confirm`

Regras:

- invalidar listagem ao criar import
- invalidar detalhe/preview ao atualizar mapping
- invalidar alunos, avaliacoes e planos ao confirmar

## UX e feedback

Mostrar claramente:

- o que foi preenchido automatico
- o que precisa revisao
- o que nao foi reconhecido

Evitar:

- salvar automatico sem revisao
- despejar erro cru do backend
- exibir JSON bruto para usuario final

Erros:

- `400`: input invalido
- `403`: sem permissao
- `404`: import nao encontrado
- `409`: conflito na confirmacao
- `422`: PDF nao pode ser interpretado

## Componentes sugeridos

- `StudentImportWizard`
- `StudentImportUploadStep`
- `StudentImportProcessingStep`
- `StudentImportReviewStep`
- `StudentImportConfirmStep`
- `ImportConfidenceBadge`
- `ImportIssueList`
- `ExerciseMatchEditor`

## Requisitos visuais

- manter o padrao visual do projeto
- usar stepper visivel com 4 etapas
- destacar progresso e confianca
- mostrar placeholders bons para campos nao reconhecidos

## Fluxos manuais para testar

1. enviar PDF valido e ir ate a revisao
2. editar campos importados
3. remapear exercicio nao reconhecido
4. confirmar criando aluno novo
5. confirmar vinculando aluno existente
6. testar PDF invalido
7. testar usuario sem permissao

## Entrega esperada

- resumo curto das telas e componentes criados
- arquivos principais alterados
- como testar ponta a ponta com backend local
