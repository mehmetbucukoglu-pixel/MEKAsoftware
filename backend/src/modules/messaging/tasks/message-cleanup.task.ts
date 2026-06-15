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

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180); // 6 ay saklama politikası

        const deleteResult = await this.prisma.message.deleteMany({
            where: {
                createdAt: { lt: sixMonthsAgo }
            }
        });

        if (deleteResult.count > 0) {
            this.logger.log(`Deleted ${deleteResult.count} messages older than 180 days (6 months).`);
        }
    }
}
