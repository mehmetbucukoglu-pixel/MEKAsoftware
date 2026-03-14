import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'Refresh token zorunludur' })
    refreshToken: string;
}
