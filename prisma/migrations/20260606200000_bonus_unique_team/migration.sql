-- Drop old unique constraint (userId, type)
ALTER TABLE "BonusPrediction" DROP CONSTRAINT IF EXISTS "BonusPrediction_userId_type_key";

-- Add new unique constraint (userId, type, team)
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_userId_type_team_key" UNIQUE ("userId", "type", "team");
