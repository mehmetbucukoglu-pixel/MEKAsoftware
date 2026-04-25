import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SocketGateway } from '../../../common/gateways/socket.gateway';

@Injectable()
export class HumanModeTimeoutTask {
    private readonly logger = new Logger(HumanModeTimeoutTask.name);

    constructor(
        private prisma: PrismaService,
        private socketGateway: SocketGateway,
    ) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleCron() {
        this.logger.debug('Running HumanModeTimeoutTask...');

        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        // Find HUMAN conversations that haven't been switched back and are older than 1 hour
        const expiredConversations = await this.prisma.conversation.findMany({
            where: {
                status: 'HUMAN',
                humanModeAt: { lt: oneHourAgo }
            },
        });

        if (expiredConversations.length === 0) return;

        this.logger.log(`Found ${expiredConversations.length} conversations to revert to BOT mode.`);

        for (const conv of expiredConversations) {
            await this.prisma.conversation.update({
                where: { id: conv.id },
                data: { status: 'BOT', humanModeAt: null }
            });

            // Notify staff via WebSocket
            this.socketGateway.emitToStaff(conv.clinicId, 'conversation_updated', {
                id: conv.id,
                status: 'BOT',
                message: 'Bot otomatik olarak devraldı.'
            });

            this.socketGateway.emitToConversation(conv.id, 'mode_changed', { status: 'BOT' });
        }
    }
}
