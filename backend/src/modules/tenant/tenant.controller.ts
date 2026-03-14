import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TenantService } from './tenant.service';

@ApiTags('Clinic')
@Controller('clinic')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class TenantController {
    constructor(private tenantService: TenantService) { }

    @Get()
    @ApiOperation({ summary: 'Klinik bilgisi getir' })
    getClinic(@CurrentUser() user: CurrentUserPayload) {
        return this.tenantService.getClinic(user.clinicId);
    }

    @Patch()
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Klinik bilgisi güncelle' })
    updateClinic(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
        return this.tenantService.updateClinic(user.clinicId, data);
    }
}
