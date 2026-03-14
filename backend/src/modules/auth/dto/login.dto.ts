import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'admin@gunesdis.com' })
    @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
    email: string;

    @ApiProperty({ example: 'GucluSifre123!' })
    @IsString()
    @IsNotEmpty({ message: 'Şifre zorunludur' })
    password: string;
}
