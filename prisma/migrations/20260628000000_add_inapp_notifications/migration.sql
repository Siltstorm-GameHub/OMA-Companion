-- CreateTable
CREATE TABLE "inappnotification" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inappnotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inappnotification_userid_read_idx" ON "inappnotification"("userid", "read");

-- AddForeignKey
ALTER TABLE "inappnotification" ADD CONSTRAINT "inappnotification_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add notificationPrefs to User
ALTER TABLE "User" ADD COLUMN "notificationPrefs" TEXT NOT NULL DEFAULT '{}';
