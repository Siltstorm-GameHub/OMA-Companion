-- Spendenpool: wiederkehrende Fixkosten (Hosting, Domains …), die vor den Zielen gedeckt werden,
-- und Verknüpfung von Ausgaben mit der bezahlten Fixkosten-Position.
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden. Der Build gleicht das Schema
-- ohnehin per db push ab (scripts/db-push.mjs).

-- CreateTable
CREATE TABLE IF NOT EXISTS "PoolFixedCost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolFixedCost_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PoolExpense" ADD COLUMN IF NOT EXISTS "fixedCostId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PoolExpense" ADD CONSTRAINT "PoolExpense_fixedCostId_fkey"
    FOREIGN KEY ("fixedCostId") REFERENCES "PoolFixedCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
