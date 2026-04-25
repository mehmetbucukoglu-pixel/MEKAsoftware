import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class N8nWebhookGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const secret = request.headers['x-n8n-secret'] || request.query['token'];
        const expectedSecret = this.configService.get<string>('N8N_WEBHOOK_SECRET');

        const secretTrimmed = secret ? String(secret).trim() : '';
        const expectedTrimmed = expectedSecret ? expectedSecret.trim() : '';

        if (secretTrimmed && secretTrimmed === expectedTrimmed) {
            return true;
        }
        throw new UnauthorizedException('Invalid n8n webhook secret');
    }
}
