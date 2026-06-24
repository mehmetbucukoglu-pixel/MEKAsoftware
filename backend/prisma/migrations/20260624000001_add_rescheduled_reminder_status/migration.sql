-- AlterEnum: Add RESCHEDULED value to ReminderStatus enum
ALTER TYPE "ReminderStatus" ADD VALUE IF NOT EXISTS 'RESCHEDULED';
