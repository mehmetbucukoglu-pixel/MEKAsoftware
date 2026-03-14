import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [MessagingController],
    providers: [MessagingService, SocketGateway],
    exports: [MessagingService, SocketGateway],
})
export class MessagingModule { }
