-- CreateTable
CREATE TABLE "MancaveItem" (
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MancaveItem_pkey" PRIMARY KEY ("userId","itemKey")
);

-- AddForeignKey
ALTER TABLE "MancaveItem" ADD CONSTRAINT "MancaveItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
