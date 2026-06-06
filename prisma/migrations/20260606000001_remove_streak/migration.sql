-- Remove activity streak fields from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "streak";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastActiveAt";
