import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // Only audit mutating operations
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle();
        }

        const user = request.user;
        if (!user) return next.handle();

        return next.handle().pipe(
            tap(async (responseData) => {
                try {
                    const action = this.getAction(method);
                    const entityType = this.getEntityType(request.route?.path || '');

                    await this.prisma.auditLog.create({
                        data: {
                            clinicId: user.clinicId,
                            userId: user.userId,
                            action,
                            entityType,
                            entityId: responseData?.id || request.params?.id,
                            newValues: ['POST', 'PUT', 'PATCH'].includes(method) ? request.body : undefined,
                            ipAddress: request.ip,
                        },
                    });
                } catch (error) {
                    // Audit log failure should never break the main request
                    console.error('Audit log error:', error);
                }
            }),
        );
    }

    private getAction(method: string): string {
        const map: Record<string, string> = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
        };
        return map[method] || 'UNKNOWN';
    }

    private getEntityType(path: string): string {
        // Extract entity from route: /api/v1/patients/:id -> patients
        const segments = path.split('/').filter(Boolean);
        const entitySegment = segments.find(
            (s) => !s.startsWith(':') && !['api', 'v1'].includes(s),
        );
        return entitySegment || 'unknown';
    }
}
