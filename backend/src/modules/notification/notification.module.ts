import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@Module({
    controllers: [NotificationController],
    providers: [NotificationService, SocketGateway],
    exports: [NotificationService],
})
export class NotificationModule { }
