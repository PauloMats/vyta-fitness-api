CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "public"."FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."AssessmentType" AS ENUM ('INITIAL', 'REASSESSMENT');

-- CreateEnum
CREATE TYPE "public"."ScreeningClearance" AS ENUM ('CLEARED', 'RESTRICTED', 'REFERRED');

-- CreateEnum
CREATE TYPE "public"."MeasurementSide" AS ENUM ('NONE', 'LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "public"."AssessmentCircumferenceKind" AS ENUM ('NECK', 'SHOULDERS', 'CHEST', 'WAIST', 'ABDOMEN', 'HIP', 'ARM', 'FOREARM', 'THIGH', 'CALF');

-- CreateEnum
CREATE TYPE "public"."AssessmentSkinfoldKind" AS ENUM ('TRICEPS', 'SUBSCAPULAR', 'BICEPS', 'AXILLARY_MID', 'SUPRAILIAC', 'SUPRASPINAL', 'ABDOMINAL', 'THIGH', 'CALF', 'PECTORAL');

-- CreateEnum
CREATE TYPE "public"."BodyCompositionMethod" AS ENUM ('BIA', 'SKINFOLD_JP3', 'SKINFOLD_JP7', 'DEXA', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."FitnessTestCategory" AS ENUM ('CARDIO', 'STRENGTH', 'MOBILITY', 'BALANCE', 'FLEXIBILITY');

-- CreateEnum
CREATE TYPE "public"."AssessmentPhotoPosition" AS ENUM ('FRONT', 'SIDE', 'BACK');

-- DropIndex
DROP INDEX "public"."Friendship_requesterId_addresseeId_key";

-- DropIndex
DROP INDEX "public"."RefreshToken_userId_idx";

-- DropIndex
DROP INDEX "public"."User_email_key";

-- DropIndex
DROP INDEX "public"."User_role_status_idx";

-- DropIndex
DROP INDEX "public"."User_username_key";

-- DropIndex
DROP INDEX "public"."WorkoutDay_workoutPlanId_order_idx";

-- DropIndex
DROP INDEX "public"."WorkoutDay_workoutPlanId_weekDay_key";

-- AlterTable
ALTER TABLE "public"."Comment" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."DeviceToken" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."ExerciseLibrary" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."Friendship" ADD COLUMN     "pairKey" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."FriendshipStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."MediaAsset" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."Notification" ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."Post" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."PostLike" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."RefreshToken" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMPTZ(3),
ADD COLUMN     "replacedByTokenId" TEXT,
ADD COLUMN     "revokedReason" TEXT,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."StudentProfile" ADD COLUMN     "currentHeightCm" DECIMAL(5,2),
ADD COLUMN     "currentWeightKg" DECIMAL(6,2),
ALTER COLUMN "targetWeightKg" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."TrainerProfile" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."TrainerStudent" ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "lastLoginAt" TIMESTAMPTZ(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMPTZ(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "email" SET DATA TYPE CITEXT,
ALTER COLUMN "username" SET DATA TYPE CITEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."WorkoutDay" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."WorkoutPlan" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."WorkoutSession" ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "finishedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."WorkoutSet" ALTER COLUMN "targetLoadKg" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "actualLoadKg" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMPTZ(3);

UPDATE "public"."Friendship"
SET "pairKey" = CONCAT(LEAST("requesterId", "addresseeId"), ':', GREATEST("requesterId", "addresseeId"));

ALTER TABLE "public"."Friendship"
ALTER COLUMN "pairKey" SET NOT NULL;

UPDATE "public"."RefreshToken"
SET "sessionId" = COALESCE("sessionId", "id"),
    "familyId" = COALESCE("familyId", "id");

ALTER TABLE "public"."RefreshToken"
ALTER COLUMN "sessionId" SET NOT NULL;

UPDATE "public"."StudentProfile"
SET "currentHeightCm" = "heightCm"::DECIMAL(5,2),
    "currentWeightKg" = "weightKg"::DECIMAL(6,2)
WHERE "heightCm" IS NOT NULL OR "weightKg" IS NOT NULL;

ALTER TABLE "public"."StudentProfile"
DROP COLUMN "heightCm",
DROP COLUMN "weightKg";

-- CreateTable
CREATE TABLE "public"."PhysicalAssessment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "status" "public"."AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "assessmentDate" TIMESTAMPTZ(3) NOT NULL,
    "assessmentType" "public"."AssessmentType" NOT NULL DEFAULT 'REASSESSMENT',
    "notes" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PhysicalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentScreening" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "symptoms" TEXT,
    "knownConditions" TEXT,
    "medications" TEXT,
    "clearance" "public"."ScreeningClearance" NOT NULL DEFAULT 'CLEARED',
    "riskFlags" TEXT[],
    "restrictions" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentAnamnesis" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "objectivePrimary" TEXT,
    "objectiveSecondary" TEXT,
    "activityLevel" TEXT,
    "sleepQuality" TEXT,
    "stressLevel" INTEGER,
    "familyHistory" TEXT,
    "injuriesHistory" TEXT,
    "limitations" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentAnamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentVitals" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "weightKg" DECIMAL(6,2),
    "heightCm" DECIMAL(5,2),
    "bmi" DECIMAL(5,2),
    "restingHeartRate" INTEGER,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "spo2" INTEGER,
    "glucose" DECIMAL(5,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentVitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentCircumference" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "kind" "public"."AssessmentCircumferenceKind" NOT NULL,
    "valueCm" DECIMAL(5,2) NOT NULL,
    "side" "public"."MeasurementSide" NOT NULL DEFAULT 'NONE',
    "protocol" TEXT,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentCircumference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentSkinfold" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "kind" "public"."AssessmentSkinfoldKind" NOT NULL,
    "valueMm" DECIMAL(5,2) NOT NULL,
    "side" "public"."MeasurementSide" NOT NULL DEFAULT 'NONE',
    "measurementIndex" INTEGER NOT NULL DEFAULT 1,
    "protocol" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentSkinfold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentBodyComposition" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "method" "public"."BodyCompositionMethod" NOT NULL,
    "protocol" TEXT,
    "equation" TEXT,
    "bodyFatPercent" DECIMAL(5,2),
    "fatMassKg" DECIMAL(6,2),
    "leanMassKg" DECIMAL(6,2),
    "muscleMassKg" DECIMAL(6,2),
    "visceralFat" DECIMAL(5,2),
    "sourceDevice" TEXT,
    "isComparable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentBodyComposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentFitnessTest" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "category" "public"."FitnessTestCategory" NOT NULL,
    "testCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rawValue" TEXT,
    "unit" TEXT,
    "score" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentFitnessTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentPhoto" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "position" "public"."AssessmentPhotoPosition" NOT NULL,
    "consentAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssessmentReport" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "summary" TEXT,
    "recommendations" TEXT,
    "warnings" TEXT,
    "generatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssessmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysicalAssessment_studentId_assessmentDate_idx" ON "public"."PhysicalAssessment"("studentId", "assessmentDate" DESC);

-- CreateIndex
CREATE INDEX "PhysicalAssessment_trainerId_assessmentDate_idx" ON "public"."PhysicalAssessment"("trainerId", "assessmentDate" DESC);

-- CreateIndex
CREATE INDEX "PhysicalAssessment_status_assessmentDate_idx" ON "public"."PhysicalAssessment"("status", "assessmentDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentScreening_assessmentId_key" ON "public"."AssessmentScreening"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnamnesis_assessmentId_key" ON "public"."AssessmentAnamnesis"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentVitals_assessmentId_key" ON "public"."AssessmentVitals"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentCircumference_assessmentId_order_idx" ON "public"."AssessmentCircumference"("assessmentId", "order");

-- CreateIndex
CREATE INDEX "AssessmentCircumference_assessmentId_kind_side_idx" ON "public"."AssessmentCircumference"("assessmentId", "kind", "side");

-- CreateIndex
CREATE INDEX "AssessmentSkinfold_assessmentId_kind_measurementIndex_idx" ON "public"."AssessmentSkinfold"("assessmentId", "kind", "measurementIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentBodyComposition_assessmentId_key" ON "public"."AssessmentBodyComposition"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentFitnessTest_assessmentId_category_idx" ON "public"."AssessmentFitnessTest"("assessmentId", "category");

-- CreateIndex
CREATE INDEX "AssessmentPhoto_assessmentId_position_idx" ON "public"."AssessmentPhoto"("assessmentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentReport_assessmentId_key" ON "public"."AssessmentReport"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_pairKey_key" ON "public"."Friendship"("pairKey");

-- CreateIndex
CREATE INDEX "Friendship_status_idx" ON "public"."Friendship"("status");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "public"."Friendship"("addresseeId", "status");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_status_idx" ON "public"."Friendship"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "public"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_sessionId_revokedAt_idx" ON "public"."RefreshToken"("userId", "sessionId", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_familyId_idx" ON "public"."RefreshToken"("userId", "familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_active_user_idx" ON "public"."RefreshToken"("userId", "expiresAt" DESC) WHERE "revokedAt" IS NULL;

-- CreateIndex
CREATE INDEX "User_role_status_deletedAt_idx" ON "public"."User"("role", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_active_key" ON "public"."User"("email") WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_active_key" ON "public"."User"("username") WHERE "deletedAt" IS NULL AND "username" IS NOT NULL;

-- CreateIndex
CREATE INDEX "WorkoutDay_workoutPlanId_weekDay_idx" ON "public"."WorkoutDay"("workoutPlanId", "weekDay");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutDay_workoutPlanId_order_key" ON "public"."WorkoutDay"("workoutPlanId", "order");

-- CreateIndex
CREATE INDEX "Notification_unread_user_idx" ON "public"."Notification"("userId", "createdAt" DESC) WHERE "readAt" IS NULL;

ALTER TABLE "public"."TrainerProfile"
ADD CONSTRAINT "TrainerProfile_yearsExperience_check" CHECK ("yearsExperience" IS NULL OR "yearsExperience" >= 0);

ALTER TABLE "public"."WorkoutDay"
ADD CONSTRAINT "WorkoutDay_weekDay_check" CHECK ("weekDay" BETWEEN 1 AND 7),
ADD CONSTRAINT "WorkoutDay_estimatedMinutes_check" CHECK ("estimatedMinutes" > 0);

ALTER TABLE "public"."WorkoutExercise"
ADD CONSTRAINT "WorkoutExercise_sets_check" CHECK ("sets" > 0),
ADD CONSTRAINT "WorkoutExercise_restSeconds_check" CHECK ("restSeconds" >= 0);

ALTER TABLE "public"."WorkoutSession"
ADD CONSTRAINT "WorkoutSession_feelingPre_check" CHECK ("feelingPre" IS NULL OR "feelingPre" BETWEEN 1 AND 5),
ADD CONSTRAINT "WorkoutSession_feelingPost_check" CHECK ("feelingPost" IS NULL OR "feelingPost" BETWEEN 1 AND 5);

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "public"."RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhysicalAssessment" ADD CONSTRAINT "PhysicalAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhysicalAssessment" ADD CONSTRAINT "PhysicalAssessment_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentScreening" ADD CONSTRAINT "AssessmentScreening_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentAnamnesis" ADD CONSTRAINT "AssessmentAnamnesis_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentVitals" ADD CONSTRAINT "AssessmentVitals_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentCircumference" ADD CONSTRAINT "AssessmentCircumference_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentSkinfold" ADD CONSTRAINT "AssessmentSkinfold_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentBodyComposition" ADD CONSTRAINT "AssessmentBodyComposition_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentFitnessTest" ADD CONSTRAINT "AssessmentFitnessTest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentPhoto" ADD CONSTRAINT "AssessmentPhoto_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentPhoto" ADD CONSTRAINT "AssessmentPhoto_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssessmentReport" ADD CONSTRAINT "AssessmentReport_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."PhysicalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
