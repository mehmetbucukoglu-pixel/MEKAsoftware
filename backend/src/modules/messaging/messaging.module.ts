import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { PushModule } from '../push/push.module';
import { HumanModeTimeoutTask } from './tasks/human-mode-timeout.task';
import { MessageCleanupTask } from './tasks/message-cleanup.task';
import { AppointmentModule } from '../appointment/appointment.module';
import { forwardRef } from '@nestjs/common';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';


@Module({
    imports: [AuditModule, NotificationModule, PushModule, forwardRef(() => AppointmentModule)],
    controllers: [MessagingController],
    providers: [MessagingService, SocketGateway, HumanModeTimeoutTask, MessageCleanupTask, N8nWebhookGuard],
    exports: [MessagingService, SocketGateway],
})
export class MessagingModule { }

