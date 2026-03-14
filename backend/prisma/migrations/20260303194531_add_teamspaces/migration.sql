-- AlterTable
ALTER TABLE "workspace_documents" ADD COLUMN     "teamspace_id" UUID;

-- CreateTable
CREATE TABLE "teamspaces" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teamspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeamspaceMembers" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TeamspaceMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "teamspaces_clinic_id_idx" ON "teamspaces"("clinic_id");

-- CreateIndex
CREATE INDEX "_TeamspaceMembers_B_index" ON "_TeamspaceMembers"("B");

-- AddForeignKey
ALTER TABLE "workspace_documents" ADD CONSTRAINT "workspace_documents_teamspace_id_fkey" FOREIGN KEY ("teamspace_id") REFERENCES "teamspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teamspaces" ADD CONSTRAINT "teamspaces_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teamspaces" ADD CONSTRAINT "teamspaces_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamspaceMembers" ADD CONSTRAINT "_TeamspaceMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "teamspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamspaceMembers" ADD CONSTRAINT "_TeamspaceMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
