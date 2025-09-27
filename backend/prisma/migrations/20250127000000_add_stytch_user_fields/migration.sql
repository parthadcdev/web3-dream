-- Add Stytch user fields to users table
ALTER TABLE "users" ADD COLUMN "stytchUserId" TEXT;
ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT;

-- Create unique index for stytchUserId
CREATE UNIQUE INDEX "users_stytchUserId_key" ON "users"("stytchUserId");
