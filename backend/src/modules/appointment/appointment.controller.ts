import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AppointmentService } from './appointment.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@ApiTags('Appointments')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AppointmentController {
    constructor(
        private appointmentService: AppointmentService,
        private socketGateway: SocketGateway,
    ) { }

    @Get('appointments')
    @ApiOperation({ summary: 'Randevuları listele' })
    @ApiQuery({ name: 'doctorId', required: false })
    @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
    @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string — range start' })
    @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string — range end' })
    @ApiQuery({ name: 'status', required: false })
    findAll(@CurrentUser() user: CurrentUserPayload, @Query() filters: any) {
        return this.appointmentService.findAll(user.clinicId, filters);
    }

    @Get('appointments/missing-followups')
    @ApiOperation({ summary: 'Yeni randevusu olmayan geçmiş randevuları getirir' })
    async getMissingFollowups(@CurrentUser() user: CurrentUserPayload) {
        try {
            return await this.appointmentService.getMissingFollowups(user.clinicId);
        } catch (error) {
            return { error: error.message, stack: error.stack };
        }
    }

    @Post('appointments')
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Manuel randevu oluştur' })
    async create(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
        const result = await this.appointmentService.create(user.clinicId, {
            ...data,
            source: 'MANUAL',
            createdBy: user.userId,
        });
        this.socketGateway.emitToStaff(user.clinicId, 'appointment_created', result);
        return result;
    }

    @Post('appointments/whatsapp')
    @UseGuards(N8nWebhookGuard)
    @ApiOperation({ summary: 'WhatsApp (n8n) üzerinden randevu oluştur' })
    async createFromWhatsApp(@Body() data: {
        clinicId: string;
        patientName: string;
        patientPhone: string;
        doctorName: string;
        startTime: string;
        durationMin: number;
        notes?: string;
    }) {
        const result = await this.appointmentService.createFromWhatsApp(data.clinicId, data);
        this.socketGateway.emitToStaff(data.clinicId, 'appointment_created', result);
        return result;
    }

    @Get('appointments/available-slots')
    @ApiOperation({ summary: 'Müsait randevu slotları' })
    @ApiQuery({ name: 'doctorId', required: true })
    @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
    availableSlots(@CurrentUser() user: CurrentUserPayload, @Query('doctorId') doctorId: string, @Query('date') date: string) {
        return this.appointmentService.getAvailableSlots(user.clinicId, doctorId, date);
    }

    @Get('appointments/:id')
    @ApiOperation({ summary: 'Randevu detay' })
    findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.appointmentService.findOne(user.clinicId, id);
    }

    @Patch('appointments/:id')
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Randevu düzenle' })
    update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() data: any) {
        return this.appointmentService.update(user.clinicId, id, data);
    }

    @Delete('appointments/:id')
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Randevu sil' })
    remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.appointmentService.remove(user.clinicId, id);
    }

    @Patch('appointments/:id/cancel')
    @ApiOperation({ summary: 'Randevu iptal' })
    cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() data: any) {
        return this.appointmentService.updateStatus(user.clinicId, id, 'CANCELLED', data?.cancelReason);
    }

    @Patch('appointments/:id/no-show')
    @Roles('ADMIN' as any, 'DOCTOR' as any, 'ASSISTANT' as any)
    @ApiOperation({ summary: 'Hasta gelmedi' })
    noShow(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.appointmentService.updateStatus(user.clinicId, id, 'NO_SHOW');
    }

    @Patch('appointments/:id/arrived')
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Hasta geldi' })
    arrived(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.appointmentService.updateStatus(user.clinicId, id, 'ARRIVED');
    }

    @Patch('appointments/:id/complete')
    @Roles('ADMIN' as any, 'DOCTOR' as any, 'ASSISTANT' as any)
    @ApiOperation({ summary: 'Randevu tamamlandı' })
    complete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.appointmentService.updateStatus(user.clinicId, id, 'COMPLETED');
    }



    @Get('doctors/:id/schedule')
    @ApiOperation({ summary: 'Doktor çalışma saatleri' })
    getDoctorSchedule(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.appointmentService.getDoctorSchedule(user.clinicId, id);
    }

    @Patch('doctors/:id/schedule')
    @Roles('ADMIN' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Doktor çalışma saatleri güncelle' })
    updateDoctorSchedule(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() schedules: any[]) {
        return this.appointmentService.updateDoctorSchedule(user.clinicId, id, schedules);
    }

}
