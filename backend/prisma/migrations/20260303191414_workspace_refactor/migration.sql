-- AlterTable
ALTER TABLE "workspace_documents" ADD COLUMN     "icon" VARCHAR(50),
ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "_DocumentCollaborators" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DocumentCollaborators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DocumentCollaborators_B_index" ON "_DocumentCollaborators"("B");

-- AddForeignKey
ALTER TABLE "_DocumentCollaborators" ADD CONSTRAINT "_DocumentCollaborators_A_fkey" FOREIGN KEY ("A") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentCollaborators" ADD CONSTRAINT "_DocumentCollaborators_B_fkey" FOREIGN KEY ("B") REFERENCES "workspace_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
