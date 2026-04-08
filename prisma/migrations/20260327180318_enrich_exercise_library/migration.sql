-- CreateEnum
CREATE TYPE "public"."ExerciseCategory" AS ENUM ('STRENGTH', 'MOBILITY', 'PLYOMETRICS', 'POWERLIFTING', 'OLYMPIC_WEIGHTLIFTING', 'STRONGMAN', 'CARDIO');

-- CreateEnum
CREATE TYPE "public"."ExerciseBodyRegion" AS ENUM ('UPPER_BODY', 'LOWER_BODY', 'FULL_BODY', 'MOBILITY', 'CORE', 'CARDIO');

-- CreateEnum
CREATE TYPE "public"."ExerciseDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "public"."ExerciseMovementPattern" AS ENUM ('HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PUSH', 'VERTICAL_PULL', 'SQUAT', 'HIP_HINGE', 'LUNGE', 'CORE', 'ELBOW_FLEXION', 'ELBOW_EXTENSION', 'SHOULDER_ISOLATION', 'HIP_ISOLATION', 'ANKLE_EXTENSION', 'CARRY', 'JUMP', 'CARDIO', 'MOBILITY', 'OLYMPIC_LIFT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ExerciseMechanic" AS ENUM ('COMPOUND', 'ISOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ExerciseForceType" AS ENUM ('PUSH', 'PULL', 'STATIC', 'OTHER');

-- AlterTable
ALTER TABLE "public"."ExerciseLibrary" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "bodyRegion" "public"."ExerciseBodyRegion" NOT NULL DEFAULT 'FULL_BODY',
ADD COLUMN     "category" "public"."ExerciseCategory" NOT NULL DEFAULT 'STRENGTH',
ADD COLUMN     "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" "public"."ExerciseDifficulty" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "equipmentList" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "forceType" "public"."ExerciseForceType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "instructionSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "instructionsPtBrAuto" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isUnilateral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mechanic" "public"."ExerciseMechanic" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "movementPattern" "public"."ExerciseMovementPattern" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "primaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceExternalId" TEXT,
ADD COLUMN     "sourceLicense" TEXT,
ADD COLUMN     "sourceProvider" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "videoUrl" TEXT;

-- CreateIndex
CREATE INDEX "ExerciseLibrary_category_bodyRegion_idx" ON "public"."ExerciseLibrary"("category", "bodyRegion");

-- CreateIndex
CREATE INDEX "ExerciseLibrary_difficulty_isActive_idx" ON "public"."ExerciseLibrary"("difficulty", "isActive");

-- CreateIndex
CREATE INDEX "ExerciseLibrary_movementPattern_idx" ON "public"."ExerciseLibrary"("movementPattern");
