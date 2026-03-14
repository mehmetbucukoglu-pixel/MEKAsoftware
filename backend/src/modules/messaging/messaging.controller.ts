import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Ip, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import { WhatsappWebhookDto } from './dto/whatsapp-webhook.dto';

@ApiTags('Messaging')
@Controller()
export class MessagingController {
    constructor(private messagingService: MessagingService) { }

    @Post('webhooks/whatsapp')
    @UseGuards(N8nWebhookGuard)
    @ApiOperation({ summary: 'WhatsApp webhook (inbound mesaj)' })
    handleWebhook(@Body() data: WhatsappWebhookDto) {
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
    @ApiOperation({ summary: 'Konuşma mesajları' })
    getMessages(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Query('page') page?: number) {
        return this.messagingService.getMessages(user, id, page);
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
}
