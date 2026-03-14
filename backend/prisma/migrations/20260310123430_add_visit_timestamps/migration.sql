-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "arrived_at" TIMESTAMPTZ,
ADD COLUMN     "completed_at" TIMESTAMPTZ;
