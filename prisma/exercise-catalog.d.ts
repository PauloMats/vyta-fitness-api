import type { PrismaClient } from '@prisma/client';
type ExerciseCatalogEntry = {
    slug: string;
    name: string;
    originalName?: string | null;
    bodyRegion?: string | null;
    primaryMuscles?: string[];
    equipment?: string[];
    description?: string | null;
    category?: string | null;
    movementPattern?: string | null;
    mechanic?: string | null;
    forceType?: string | null;
    difficulty?: string | null;
    isUnilateral?: boolean | null;
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
export declare function resolveExerciseCatalogPath(catalogPath?: string): string;
export declare function loadExerciseCatalog(options?: Pick<ImportExerciseCatalogOptions, 'catalogPath' | 'strict'>): {
    filePath: string;
    entries: ExerciseCatalogEntry[];
} | null;
export declare function importExerciseCatalog(prisma: ExerciseLibraryClient, options?: ImportExerciseCatalogOptions): Promise<{
    filePath: string;
    count: number;
} | null>;
export {};
