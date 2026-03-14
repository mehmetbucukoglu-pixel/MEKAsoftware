import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CryptoUtil } from '../src/common/utils/crypto.util';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Demo Klinik
    const clinic = await prisma.clinic.upsert({
        where: { slug: 'demo-klinik' },
        update: {},
        create: {
            name: 'Demo Diş Kliniği',
            slug: 'demo-klinik',
            phone: '+905551234567',
            address: 'Ankara, Çankaya',
            timezone: 'Europe/Istanbul',
        },
    });
    console.log(`✅ Klinik: ${clinic.name} (${clinic.id})`);

    // Admin kullanıcı
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const admin = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'admin@demo.com' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'admin@demo.com',
            passwordHash: adminPassword,
            firstName: 'Ahmet',
            lastName: 'Yılmaz',
            phone: '+905551234567',
            role: UserRole.ADMIN,
        },
    });
    console.log(`✅ Admin: ${admin.email}`);

    // Doktor
    const doctorPassword = await bcrypt.hash('Doctor123!', 12);
    const doctor = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'doctor@demo.com' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'doctor@demo.com',
            passwordHash: doctorPassword,
            firstName: 'Fatma',
            lastName: 'Kaya',
            phone: '+905559876543',
            role: UserRole.DOCTOR,
        },
    });
    console.log(`✅ Doktor: ${doctor.email}`);

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
            where: { clinicId_doctorId_dayOfWeek: { clinicId: clinic.id, doctorId: admin.id, dayOfWeek: day } },
            update: {},
            create: {
                clinicId: clinic.id,
                doctorId: admin.id,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '17:00',
                breakStart: '12:00',
                breakEnd: '13:00',
                slotDuration: 30,
            },
        });
        await prisma.doctorSchedule.upsert({
            where: { clinicId_doctorId_dayOfWeek: { clinicId: clinic.id, doctorId: doctor.id, dayOfWeek: day } },
            update: {},
            create: {
                clinicId: clinic.id,
                doctorId: doctor.id,
                dayOfWeek: day,
                startTime: '10:00',
                endTime: '18:00',
                breakStart: '13:00',
                breakEnd: '14:00',
                slotDuration: 30,
            },
        });
    }
    console.log('✅ Doktor takvimleri oluşturuldu');

    // Demo hastalar
    const patients = [
        { tcKimlik: '10000000001', firstName: 'Ali', lastName: 'Korkmaz', phone: '+905550001111', address: 'Ankara, Çankaya, Kızılay Mah. Atatürk Blv. No:10' },
        { tcKimlik: '20000000002', firstName: 'Ayşe', lastName: 'Şahin', phone: '+905550002222', address: 'Ankara, Keçiören, Etlik Cad. No:25' },
        { tcKimlik: '30000000003', firstName: 'Mehmet', lastName: 'Öztürk', phone: '+905550003333', address: 'İstanbul, Kadıköy, Moda Cad. No:5' },
        { tcKimlik: '40000000004', firstName: 'Zeynep', lastName: 'Arslan', phone: '+905550004444', address: 'İzmir, Bornova, Üniversite Mah. No:42' },
        { tcKimlik: '50000000005', firstName: 'Emre', lastName: 'Yıldız', phone: '+905550005555', address: 'Ankara, Çankaya, Bahçelievler Mah. No:8' },
    ];

    for (const p of patients) {
        const encryptedTc = CryptoUtil.encrypt(p.tcKimlik);
        const hashedTc = CryptoUtil.hash(p.tcKimlik);

        await prisma.patient.upsert({
            where: { clinicId_tcKimlikHash: { clinicId: clinic.id, tcKimlikHash: hashedTc } },
            update: {},
            create: {
                clinicId: clinic.id,
                ...p,
                tcKimlik: encryptedTc,
                tcKimlikHash: hashedTc
            },
        });
    }
    console.log(`✅ ${patients.length} demo hasta oluşturuldu`);

    // Example Conversations & Messages
    const ali = await prisma.patient.findFirst({ where: { firstName: 'Ali', clinicId: clinic.id } });
    const ayse = await prisma.patient.findFirst({ where: { firstName: 'Ayşe', clinicId: clinic.id } });
    const mehmet = await prisma.patient.findFirst({ where: { firstName: 'Mehmet', clinicId: clinic.id } });

    if (ali && ayse && mehmet) {
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
                assignedTo: admin.id,
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
