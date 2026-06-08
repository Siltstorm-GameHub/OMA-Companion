-- AlterTable: Discord-Kanal-ID pro Event (optional, überschreibt globale Env-Var)
ALTER TABLE "Event" ADD COLUMN "discordChannelId" TEXT;
