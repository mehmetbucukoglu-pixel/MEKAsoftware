import { Controller, Post, Delete, Get, Patch, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PushService } from './push.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Push Notifications')
@Controller('push')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PushController {
    constructor(
        private readonly pushService: PushService,
        private readonly prisma: PrismaService,
    ) {}

    @Get('vapid-public-key')
    @ApiOperation({ summary: 'VAPID public key (frontend subscription için)' })
    getVapidKey() {
        return { publicKey: this.pushService.getVapidPublicKey() };
    }

    @Post('subscribe')
    @HttpCode(200)
    @ApiOperation({ summary: 'Push subscription kaydet' })
    async subscribe(
        @CurrentUser() user: CurrentUserPayload,
        @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
    ) {
        await this.pushService.subscribe(user.userId, user.clinicId, body);
        return { ok: true };
    }

    @Delete('unsubscribe')
    @HttpCode(200)
    @ApiOperation({ summary: 'Push subscription sil' })
    async unsubscribe(@Body() body: { endpoint: string }) {
        await this.pushService.unsubscribe(body.endpoint);
        return { ok: true };
    }

    @Get('preferences')
    @ApiOperation({ summary: 'Bildirim tercihlerini getir' })
    async getPreferences(@CurrentUser() user: CurrentUserPayload) {
        const pref = await this.prisma.notificationPreference.findUnique({
            where: { userId: user.userId },
        });
        // Kayıt yoksa default değerler döndür
        return pref ?? {
            escalatedMessages: true,
            appointmentCreated: true,
            appointmentCancelled: true,
            appointmentUpdated: false,
        };
    }

    @Patch('preferences')
    @ApiOperation({ summary: 'Bildirim tercihlerini güncelle' })
    async updatePreferences(
        @CurrentUser() user: CurrentUserPayload,
        @Body() body: Partial<{
            escalatedMessages: boolean;
            appointmentCreated: boolean;
            appointmentCancelled: boolean;
            appointmentUpdated: boolean;
        }>,
    ) {
        return this.prisma.notificationPreference.upsert({
            where: { userId: user.userId },
            update: body,
            create: {
                userId: user.userId,
                clinicId: user.clinicId,
                escalatedMessages: body.escalatedMessages ?? true,
                appointmentCreated: body.appointmentCreated ?? true,
                appointmentCancelled: body.appointmentCancelled ?? true,
                appointmentUpdated: body.appointmentUpdated ?? false,
            },
        });
    }
}
