-- Check-in, geplante Veröffentlichung, Veröffentlichungs-Status, Spiel um Platz 3

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "checkInEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "checkInMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Event" ADD COLUMN "publishAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "publishStateJson" TEXT;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN "checkedInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "isThirdPlace" BOOLEAN NOT NULL DEFAULT false;
