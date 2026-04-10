import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { StudentImportSourcePlatform } from '@prisma/client';
import pdfParse from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import {
  ImportField,
  StudentImportExercisePreview,
  StudentImportIssuePayload,
  StudentImportMappingSummary,
  StudentImportParsedData,
} from './student-imports.types';

type ParsedExerciseLine = {
  rawExerciseName: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
};

@Injectable()
export class StudentImportsParserService {
  constructor(private readonly prisma: PrismaService) {}

  async parse(buffer: Buffer, fileName: string, requestedSource?: StudentImportSourcePlatform) {
    const textResult = await pdfParse(buffer);
    const rawExtractedText = textResult.text?.trim();
    if (!rawExtractedText) {
      throw new UnprocessableEntityException('Could not extract readable text from the PDF');
    }

    const sourcePlatform = requestedSource ?? StudentImportSourcePlatform.GENERIC_PDF;
    const lines = this.toLines(rawExtractedText);
    const student = this.extractStudent(lines, rawExtractedText);
    const assessment = this.extractAssessment(lines, rawExtractedText, student);
    const parsedExercises = this.extractExercises(lines);
    const exerciseMatches = await this.matchExercises(parsedExercises);
    const workoutPlan = this.buildWorkoutPlan(lines, exerciseMatches);
    const issues = this.buildIssues(student, assessment, workoutPlan, exerciseMatches);
    const summary = this.buildSummary(student, assessment, exerciseMatches);

    return {
      sourcePlatform,
      rawExtractedText,
      parsedData: {
        student,
        assessment,
        workoutPlan,
      } satisfies StudentImportParsedData,
      mappingSummary: {
        issues,
        summary,
      } satisfies StudentImportMappingSummary,
      exerciseMatches,
      detectedSourceHint: this.detectSourceHint(fileName, rawExtractedText),
    };
  }

  private toLines(rawText: string) {
    return rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  private extractStudent(lines: string[], rawText: string): StudentImportParsedData['student'] {
    const fullName = this.findLineValue(lines, [/^aluno[:\s-]+(.+)$/i, /^nome[:\s-]+(.+)$/i]);
    const birthDate = this.findDateValue(lines, [/^data de nascimento[:\s-]+(.+)$/i, /^nascimento[:\s-]+(.+)$/i]);
    const currentWeightKg = this.findNumericValue(lines, [/(?:peso atual|peso|weight)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i]);
    const currentHeightCm = this.findNumericValue(lines, [/(?:altura|height)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i]);
    const targetWeightKg = this.findNumericValue(lines, [/(?:meta de peso|peso alvo|target weight)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i]);
    const limitations = this.findLineValue(lines, [/(?:limita[cç][aã]o(?:es)?|restri[cç][aã]o(?:es)?|les[oõ]es)[:\s-]+(.+)$/i]);
    const notes = this.findLineValue(lines, [/^(?:observa[cç][oõ]es|obs)[:\s-]+(.+)$/i]);
    const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phone = rawText.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4})-?\d{4}/)?.[0] ?? null;

    return {
      fullName: this.field(fullName.value, fullName.confidence, fullName.sourceText),
      email: this.field(email, email ? 0.93 : 0, email ?? undefined),
      phone: this.field(phone, phone ? 0.86 : 0, phone ?? undefined),
      birthDate: this.field(birthDate.value, birthDate.confidence, birthDate.sourceText),
      currentWeightKg: this.field(currentWeightKg.value, currentWeightKg.confidence, currentWeightKg.sourceText),
      currentHeightCm: this.field(currentHeightCm.value, currentHeightCm.confidence, currentHeightCm.sourceText),
      targetWeightKg: this.field(targetWeightKg.value, targetWeightKg.confidence, targetWeightKg.sourceText),
      limitations: this.field(limitations.value, limitations.confidence, limitations.sourceText),
      notes: this.field(notes.value, notes.confidence, notes.sourceText),
    };
  }

  private extractAssessment(
    lines: string[],
    rawText: string,
    student: StudentImportParsedData['student'],
  ): StudentImportParsedData['assessment'] {
    const assessmentDate = this.findDateValue(lines, [
      /(?:data da avalia[cç][aã]o|avalia[cç][aã]o em|assessment date)[:\s-]+(.+)$/i,
      /(?:data)[:\s-]+(\d{2}\/\d{2}\/\d{4})$/i,
    ]);
    const restingHeartRate = this.findNumericValue(lines, [/(?:fc repouso|resting heart rate)[:\s-]+(\d{2,3})/i]);
    const systolicBp = this.findNumericValue(lines, [/press[aã]o[:\s-]+(\d{2,3})\s*\/\s*\d{2,3}/i]);
    const diastolicBp = this.findNumericValue(lines, [/press[aã]o[:\s-]+\d{2,3}\s*\/\s*(\d{2,3})/i]);
    const bodyFatPercent = this.findNumericValue(lines, [/(?:% gordura|gordura corporal|body fat)[:\s-]+(\d{1,2}(?:[.,]\d{1,2})?)/i]);
    const leanMassKg = this.findNumericValue(lines, [/(?:massa magra|lean mass)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i]);

    return {
      assessmentDate: this.field(assessmentDate.value, assessmentDate.confidence, assessmentDate.sourceText),
      assessmentType: this.field('INITIAL', assessmentDate.value ? 0.65 : 0.3, assessmentDate.sourceText),
      vitals: {
        weightKg: student.currentWeightKg,
        heightCm: student.currentHeightCm,
        bmi: this.field(
          this.calculateBmi(student.currentWeightKg.value, student.currentHeightCm.value),
          student.currentWeightKg.value && student.currentHeightCm.value ? 0.75 : 0,
          rawText.includes('IMC') ? 'IMC calculado a partir de peso e altura' : undefined,
        ),
        restingHeartRate: this.field(restingHeartRate.value, restingHeartRate.confidence, restingHeartRate.sourceText),
        systolicBp: this.field(systolicBp.value, systolicBp.confidence, systolicBp.sourceText),
        diastolicBp: this.field(diastolicBp.value, diastolicBp.confidence, diastolicBp.sourceText),
      },
      circumferences: this.extractCircumferences(lines),
      skinfolds: this.extractSkinfolds(lines),
      bodyComposition:
        bodyFatPercent.value || leanMassKg.value
          ? {
              method: 'MANUAL',
              bodyFatPercent: bodyFatPercent.value,
              leanMassKg: leanMassKg.value,
              confidence: Math.max(bodyFatPercent.confidence, leanMassKg.confidence),
            }
          : undefined,
    };
  }

  private buildWorkoutPlan(
    lines: string[],
    exercises: StudentImportExercisePreview[],
  ): StudentImportParsedData['workoutPlan'] {
    const title = this.findLineValue(lines, [
      /(?:plano de treino|treino|programa)[:\s-]+(.+)$/i,
      /^(treino [a-z0-9][^:]*)$/i,
    ]);
    const goal = this.findLineValue(lines, [/(?:objetivo|goal)[:\s-]+(.+)$/i]);

    return {
      title: this.field(title.value ?? (exercises.length ? 'Treino importado' : null), title.value ? 0.86 : 0.4, title.sourceText),
      goal: this.field(goal.value, goal.confidence, goal.sourceText),
      days: exercises.length
        ? [
            {
              order: 1,
              weekDay: null,
              title: title.value ?? 'Treino importado',
              focus: goal.value ?? 'Plano importado de PDF',
              estimatedMinutes: null,
              exercises,
            },
          ]
        : [],
    };
  }

  private async matchExercises(parsedExercises: ParsedExerciseLine[]): Promise<StudentImportExercisePreview[]> {
    if (!parsedExercises.length) {
      return [];
    }

    const library = await this.prisma.exerciseLibrary.findMany({
      where: { isActive: true },
      select: { id: true, name: true, originalName: true, slug: true, aliases: true },
    });

    return parsedExercises.map((exercise) => {
      const normalized = this.normalize(exercise.rawExerciseName);
      let bestMatch: { id: string; name: string } | null = null;
      let bestScore = 0;

      for (const candidate of library) {
        const names = [candidate.name, candidate.originalName ?? '', candidate.slug.replace(/-/g, ' '), ...candidate.aliases]
          .map((value) => this.normalize(value))
          .filter(Boolean);

        const score = this.scoreName(normalized, names);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { id: candidate.id, name: candidate.name };
        }
      }

      const status =
        bestScore >= 0.92 ? 'AUTO_MATCHED' : bestScore >= 0.7 ? 'MANUAL_REVIEW' : 'UNMATCHED';

      return {
        rawExerciseName: exercise.rawExerciseName,
        matchedExerciseLibraryId: status === 'UNMATCHED' ? null : bestMatch?.id ?? null,
        matchedExerciseName: status === 'UNMATCHED' ? null : bestMatch?.name ?? null,
        confidence: Number(bestScore.toFixed(3)),
        status,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
      };
    });
  }

  private buildIssues(
    student: StudentImportParsedData['student'],
    assessment: StudentImportParsedData['assessment'],
    workoutPlan: StudentImportParsedData['workoutPlan'],
    exerciseMatches: StudentImportExercisePreview[],
  ): StudentImportIssuePayload[] {
    const issues: StudentImportIssuePayload[] = [];

    if (!student.fullName.value) {
      issues.push({
        fieldPath: 'student.fullName',
        severity: 'ERROR',
        message: 'Nome do aluno nao foi identificado com confianca suficiente.',
      });
    }

    if (!student.email.value) {
      issues.push({
        fieldPath: 'student.email',
        severity: 'WARNING',
        message: 'Email nao foi encontrado no PDF. O treinador pode completar manualmente.',
      });
    }

    if (!assessment.vitals.weightKg.value) {
      issues.push({
        fieldPath: 'assessment.vitals.weightKg',
        severity: 'WARNING',
        message: 'Peso nao foi identificado no PDF.',
      });
    }

    if (!workoutPlan.days.length) {
      issues.push({
        fieldPath: 'workoutPlan.days',
        severity: 'INFO',
        message: 'Nenhum bloco de treino foi reconhecido automaticamente.',
      });
    }

    for (const exercise of exerciseMatches.filter((item) => item.status !== 'AUTO_MATCHED')) {
      issues.push({
        fieldPath: `workoutPlan.exercises.${exercise.rawExerciseName}`,
        severity: exercise.status === 'UNMATCHED' ? 'ERROR' : 'WARNING',
        message:
          exercise.status === 'UNMATCHED'
            ? `Exercicio "${exercise.rawExerciseName}" nao foi encontrado na biblioteca do VYTA.`
            : `Exercicio "${exercise.rawExerciseName}" requer revisao manual antes da confirmacao.`,
      });
    }

    return issues;
  }

  private buildSummary(
    student: StudentImportParsedData['student'],
    assessment: StudentImportParsedData['assessment'],
    exerciseMatches: StudentImportExercisePreview[],
  ) {
    const fields = [...Object.values(student), assessment.assessmentDate, assessment.assessmentType, ...Object.values(assessment.vitals)];
    const recognizedFields = fields.filter((field) => field.value !== null).length;
    return {
      recognizedFields,
      pendingFields: fields.length - recognizedFields,
      autoMatchedExercises: exerciseMatches.filter((item) => item.status === 'AUTO_MATCHED').length,
      manualReviewExercises: exerciseMatches.filter((item) => item.status === 'MANUAL_REVIEW').length,
      unmatchedExercises: exerciseMatches.filter((item) => item.status === 'UNMATCHED').length,
    };
  }

  private extractExercises(lines: string[]): ParsedExerciseLine[] {
    return lines
      .map((line) =>
        line.match(
          /^(?<name>[A-Za-zÀ-ÿ0-9\s()\/,+.-]{4,}?)(?:\s+-\s+|\s{2,}|\s+)(?<sets>\d{1,2})\s*x\s*(?<reps>[\dA-Za-z/-]+)(?:\s*(?:-|\/|\|)\s*|\s+)?(?<rest>\d{1,3})?\s*(?:s|seg|sec|seconds?)?$/i,
        ),
      )
      .filter((match): match is RegExpMatchArray & { groups: Record<string, string> } => Boolean(match?.groups?.name))
      .map((match) => ({
        rawExerciseName: match.groups.name.trim(),
        sets: Number(match.groups.sets ?? '') || null,
        reps: match.groups.reps?.trim() ?? null,
        restSeconds: Number(match.groups.rest ?? '') || null,
        notes: null,
      }));
  }

  private extractCircumferences(lines: string[]) {
    const definitions = [
      { kind: 'WAIST', regex: /(?:cintura|waist)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i },
      { kind: 'HIP', regex: /(?:quadril|hip)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i },
      { kind: 'CHEST', regex: /(?:peito|chest|torax)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i },
      { kind: 'THIGH', regex: /(?:coxa|thigh)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i },
      { kind: 'ARM', regex: /(?:bra[cç]o|arm)[:\s-]+(\d{2,3}(?:[.,]\d{1,2})?)/i },
    ];

    return definitions
      .map((definition) => {
        const found = this.findNumericValue(lines, [definition.regex]);
        return { kind: definition.kind, side: 'NONE' as const, valueCm: found.value, confidence: found.confidence };
      })
      .filter((item) => item.valueCm !== null);
  }

  private extractSkinfolds(lines: string[]) {
    const definitions = [
      { kind: 'TRICEPS', regex: /(?:tr[ií]ceps)[:\s-]+(\d{1,2}(?:[.,]\d{1,2})?)/i },
      { kind: 'ABDOMINAL', regex: /(?:abdominal)[:\s-]+(\d{1,2}(?:[.,]\d{1,2})?)/i },
      { kind: 'THIGH', regex: /(?:coxa dobra|thigh skinfold|coxa)[:\s-]+(\d{1,2}(?:[.,]\d{1,2})?)/i },
    ];

    return definitions
      .map((definition) => {
        const found = this.findNumericValue(lines, [definition.regex]);
        return { kind: definition.kind, side: 'NONE' as const, valueMm: found.value, confidence: found.confidence };
      })
      .filter((item) => item.valueMm !== null);
  }

  private detectSourceHint(fileName: string, rawText: string) {
    const content = `${fileName}\n${rawText}`.toLowerCase();
    return content.includes('treino') || content.includes('avalia')
      ? StudentImportSourcePlatform.GENERIC_PDF
      : StudentImportSourcePlatform.UNKNOWN;
  }

  private findLineValue(lines: string[], regexes: RegExp[]) {
    for (const line of lines) {
      for (const regex of regexes) {
        const match = line.match(regex);
        if (match?.[1]) {
          return { value: match[1].trim(), confidence: 0.9, sourceText: line };
        }
      }
    }

    return { value: null, confidence: 0, sourceText: undefined as string | undefined };
  }

  private findNumericValue(lines: string[], regexes: RegExp[]) {
    for (const line of lines) {
      for (const regex of regexes) {
        const match = line.match(regex);
        if (match?.[1]) {
          return {
            value: Number(match[1].replace(',', '.')),
            confidence: 0.88,
            sourceText: line,
          };
        }
      }
    }

    return { value: null, confidence: 0, sourceText: undefined as string | undefined };
  }

  private findDateValue(lines: string[], regexes: RegExp[]) {
    for (const line of lines) {
      for (const regex of regexes) {
        const match = line.match(regex);
        if (match?.[1]) {
          const iso = this.toIsoDate(match[1]);
          return { value: iso, confidence: iso ? 0.82 : 0, sourceText: line };
        }
      }
    }

    return { value: null, confidence: 0, sourceText: undefined as string | undefined };
  }

  private toIsoDate(raw: string) {
    const text = raw.trim();
    const ddmmyyyy = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  private field<T>(value: T | null, confidence: number, sourceText?: string): ImportField<T> {
    return {
      value,
      confidence: Number(confidence.toFixed(3)),
      sourceText,
      sourcePage: sourceText ? 1 : undefined,
      editable: true,
    };
  }

  private calculateBmi(weightKg: number | null, heightCm: number | null) {
    if (!weightKg || !heightCm) {
      return null;
    }

    const heightMeters = heightCm / 100;
    return Number((weightKg / (heightMeters * heightMeters)).toFixed(2));
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private scoreName(raw: string, candidates: string[]) {
    if (!raw) {
      return 0;
    }

    let best = 0;
    const rawTokens = new Set(raw.split(' ').filter(Boolean));

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      if (candidate === raw) {
        return 1;
      }

      if (candidate.includes(raw) || raw.includes(candidate)) {
        best = Math.max(best, 0.84);
      }

      const candidateTokens = new Set(candidate.split(' ').filter(Boolean));
      const overlap = [...rawTokens].filter((token) => candidateTokens.has(token)).length;
      const union = new Set([...rawTokens, ...candidateTokens]).size;
      if (union > 0) {
        best = Math.max(best, overlap / union);
      }
    }

    return best;
  }
}
