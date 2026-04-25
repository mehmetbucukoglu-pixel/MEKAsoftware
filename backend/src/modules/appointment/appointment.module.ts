import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { NotificationModule } from '../notification/notification.module';
import { MessagingModule } from '../messaging/messaging.module';

import { WhatsappAppointmentController } from './whatsapp-appointment.controller';

@Module({
    imports: [NotificationModule, MessagingModule],
    controllers: [AppointmentController, WhatsappAppointmentController],
    providers: [AppointmentService, SocketGateway],
    exports: [AppointmentService],
})
export class AppointmentModule { }


