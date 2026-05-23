import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsappWebhookDto {
    @ApiProperty()
    @IsString()
    clinicId: string;

    @ApiProperty()
    @IsString()
    waPhone: string;

    @ApiProperty()
    @IsString()
    waMessageId: string;

    @ApiProperty()
    @IsString()
    body: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    direction?: 'INBOUND' | 'OUTBOUND';

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    mediaUrl?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    mediaType?: string;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    metadata?: any;
}
