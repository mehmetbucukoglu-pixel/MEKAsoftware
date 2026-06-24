-- AlterTable: Add appointmentConfirmed column to notification_preferences
ALTER TABLE "notification_preferences" 
ADD COLUMN IF NOT EXISTS "appointment_confirmed" BOOLEAN NOT NULL DEFAULT true;
