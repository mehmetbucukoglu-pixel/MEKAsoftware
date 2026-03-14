import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'Güneş Diş Kliniği' })
    @IsString()
    @IsNotEmpty({ message: 'Klinik adı zorunludur' })
    clinicName: string;

    @ApiProperty({ example: 'gunes-dis' })
    @IsString()
    @IsNotEmpty({ message: 'Klinik kısa adı zorunludur' })
    @Matches(/^[a-z0-9-]+$/, { message: 'Kısa ad sadece küçük harf, rakam ve tire içerebilir' })
    clinicSlug: string;

    @ApiProperty({ example: '+905551234567', required: false })
    @IsString()
    clinicPhone?: string;

    @ApiProperty({ example: 'admin@gunesdis.com' })
    @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
    email: string;

    @ApiProperty({ example: 'GucluSifre123!' })
    @IsString()
    @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
    password: string;

    @ApiProperty({ example: 'Ahmet' })
    @IsString()
    @IsNotEmpty({ message: 'Ad zorunludur' })
    firstName: string;

    @ApiProperty({ example: 'Yılmaz' })
    @IsString()
    @IsNotEmpty({ message: 'Soyad zorunludur' })
    lastName: string;

    @ApiProperty({ example: '+905551234567', required: false })
    @IsString()
    phone?: string;
}
