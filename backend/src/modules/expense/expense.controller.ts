import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ExpenseController {
    constructor(private expenseService: ExpenseService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Giderleri listele' })
    findAll(@CurrentUser() user: CurrentUserPayload) {
        return this.expenseService.findAll(user.clinicId);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Gider detay' })
    findOne(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.expenseService.findOne(user.clinicId, id);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Gider ekle' })
    create(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateExpenseDto,
    ) {
        return this.expenseService.create(user.clinicId, user.userId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Gider güncelle' })
    update(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateExpenseDto,
    ) {
        return this.expenseService.update(user.clinicId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Gider sil' })
    remove(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.expenseService.remove(user.clinicId, id);
    }
}
