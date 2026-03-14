import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenantService {
    constructor(private prisma: PrismaService) { }

    async getClinic(clinicId: string) {
        return this.prisma.clinic.findUnique({ where: { id: clinicId } });
    }

    async updateClinic(clinicId: string, data: { name?: string; phone?: string; address?: string; timezone?: string }) {
        return this.prisma.clinic.update({ where: { id: clinicId }, data });
    }
}
