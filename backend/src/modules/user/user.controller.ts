import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class UserController {
    constructor(private userService: UserService) { }

    @Get('doctors')
    @Roles('ADMIN' as any, 'ASSISTANT' as any, 'DOCTOR' as any)
    @ApiOperation({ summary: 'Klinikteki aktif doktorları listele' })
    findDoctors(@CurrentUser() user: CurrentUserPayload) {
        console.log("🔥 controller hit - findDoctors for User:", user);
        return this.userService.findAllDoctors(user.clinicId);
    }

    @Get()
    @Roles('ADMIN' as any, 'DOCTOR' as any, 'ASSISTANT' as any)
    @ApiOperation({ summary: 'Kullanıcıları listele' })
    findAll(@CurrentUser() user: CurrentUserPayload) {
        return this.userService.findAll(user.clinicId);
    }

    @Post()
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Kullanıcı ekle' })
    create(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
        return this.userService.create(user.clinicId, data);
    }

    @Patch(':id')
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Kullanıcı güncelle' })
    update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() data: any) {
        return this.userService.update(user.clinicId, id, data);
    }

    @Delete(':id')
    @Roles('ADMIN' as any)
    @ApiOperation({ summary: 'Kullanıcı deaktif et' })
    deactivate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.userService.deactivate(user.clinicId, id);
    }
}
