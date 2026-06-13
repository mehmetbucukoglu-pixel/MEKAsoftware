import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DashboardController {
    constructor(private dashboardService: DashboardService) { }

    @Get()
    @ApiOperation({ summary: 'Dashboard verilerini getir' })
    async getDashboardData(@CurrentUser() user: CurrentUserPayload) {
        return this.dashboardService.getDashboardData(user.clinicId);
    }

    @Get('extended-kpis')
    @ApiOperation({ summary: 'Genişletilmiş KPI verilerini getir' })
    async getExtendedKpis(@CurrentUser() user: CurrentUserPayload) {
        return this.dashboardService.getExtendedKpis(user.clinicId);
    }

    @Get('reminders')
    @ApiOperation({ summary: 'Bugünkü randevuların teyit durumlarını getir' })
    async getTodayReminderStatus(@CurrentUser() user: CurrentUserPayload) {
        return this.dashboardService.getTodayReminderStatus(user.clinicId);
    }

    @Get('activity')
    @ApiOperation({ summary: 'Bugünkü randevu hareketlerini getir (oluşturma, güncelleme, iptal)' })
    async getTodayAppointmentActivity(@CurrentUser() user: CurrentUserPayload) {
        return this.dashboardService.getTodayAppointmentActivity(user.clinicId);
    }

    @Get('escalations')
    @ApiOperation({ summary: 'Bekleyen eskalasyonları (HUMAN mode konuşmalar) getir' })
    async getPendingEscalations(@CurrentUser() user: CurrentUserPayload) {
        return this.dashboardService.getPendingEscalations(user.clinicId);
    }
}

