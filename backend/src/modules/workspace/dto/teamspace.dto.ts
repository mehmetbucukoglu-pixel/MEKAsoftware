import { IsString, IsOptional, IsNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamspaceDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    icon?: string;
}

export class UpdateTeamspaceDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    icon?: string;
}

export class AddTeamspaceMembersDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @IsUUID('all', { each: true })
    userIds: string[];
}
