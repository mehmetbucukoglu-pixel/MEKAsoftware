import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CryptoUtil } from '../src/common/utils/crypto.util';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Demo Klinik
    const clinic = await prisma.clinic.upsert({
        where: { slug: 'feneryolu-psikiyatri' },
        update: {},
        create: {
            id: '135460d3-f612-457f-89e8-8ead3181c562',
            name: 'Feneryolu Psikiyatri',
            slug: 'feneryolu-psikiyatri',
            phone: '+905551234567',
            address: 'Ankara, Çankaya',
            timezone: 'Europe/Istanbul',
        },
    });
    console.log(`✅ Klinik: ${clinic.name} (${clinic.id})`);

    // Admin
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const admin = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'admin@demo.com' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'admin@demo.com',
            passwordHash: adminPassword,
            firstName: 'Demo',
            lastName: 'Admin',
            phone: '+905559998877',
            role: UserRole.ADMIN,
        },
    });
    console.log(`✅ Admin: ${admin.email}`);

    // Doktor 1 (Ayşe Pınar Vural)
    const doctor1Password = await bcrypt.hash('Doctor123!', 12);
    const doctor1 = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'ayse@demo.com' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'ayse@demo.com',
            passwordHash: doctor1Password,
            firstName: 'Ayşe Pınar',
            lastName: 'Vural',
            phone: '+905559876543',
            role: UserRole.DOCTOR,
        },
    });
    console.log(`✅ Doktor 1: ${doctor1.email}`);

    // Doktor 2 (Ece Yılmaz)
    const doctor2Password = await bcrypt.hash('Doctor123!', 12);
    const doctor2 = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'ece@demo.com' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'ece@demo.com',
            passwordHash: doctor2Password,
            firstName: 'Ece',
            lastName: 'Yılmaz',
            phone: '+905558887766',
            role: UserRole.DOCTOR,
        },
    });
    console.log(`✅ Doktor 2: ${doctor2.email}`);

    // Asistan
    const assistantPassword = await bcrypt.hash('Assist123!', 12);
    const assistant = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'asistan@demo.com' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'asistan@demo.com',
            passwordHash: assistantPassword,
            firstName: 'Elif',
            lastName: 'Demir',
            phone: '+905551112233',
            role: UserRole.ASSISTANT,
        },
    });
    console.log(`✅ Asistan: ${assistant.email}`);

    // Doktor çalışma takvimi (Pazartesi-Cuma)
    for (let day = 0; day < 5; day++) {
        await prisma.doctorSchedule.upsert({
            where: { clinicId_doctorId_dayOfWeek: { clinicId: clinic.id, doctorId: doctor1.id, dayOfWeek: day } },
            update: {},
            create: {
                clinicId: clinic.id,
                doctorId: doctor1.id,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '23:00', // AI Agent'ın çalışma saatlerine uygun
                slotDuration: 60,
            },
        });
        await prisma.doctorSchedule.upsert({
            where: { clinicId_doctorId_dayOfWeek: { clinicId: clinic.id, doctorId: doctor2.id, dayOfWeek: day } },
            update: {},
            create: {
                clinicId: clinic.id,
                doctorId: doctor2.id,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '23:00',
                slotDuration: 60,
            },
        });
    }
    console.log('✅ Doktor takvimleri oluşturuldu');

    // Demo hastalar
    const patients = [
        { firstName: 'Ali', lastName: 'Korkmaz', phone: '+905550001111', address: 'Ankara, Çankaya, Kızılay Mah. Atatürk Blv. No:10' },
        { firstName: 'Ayşe', lastName: 'Şahin', phone: '+905550002222', address: 'Ankara, Keçiören, Etlik Cad. No:25' },
        { firstName: 'Mehmet', lastName: 'Öztürk', phone: '+905550003333', address: 'İstanbul, Kadıköy, Moda Cad. No:5' },
        { firstName: 'Zeynep', lastName: 'Arslan', phone: '+905550004444', address: 'İzmir, Bornova, Üniversite Mah. No:42' },
        { firstName: 'Emre', lastName: 'Yıldız', phone: '+905550005555', address: 'Ankara, Çankaya, Bahçelievler Mah. No:8' },
    ];

    for (const p of patients) {
        const existing = await prisma.patient.findFirst({
            where: { clinicId: clinic.id, phone: p.phone }
        });
        if (!existing) {
            await prisma.patient.create({
                data: {
                    clinicId: clinic.id,
                    ...p
                },
            });
        }
    }
    console.log(`✅ ${patients.length} demo hasta kontrol edildi/oluşturuldu`);

    // Example Conversations & Messages
    const ali = await prisma.patient.findFirst({ where: { firstName: 'Ali', clinicId: clinic.id } });
    const ayse = await prisma.patient.findFirst({ where: { firstName: 'Ayşe', clinicId: clinic.id } });
    const mehmet = await prisma.patient.findFirst({ where: { firstName: 'Mehmet', clinicId: clinic.id } });

    if (ali && ayse && mehmet) {
        // Clear old conversations to avoid unique constraint errors
        await prisma.message.deleteMany({ where: { clinicId: clinic.id } });
        await prisma.conversation.deleteMany({ where: { clinicId: clinic.id } });

        // Ali: Completed bot flow
        const convAli = await prisma.conversation.create({
            data: {
                clinicId: clinic.id,
                patientId: ali.id,
                waPhone: ali.phone,
                status: 'BOT',
                lastMessageAt: new Date(),
                messages: {
                    create: [
                        { clinicId: clinic.id, direction: 'INBOUND', body: 'Merhaba, randevu almak istiyorum.', createdAt: new Date(Date.now() - 3600000) },
                        { clinicId: clinic.id, direction: 'OUTBOUND', body: 'Merhaba Ali Bey, size nasıl yardımcı olabilirim? Hangi branş için randevu istersiniz?', createdAt: new Date(Date.now() - 3500000) },
                        { clinicId: clinic.id, direction: 'INBOUND', body: 'Diş temizliği için.', createdAt: new Date(Date.now() - 3400000) }
                    ]
                }
            }
        });

        // Ayşe: New message, unread
        await prisma.conversation.create({
            data: {
                clinicId: clinic.id,
                patientId: ayse.id,
                waPhone: ayse.phone,
                status: 'BOT',
                unreadCount: 1,
                lastMessageAt: new Date(),
                messages: {
                    create: [
                        { clinicId: clinic.id, direction: 'INBOUND', body: 'Yarınki randevum saat kaçtaydı?', createdAt: new Date() }
                    ]
                }
            }
        });

        // Mehmet: Human intervention
        await prisma.conversation.create({
            data: {
                clinicId: clinic.id,
                patientId: mehmet.id,
                waPhone: mehmet.phone,
                status: 'HUMAN',
                assignedTo: assistant.id,
                lastMessageAt: new Date(),
                messages: {
                    create: [
                        { clinicId: clinic.id, direction: 'INBOUND', body: 'Fiyatlarınız hakkında bilgi alabilir miyim?', createdAt: new Date(Date.now() - 7200000) },
                        { clinicId: clinic.id, direction: 'OUTBOUND', body: 'Tabii Mehmet Bey, sizi bir asistanımıza aktarıyorum.', createdAt: new Date(Date.now() - 7100000) },
                        { clinicId: clinic.id, direction: 'OUTBOUND', body: 'Merhaba Mehmet Bey, ben Elif. Hangi işlem için fiyat bilgisi istersiniz?', createdAt: new Date(Date.now() - 7000000) }
                    ]
                }
            }
        });
        console.log('✅ Örnek sohbetler oluşturuldu');
    }

    console.log('\n🎉 Seed tamamlandı!');
    console.log('\n📋 Giriş bilgileri:');
    console.log('  Admin:   admin@demo.com / Admin123!');
    console.log('  Doktor:  doctor@demo.com / Doctor123!');
    console.log('  Asistan: asistan@demo.com / Assist123!');
}

main()
    .catch((e) => {
        console.error('❌ Seed hatası:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
