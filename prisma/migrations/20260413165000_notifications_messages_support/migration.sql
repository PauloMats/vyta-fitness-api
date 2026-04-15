ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE';
ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'ASSESSMENT';
ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'WORKOUT';

CREATE TYPE "public"."MessageCategory" AS ENUM ('GENERAL', 'SUPPORT', 'REMINDER', 'TRAINING', 'ASSESSMENT');
CREATE TYPE "public"."SupportCategory" AS ENUM ('STUDENT_REGISTRATION', 'PAYMENTS', 'ABOUT_APP', 'QUESTIONS', 'OTHER');
CREATE TYPE "public"."SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TABLE "public"."DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "trainerId" TEXT,
    "studentId" TEXT,
    "subject" TEXT,
    "category" "public"."MessageCategory",
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(3),
    "meta" JSONB,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "public"."SupportCategory" NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "public"."SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "emailSentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Notification"
  ADD COLUMN "recipientId" TEXT,
  ADD COLUMN "senderId" TEXT,
  ADD COLUMN "directMessageId" TEXT,
  ADD COLUMN "supportTicketId" TEXT,
  ADD COLUMN "body" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "actionHref" TEXT,
  ADD COLUMN "actionLabel" TEXT,
  ADD COLUMN "meta" JSONB,
  ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "public"."Notification"
SET
  "recipientId" = "userId",
  "body" = "message",
  "meta" = "data",
  "updatedAt" = "createdAt";

ALTER TABLE "public"."Notification"
  ALTER COLUMN "recipientId" SET NOT NULL,
  ALTER COLUMN "body" SET NOT NULL;

ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";
DROP INDEX IF EXISTS "public"."Notification_userId_createdAt_idx";
DROP INDEX IF EXISTS "public"."Notification_userId_readAt_idx";

ALTER TABLE "public"."Notification"
  DROP COLUMN "userId",
  DROP COLUMN "message",
  DROP COLUMN "data";

CREATE UNIQUE INDEX "Notification_directMessageId_key" ON "public"."Notification"("directMessageId");
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "public"."Notification"("recipientId", "createdAt");
CREATE INDEX "Notification_recipientId_readAt_idx" ON "public"."Notification"("recipientId", "readAt");
CREATE INDEX "Notification_senderId_createdAt_idx" ON "public"."Notification"("senderId", "createdAt");

CREATE INDEX "DirectMessage_senderId_createdAt_idx" ON "public"."DirectMessage"("senderId", "createdAt");
CREATE INDEX "DirectMessage_recipientId_createdAt_idx" ON "public"."DirectMessage"("recipientId", "createdAt");
CREATE INDEX "DirectMessage_trainerId_studentId_createdAt_idx" ON "public"."DirectMessage"("trainerId", "studentId", "createdAt");

CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "public"."SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "public"."SupportTicket"("status", "createdAt");

ALTER TABLE "public"."Notification"
  ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Notification_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "public"."DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Notification_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "public"."SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."DirectMessage"
  ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SupportTicket"
  ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
