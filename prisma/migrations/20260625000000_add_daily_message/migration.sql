-- CreateTable
CREATE TABLE "DailyMessage" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3) NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DailyMessage" ADD CONSTRAINT "DailyMessage_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
