-- CreateEnum
CREATE TYPE "public"."StudentImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_READY', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."StudentImportSourcePlatform" AS ENUM ('UNKNOWN', 'GENERIC_PDF');

-- CreateEnum
CREATE TYPE "public"."StudentImportIssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."StudentImportMatchStatus" AS ENUM ('AUTO_MATCHED', 'MANUAL_REVIEW', 'UNMATCHED');

-- CreateTable
CREATE TABLE "public"."StudentImportJob" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "sourcePlatform" "public"."StudentImportSourcePlatform" NOT NULL DEFAULT 'UNKNOWN',
    "status" "public"."StudentImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "rawExtractedText" TEXT,
    "parsedData" JSONB,
    "mappingSummary" JSONB,
    "errorMessage" TEXT,
    "confirmedStudentId" TEXT,
    "confirmedPlanId" TEXT,
    "confirmedAssessmentId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StudentImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentImportIssue" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "severity" "public"."StudentImportIssueSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "suggestedValue" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentImportIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentImportExerciseMatch" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawExerciseName" TEXT NOT NULL,
    "normalizedExerciseName" TEXT NOT NULL,
    "matchedExerciseLibraryId" TEXT,
    "matchedExerciseName" TEXT,
    "confidence" DECIMAL(4,3),
    "status" "public"."StudentImportMatchStatus" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StudentImportExerciseMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentImportJob_createdByUserId_createdAt_idx" ON "public"."StudentImportJob"("createdByUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StudentImportJob_status_createdAt_idx" ON "public"."StudentImportJob"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StudentImportJob_sourcePlatform_createdAt_idx" ON "public"."StudentImportJob"("sourcePlatform", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StudentImportIssue_importJobId_severity_idx" ON "public"."StudentImportIssue"("importJobId", "severity");

-- CreateIndex
CREATE INDEX "StudentImportExerciseMatch_importJobId_status_idx" ON "public"."StudentImportExerciseMatch"("importJobId", "status");

-- CreateIndex
CREATE INDEX "StudentImportExerciseMatch_matchedExerciseLibraryId_idx" ON "public"."StudentImportExerciseMatch"("matchedExerciseLibraryId");

-- AddForeignKey
ALTER TABLE "public"."StudentImportJob" ADD CONSTRAINT "StudentImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentImportIssue" ADD CONSTRAINT "StudentImportIssue_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "public"."StudentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentImportExerciseMatch" ADD CONSTRAINT "StudentImportExerciseMatch_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "public"."StudentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentImportExerciseMatch" ADD CONSTRAINT "StudentImportExerciseMatch_matchedExerciseLibraryId_fkey" FOREIGN KEY ("matchedExerciseLibraryId") REFERENCES "public"."ExerciseLibrary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
