import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    order?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    teamspaceId?: string;
}

export class UpdateDocumentDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    order?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    teamspaceId?: string;
}

export class ShareDocumentDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @IsUUID('all', { each: true })
    userIds: string[];
}
