export type ImportField<T> = {
  value: T | null;
  confidence: number;
  sourceText?: string;
  sourcePage?: number;
  editable: boolean;
};

export type StudentImportIssuePayload = {
  fieldPath: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  suggestedValue?: unknown;
};

export type StudentImportExercisePreview = {
  rawExerciseName: string;
  matchedExerciseLibraryId: string | null;
  matchedExerciseName: string | null;
  confidence: number;
  status: 'AUTO_MATCHED' | 'MANUAL_REVIEW' | 'UNMATCHED';
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
};

export type StudentImportWorkoutDayPreview = {
  order: number;
  weekDay: number | null;
  title: string;
  focus: string;
  estimatedMinutes: number | null;
  exercises: StudentImportExercisePreview[];
};

export type StudentImportParsedData = {
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
    days: StudentImportWorkoutDayPreview[];
  };
};

export type StudentImportMappingSummary = {
  issues: StudentImportIssuePayload[];
  summary: {
    recognizedFields: number;
    pendingFields: number;
    autoMatchedExercises: number;
    manualReviewExercises: number;
    unmatchedExercises: number;
  };
};

export type StudentImportPreview = StudentImportParsedData & StudentImportMappingSummary;
