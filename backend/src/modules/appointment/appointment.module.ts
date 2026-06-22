import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { NotificationModule } from '../notification/notification.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PushModule } from '../push/push.module';
import { forwardRef } from '@nestjs/common';
import { WhatsappAppointmentController } from './whatsapp-appointment.controller';
import { AppointmentReminderTask } from './tasks/appointment-reminder.task';
import { N8nWebhookGuard } from '../../common/guards/n8n-webhook.guard';

@Module({
    imports: [NotificationModule, PushModule, forwardRef(() => MessagingModule)],
    controllers: [AppointmentController, WhatsappAppointmentController],
    providers: [AppointmentService, SocketGateway, AppointmentReminderTask, N8nWebhookGuard],
    exports: [AppointmentService],
})
export class AppointmentModule { }


