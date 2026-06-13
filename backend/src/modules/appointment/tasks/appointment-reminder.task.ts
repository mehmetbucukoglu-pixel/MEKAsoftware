import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MessagingService } from '../../messaging/messaging.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppointmentReminderTask {
    private readonly logger = new Logger(AppointmentReminderTask.name);

    constructor(
        private prisma: PrismaService,
        private messagingService: MessagingService,
        private configService: ConfigService
    ) { }

    // ── Her 5 dakikada: biten randevuları COMPLETED yap ─────────────────────
    // İleride bu hook üzerinden doktora "işlem bildirimi" gönderilebilir.
    @Cron('*/5 * * * *')
    async handleAutoCompleteAppointments() {
        const now = new Date();
        const result = await this.prisma.appointment.updateMany({
            where: {
                endTime: { lt: now },
                status: 'CONFIRMED',
            },
            data: { status: 'COMPLETED' },
        });

        if (result.count > 0) {
            this.logger.log(`[AutoComplete] ${result.count} randevu COMPLETED yapıldı.`);
            // TODO: İleride burada doktora bildirim gönder
            // await this.notificationService.notifyDoctorSessionEnded(...)
        }
    }

    // ── Her gün 16:00: Yarınki randevu hatırlatmaları ───────────────────────
    @Cron('0 16 * * *')
    async handleCron() {
        this.logger.log('Starting daily appointment reminder checks...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayEnd = new Date(tomorrow);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const pendingAppointments = await this.prisma.appointment.findMany({
            where: {
                startTime: { gte: tomorrow, lt: dayEnd },
                status: 'CONFIRMED',
                reminderStatus: 'PENDING',
            },
            include: {
                patient: true,
                doctor: true,
                clinic: true
            }
        });

        this.logger.log(`Found ${pendingAppointments.length} appointments pending reminders.`);

        for (const appt of pendingAppointments) {
            if (!appt.patient.phone) continue;

            const timeStr = appt.startTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
            const message = `Merhaba ${appt.patient.firstName} Hanım/Bey,\n\nYarın saat ${timeStr}'te Dr. ${appt.doctor.firstName} ${appt.doctor.lastName} ile randevunuz bulunmaktadır.\n\nOnaylamak için lütfen EVET, iptal etmek için HAYIR yazarak yanıtlayınız. Sağlıklı günler dileriz.`;

            try {
                await (this.messagingService as any).relayToWhatsApp(appt.patient.phone, message, undefined);
                await this.prisma.appointment.update({
                    where: { id: appt.id },
                    data: { reminderStatus: 'SENT' }
                });
                this.logger.log(`Reminder sent for appointment ${appt.id}`);
            } catch (err) {
                this.logger.error(`Failed to send reminder for appointment ${appt.id}`, err);
            }
        }
        this.logger.log('Daily appointment reminder checks completed.');
    }
}
