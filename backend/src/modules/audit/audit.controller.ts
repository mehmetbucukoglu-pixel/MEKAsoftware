import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN' as any)
@ApiBearerAuth()
export class AuditController {
    constructor(private auditService: AuditService) { }

    @Get()
    @ApiOperation({ summary: 'Denetim kayıtlarını listele' })
    findAll(@CurrentUser() user: CurrentUserPayload, @Query() filters: any) {
        return this.auditService.findAll(user.clinicId, filters);
    }
}
