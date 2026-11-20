-- Event-Anmeldung: optionaler Anmeldeschluss und Warteliste für volle Events.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "registrationClosesAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventWaitlistEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventWaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventWaitlistEntry_eventId_userId_key" ON "EventWaitlistEntry"("eventId", "userId");
CREATE INDEX "EventWaitlistEntry_eventId_createdAt_idx" ON "EventWaitlistEntry"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventWaitlistEntry" ADD CONSTRAINT "EventWaitlistEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventWaitlistEntry" ADD CONSTRAINT "EventWaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
