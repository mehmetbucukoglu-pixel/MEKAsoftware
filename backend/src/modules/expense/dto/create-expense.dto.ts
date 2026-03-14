import { IsEnum, IsNumber, IsOptional, IsString, IsDecimal, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
    @ApiProperty({ enum: ExpenseCategory })
    @IsEnum(ExpenseCategory)
    category: ExpenseCategory;

    @ApiProperty({ example: 1500.00 })
    @IsNumber()
    amount: number;

    @ApiProperty({ example: 'Kira Ödemesi' })
    @IsString()
    description: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDateString()
    paidAt?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    metadata?: any;
}
