import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { StatisticsService } from './statistics.service';

@ApiTags('Statistics')
@Controller('statistics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class StatisticsController {
    constructor(private statisticsService: StatisticsService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Genel istatistik özeti' })
    @ApiQuery({ name: 'startDate', required: false, description: 'ISO date — range start' })
    @ApiQuery({ name: 'endDate', required: false, description: 'ISO date — range end' })
    @ApiQuery({ name: 'doctorId', required: false })
    async getOverview(
        @CurrentUser() user: CurrentUserPayload,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('doctorId') doctorId?: string,
    ) {
        return this.statisticsService.getOverview(user.clinicId, { startDate, endDate, doctorId });
    }

    @Get('visits')
    @ApiOperation({ summary: 'Hasta giriş/çıkış ziyaret verileri' })
    @ApiQuery({ name: 'startDate', required: false, description: 'ISO date — range start' })
    @ApiQuery({ name: 'endDate', required: false, description: 'ISO date — range end' })
    @ApiQuery({ name: 'doctorId', required: false })
    async getVisits(
        @CurrentUser() user: CurrentUserPayload,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('doctorId') doctorId?: string,
    ) {
        return this.statisticsService.getVisitStats(user.clinicId, { startDate, endDate, doctorId });
    }

    @Get('recent-visits')
    @ApiOperation({ summary: 'Son hasta ziyaretleri listesi' })
    @ApiQuery({ name: 'limit', required: false, description: 'Kayıt sayısı (default: 20)' })
    async getRecentVisits(
        @CurrentUser() user: CurrentUserPayload,
        @Query('limit') limit?: string,
    ) {
        return this.statisticsService.getRecentVisits(user.clinicId, Number(limit) || 20);
    }

    @Get('chat-insights')
    @ApiOperation({ summary: 'WhatsApp bot ve mesajlaşma istatistikleri' })
    async getChatInsights(@CurrentUser() user: CurrentUserPayload) {
        return this.statisticsService.getChatInsights(user.clinicId);
    }

    @Get('escalations')
    @ApiOperation({ summary: 'Dönem bazlı eskalasyon istatistikleri' })
    @ApiQuery({ name: 'period', required: false, enum: ['14d', '30d', '3m'], description: 'Zaman dilimi (default: 30d)' })
    async getEscalationStats(
        @CurrentUser() user: CurrentUserPayload,
        @Query('period') period?: '14d' | '30d' | '3m',
    ) {
        return this.statisticsService.getEscalationStats(user.clinicId, period || '30d');
    }

    @Get('auto-appointments')
    @ApiOperation({ summary: 'WhatsApp üzerinden oluşturulan randevuların dönem istatistikleri' })
    @ApiQuery({ name: 'period', required: false, enum: ['14d', '30d', '3m'] })
    async getAutoAppointmentStats(
        @CurrentUser() user: CurrentUserPayload,
        @Query('period') period?: '14d' | '30d' | '3m',
    ) {
        return this.statisticsService.getAutoAppointmentStats(user.clinicId, period || '30d');
    }

    @Get('new-patients')
    @ApiOperation({ summary: 'Dönem bazlı yeni hasta sayısı' })
    @ApiQuery({ name: 'period', required: false, enum: ['14d', '30d', '3m'] })
    async getNewPatientStats(
        @CurrentUser() user: CurrentUserPayload,
        @Query('period') period?: '14d' | '30d' | '3m',
    ) {
        return this.statisticsService.getNewPatientStats(user.clinicId, period || '30d');
    }
}
