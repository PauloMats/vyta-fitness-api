import { PrismaClient } from '@prisma/client';
import { importExerciseCatalog } from '../src/exercises/exercise-catalog.util';

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await importExerciseCatalog(prisma, {
      catalogPath: process.env.EXERCISE_CATALOG_PATH,
      clearExisting: process.argv.includes('--clear'),
      strict: true,
    });

    console.log(
      `Imported ${result?.count ?? 0} exercises from ${result?.filePath ?? process.env.EXERCISE_CATALOG_PATH}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
