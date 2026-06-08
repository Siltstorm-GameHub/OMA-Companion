CREATE TABLE "BotConfig" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("key")
);
