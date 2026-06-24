import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { MessagingService } from '../messaging/messaging.service';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@ApiTags('WhatsApp Appointments')
@Controller('whatsapp/appointments')
@UseGuards(N8nWebhookGuard)
export class WhatsappAppointmentController {

    constructor(
        private readonly appointmentService: AppointmentService,
        private readonly messagingService: MessagingService,
        private readonly socketGateway: SocketGateway,
    ) {}

    /**
     * Her n8n workflow kendi clinicId'sini ?clinicId= param olarak geçer.
     * clinicId gelmezse sessiz yanlış klinik yerine açık hata fırlatılır.
     */
    private resolveClinicId(clinicIdParam?: string): string {
        if (!clinicIdParam?.trim()) {
            throw new BadRequestException(
                'clinicId query param is required. Each n8n workflow must pass ?clinicId=CLINIC_ID.',
            );
        }
        return clinicIdParam.trim();
    }

    @Get('conversation-status')
    @ApiOperation({ summary: 'WhatsApp numarasının BOT/HUMAN modu ve doktor bilgisini getirir' })
    @ApiQuery({ name: 'waPhone', required: true })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async getConversationStatus(
        @Query('waPhone') waPhone: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.messagingService.getStatusByPhone(this.resolveClinicId(clinicId), waPhone);
    }

    @Post('escalate')
    @ApiOperation({ summary: 'Konuşmayı HUMAN moduna çeker ve görevliyi uyarır' })
    @ApiQuery({ name: 'waPhone', required: false, description: 'Gönderenin WA numarası (n8n URL fixed param)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async escalate(
        @Body() data: { waPhone: string; reason: string; urgency: string; summary: string },
        @Query('waPhone') waPhoneQuery?: string,
        @Query('clinicId') clinicId?: string,
    ) {
        const effectiveData = { ...data, waPhone: waPhoneQuery || data.waPhone };
        return this.messagingService.escalate(this.resolveClinicId(clinicId), effectiveData);
    }

    @Get('latest-inbound')
    @ApiOperation({ summary: 'Telefon numarasının en son inbound mesaj ID sini getirir (debounce için)' })
    @ApiQuery({ name: 'waPhone', required: true })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async getLatestInbound(
        @Query('waPhone') waPhone: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.messagingService.getLatestInboundId(this.resolveClinicId(clinicId), waPhone);
    }

    @Get('pending-inbound')
    @ApiOperation({ summary: 'Henüz cevaplanmamış tüm inbound mesajları birleştirip getirir (debounce sonrası AI context için)' })
    @ApiQuery({ name: 'waPhone', required: true })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async getPendingInbound(
        @Query('waPhone') waPhone: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.messagingService.getPendingInboundMessages(this.resolveClinicId(clinicId), waPhone);
    }

    @Get('ping')
    ping() {
        return { message: 'pong' };
    }

    @Get('lookup')
    @ApiOperation({ summary: 'Randevu sorgula (referenceCode veya telefon)' })
    @ApiQuery({ name: 'referenceCode', required: false })
    @ApiQuery({ name: 'phone', required: false })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    whatsappLookup(
        @Query('referenceCode') referenceCode?: string,
        @Query('phone') phone?: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.appointmentService.findByReferenceOrPhone(this.resolveClinicId(clinicId), { referenceCode, phone });
    }

    @Get('availability')
    @ApiOperation({ summary: 'Doktor adı + tarih ile müsaitlik kontrol' })
    @ApiQuery({ name: 'doctorName', required: true })
    @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
    @ApiQuery({ name: 'preferredTime', required: false, description: 'Tercih edilen saat HH:MM (örn: 17:00)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    whatsappAvailability(
        @Query('doctorName') doctorName: string,
        @Query('date') date: string,
        @Query('preferredTime') preferredTime?: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.appointmentService.findAvailabilityByDoctorName(this.resolveClinicId(clinicId), doctorName, date, preferredTime);
    }

    @Post()
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu oluştur' })
    @ApiQuery({ name: 'waPhone', required: false, description: 'Gönderenin WA numarası (n8n fixed param olarak geçer)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
    async whatsappCreate(
        @Body() data: any,
        @Query('waPhone') waPhoneQuery?: string,
        @Query('clinicId') clinicId?: string,
    ) {
        const effectiveData = {
            ...data,
            waPhone: waPhoneQuery || data.waPhone,
        };
        const resolvedClinicId = this.resolveClinicId(clinicId);
        const result = await this.appointmentService.createFromWhatsApp(resolvedClinicId, effectiveData);
        this.socketGateway.emitToStaff(resolvedClinicId, 'appointment_created', result);
        return result;
    }

    @Post('update-by-id')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu güncelle (appointmentId body\'den alınır — n8n AI tool için)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async whatsappUpdateById(
        @Body() data: { appointmentId: string; startTime?: string; durationMin?: number },
        @Query('clinicId') clinicId?: string,
    ) {
        const { appointmentId, ...rest } = data;
        const resolvedClinicId = this.resolveClinicId(clinicId);
        const result = await this.appointmentService.updateFromWhatsApp(resolvedClinicId, appointmentId, rest);
        this.socketGateway.emitToClinic(resolvedClinicId, 'appointment:updated', { appointmentId });
        return result;
    }

    @Post('cancel-by-id')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu iptal (appointmentId body\'den alınır — n8n AI tool için)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async whatsappCancelById(
        @Body() data: { appointmentId: string },
        @Query('clinicId') clinicId?: string,
    ) {
        const resolvedClinicId = this.resolveClinicId(clinicId);
        const result = await this.appointmentService.cancelFromWhatsApp(resolvedClinicId, data.appointmentId);
        this.socketGateway.emitToStaff(resolvedClinicId, 'appointment_cancelled', result);
        return result;
    }

    @Patch(':id')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu güncelle' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    whatsappUpdate(
        @Param('id') id: string,
        @Body() data: { startTime?: string; durationMin?: number },
        @Query('clinicId') clinicId?: string,
    ) {
        return this.appointmentService.updateFromWhatsApp(this.resolveClinicId(clinicId), id, data);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu iptal' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async whatsappCancel(
        @Param('id') id: string,
        @Query('clinicId') clinicId?: string,
    ) {
        const resolvedClinicId = this.resolveClinicId(clinicId);
        const result = await this.appointmentService.cancelFromWhatsApp(resolvedClinicId, id);
        this.socketGateway.emitToStaff(resolvedClinicId, 'appointment_cancelled', result);
        return result;
    }

    @Post('confirm-reminder-by-id')
    @ApiOperation({ summary: 'WhatsApp üzerinden hatırlatma teyidi (appointmentId body\'den alınır — n8n AI tool için)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async whatsappConfirmReminderById(
        @Body() data: { appointmentId: string },
        @Query('clinicId') clinicId?: string,
    ) {
        const resolvedClinicId = this.resolveClinicId(clinicId);
        const result = await this.appointmentService.confirmReminderFromWhatsApp(resolvedClinicId, data.appointmentId);
        this.socketGateway.emitToClinic(resolvedClinicId, 'appointment:confirmed', { appointmentId: data.appointmentId });
        return result;
    }

    @Patch(':id/confirm-reminder')
    @ApiOperation({ summary: 'WhatsApp üzerinden randevu teyidini onayla' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    async whatsappConfirmReminder(
        @Param('id') id: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.appointmentService.confirmReminderFromWhatsApp(this.resolveClinicId(clinicId), id);
    }

    @Get('tomorrow')
    @ApiOperation({ summary: 'Yarınki onaylı randevuları listele' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    whatsappTomorrow(@Query('clinicId') clinicId?: string) {
        return this.appointmentService.getTomorrowAppointments(this.resolveClinicId(clinicId));
    }

    @Get('reminder-due')
    @ApiOperation({ summary: 'Yarin hatirlama gonderilmesi gereken randevular (reminderStatus=PENDING)' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    getReminderDue(@Query('clinicId') clinicId?: string) {
        return this.appointmentService.getReminderDueAppointments(this.resolveClinicId(clinicId));
    }

    @Patch(':id/reminder-sent')
    @ApiOperation({ summary: 'Hatirlatma mesaji gonderildi olarak isaretle' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    markReminderSent(
        @Param('id') id: string,
        @Query('clinicId') clinicId?: string,
    ) {
        return this.appointmentService.markReminderSent(this.resolveClinicId(clinicId), id);
    }

    @Patch('complete-past')
    @ApiOperation({ summary: 'Gecmis CONFIRMED randevulari COMPLETED yap' })
    @ApiQuery({ name: 'clinicId', required: true, description: 'Klinik ID — n8n her workflow için geçer.' })
    whatsappCompletePast(@Query('clinicId') clinicId?: string) {
        return this.appointmentService.completePastAppointments(this.resolveClinicId(clinicId));
    }
}
