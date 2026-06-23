import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {

    @ApiProperty({ example: 'Ali', description: 'Hastanın adı' })
    @IsString()
    @IsNotEmpty({ message: 'Ad zorunludur' })
    @MinLength(2, { message: 'Ad en az 2 karakter olmalıdır' })
    firstName: string;

    @ApiProperty({ example: 'Korkmaz', description: 'Hastanın soyadı' })
    @IsString()
    @IsNotEmpty({ message: 'Soyad zorunludur' })
    @MinLength(2, { message: 'Soyad en az 2 karakter olmalıdır' })
    lastName: string;

    @ApiProperty({ example: '+905550001111', description: 'Telefon numarası' })
    @IsString()
    @IsNotEmpty({ message: 'Telefon numarası zorunludur' })
    phone: string;

    @ApiPropertyOptional({ example: 'ali@email.com' })
    @IsOptional()
    @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
    email?: string;

    @ApiPropertyOptional({ example: 'Ankara, Çankaya, Atatürk Bulvarı No:123', description: 'Adres' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: '1990-05-15', description: 'Doğum tarihi (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    dateOfBirth?: string;

    @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'], { message: 'Cinsiyet MALE, FEMALE veya OTHER olmalıdır' })
    gender?: string;

    @ApiPropertyOptional({ example: 'Alerji: Penisilin' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: '+905550002222', description: 'İkinci telefon numarası (opsiyonel, çocuk hastalarda veli)' })
    @IsOptional()
    @IsString()
    phone2?: string;

    @ApiPropertyOptional({ example: { primaryDoctorId: 'uuid' }, description: 'Ek meta veriler (branş spesifik)' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
