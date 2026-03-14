import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(dto: RegisterDto) {
        // Check if clinic slug already exists
        const existingClinic = await this.prisma.clinic.findUnique({
            where: { slug: dto.clinicSlug },
        });
        if (existingClinic) {
            throw new ConflictException('Bu klinik kısa adı zaten kullanılıyor');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Create clinic + admin user in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const clinic = await tx.clinic.create({
                data: {
                    name: dto.clinicName,
                    slug: dto.clinicSlug,
                    phone: dto.clinicPhone,
                },
            });

            const user = await tx.user.create({
                data: {
                    clinicId: clinic.id,
                    email: dto.email,
                    passwordHash,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    phone: dto.phone,
                    role: 'ADMIN',
                },
            });

            return { clinic, user };
        });

        const tokens = await this.generateTokens(result.user.id, result.clinic.id, result.user.email, result.user.role);

        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                role: result.user.role,
            },
            clinic: {
                id: result.clinic.id,
                name: result.clinic.name,
                slug: result.clinic.slug,
            },
            ...tokens,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findFirst({
            where: { email: dto.email, isActive: true },
            include: { clinic: true },
        });

        if (!user) {
            throw new UnauthorizedException('Geçersiz e-posta veya şifre');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Geçersiz e-posta veya şifre');
        }

        if (!user.clinic.isActive) {
            throw new UnauthorizedException('Bu klinik hesabı devre dışı');
        }

        const tokens = await this.generateTokens(user.id, user.clinicId, user.email, user.role);

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            clinic: {
                id: user.clinic.id,
                name: user.clinic.name,
                slug: user.clinic.slug,
            },
            ...tokens,
        };
    }

    async refreshToken(refreshToken: string) {
        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: { include: { clinic: true } },
            },
        });

        if (!storedToken || !storedToken.user.isActive) {
            throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
        }

        // Delete old refresh token (rotation)
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

        const tokens = await this.generateTokens(
            storedToken.user.id,
            storedToken.user.clinicId,
            storedToken.user.email,
            storedToken.user.role,
        );

        return {
            user: {
                id: storedToken.user.id,
                email: storedToken.user.email,
                firstName: storedToken.user.firstName,
                lastName: storedToken.user.lastName,
                role: storedToken.user.role,
            },
            ...tokens,
        };
    }

    async logout(userId: string) {
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { clinic: true },
        });

        if (!user) {
            throw new UnauthorizedException('Kullanıcı bulunamadı');
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phone: user.phone,
            clinic: {
                id: user.clinic.id,
                name: user.clinic.name,
                slug: user.clinic.slug,
                timezone: user.clinic.timezone,
            },
        };
    }

    // --- Private helpers ---

    private async generateTokens(userId: string, clinicId: string, email: string, role: string) {
        const payload = { sub: userId, clinicId, email, role };

        const accessToken = this.jwtService.sign(payload);

        const refreshTokenRaw = uuidv4();
        const refreshTokenHash = this.hashToken(refreshTokenRaw);

        const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn));

        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash: refreshTokenHash,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken: refreshTokenRaw,
        };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
