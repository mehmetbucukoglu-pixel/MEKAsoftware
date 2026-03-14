import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UserRole, MessageDirection, MessageStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { WhatsappWebhookDto } from './dto/whatsapp-webhook.dto';

@Injectable()
export class MessagingService {
    constructor(
        private prisma: PrismaService,
        private socketGateway: SocketGateway,
        private auditService: AuditService
    ) { }

    async getConversations(user: CurrentUserPayload) {
        const { clinicId, userId, role } = user;

        if (role === UserRole.ADMIN || role === UserRole.ASSISTANT) {
            return this.prisma.conversation.findMany({
                where: { clinicId },
                include: { patient: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { lastMessageAt: 'desc' },
            });
        }

        // For DOCTOR: Filter by assignment OR patients with appointments
        return this.prisma.conversation.findMany({
            where: {
                clinicId,
                OR: [
                    { assignedTo: userId },
                    {
                        patient: {
                            appointments: {
                                some: { doctorId: userId }
                            }
                        }
                    }
                ]
            },
            include: { patient: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { lastMessageAt: 'desc' },
        });
    }

    async getMessages(user: CurrentUserPayload, conversationId: string, page = 1, limit = 50) {
        const { clinicId, userId, role } = user;

        // Security check for DOCTOR
        if (role === UserRole.DOCTOR) {
            const hasAccess = await this.prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    clinicId,
                    OR: [
                        { assignedTo: userId },
                        {
                            patient: {
                                appointments: {
                                    some: { doctorId: userId }
                                }
                            }
                        }
                    ]
                }
            });
            if (!hasAccess) throw new ForbiddenException('Bu konuşmaya erişim yetkiniz yok.');
        }

        return this.prisma.message.findMany({
            where: { clinicId, conversationId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    async sendMessage(
        user: CurrentUserPayload,
        conversationId: string,
        body: string,
        mediaUrl?: string,
        mediaType?: string,
        ipAddress?: string,
        userAgent?: string
    ) {
        const { clinicId, userId } = user;
        const message = await this.prisma.message.create({
            data: {
                clinicId,
                conversationId,
                direction: MessageDirection.OUTBOUND,
                body,
                mediaUrl,
                status: MessageStatus.SENT,
                createdBy: userId
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
        });

        // Audit Log
        await this.auditService.create({
            clinicId,
            userId,
            action: 'SEND_MESSAGE',
            entityType: 'CONVERSATION',
            entityId: conversationId,
            newValues: { messageId: message.id, body: body?.substring(0, 50) },
            ipAddress
        });

        // Emit to the specific conversation room for real-time update in chat window
        this.socketGateway.emitToConversation(conversationId, 'new_message', message);

        // Emit to clinic staff and relevant doctors for list updates
        this.socketGateway.emitToStaff(clinicId, 'conversation_updated', { id: conversationId, lastMessageAt: new Date() });

        // Find conversation to notify assigned user if any
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (conv?.assignedTo && conv.assignedTo !== userId) {
            this.socketGateway.emitToUser(conv.assignedTo, 'new_message', message);
        }

        return message;
    }

    async handleInboundWebhook(data: WhatsappWebhookDto) {
        const { clinicId, waPhone, waMessageId, body, mediaUrl, mediaType, metadata } = data;
        // Idempotency: check if message exists
        const existing = await this.prisma.message.findFirst({
            where: { clinicId, waMessageId },
        });
        if (existing) return existing;

        // Find or create conversation
        let conversation = await this.prisma.conversation.findFirst({
            where: { clinicId, waPhone },
            include: { patient: true }
        });

        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: { clinicId, waPhone },
                include: { patient: true }
            });
        }

        // Auto-update patient info if metadata provided (e.g. from bot flow)
        if (conversation && metadata?.patientName && !conversation.patientId) {
            const names = metadata.patientName.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ') || '-';

            const patient = await this.prisma.patient.create({
                data: {
                    clinicId,
                    firstName,
                    lastName,
                    phone: waPhone,
                } as any
            });

            await this.prisma.conversation.update({
                where: { id: conversation.id },
                data: { patientId: patient.id }
            });

            // Re-fetch conversation to include updated patient
            const updatedConv = await this.prisma.conversation.findUnique({
                where: { id: conversation.id },
                include: { patient: true }
            });
            if (updatedConv) conversation = updatedConv as any;
        }

        if (!conversation) return null;

        const message = await this.prisma.message.create({
            data: {
                clinicId,
                conversationId: conversation.id,
                waMessageId,
                direction: MessageDirection.INBOUND,
                body,
                mediaUrl,
                status: MessageStatus.READ,
                metadata: metadata || {}
            } as any,
            include: { conversation: { include: { patient: { include: { appointments: { select: { doctorId: true } } } } } } }
        });

        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
        });

        // Real-time message in the specific conversation room
        this.socketGateway.emitToConversation(conversation.id, 'new_message', message);

        // List update notification for staff
        this.socketGateway.emitToStaff(clinicId, 'conversation_updated', conversation);

        if (message.conversation?.patient?.appointments) {
            const relevantDoctorIds = Array.from(new Set(
                message.conversation.patient.appointments.map(a => a.doctorId)
            ));
            for (const docId of relevantDoctorIds) {
                this.socketGateway.emitToUser(docId, 'new_message', message);
                this.socketGateway.emitToUser(docId, 'conversation_updated', conversation);
            }
        }

        return message;
    }

    async switchMode(
        user: CurrentUserPayload,
        conversationId: string,
        mode: 'BOT' | 'HUMAN',
        assignedTo?: string,
        ipAddress?: string,
        userAgent?: string
    ) {
        const result = await this.prisma.conversation.update({
            where: { id: conversationId, clinicId: user.clinicId },
            data: { status: mode, assignedTo },
        });

        await this.auditService.create({
            clinicId: user.clinicId,
            userId: user.userId,
            action: mode === 'HUMAN' ? 'ACTIVATE_HUMAN_MODE' : 'ACTIVATE_BOT_MODE',
            entityType: 'CONVERSATION',
            entityId: conversationId,
            newValues: { mode, assignedTo },
            ipAddress
        });

        return result;
    }
}
