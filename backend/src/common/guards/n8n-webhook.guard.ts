import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class N8nWebhookGuard implements CanActivate {
    private readonly logger = new Logger(N8nWebhookGuard.name);
    private readonly expectedSecret: string;

    constructor(private configService: ConfigService) {
        // ConfigService fallback to process.env — handles Coolify runtime injection
        const fromConfig = this.configService.get<string>('N8N_WEBHOOK_SECRET');
        const fromEnv = process.env.N8N_WEBHOOK_SECRET;
        this.expectedSecret = (fromConfig || fromEnv || '').trim();
        this.logger.log(`N8nWebhookGuard initialized — secret loaded: ${this.expectedSecret ? 'YES (' + this.expectedSecret.substring(0, 6) + '...)' : 'NO (empty!)'}`);
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const secret = request.headers['x-n8n-secret'] || request.query['token'];
        const secretTrimmed = secret ? String(secret).trim() : '';

        if (secretTrimmed && secretTrimmed === this.expectedSecret) {
            return true;
        }
        throw new UnauthorizedException('Invalid n8n webhook secret');
    }
}
