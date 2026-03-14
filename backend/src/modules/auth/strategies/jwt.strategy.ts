import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface JwtPayload {
    sub: string;
    clinicId: string;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });
    }

    async validate(payload: JwtPayload) {
        console.log('JWT STRATEGY PAYLOAD:', payload);
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            console.log('JWT STRATEGY: User not found');
            throw new UnauthorizedException('Kullanıcı bulunamadı');
        }

        if (!user.isActive) {
            console.log('JWT STRATEGY: User is not active');
            throw new UnauthorizedException('Geçersiz veya devre dışı kullanıcı');
        }

        return {
            userId: payload.sub,
            clinicId: payload.clinicId,
            email: payload.email,
            role: payload.role,
        };
    }
}
