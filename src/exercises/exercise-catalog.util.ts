import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ExerciseBodyRegion,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseForceType,
  ExerciseMechanic,
  ExerciseMovementPattern,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

type ExerciseCatalogEntry = {
  slug: string;
  name: string;
  originalName?: string | null;
  bodyRegion?: string | null;
  category?: string | null;
  movementPattern?: string | null;
  mechanic?: string | null;
  forceType?: string | null;
  difficulty?: string | null;
  isUnilateral?: boolean | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  description?: string | null;
  instructions?: string[];
  instructionsPtBrAuto?: string[];
  tips?: string[];
  contraindications?: string[];
  aliases?: string[];
  tags?: string[];
  media?: {
    thumbnailUrl?: string | null;
    imageUrls?: string[];
    videoUrl?: string | null;
  } | null;
  source?: {
    provider?: string | null;
    externalId?: string | null;
    license?: string | null;
  } | null;
  isActive?: boolean | null;
};

type ExerciseLibraryClient = Pick<PrismaClient, 'exerciseLibrary'>;

type ImportExerciseCatalogOptions = {
  catalogPath?: string;
  clearExisting?: boolean;
  strict?: boolean;
};

const DEFAULT_CATALOG_FILE = 'vyta-exercise-catalog.v1.json';

function buildInstructionText(entry: ExerciseCatalogEntry) {
  const sections: string[] = [];

  if (entry.description?.trim()) {
    sections.push(`Descricao: ${entry.description.trim()}`);
  }

  const steps = entry.instructionsPtBrAuto?.length ? entry.instructionsPtBrAuto : entry.instructions;
  if (steps?.length) {
    sections.push(`Execucao:\n${steps.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
  }

  if (entry.tips?.length) {
    sections.push(`Dicas:\n${entry.tips.map((item) => `- ${item}`).join('\n')}`);
  }

  if (entry.contraindications?.length) {
    sections.push(`Cuidados:\n${entry.contraindications.map((item) => `- ${item}`).join('\n')}`);
  }

  return sections.join('\n\n').trim();
}

function enumValue<T extends Record<string, string>>(enumMap: T, value: string | null | undefined, fallback: T[keyof T]) {
  if (!value) {
    return fallback;
  }

  return value in enumMap ? (value as T[keyof T]) : fallback;
}

function mapCatalogEntry(entry: ExerciseCatalogEntry): Prisma.ExerciseLibraryUncheckedCreateInput {
  const thumbUrl = entry.media?.thumbnailUrl ?? entry.media?.imageUrls?.[0] ?? null;
  const mediaUrl = entry.media?.videoUrl ?? entry.media?.imageUrls?.[0] ?? thumbUrl;

  return {
    originalName: entry.originalName ?? null,
    slug: entry.slug,
    name: entry.name,
    description: entry.description ?? null,
    category: enumValue(ExerciseCategory, entry.category, ExerciseCategory.STRENGTH),
    movementPattern: enumValue(ExerciseMovementPattern, entry.movementPattern, ExerciseMovementPattern.OTHER),
    mechanic: enumValue(ExerciseMechanic, entry.mechanic, ExerciseMechanic.OTHER),
    forceType: enumValue(ExerciseForceType, entry.forceType, ExerciseForceType.OTHER),
    difficulty: enumValue(ExerciseDifficulty, entry.difficulty, ExerciseDifficulty.BEGINNER),
    bodyRegion: enumValue(ExerciseBodyRegion, entry.bodyRegion, ExerciseBodyRegion.FULL_BODY),
    isUnilateral: entry.isUnilateral ?? false,
    isActive: entry.isActive ?? true,
    muscleGroup: entry.primaryMuscles?.[0] ?? entry.bodyRegion ?? 'OTHER',
    equipment: entry.equipment?.length ? entry.equipment.join(', ') : null,
    instructions: buildInstructionText(entry) || 'Sem instrucoes detalhadas no catalogo.',
    defaultMediaUrl: mediaUrl,
    defaultThumbUrl: thumbUrl,
    aliases: entry.aliases ?? [],
    primaryMuscles: entry.primaryMuscles ?? [],
    secondaryMuscles: entry.secondaryMuscles ?? [],
    equipmentList: entry.equipment ?? [],
    instructionSteps: entry.instructions ?? [],
    instructionsPtBrAuto: entry.instructionsPtBrAuto ?? [],
    tips: entry.tips ?? [],
    contraindications: entry.contraindications ?? [],
    tags: entry.tags ?? [],
    imageUrls: entry.media?.imageUrls ?? [],
    videoUrl: entry.media?.videoUrl ?? null,
    sourceProvider: entry.source?.provider ?? null,
    sourceExternalId: entry.source?.externalId ?? null,
    sourceLicense: entry.source?.license ?? null,
  };
}

export function resolveExerciseCatalogPath(catalogPath?: string) {
  return resolve(process.cwd(), catalogPath ?? DEFAULT_CATALOG_FILE);
}

export function loadExerciseCatalog(options: Pick<ImportExerciseCatalogOptions, 'catalogPath' | 'strict'> = {}) {
  const filePath = resolveExerciseCatalogPath(options.catalogPath);

  if (!existsSync(filePath)) {
    if (options.strict ?? true) {
      throw new Error(`Exercise catalog not found at ${filePath}`);
    }

    return null;
  }

  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Exercise catalog at ${filePath} must be a JSON array`);
  }

  return {
    filePath,
    entries: parsed as ExerciseCatalogEntry[],
  };
}

export async function importExerciseCatalog(
  prisma: ExerciseLibraryClient,
  options: ImportExerciseCatalogOptions = {},
) {
  const catalog = loadExerciseCatalog({
    catalogPath: options.catalogPath,
    strict: options.strict,
  });

  if (!catalog) {
    return null;
  }

  if (options.clearExisting) {
    await prisma.exerciseLibrary.deleteMany();
  }

  for (const entry of catalog.entries) {
    const mapped = mapCatalogEntry(entry);

    await prisma.exerciseLibrary.upsert({
      where: { slug: mapped.slug },
      create: mapped,
      update: mapped,
    });
  }

  return {
    filePath: catalog.filePath,
    count: catalog.entries.length,
  };
}
