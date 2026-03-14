import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger'; // Assuming ApiBearerAuth is from @nestjs/swagger

// Assuming TaskStatus is an enum or type defined elsewhere, adding it for compilation
type TaskStatus = string;

@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly taskService: TaskService) { }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.taskService.create(user.clinicId, user.userId, createTaskDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.taskService.findAll(user.clinicId, assigneeId, status);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.taskService.findOne(user.clinicId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(user.clinicId, id, updateTaskDto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string
  ) {
    return this.taskService.remove(user.clinicId, id);
  }

  @Post(':id/comments')
  addComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() createCommentDto: CreateTaskCommentDto,
  ) {
    return this.taskService.addComment(user.clinicId, id, user.userId, createCommentDto);
  }
}
