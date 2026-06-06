-- CreateTable: Spendenpool
CREATE TABLE "Donation" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "amount"    DOUBLE PRECISION NOT NULL,
    "month"     INTEGER NOT NULL,
    "year"      INTEGER NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- UniqueConstraint: eine Spende pro User pro Monat
CREATE UNIQUE INDEX "Donation_userId_month_year_key" ON "Donation"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
