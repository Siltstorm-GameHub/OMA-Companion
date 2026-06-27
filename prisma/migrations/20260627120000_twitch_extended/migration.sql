-- AlterTable User: add twitchLogin
ALTER TABLE "User" ADD COLUMN "twitchLogin" TEXT;
CREATE UNIQUE INDEX "User_twitchLogin_key" ON "User"("twitchLogin");

-- AlterTable Event: add twitchClipUrl
ALTER TABLE "Event" ADD COLUMN "twitchClipUrl" TEXT;

-- CreateTable EventClipSubmission
CREATE TABLE "EventClipSubmission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clipUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventClipSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventClipSubmission_eventId_userId_key" ON "EventClipSubmission"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventClipSubmission" ADD CONSTRAINT "EventClipSubmission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClipSubmission" ADD CONSTRAINT "EventClipSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
