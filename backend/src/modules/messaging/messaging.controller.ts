import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Ip, Headers, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';

@ApiTags('Messaging')
@Controller()
export class MessagingController {
    constructor(private messagingService: MessagingService) { }

    @Post('webhooks/whatsapp')
    @UseGuards(N8nWebhookGuard)
    @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
    @ApiOperation({ summary: 'WhatsApp webhook (inbound mesaj)' })
    handleWebhook(@Body() data: any) {
        return this.messagingService.handleInboundWebhook(data);
    }

    @Get('conversations')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Inbox - konuşma listesi' })
    getConversations(@CurrentUser() user: CurrentUserPayload) {
        return this.messagingService.getConversations(user);
    }

    @Get('conversations/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Konuşma mesajları (eski route - geriye dönük uyum)' })
    getConversationById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        return this.messagingService.getMessages(user, id, page, limit);
    }

    @Get('conversations/:id/messages')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Konuşma mesajları (yeni route - frontend bu endpoint çağırıyor)' })
    getMessages(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        return this.messagingService.getMessages(user, id, page, limit);
    }

    @Post('conversations/:id/messages')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mesaj gönder (WhatsApp cevap)' })
    sendMessage(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Body() data: any,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string
    ) {
        return this.messagingService.sendMessage(user, id, data.body, data.mediaUrl, data.mediaType, ip, userAgent);
    }

    @Patch('conversations/:id/mode')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'BOT ↔ HUMAN mod değiştir' })
    switchMode(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Body() data: any,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string
    ) {
        return this.messagingService.switchMode(user, id, data.mode, data.assignedTo, ip, userAgent);
    }

    @Patch('conversations/:id/mark-seen')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Eskalasyonu görüldü olarak işaretle (Bekleyen Mesaj badge temizler)' })
    markEscalationSeen(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.messagingService.markEscalationSeen(user, id);
    }

    @Patch('conversations/:id/lock')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Human mode kilidini aç/kapat (otomatik BOT geçişini engeller)' })
    toggleHumanLock(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() data: { locked: boolean }) {
        return this.messagingService.toggleHumanLock(user, id, data.locked);
    }
}
