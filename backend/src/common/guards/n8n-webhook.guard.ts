import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class N8nWebhookGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const secret = request.headers['x-n8n-secret'];
        const expectedSecret = this.configService.get<string>('N8N_WEBHOOK_SECRET');

        if (!secret || secret !== expectedSecret) {
            throw new UnauthorizedException('Invalid n8n webhook secret');
        }

        return true;
    }
}
