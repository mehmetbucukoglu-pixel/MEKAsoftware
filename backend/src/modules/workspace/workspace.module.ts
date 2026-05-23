import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [NotificationModule],
    controllers: [WorkspaceController],
    providers: [WorkspaceService],
    exports: [WorkspaceService],
})
export class WorkspaceModule { }
