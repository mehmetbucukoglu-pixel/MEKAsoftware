import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, MaxLength, Length, Matches, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
    @ApiProperty({ example: '12345678901', description: 'TC Kimlik No (11 hane)' })
    @IsString()
    @IsNotEmpty({ message: 'TC Kimlik No zorunludur' })
    @Length(11, 11, { message: 'TC Kimlik No 11 haneli olmalıdır' })
    @Matches(/^\d{11}$/, { message: 'TC Kimlik No sadece rakamlardan oluşmalıdır' })
    tcKimlik: string;

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

    @ApiProperty({ example: 'Ankara, Çankaya, Atatürk Bulvarı No:123', description: 'Adres' })
    @IsString()
    @IsNotEmpty({ message: 'Adres zorunludur' })
    @MinLength(5, { message: 'Adres en az 5 karakter olmalıdır' })
    address: string;

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
}
