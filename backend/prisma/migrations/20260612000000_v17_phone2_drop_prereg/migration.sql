-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'CANCELLED');

-- DropIndex
DROP INDEX "patients_clinic_id_phone_key";

-- DropIndex  
DROP INDEX "patients_clinic_id_tc_kimlik_hash_key";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "reference_code" VARCHAR(10), ADD COLUMN "reminder_status" "ReminderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "escalation_reason" VARCHAR(50), ADD COLUMN "human_mode_at" TIMESTAMPTZ, ADD COLUMN "human_mode_locked" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "last_outbound_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN IF EXISTS "tc_kimlik", DROP COLUMN IF EXISTS "tc_kimlik_hash", ADD COLUMN IF NOT EXISTS "phone2" VARCHAR(20);

-- CreateTable
CREATE TABLE IF NOT EXISTS "phone_patient_links" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "wa_phone" VARCHAR(20) NOT NULL,
    "patient_id" UUID NOT NULL,
    "linked_by" VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP_BOT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phone_patient_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "phone_patient_links_clinic_id_wa_phone_key" ON "phone_patient_links"("clinic_id", "wa_phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_reference_code_key" ON "appointments"("reference_code");

-- AddForeignKey
ALTER TABLE "phone_patient_links" ADD CONSTRAINT "phone_patient_links_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_patient_links" ADD CONSTRAINT "phone_patient_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
