import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWhatsAppAppointmentDto {
    @ApiProperty({ description: 'Hasta adı soyadı', example: 'Mehmet Çubukoğlu' })
    @IsString()
    @IsNotEmpty()
    patientName: string;

    @ApiProperty({ description: 'Hasta telefon numarası', example: '905413319917' })
    @IsString()
    @IsNotEmpty()
    patientPhone: string;

    @ApiProperty({ description: 'Doktor adı', example: 'Dr. Ayşe Pınar Vural' })
    @IsString()
    @IsNotEmpty()
    doctorName: string;

    @ApiProperty({ description: 'Randevu başlangıç zamanı', example: '2026-04-21 16:00' })
    @IsString()
    @IsNotEmpty()
    startTime: string;

    @ApiProperty({ description: 'Randevu süresi (dakika)', example: '60' })
    @IsNotEmpty()
    durationMin: any; // Accept both string and number from AI

    @ApiProperty({ description: 'Notlar', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
