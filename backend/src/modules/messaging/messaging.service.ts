import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UserRole, MessageDirection, MessageStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { WhatsappWebhookDto } from './dto/whatsapp-webhook.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { NotificationService } from '../notification/notification.service';
import { AppointmentService } from '../appointment/appointment.service';
import { Inject, forwardRef } from '@nestjs/common';


@Injectable()
export class MessagingService {
    constructor(
        private prisma: PrismaService,
        private socketGateway: SocketGateway,
        private auditService: AuditService,
        private configService: ConfigService,
        private notificationService: NotificationService,
        @Inject(forwardRef(() => AppointmentService))
        private appointmentService: AppointmentService,
    ) { }



    async getConversations(user: CurrentUserPayload) {
        const { clinicId } = user;

        return this.prisma.conversation.findMany({
            where: { clinicId },
            include: { patient: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { lastMessageAt: 'desc' },
        });
    }

    async getMessages(user: CurrentUserPayload, conversationId: string, page: string | number = 1, limit: string | number = 50) {
        const { clinicId } = user;

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;

        const messages = await this.prisma.message.findMany({
            where: { clinicId, conversationId },
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
        });

        // Decrypt bodies
        return messages.map(msg => ({
            ...msg,
            body: msg.body ? CryptoUtil.decrypt(msg.body) : msg.body
        }));
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
                body: body ? CryptoUtil.encrypt(body) : body,
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

        const plainMessage = { ...message, body };

        // Emit to the specific conversation room for real-time update in chat window
        this.socketGateway.emitToConversation(conversationId, 'new_message', plainMessage);

        // Emit to clinic staff and relevant doctors for list updates
        this.socketGateway.emitToStaff(clinicId, 'conversation_updated', { id: conversationId, lastMessageAt: new Date() });

        // Find conversation to notify assigned user if any
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (conv?.assignedTo && conv.assignedTo !== userId) {
            this.socketGateway.emitToUser(conv.assignedTo, 'new_message', plainMessage);
        }

        // --- Outbound WhatsApp relay via n8n ---
        // Only send if conversation is in HUMAN mode (bot handles BOT mode itself)
        if (conv?.status === 'HUMAN') {
            await this.relayToWhatsApp(conv.waPhone, body, mediaUrl);

            // Update outbound timestamp + clear escalation reason (Bekleyen Mesaj badge clears)
            // Stay in HUMAN mode — auto-revert handled by 3-hour cron task
            const updatedConv = await this.prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    lastOutboundAt: new Date(),
                    escalationReason: null,
                },
                include: { patient: true },
            });

            // Notify frontend to refresh badge/list
            this.socketGateway.emitToStaff(clinicId, 'conversation_updated', updatedConv);
        }

        return message;
    }

    async handleInboundWebhook(data: WhatsappWebhookDto) {
        const { clinicId, waPhone, waMessageId, body, metadata } = data;
        const cleanPhone = waPhone.replace(/\D/g, '');

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
                    where: { clinicId, waPhone: cleanPhone },
                    include: { patient: true }
                });

                if (!conversation) {
                    const link = await this.prisma.phonePatientLink.findFirst({
                        where: { clinicId, waPhone: cleanPhone }
                    });

                    conversation = await this.prisma.conversation.create({
                        data: {
                            clinicId,
                            waPhone: cleanPhone,
                            patientId: link?.patientId
                        },
                        include: { patient: true }
                    });
                } else if (!conversation.patientId) {
                    // Try to link if not linked
                    const link = await this.prisma.phonePatientLink.findFirst({
                        where: { clinicId, waPhone: cleanPhone }
                    });
                    if (link) {
                        conversation = await this.prisma.conversation.update({
                            where: { id: conversation.id },
                            data: { patientId: link.patientId },
                            include: { patient: true }
                        });
                    }
                }

                // Auto-update patient info if metadata provided (e.g. from bot flow)
                if (conversation && metadata?.patientName && !conversation.patientId) {
                    const names = metadata.patientName.split(' ');
                    const firstName = names[0];
                    const lastName = names.slice(1).join(' ') || '-';

                    // Check if patient already exists (like Parent 2 scenario)
                    const existingPatient = await this.prisma.patient.findFirst({
                        where: {
                            clinicId,
                            firstName: { equals: firstName, mode: 'insensitive' },
                            lastName: { equals: lastName, mode: 'insensitive' }
                        }
                    });

                    let targetPatientId = existingPatient?.id;

                    if (!targetPatientId) {
                        // Kayıtsız numara: hasta bulunamadı, otomatik oluşturma yapılmıyor.
                        // Eskalasyon zaten n8n tarafından tetiklenecek.
                        console.warn('[Messaging] Unknown number — no matching patient found. Skipping auto-create.');
                        return;
                    }

                    // Create Phone Link if not exists
                    const existingLink = await this.prisma.phonePatientLink.findUnique({
                        where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } }
                    });
                    
                    if (!existingLink) {
                        await this.prisma.phonePatientLink.create({
                            data: { clinicId, waPhone: cleanPhone, patientId: targetPatientId }
                        });
                    }

                    conversation = await this.prisma.conversation.update({
                        where: { id: conversation.id },
                        data: { patientId: targetPatientId },
                        include: { patient: true }
                    });
                }

                if (!conversation) return;

                const messageDirection = data.direction === 'OUTBOUND' ? MessageDirection.OUTBOUND : MessageDirection.INBOUND;

                const message = await this.prisma.message.create({
                    data: {
                        clinicId,
                        conversationId: conversation.id,
                        waMessageId,
                        direction: messageDirection,
                        body: body ? CryptoUtil.encrypt(body) : body,
                        status: MessageStatus.READ,
                        metadata: metadata || {}
                    } as any,
                    include: { conversation: { include: { patient: { include: { appointments: { select: { doctorId: true } } } } } } }
                });

                await this.prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { 
                        lastMessageAt: new Date(), 
                        unreadCount: messageDirection === 'INBOUND' ? { increment: 1 } : undefined,
                        lastOutboundAt: messageDirection === 'OUTBOUND' ? new Date() : undefined
                    },
                });

                // WebSocket emits (real-time chat and list updates)
                const plainMessage = { ...message, body: body || '' };
                this.socketGateway.emitToConversation(conversation.id, 'new_message', plainMessage);
                this.socketGateway.emitToStaff(clinicId, 'conversation_updated', conversation);

                if ((message.conversation as any)?.patient?.appointments) {
                    const relevantDoctorIds = Array.from(new Set(
                        (message.conversation as any).patient.appointments.map((a: any) => a.doctorId)
                    ));
                    for (const docId of relevantDoctorIds) {
                        this.socketGateway.emitToUser(docId as string, 'new_message', plainMessage);
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
        const cleanPhone = waPhone.replace(/\D/g, '');
        const conv = await this.prisma.conversation.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } },
            include: { patient: true },
        });

        const mode = conv?.status || 'BOT';
        let doctorName: string | null = null;
        let doctorId: string | null = null;
        let combinedText = '';
        let patientName: string | null = null;
        let patientPatterns: any = null;
        let sentiment: 'HAPPY' | 'NEUTRAL' | 'ANGRY' = 'NEUTRAL';
        let resolvedPatientId: string | null = conv?.patientId || null;

        // --- phone2 / direct lookup (if conv has no patient yet) ---
        if (!resolvedPatientId) {
            // A. PhonePatientLink
            const link = await this.prisma.phonePatientLink.findUnique({
                where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } },
            });
            if (link) {
                resolvedPatientId = link.patientId;
            }
        }
        if (!resolvedPatientId) {
            // B. Patient.phone or Patient.phone2
            const byPhone = await this.prisma.patient.findFirst({
                where: { clinicId, OR: [{ phone: cleanPhone }, { phone2: cleanPhone }], isActive: true },
            });
            if (byPhone) {
                resolvedPatientId = byPhone.id;
                // Auto-create PhonePatientLink for next time
                await this.prisma.phonePatientLink.upsert({
                    where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } },
                    create: { clinicId, waPhone: cleanPhone, patientId: resolvedPatientId },
                    update: {},
                });
            }
        }

        const isRegistered = !!resolvedPatientId;

        if (conv) {
            if (conv.patient) {
                patientName = `${conv.patient.firstName} ${conv.patient.lastName}`;
            } else if (resolvedPatientId) {
                const p = await this.prisma.patient.findUnique({ where: { id: resolvedPatientId } });
                if (p) patientName = `${p.firstName} ${p.lastName}`;
            }

            // Fetch patient patterns
            if (resolvedPatientId) {
                patientPatterns = await this.appointmentService.getPatientPatterns(clinicId, resolvedPatientId);
            }

            // Find patient's most recent appointment to determine their doctor
            if (resolvedPatientId) {
                const lastAppointment = await this.prisma.appointment.findFirst({
                    where: { patientId: resolvedPatientId, clinicId },
                    orderBy: { startTime: 'desc' },
                    include: { doctor: { select: { id: true, firstName: true, lastName: true } } },
                });
                if (lastAppointment?.doctor) {
                    doctorId = lastAppointment.doctor.id;
                    doctorName = `Dr. ${lastAppointment.doctor.firstName} ${lastAppointment.doctor.lastName}`;
                }
            }

            // Fetch pending inbound messages for AI context
            const messages = await this.prisma.message.findMany({
                where: { 
                    conversationId: conv.id,
                    createdAt: { gt: conv.lastOutboundAt || new Date(0) }
                },
                orderBy: { createdAt: 'asc' },
            });

            // Filter only INBOUND and decrypt text
            const inboundTexts = messages
                .filter(m => m.direction === 'INBOUND' && m.contentType === 'TEXT' && m.body)
                .map(m => CryptoUtil.decrypt(m.body!));
            
            combinedText = inboundTexts.join('\n');

            // --- Simple Sentiment Analysis ---
            if (combinedText) {
                const text = combinedText.toLowerCase();
                const angryKeywords = ['yeter', 'bıktım', 'hata', 'şikayet', 'kötü', 'rezalet', 'bekliyorum', 'cevap verin', 'sinir'];
                const happyKeywords = ['teşekkür', 'sağol', 'harika', 'iyi', 'memnun', 'güzel'];

                const angryCount = angryKeywords.filter(k => text.includes(k)).length;
                const happyCount = happyKeywords.filter(k => text.includes(k)).length;

                if (angryCount > 0) sentiment = 'ANGRY';
                else if (happyCount > 1) sentiment = 'HAPPY';
            }

            // Mark these messages as processed by updating lastOutboundAt
            if (inboundTexts.length > 0) {
                await this.prisma.conversation.update({
                    where: { id: conv.id },
                    data: { lastOutboundAt: new Date() }
                });
            }
        }

        // Fetch all patients linked to this phone number
        const links = await this.prisma.phonePatientLink.findMany({
            where: { clinicId, waPhone: cleanPhone },
            include: { patient: true }
        });
        const linkedPatients = links.map(link => ({
            id: link.patient.id,
            name: `${link.patient.firstName} ${link.patient.lastName}`
        }));

        const isNewConversation = !conv;

        return {
            mode,
            isRegistered,
            isNewConversation,
            doctorName,
            doctorId,
            combinedText,
            patientName,
            patientPatterns,
            sentiment,
            linkedPatients,
        };
    }

    /** Get the latest inbound message ID for debounce — n8n checks this after waiting */
    async getLatestInboundId(clinicId: string, waPhone: string) {
        const cleanPhone = waPhone.replace(/\D/g, '');
        const conv = await this.prisma.conversation.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } },
        });
        if (!conv) return { latestWaMessageId: null };

        const latestMsg = await this.prisma.message.findFirst({
            where: { conversationId: conv.id, direction: 'INBOUND' },
            orderBy: { createdAt: 'desc' },
            select: { waMessageId: true },
        });
        return { latestWaMessageId: latestMsg?.waMessageId || null };
    }

    /** Get all inbound messages since the last outbound message and concatenate them */
    async getPendingInboundMessages(clinicId: string, waPhone: string) {
        const cleanPhone = waPhone.replace(/\D/g, '');
        const conv = await this.prisma.conversation.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } },
        });
        if (!conv) return { combinedText: '' };

        // Fetch messages since the last outbound message
        const messages = await this.prisma.message.findMany({
            where: { 
                conversationId: conv.id,
                createdAt: { gt: conv.lastOutboundAt || new Date(0) }
            },
            orderBy: { createdAt: 'asc' },
        });

        // Filter only INBOUND and decrypt text
        const inboundTexts = messages
            .filter(m => m.direction === 'INBOUND' && m.contentType === 'TEXT' && m.body)
            .map(m => CryptoUtil.decrypt(m.body!));

        return { combinedText: inboundTexts.join(' ') };
    }
    /** Mark conversation as seen — clears unreadCount + escalationReason badge */
    async markEscalationSeen(user: CurrentUserPayload, conversationId: string) {
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conv || conv.clinicId !== user.clinicId) return { ok: false };

        // Nothing to clear
        if (!conv.escalationReason && conv.unreadCount === 0) return { ok: true };

        const updated = await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { escalationReason: null, unreadCount: 0 },
            include: { patient: true },
        });
        this.socketGateway.emitToStaff(user.clinicId, 'conversation_updated', updated);
        return { ok: true };
    }

    /** Toggle humanModeLocked — prevents cron from auto-reverting to BOT */
    async toggleHumanLock(user: CurrentUserPayload, conversationId: string, locked: boolean) {
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conv || conv.clinicId !== user.clinicId) return { ok: false };

        const updated = await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { humanModeLocked: locked },
            include: { patient: true },
        });
        this.socketGateway.emitToStaff(user.clinicId, 'conversation_updated', updated);
        return { ok: true, locked: updated.humanModeLocked };
    }

    async escalate(clinicId: string, data: { waPhone: string; reason: string; urgency: string; summary: string }) {
        const { waPhone, reason, summary } = data;
        const cleanPhone = waPhone.replace(/\D/g, '');

        // 1. Find or create conversation
        let conv = await this.prisma.conversation.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone: cleanPhone } },
            include: { patient: true }
        });

        if (!conv) {
            // Check for existing patient link
            const link = await this.prisma.phonePatientLink.findFirst({
                where: { clinicId, waPhone: cleanPhone }
            });

            conv = await this.prisma.conversation.create({
                data: {
                    clinicId,
                    waPhone: cleanPhone,
                    status: 'HUMAN',
                    humanModeAt: new Date(),
                    patientId: link?.patientId,
                    escalationReason: reason.substring(0, 50)
                },
                include: { patient: true }
            }) as any;
        } else {
            // If conversation exists but patient is not linked, try to link it
            let patientIdToUpdate = conv.patientId;
            if (!patientIdToUpdate) {
                const link = await this.prisma.phonePatientLink.findFirst({
                    where: { clinicId, waPhone: cleanPhone }
                });
                patientIdToUpdate = link?.patientId || null;
            }

            conv = await this.prisma.conversation.update({
                where: { id: (conv as any).id },
                data: {
                    status: 'HUMAN',
                    humanModeAt: new Date(),
                    escalationReason: reason.substring(0, 50),
                    patientId: patientIdToUpdate
                },
                include: { patient: true }
            }) as any;
        }

        if (!conv) return { success: false, message: 'Konuşma bulunamadı' };

        // 2. Notifications
        const patientName = (conv as any).patient ? `${(conv as any).patient.firstName} ${(conv as any).patient.lastName}` : cleanPhone;
        const note = `🔴 Eskalasyon (${reason}): ${patientName}\nÖzet: ${summary}`;

        // Notify staff via WebSocket
        this.socketGateway.emitToStaff(clinicId, 'conversation_escalated', {
            conversationId: (conv as any).id,
            reason,
            summary,
            patientName
        });

        // System notification for assistants and admins
        const staffToNotify = await this.prisma.user.findMany({ 
            where: { clinicId, role: { in: ['ASSISTANT', 'ADMIN'] } } 
        });
        for (const staff of staffToNotify) {
            await this.notificationService.create(clinicId, staff.id, {
                type: 'ESCALATION',
                title: 'Asistan Desteği Bekleniyor',
                body: note,
            });
            this.socketGateway.emitToUser(staff.id, 'notification', { message: note });
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
