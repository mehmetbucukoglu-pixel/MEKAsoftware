import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateDocumentDto, UpdateDocumentDto, ShareDocumentDto } from './dto/document.dto';
import { CreateTeamspaceDto, UpdateTeamspaceDto, AddTeamspaceMembersDto } from './dto/teamspace.dto';

@Injectable()
export class WorkspaceService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService
    ) { }

    async createDocument(clinicId: string, creatorId: string, dto: CreateDocumentDto) {
        console.log('Creating document:', { clinicId, creatorId, dto });
        try {
            const doc = await this.prisma.workspaceDocument.create({
                data: {
                    title: dto.title,
                    content: dto.content || '[]',
                    icon: dto.icon,
                    order: dto.order ?? 0,
                    clinic: { connect: { id: clinicId } },
                    creator: { connect: { id: creatorId } },
                    ...(dto.teamspaceId ? { teamspace: { connect: { id: dto.teamspaceId } } } : {})
                },
            });
            console.log('Document created successfully:', doc.id);
            return doc;
        } catch (error) {
            console.error('Error creating document in service:', error);
            throw error;
        }
    }

    async findAllDocuments(clinicId: string, userId: string) {
        return this.prisma.workspaceDocument.findMany({
            where: {
                clinicId,
                OR: [
                    { creatorId: userId },
                    { collaborators: { some: { id: userId } } },
                    { teamspace: { members: { some: { id: userId } } } }
                ]
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                collaborators: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            },
            orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
        });
    }

    async findOneDocument(clinicId: string, id: string) {
        const doc = await this.prisma.workspaceDocument.findFirst({
            where: { id, clinicId },
            include: {
                creator: {
                    select: { id: true, firstName: true, lastName: true }
                },
                collaborators: {
                    select: { id: true, firstName: true, lastName: true }
                },
                tasks: {
                    include: {
                        assignee: true,
                    },
                },
            },
        });
        if (!doc) throw new NotFoundException('Döküman bulunamadı');
        return doc;
    }

    async updateDocument(clinicId: string, id: string, dto: UpdateDocumentDto) {
        return this.prisma.workspaceDocument.update({
            where: { id },
            data: dto,
        });
    }

    async shareDocument(clinicId: string, id: string, dto: ShareDocumentDto) {
        const doc = await this.prisma.workspaceDocument.update({
            where: { id, clinicId },
            data: {
                collaborators: {
                    set: dto.userIds.map(userId => ({ id: userId }))
                }
            },
            include: {
                collaborators: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        // Bildirim gönder
        for (const userId of dto.userIds) {
            await this.notificationService.create(clinicId, userId, {
                type: 'WORKSPACE_DOCUMENT',
                title: 'Belge Paylaşımı',
                body: `"${doc.title}" isimli çalışma belgesi sizinle paylaşıldı.`,
                entityType: 'WORKSPACE_DOCUMENT',
                entityId: doc.id
            });
        }

        return doc;
    }

    async removeDocument(clinicId: string, id: string) {
        return this.prisma.workspaceDocument.delete({
            where: { id },
        });
    }

    // =====================================
    // TEAMSPACE METHODS
    // =====================================

    async createTeamspace(clinicId: string, creatorId: string, dto: CreateTeamspaceDto) {
        return this.prisma.teamspace.create({
            data: {
                name: dto.name,
                description: dto.description,
                icon: dto.icon,
                clinic: { connect: { id: clinicId } },
                creator: { connect: { id: creatorId } },
                members: { connect: { id: creatorId } }, // Add creator to members automatically
            }
        });
    }

    async findAllTeamspaces(clinicId: string, userId: string) {
        return this.prisma.teamspace.findMany({
            where: {
                clinicId,
                members: { some: { id: userId } }
            },
            include: {
                members: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    async addTeamspaceMembers(clinicId: string, teamspaceId: string, dto: AddTeamspaceMembersDto) {
        const ts = await this.prisma.teamspace.update({
            where: { id: teamspaceId, clinicId },
            data: {
                members: {
                    connect: dto.userIds.map(id => ({ id }))
                }
            },
            include: {
                members: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        // Bildirim gönder
        for (const userId of dto.userIds) {
            await this.notificationService.create(clinicId, userId, {
                type: 'WORKSPACE_TEAMSPACE',
                title: 'Yeni Çalışma Alanı',
                body: `"${ts.name}" isimli çalışma alanına eklendiniz.`,
                entityType: 'TEAMSPACE',
                entityId: ts.id
            });
        }

        return ts;
    }

    async deleteTeamspace(clinicId: string, id: string) {
        return this.prisma.teamspace.delete({
            where: { id, clinicId }
        });
    }
}
