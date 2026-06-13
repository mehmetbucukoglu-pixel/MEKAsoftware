import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';

@Injectable()
export class PatientService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string, search?: string, page = 1, limit = 20) {
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where: any = { clinicId, isActive: true };

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { phone2: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ];

            // Eğer arama terimi 11 haneli rakamsa (TC araması olma ihtimali)
            if (/^\d{11}$/.test(search)) {
                where.OR.push({ phone: { contains: search, mode: 'insensitive' } });
            }
        }

        const [data, total] = await Promise.all([
            this.prisma.patient.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    appointments: {
                        orderBy: { startTime: 'desc' },
                        take: 1,
                        select: { startTime: true, status: true },
                    },
                    conversations: {
                        where: { clinicId },
                        select: { status: true, escalationReason: true },
                        take: 1,
                        orderBy: { updatedAt: 'desc' }
                    }
                },
            }),
            this.prisma.patient.count({ where }),
        ]);

        // TC Kimlikleri deşifre et
        const mappedData = data.map(p => ({
            ...p,
            // Removed tcKimlik
        }));

        return { data: mappedData, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
    }

    async findOne(clinicId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinicId, isActive: true },
            include: {
                appointments: {
                    orderBy: { startTime: 'desc' },
                    take: 5,
                    include: {
                        doctor: { select: { firstName: true, lastName: true } },
                    },
                },
                clinicalNotes: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: {
                        doctor: { select: { firstName: true, lastName: true } },
                    },
                },
                attachments: { orderBy: { createdAt: 'desc' }, take: 5 },
                _count: {
                    select: { appointments: true, clinicalNotes: true, payments: true },
                },
            },
        });

        if (!patient) {
            throw new NotFoundException('Hasta bulunamadı');
        }

        // Deşifre
        // tcKimlik decryption removed

        return patient;
    }

    async create(clinicId: string, dto: CreatePatientDto) {
        const data: any = {
            clinicId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            phone2: (dto as any).phone2 || null,
            email: dto.email || null,
            address: dto.address,
            gender: dto.gender || null,
            notes: dto.notes || null,
        };

        if (dto.dateOfBirth) {
            data.dateOfBirth = new Date(dto.dateOfBirth);
        }

        return this.prisma.patient.create({ data });
    }

    async update(clinicId: string, patientId: string, dto: UpdatePatientDto) {
        const existing = await this.prisma.patient.findFirst({
            where: { id: patientId, clinicId, isActive: true },
        });

        if (!existing) {
            throw new NotFoundException('Hasta bulunamadı');
        }

        const data: any = { ...dto };
        if (data.dateOfBirth) {
            data.dateOfBirth = new Date(data.dateOfBirth);
        }

        return this.prisma.patient.update({ where: { id: patientId }, data });
    }

    async softDelete(clinicId: string, patientId: string) {
        const existing = await this.prisma.patient.findFirst({
            where: { id: patientId, clinicId, isActive: true },
        });

        if (!existing) {
            throw new NotFoundException('Hasta bulunamadı');
        }

        return this.prisma.patient.update({
            where: { id: patientId },
            data: { isActive: false },
        });
    }

    // Yeni: Silinen hastaları getir
    async findDeleted(clinicId: string) {
        const data = await this.prisma.patient.findMany({
            where: { clinicId, isActive: false },
            orderBy: { updatedAt: 'desc' },
        });

        return data.map(p => ({
            ...p,
            // Removed tcKimlik
        }));
    }

    // Yeni: Silinen hastayı geri al
    async restore(clinicId: string, patientId: string) {
        const existing = await this.prisma.patient.findFirst({
            where: { id: patientId, clinicId, isActive: false },
        });

        if (!existing) {
            throw new NotFoundException('Silinmiş hasta bulunamadı');
        }

        const restored = await this.prisma.patient.update({
            where: { id: patientId },
            data: { isActive: true },
        });

        return restored;
    }

    // Telefon duplicate kontrolü (birincil ve ikincil numara)
    async checkPhone(clinicId: string, phone: string) {
        const existing = await this.prisma.patient.findFirst({
            where: {
                clinicId,
                OR: [{ phone }, { phone2: phone }],
            }
        });

        if (existing) {
            return { exists: true, patientName: `${existing.firstName} ${existing.lastName}`, isActive: existing.isActive };
        }
        return { exists: false };
    }
}
