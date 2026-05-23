import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationController {
    constructor(private notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Bildirimleri getir' })
    findAll(@CurrentUser() user: CurrentUserPayload, @Query('unreadOnly') unreadOnly?: boolean) {
        return this.notificationService.findAll(user.userId, unreadOnly);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Okundu işaretle' })
    markAsRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.notificationService.markAsRead(user.userId, id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Tümünü okundu işaretle' })
    markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
        return this.notificationService.markAllAsRead(user.userId);
    }

    @Post()
    @ApiOperation({ summary: 'Yeni bildirim oluştur' })
    create(@CurrentUser() user: CurrentUserPayload, @Body() body: { targetUserId: string; type: string; title: string; text?: string; entityType?: string; entityId?: string }) {
        return this.notificationService.create(user.clinicId, body.targetUserId, {
            type: body.type,
            title: body.title,
            body: body.text,
            entityType: body.entityType,
            entityId: body.entityId
        });
    }
}
