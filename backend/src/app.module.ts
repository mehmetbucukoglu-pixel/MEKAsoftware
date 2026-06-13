import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UserModule } from './modules/user/user.module';
import { PatientModule } from './modules/patient/patient.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ClinicalNoteModule } from './modules/clinical-note/clinical-note.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TaskModule } from './modules/task/task.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PushModule } from './modules/push/push.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    PrismaModule,

    // Cron
    ScheduleModule.forRoot(),


    // Feature modules
    AuthModule,
    TenantModule,
    UserModule,
    PatientModule,
    AppointmentModule,
    MessagingModule,
    FinanceModule,
    ExpenseModule,
    ClinicalNoteModule,
    NotificationModule,
    AuditModule,
    DashboardModule,
    TaskModule,
    WorkspaceModule,
    StatisticsModule,
    PushModule,
  ],
})
export class AppModule { }
