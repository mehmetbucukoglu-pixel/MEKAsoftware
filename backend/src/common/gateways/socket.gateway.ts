import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*', // In production, restrict this to your frontend URL
    },
})
export class SocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('SocketGateway');

    afterInit(server: Server) {
        this.logger.log('Socket.io Gateway Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);

        const clinicId = client.handshake.query.clinicId as string;
        const userId = client.handshake.query.userId as string;
        const role = client.handshake.query.role as string;

        if (clinicId) {
            client.join(`clinic_${clinicId}`);

            // Admins and Assistants join a staff room
            if (role === 'ADMIN' || role === 'ASSISTANT') {
                client.join(`staff_${clinicId}`);
            }

            // Every user joins their own private room
            if (userId) {
                client.join(`user_${userId}`);
            }
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // Generic method to emit to all in clinic
    emitToClinic(clinicId: string, event: string, data: any) {
        this.server.to(`clinic_${clinicId}`).emit(event, data);
    }

    // Emit to all clinic staff members
    emitToStaff(clinicId: string, event: string, data: any) {
        this.server.to(`staff_${clinicId}`).emit(event, data);
    }

    // Emit to a specific user
    // Emit to a specific user
    emitToUser(userId: string, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data);
    }

    // Join a specific conversation room
    joinConversation(client: Socket, conversationId: string) {
        client.join(`conversation_${conversationId}`);
        this.logger.log(`Client ${client.id} joined conversation: ${conversationId}`);
    }

    // Leave a specific conversation room
    leaveConversation(client: Socket, conversationId: string) {
        client.leave(`conversation_${conversationId}`);
        this.logger.log(`Client ${client.id} left conversation: ${conversationId}`);
    }

    // Emit to a specific conversation
    emitToConversation(conversationId: string, event: string, data: any) {
        this.server.to(`conversation_${conversationId}`).emit(event, data);
    }

    @SubscribeMessage('ping')
    handlePing(client: Socket, data: any) {
        return { event: 'pong', data };
    }

    @SubscribeMessage('join_conversation')
    handleJoinConversation(client: Socket, data: { conversationId: string }) {
        this.joinConversation(client, data.conversationId);
    }

    @SubscribeMessage('leave_conversation')
    handleLeaveConversation(client: Socket, data: { conversationId: string }) {
        this.leaveConversation(client, data.conversationId);
    }
}
