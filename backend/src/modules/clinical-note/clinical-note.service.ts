import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ClinicalNoteService {
    constructor(private prisma: PrismaService) { }

    async findAll(user: { id: string, role: any, clinicId: string }, patientId?: string) {
        const { id: userId, role, clinicId } = user;
        const where: any = { clinicId };
        if (patientId) where.patientId = patientId;

        // Visibility logic based on role
        if (role === 'DOCTOR') {
            where.OR = [
                { doctorId: userId }, // Own notes
                { visibility: { in: ['STAFF', 'ALL'] } } // Shared notes
            ];
        } else if (role === 'ASSISTANT') {
            where.visibility = { in: ['STAFF', 'ALL'] };
        } else if (role === 'ADMIN') {
            // ADMIN sees everything
        } else {
            // Others (like ACCOUNTANT) see nothing
            return [];
        }

        return this.prisma.clinicalNote.findMany({
            where, orderBy: { createdAt: 'desc' },
            include: {
                doctor: { select: { id: true, firstName: true, lastName: true } },
                patient: { select: { id: true, firstName: true, lastName: true } }
            },
        });
    }

    async create(clinicId: string, doctorId: string, data: { patientId: string; appointmentId?: string; noteType?: any; title?: string; content: string; visibility?: any }) {
        return this.prisma.clinicalNote.create({ data: { clinicId, doctorId, ...data } });
    }

    async update(clinicId: string, noteId: string, doctorId: string, data: { title?: string; content?: string }) {
        return this.prisma.clinicalNote.update({ where: { id: noteId, clinicId, doctorId }, data });
    }
}
