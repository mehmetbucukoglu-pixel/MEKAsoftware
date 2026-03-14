import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ClinicalNoteService } from './clinical-note.service';

@ApiTags('Clinical Notes')
@Controller('clinical-notes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ClinicalNoteController {
    constructor(private clinicalNoteService: ClinicalNoteService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT)
    @ApiOperation({ summary: 'Klinik notlarını listele' })
    findAll(@CurrentUser() user: CurrentUserPayload, @Query('patientId') patientId?: string) {
        return this.clinicalNoteService.findAll({ id: user.userId, role: user.role, clinicId: user.clinicId }, patientId);
    }

    @Post()
    @Roles(UserRole.DOCTOR, UserRole.ADMIN)
    @ApiOperation({ summary: 'Klinik notu oluştur' })
    create(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
        return this.clinicalNoteService.create(user.clinicId, user.userId, data);
    }

    @Patch(':id')
    @Roles(UserRole.DOCTOR, UserRole.ADMIN)
    @ApiOperation({ summary: 'Klinik notu güncelle' })
    update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() data: any) {
        return this.clinicalNoteService.update(user.clinicId, id, user.userId, data);
    }
}
