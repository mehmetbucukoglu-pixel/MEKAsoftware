import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class PatientController {
    constructor(private patientService: PatientService) { }

    @Get()
    @ApiOperation({ summary: 'Hastaları listele & ara' })
    @ApiQuery({ name: 'search', required: false, description: 'İsim, soyisim, telefon veya e-posta ile arama' })
    @ApiQuery({ name: 'page', required: false, description: 'Sayfa numarası', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Sayfa başına kayıt', example: 20 })
    findAll(
        @CurrentUser() user: CurrentUserPayload,
        @Query('search') search?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.patientService.findAll(user.clinicId, search, page, limit);
    }

    @Get('deleted')
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Silinmiş hastaları listele' })
    findDeleted(@CurrentUser() user: CurrentUserPayload) {
        return this.patientService.findDeleted(user.clinicId);
    }

    @Get('check-phone')
    @ApiOperation({ summary: 'Telefon mükerrer kontrolü' })
    @ApiQuery({ name: 'phone', required: true })
    checkPhone(
        @CurrentUser() user: CurrentUserPayload,
        @Query('phone') phone: string,
    ) {
        return this.patientService.checkPhone(user.clinicId, phone);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Hasta detay (randevular, notlar, dosyalar dahil)' })
    findOne(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.patientService.findOne(user.clinicId, id);
    }

    @Post()
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Hasta ekle' })
    create(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreatePatientDto,
    ) {
        return this.patientService.create(user.clinicId, dto);
    }

    @Patch(':id')
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Hasta güncelle' })
    update(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePatientDto,
    ) {
        return this.patientService.update(user.clinicId, id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Hasta deaktif et (soft delete)' })
    remove(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.patientService.softDelete(user.clinicId, id);
    }

    @Patch(':id/restore')
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Silinmiş hastayı geri al' })
    restore(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.patientService.restore(user.clinicId, id);
    }
}
