import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class MessageCleanupTask {
    private readonly logger = new Logger(MessageCleanupTask.name);

    constructor(private prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCron() {
        this.logger.debug('Running MessageCleanupTask...');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deleteResult = await this.prisma.message.deleteMany({
            where: {
                createdAt: { lt: thirtyDaysAgo }
                // Note: appointments are currently not directly linked in schema,
                // so we delete all messages older than 30 days.
            }
        });

        if (deleteResult.count > 0) {
            this.logger.log(`Deleted ${deleteResult.count} messages older than 30 days.`);
        }
    }
}
