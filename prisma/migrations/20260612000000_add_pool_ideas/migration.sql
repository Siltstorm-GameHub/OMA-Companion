CREATE TABLE "PoolIdea" (
    "id"            TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoolIdea_pkey" PRIMARY KEY ("id")
);
