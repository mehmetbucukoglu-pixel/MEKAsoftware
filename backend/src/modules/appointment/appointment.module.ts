import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@Module({
    controllers: [AppointmentController],
    providers: [AppointmentService, SocketGateway],
    exports: [AppointmentService],
})
export class AppointmentModule { }
