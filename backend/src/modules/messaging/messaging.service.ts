import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UserRole, MessageDirection, MessageStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { WhatsappWebhookDto } from './dto/whatsapp-webhook.dto';

import { NotificationService } from '../notification/notification.service';

@Injectable()
export class MessagingService {
    constructor(
        private prisma: PrismaService,
        private socketGateway: SocketGateway,
        private auditService: AuditService,
        private configService: ConfigService,
        private notificationService: NotificationService,
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

        // --- Outbound WhatsApp relay via n8n ---
        // Only send if conversation is in HUMAN mode (bot handles BOT mode itself)
        if (conv?.status === 'HUMAN') {
            await this.relayToWhatsApp(conv.waPhone, body, mediaUrl);
        }

        return message;
    }

    async handleInboundWebhook(data: WhatsappWebhookDto) {
        const { clinicId, waPhone, waMessageId, body, metadata } = data;

        // Start async processing block
        (async () => {
            try {
                // Idempotency: check if message exists
                const existing = await this.prisma.message.findFirst({
                    where: { clinicId, waMessageId },
                });
                if (existing) return;

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
                            registrationStatus: 'PRE_REGISTERED'
                        }
                    });

                    await this.prisma.conversation.update({
                        where: { id: conversation.id },
                        data: { patientId: patient.id }
                    });

                    // Re-fetch conversation
                    const updatedConv = await this.prisma.conversation.findUnique({
                        where: { id: conversation.id },
                        include: { patient: true }
                    });
                    if (updatedConv) conversation = updatedConv as any;
                }

                if (!conversation) return;

                const message = await this.prisma.message.create({
                    data: {
                        clinicId,
                        conversationId: conversation.id,
                        waMessageId,
                        direction: MessageDirection.INBOUND,
                        body,
                        status: MessageStatus.READ,
                        metadata: metadata || {}
                    } as any,
                    include: { conversation: { include: { patient: { include: { appointments: { select: { doctorId: true } } } } } } }
                });

                await this.prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
                });

                // WebSocket emits (real-time chat and list updates)
                this.socketGateway.emitToConversation(conversation.id, 'new_message', message);
                this.socketGateway.emitToStaff(clinicId, 'conversation_updated', conversation);

                if ((message.conversation as any)?.patient?.appointments) {
                    const relevantDoctorIds = Array.from(new Set(
                        (message.conversation as any).patient.appointments.map((a: any) => a.doctorId)
                    ));
                    for (const docId of relevantDoctorIds) {
                        this.socketGateway.emitToUser(docId as string, 'new_message', message);
                        this.socketGateway.emitToUser(docId as string, 'conversation_updated', conversation);
                    }
                }
            } catch (err) {
                console.error('[Messaging] Async webhook processing error:', err);
            }
        })();

        return { success: true, message: 'Processing started' };
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
            data: {
                status: mode,
                assignedTo,
                humanModeAt: mode === 'HUMAN' ? new Date() : null
            },
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

    async getStatusByPhone(clinicId: string, waPhone: string) {
        const conv = await this.prisma.conversation.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone } }
        });
        return conv?.status || 'BOT';
    }

    async escalate(clinicId: string, data: { waPhone: string; reason: string; urgency: string; summary: string }) {
        const { waPhone, reason, summary } = data;

        // 1. Find or create conversation
        let conv = await this.prisma.conversation.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone } },
            include: { patient: true }
        });

        if (!conv) {
            conv = await this.prisma.conversation.create({
                data: { clinicId, waPhone, status: 'HUMAN', humanModeAt: new Date() },
                include: { patient: true }
            }) as any;
        } else {
            conv = await this.prisma.conversation.update({
                where: { id: (conv as any).id },
                data: { status: 'HUMAN', humanModeAt: new Date(), escalationReason: reason.substring(0, 50) },
                include: { patient: true }
            }) as any;
        }

        if (!conv) return { success: false, message: 'Konuşma bulunamadı' };

        // 2. Notifications
        const patientName = (conv as any).patient ? `${(conv as any).patient.firstName} ${(conv as any).patient.lastName}` : waPhone;
        const note = `🔴 Eskalasyon (${reason}): ${patientName}\nÖzet: ${summary}`;

        // Notify staff via WebSocket
        this.socketGateway.emitToStaff(clinicId, 'conversation_escalated', {
            conversationId: (conv as any).id,
            reason,
            summary,
            patientName
        });

        // System notification for assistants
        const assistants = await this.prisma.user.findMany({ where: { clinicId, role: 'ASSISTANT' } });
        for (const assistant of assistants) {
            await this.notificationService.create(clinicId, assistant.id, {
                type: 'ESCALATION',
                title: 'Acil Müdahale Gerekli',
                body: note,
                entityType: 'CONVERSATION',
                entityId: (conv as any).id
            });
            this.socketGateway.emitToUser(assistant.id, 'notification', { message: note });
        }

        // If patient has a doctor, notify them too
        if ((conv as any).patientId) {
            const lastAppt = await this.prisma.appointment.findFirst({
                where: { patientId: (conv as any).patientId },
                orderBy: { startTime: 'desc' }
            });
            if (lastAppt?.doctorId) {
                await this.notificationService.create(clinicId, lastAppt.doctorId, {
                    type: 'ESCALATION',
                    title: 'Hastanızdan Soru Var',
                    body: note,
                    entityType: 'CONVERSATION',
                    entityId: (conv as any).id
                });
                this.socketGateway.emitToUser(lastAppt.doctorId, 'notification', { message: note });
            }
        }

        return { success: true, conversationId: (conv as any).id };
    }



    // --- Private Helpers ---

    /**
     * Calls n8n outbound webhook to send a WhatsApp message via Meta Cloud API.
     * Gracefully degrades: if not configured or call fails, logs error but does not throw.
     */
    private async relayToWhatsApp(waPhone: string, body?: string, mediaUrl?: string) {
        const webhookUrl = this.configService.get<string>('N8N_OUTBOUND_WEBHOOK_URL');
        const secret = this.configService.get<string>('N8N_WEBHOOK_SECRET');

        if (!webhookUrl) {
            console.warn('[Messaging] N8N_OUTBOUND_WEBHOOK_URL not configured — skipping WhatsApp relay.');
            return;
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-n8n-secret': secret || '',
                },
                body: JSON.stringify({ to: waPhone, message: body, mediaUrl }),
            });

            if (!response.ok) {
                console.error(`[Messaging] n8n outbound relay failed: ${response.status} ${await response.text()}`);
            }
        } catch (err) {
            console.error('[Messaging] n8n outbound relay error:', err);
        }
    }
}

