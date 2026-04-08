"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExerciseCatalogPath = resolveExerciseCatalogPath;
exports.loadExerciseCatalog = loadExerciseCatalog;
exports.importExerciseCatalog = importExerciseCatalog;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DEFAULT_CATALOG_FILE = 'vyta-exercise-catalog.v1.json';
function buildInstructionText(entry) {
    const sections = [];
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
function mapCatalogEntry(entry) {
    const thumbUrl = entry.media?.thumbnailUrl ?? entry.media?.imageUrls?.[0] ?? null;
    const mediaUrl = entry.media?.videoUrl ?? entry.media?.imageUrls?.[0] ?? thumbUrl;
    return {
        originalName: entry.originalName ?? null,
        slug: entry.slug,
        name: entry.name,
        description: entry.description ?? null,
        category: entry.category ?? 'STRENGTH',
        movementPattern: entry.movementPattern ?? 'OTHER',
        mechanic: entry.mechanic ?? 'OTHER',
        forceType: entry.forceType ?? 'OTHER',
        difficulty: entry.difficulty ?? 'BEGINNER',
        bodyRegion: entry.bodyRegion ?? 'FULL_BODY',
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
function resolveExerciseCatalogPath(catalogPath) {
    return (0, node_path_1.resolve)(process.cwd(), catalogPath ?? DEFAULT_CATALOG_FILE);
}
function loadExerciseCatalog(options = {}) {
    const filePath = resolveExerciseCatalogPath(options.catalogPath);
    if (!(0, node_fs_1.existsSync)(filePath)) {
        if (options.strict ?? true) {
            throw new Error(`Exercise catalog not found at ${filePath}`);
        }
        return null;
    }
    const raw = (0, node_fs_1.readFileSync)(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error(`Exercise catalog at ${filePath} must be a JSON array`);
    }
    return {
        filePath,
        entries: parsed,
    };
}
async function importExerciseCatalog(prisma, options = {}) {
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
//# sourceMappingURL=exercise-catalog.js.map