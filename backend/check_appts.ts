import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const appts = await prisma.appointment.findMany({
    include: { patient: true, doctor: true }
  });
  const filtered = appts.filter(a => 
    a.patient.firstName.toLowerCase().includes('bar')
  ).map(a => ({
    id: a.id,
    start: a.startTime,
    patient: a.patient.firstName + ' ' + a.patient.lastName,
    doctorId: a.doctorId,
    doctor: a.doctor.firstName,
    status: a.status
  }));
  
  console.log(JSON.stringify(filtered, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
