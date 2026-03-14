import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@Controller('payments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class FinanceController {
    constructor(private financeService: FinanceService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Ödemeleri listele' })
    findAll(@CurrentUser() user: CurrentUserPayload, @Query() filters: any) { return this.financeService.findAll(user.clinicId, filters); }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.ASSISTANT, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Ödeme kaydet' })
    create(@CurrentUser() user: CurrentUserPayload, @Body() data: any) { return this.financeService.create(user.clinicId, user.userId, data); }

    @Get('summary')
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Ciro özeti' })
    summary(
        @CurrentUser() user: CurrentUserPayload,
        @Query('period') period?: 'week' | 'month' | 'quarter' | 'custom',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.financeService.getSummary(user.clinicId, period, startDate, endDate);
    }
}
