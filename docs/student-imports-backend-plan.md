# Student Imports

## Objetivo

Adicionar um fluxo de importacao assistida de aluno a partir de PDF gerado por outra plataforma, sem gravacao definitiva imediata. O backend deve:

- receber um PDF
- extrair texto e metadados
- identificar a plataforma/origem quando possivel
- gerar um draft estruturado
- informar o que foi preenchido, o que ficou pendente e o que exige revisao
- permitir confirmacao transacional posterior para criar aluno, avaliacao e plano

O fluxo deve ser seguro, auditavel e extensivel para novos layouts de PDF.

## Escopo MVP

Primeira entrega:

- suportar PDF textual, sem OCR
- suportar 1 origem/plataforma inicialmente
- importar dados de aluno, avaliacao e plano de treino quando presentes
- gerar preview editavel
- confirmar gravacao apenas apos revisao manual

Fora do MVP:

- OCR de PDFs escaneados
- IA generica para qualquer PDF arbitrario
- importacao em lote
- atualizacao automatica de aluno existente sem revisao

## Estrutura proposta

Novo modulo:

- `src/student-imports`

Arquivos iniciais:

- `student-imports.module.ts`
- `student-imports.controller.ts`
- `student-imports.service.ts`
- `student-imports-parser.service.ts`
- `student-imports-mapper.service.ts`
- `student-imports-confirm.service.ts`
- `student-imports.types.ts`
- `dto/create-student-import.dto.ts`
- `dto/update-student-import-mapping.dto.ts`
- `dto/confirm-student-import.dto.ts`
- `dto/list-student-imports.dto.ts`

Subpasta opcional para parsers por origem:

- `src/student-imports/parsers/base-platform.parser.ts`
- `src/student-imports/parsers/platform-x.parser.ts`

## Modelagem Prisma

### Enums novos

```prisma
enum StudentImportStatus {
  UPLOADED
  PROCESSING
  REVIEW_READY
  CONFIRMED
  FAILED
}

enum StudentImportSourcePlatform {
  UNKNOWN
  CUSTOM
  PLATFORM_A
}

enum StudentImportIssueSeverity {
  INFO
  WARNING
  ERROR
}

enum StudentImportMatchStatus {
  AUTO_MATCHED
  MANUAL_REVIEW
  UNMATCHED
}
```

### Models novos

```prisma
model StudentImportJob {
  id                  String                     @id @default(cuid())
  createdByUserId     String
  sourcePlatform      StudentImportSourcePlatform @default(UNKNOWN)
  status              StudentImportStatus        @default(UPLOADED)
  fileName            String
  originalFileUrl     String?
  mediaAssetId        String?
  rawExtractedText    String?
  parsedData          Json?
  mappingSummary      Json?
  errorMessage        String?
  confirmedStudentId  String?
  confirmedPlanId     String?
  confirmedAssessmentId String?
  createdAt           DateTime                   @default(now()) @db.Timestamptz(3)
  updatedAt           DateTime                   @updatedAt @db.Timestamptz(3)
  createdByUser       User                       @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  mediaAsset          MediaAsset?                @relation(fields: [mediaAssetId], references: [id], onDelete: SetNull)
  issues              StudentImportIssue[]
  exerciseMatches     StudentImportExerciseMatch[]

  @@index([createdByUserId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([sourcePlatform, createdAt(sort: Desc)])
}

model StudentImportIssue {
  id           String                   @id @default(cuid())
  importJobId  String
  fieldPath    String
  severity     StudentImportIssueSeverity
  message      String
  suggestedValue Json?
  createdAt    DateTime                 @default(now()) @db.Timestamptz(3)
  importJob    StudentImportJob         @relation(fields: [importJobId], references: [id], onDelete: Cascade)

  @@index([importJobId, severity])
}

model StudentImportExerciseMatch {
  id                      String                  @id @default(cuid())
  importJobId             String
  rawExerciseName         String
  normalizedExerciseName  String
  matchedExerciseLibraryId String?
  matchedExerciseName     String?
  confidence             Decimal?                @db.Decimal(4, 3)
  status                 StudentImportMatchStatus
  payload                Json?
  createdAt              DateTime                @default(now()) @db.Timestamptz(3)
  updatedAt              DateTime                @updatedAt @db.Timestamptz(3)
  importJob              StudentImportJob        @relation(fields: [importJobId], references: [id], onDelete: Cascade)
  matchedExerciseLibrary ExerciseLibrary?        @relation(fields: [matchedExerciseLibraryId], references: [id], onDelete: SetNull)

  @@index([importJobId, status])
  @@index([matchedExerciseLibraryId])
}
```

## Contrato do draft

O `parsedData` e o preview retornado pela API devem seguir um formato estavel:

```ts
type ImportField<T> = {
  value: T | null;
  confidence: number;
  sourceText?: string;
  sourcePage?: number;
  editable: boolean;
};

type StudentImportPreview = {
  student: {
    fullName: ImportField<string>;
    email: ImportField<string>;
    phone: ImportField<string>;
    birthDate: ImportField<string>;
    currentWeightKg: ImportField<number>;
    currentHeightCm: ImportField<number>;
    targetWeightKg: ImportField<number>;
    limitations: ImportField<string>;
    notes: ImportField<string>;
  };
  assessment: {
    assessmentDate: ImportField<string>;
    assessmentType: ImportField<'INITIAL' | 'REASSESSMENT'>;
    vitals: {
      weightKg: ImportField<number>;
      heightCm: ImportField<number>;
      bmi: ImportField<number>;
      restingHeartRate: ImportField<number>;
      systolicBp: ImportField<number>;
      diastolicBp: ImportField<number>;
    };
    circumferences: Array<{
      kind: string;
      side: 'NONE' | 'LEFT' | 'RIGHT';
      valueCm: number | null;
      confidence: number;
    }>;
    skinfolds: Array<{
      kind: string;
      side: 'NONE' | 'LEFT' | 'RIGHT';
      valueMm: number | null;
      confidence: number;
    }>;
    bodyComposition?: {
      method?: string | null;
      bodyFatPercent?: number | null;
      leanMassKg?: number | null;
      confidence?: number;
    };
  };
  workoutPlan: {
    title: ImportField<string>;
    goal: ImportField<string>;
    days: Array<{
      order: number;
      weekDay: number | null;
      title: string;
      focus: string;
      estimatedMinutes: number | null;
      exercises: Array<{
        rawExerciseName: string;
        matchedExerciseLibraryId: string | null;
        matchedExerciseName: string | null;
        confidence: number;
        sets: number | null;
        reps: string | null;
        restSeconds: number | null;
        notes: string | null;
      }>;
    }>;
  };
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

## Endpoints

### Upload e processamento

- `POST /api/v1/student-imports`
  - auth: `TRAINER`, `ADMIN`
  - multipart upload de PDF
  - cria job com `UPLOADED`
  - processa o documento
  - responde com preview inicial

### Listagem

- `GET /api/v1/student-imports`
  - auth: `TRAINER`, `ADMIN`
  - filtros: `status`, `sourcePlatform`, `page`, `limit`

### Detalhe

- `GET /api/v1/student-imports/:id`
  - auth: owner ou admin

### Preview

- `GET /api/v1/student-imports/:id/preview`
  - auth: owner ou admin

### Ajustes manuais

- `PATCH /api/v1/student-imports/:id/mapping`
  - auth: owner ou admin
  - permite sobrescrever campos do preview e matches de exercicios

### Confirmacao final

- `POST /api/v1/student-imports/:id/confirm`
  - auth: owner ou admin
  - cria os registros reais em transacao

### Cancelamento opcional

- `DELETE /api/v1/student-imports/:id`
  - auth: owner ou admin
  - marca o job como descartado ou remove apenas o draft

## DTOs

### `CreateStudentImportDto`

Metadados opcionais:

- `sourcePlatform?: StudentImportSourcePlatform`
- `createStudentIfNotExists?: boolean`
- `linkToExistingStudentId?: string`

O arquivo entra via multipart.

### `UpdateStudentImportMappingDto`

- `student?: Partial<StudentImportPreview['student']>`
- `assessment?: Partial<StudentImportPreview['assessment']>`
- `workoutPlan?: Partial<StudentImportPreview['workoutPlan']>`
- `exerciseMatches?: Array<{ rawExerciseName: string; matchedExerciseLibraryId?: string | null }>`

### `ConfirmStudentImportDto`

- `createStudent: boolean`
- `existingStudentId?: string`
- `createAssessment: boolean`
- `assessmentStatus?: 'DRAFT' | 'COMPLETED'`
- `createWorkoutPlan: boolean`
- `planVisibility?: 'PRIVATE' | 'TRAINER_ONLY' | 'PUBLIC'`
- `isTemplate?: boolean`

## Regras de negocio

- apenas `TRAINER` e `ADMIN` podem importar
- `TRAINER` so pode confirmar importacao para aluno proprio ou novo aluno
- nunca salvar automaticamente sem revisao
- `StudentImportJob` e os registros finais devem manter rastreabilidade
- `existingStudentId` so pode ser usado se o treinador tiver permissao sobre o aluno
- se o parser nao identificar plataforma, usar `UNKNOWN`
- `FAILED` deve guardar `errorMessage`

## Pipeline de processamento

### Etapa 1. Upload

- armazenar PDF como `MediaAsset` ou caminho temporario
- criar `StudentImportJob`

### Etapa 2. Extracao

- usar `pdf-parse` ou `pdfjs-dist`
- gerar `rawExtractedText`
- se nao houver texto util, marcar issue e falhar ou deixar como `FAILED`

### Etapa 3. Classificacao

- identificar origem por frases, cabecalhos, estrutura e labels conhecidas
- escolher parser especifico

### Etapa 4. Parsing

- extrair blocos:
  - dados pessoais
  - anamnese/avaliacao
  - plano/dias/exercicios

### Etapa 5. Matching de exercicios

- normalizar nome
- tentar match por:
  - `slug`
  - `name`
  - `originalName`
  - `aliases`
- fallback com fuzzy match
- salvar confianca e status

### Etapa 6. Montagem do preview

- preencher `parsedData`
- gerar `issues`
- gerar `mappingSummary`
- atualizar job para `REVIEW_READY`

## Confirmacao final

Implementar em transacao:

1. resolver aluno alvo
2. criar `User` + `StudentProfile` se necessario
3. criar `PhysicalAssessment` se solicitado
4. criar `WorkoutPlan` com `WorkoutDay` e `WorkoutExercise` se solicitado
5. atualizar `StudentImportJob` com ids finais e `CONFIRMED`

Se qualquer etapa falhar, rollback total.

## Autorizacao

- `ADMIN`: acesso total
- `TRAINER`: apenas imports criados por ele
- ownership deve ser checada no controller e no service

## Observabilidade

Logar:

- upload iniciado
- parser escolhido
- quantidade de campos reconhecidos
- quantidade de exercicios auto-mapeados
- confirmacao final com ids criados
- falhas de parse sem vazar dados sensiveis integralmente

## Testes

### Unit

- parser da plataforma suportada
- matcher de exercicios
- mapper para preview
- service de confirmacao

### e2e

- upload + preview
- update de mapping
- confirmacao criando aluno novo
- confirmacao vinculando aluno existente
- trainer sem ownership
- PDF invalido
- parser sem match suficiente

## Ordem recomendada de implementacao

1. schema Prisma e migrations
2. upload basico + `StudentImportJob`
3. extracao de texto do PDF
4. parser de 1 plataforma
5. preview estruturado
6. ajustes manuais
7. confirmacao em transacao
8. testes

## Decisoes tecnicas recomendadas

- armazenar `parsedData` como JSON estruturado, nao string livre
- manter parser por plataforma separado
- nao usar LLM como dependencia obrigatoria do MVP
- introduzir OCR apenas quando houver prova de necessidade
- importar para draft antes de gravar entidades reais
