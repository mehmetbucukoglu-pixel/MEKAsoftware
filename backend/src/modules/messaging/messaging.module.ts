import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { HumanModeTimeoutTask } from './tasks/human-mode-timeout.task';
import { MessageCleanupTask } from './tasks/message-cleanup.task';

@Module({
    imports: [AuditModule, NotificationModule],
    controllers: [MessagingController],
    providers: [MessagingService, SocketGateway, HumanModeTimeoutTask, MessageCleanupTask],
    exports: [MessagingService, SocketGateway],
})
export class MessagingModule { }

