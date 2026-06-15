import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppointmentService } from './appointment.service';
import { MessagingService } from '../messaging/messaging.service';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@ApiTags('WhatsApp Appointments')
@Controller('whatsapp/appointments')
@UseGuards(N8nWebhookGuard)
export class WhatsappAppointmentController {
    private readonly defaultClinicId: string;

    constructor(
        private readonly appointmentService: AppointmentService,
        private readonly messagingService: MessagingService,
        private readonly socketGateway: SocketGateway,
        private readonly configService: ConfigService,
    ) {
        this.defaultClinicId = this.configService.get<string>('DEFAULT_CLINIC_ID')!;
    }

    @Get('conversation-status')
    @ApiOperation({ summary: 'WhatsApp numarasının BOT/HUMAN modu ve doktor bilgisini getirir' })
    @ApiQuery({ name: 'waPhone', required: true })
    async getConversationStatus(@Query('waPhone') waPhone: string) {
        return this.messagingService.getStatusByPhone(this.defaultClinicId, waPhone);
    }

    @Post('escalate')
    @ApiOperation({ summary: 'Konuşmayı HUMAN moduna çeker ve görevliyi uyarır' })
    @ApiQuery({ name: 'waPhone', required: false, description: 'Gönderenin WA numarası (n8n URL fixed param)' })
    async escalate(
        @Body() data: { waPhone: string; reason: string; urgency: string; summary: string },
        @Query('waPhone') waPhoneQuery?: string,
    ) {
        const effectiveData = { ...data, waPhone: waPhoneQuery || data.waPhone };
        return this.messagingService.escalate(this.defaultClinicId, effectiveData);
    }

    @Get('latest-inbound')
    @ApiOperation({ summary: 'Telefon numarasının en son inbound mesaj ID sini getirir (debounce için)' })
    @ApiQuery({ name: 'waPhone', required: true })
    async getLatestInbound(@Query('waPhone') waPhone: string) {
        return this.messagingService.getLatestInboundId(this.defaultClinicId, waPhone);
    }

    @Get('pending-inbound')
    @ApiOperation({ summary: 'Henüz cevaplanmamış tüm inbound mesajları birleştirip getirir (debounce sonrası AI context için)' })
    @ApiQuery({ name: 'waPhone', required: true })
    async getPendingInbound(@Query('waPhone') waPhone: string) {
        return this.messagingService.getPendingInboundMessages(this.defaultClinicId, waPhone);
    }

    @Get('ping')
    ping() {
        return { message: 'pong' };
    }

    @Get('lookup')
    @ApiOperation({ summary: 'Randevu sorgula (referenceCode veya telefon)' })
    @ApiQuery({ name: 'referenceCode', required: false })
    @ApiQuery({ name: 'phone', required: false })
    whatsappLookup(
        @Query('referenceCode') referenceCode?: string,
        @Query('phone') phone?: string,
    ) {
        return this.appointmentService.findByReferenceOrPhone(this.defaultClinicId, { referenceCode, phone });
    }

    @Get('availability')
    @ApiOperation({ summary: 'Doktor adı + tarih ile müsaitlik kontrol' })
    @ApiQuery({ name: 'doctorName', required: true })
    @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
    @ApiQuery({ name: 'preferredTime', required: false, description: 'Tercih edilen saat HH:MM (örn: 17:00)' })
    whatsappAvailability(
        @Query('doctorName') doctorName: string,
        @Query('date') date: string,
        @Query('preferredTime') preferredTime?: string,
    ) {
        return this.appointmentService.findAvailabilityByDoctorName(this.defaultClinicId, doctorName, date, preferredTime);
    }

    @Post()
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu oluştur' })
    @ApiQuery({ name: 'waPhone', required: false, description: 'Gönderenin WA numarası (n8n fixed param olarak geçer)' })
    @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
    async whatsappCreate(
        @Body() data: any,
        @Query('waPhone') waPhoneQuery?: string,
    ) {
        // waPhone: query param öncelikli (n8n sabit expression), yoksa body'den al
        const effectiveData = {
            ...data,
            waPhone: waPhoneQuery || data.waPhone,
        };
        const result = await this.appointmentService.createFromWhatsApp(this.defaultClinicId, effectiveData);
        this.socketGateway.emitToStaff(this.defaultClinicId, 'appointment_created', result);
        return result;
    }

    @Post('update-by-id')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu güncelle (appointmentId body\'den alınır — n8n AI tool için)' })
    async whatsappUpdateById(
        @Body() data: { appointmentId: string; startTime?: string; durationMin?: number },
    ) {
        const { appointmentId, ...rest } = data;
        const result = await this.appointmentService.updateFromWhatsApp(this.defaultClinicId, appointmentId, rest);
        this.socketGateway.emitToClinic(this.defaultClinicId, 'appointment:updated', { appointmentId });
        return result;
    }

    @Post('cancel-by-id')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu iptal (appointmentId body\'den alınır — n8n AI tool için)' })
    async whatsappCancelById(
        @Body() data: { appointmentId: string },
    ) {
        const result = await this.appointmentService.cancelFromWhatsApp(this.defaultClinicId, data.appointmentId);
        this.socketGateway.emitToStaff(this.defaultClinicId, 'appointment_cancelled', result);
        return result;
    }

    @Patch(':id')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu güncelle' })
    whatsappUpdate(
        @Param('id') id: string,
        @Body() data: { startTime?: string; durationMin?: number },
    ) {
        return this.appointmentService.updateFromWhatsApp(this.defaultClinicId, id, data);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu iptal' })
    async whatsappCancel(
        @Param('id') id: string,
    ) {
        const result = await this.appointmentService.cancelFromWhatsApp(this.defaultClinicId, id);
        this.socketGateway.emitToStaff(this.defaultClinicId, 'appointment_cancelled', result);
        return result;
    }

    @Patch(':id/confirm-reminder')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu teyidini onayla' })
    async whatsappConfirmReminder(
        @Param('id') id: string,
    ) {
        const result = await this.appointmentService.confirmReminderFromWhatsApp(this.defaultClinicId, id);
        // Maybe emit to staff to update the UI
        return result;
    }

    @Get('tomorrow')
    @ApiOperation({ summary: 'Yarınki onaylı randevuları listele' })
    whatsappTomorrow() {
        return this.appointmentService.getTomorrowAppointments(this.defaultClinicId);
    }

    @Get('reminder-due')
    @ApiOperation({ summary: 'Yarin hatirlama gonderilmesi gereken randevular (reminderStatus=PENDING)' })
    getReminderDue() {
        return this.appointmentService.getReminderDueAppointments(this.defaultClinicId);
    }

    @Patch(':id/reminder-sent')
    @ApiOperation({ summary: 'Hatirlatma mesaji gonderildi olarak isaretle' })
    markReminderSent(@Param('id') id: string) {
        return this.appointmentService.markReminderSent(this.defaultClinicId, id);
    }

    @Patch('complete-past')
    @ApiOperation({ summary: 'Gecmis CONFIRMED randevulari COMPLETED yap' })
    whatsappCompletePast() {
        return this.appointmentService.completePastAppointments(this.defaultClinicId);
    }
}
