import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, Task, User, TaskComment } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }

  async create(clinicId: string, userId: string, createTaskDto: CreateTaskDto) {
    const task = (await this.prisma.task.create({
      data: {
        clinicId,
        creatorId: userId,
        ...createTaskDto,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    })) as Task & { creator: { firstName: string } };

    if (createTaskDto.assigneeId && createTaskDto.assigneeId !== userId) {
      await this.notificationService.create(
        clinicId,
        createTaskDto.assigneeId,
        {
          type: 'NEW_TASK',
          title: 'Yeni Görev Atandı',
          body: `${task.creator.firstName} size "${task.title}" görevini atadı.`,
          entityType: 'task',
          entityId: task.id,
        },
      );
    }

    return task;
  }

  async findAll(clinicId: string, assigneeId?: string, status?: string) {
    const where: Prisma.TaskWhereInput = { clinicId };

    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status as any;

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [
        { status: 'asc' }, // TODO first
        { priority: 'desc' }, // HIGH first
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(clinicId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, clinicId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) throw new NotFoundException('Görev bulunamadı');
    return task;
  }

  async update(clinicId: string, id: string, updateTaskDto: UpdateTaskDto) {
    // First check if exists
    await this.findOne(clinicId, id);

    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(clinicId: string, id: string) {
    await this.findOne(clinicId, id);
    return this.prisma.task.delete({ where: { id } });
  }

  async addComment(
    clinicId: string,
    taskId: string,
    userId: string,
    createCommentDto: CreateTaskCommentDto,
  ) {
    const task = (await this.findOne(clinicId, taskId)) as Task;

    const comment = (await this.prisma.taskComment.create({
      data: {
        clinicId,
        taskId,
        userId,
        content: createCommentDto.content,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    })) as TaskComment & { user: { firstName: string } };

    // Notify participants (creator or assignee, whoever is NOT the commenter)
    const notifyUserId =
      task.creatorId === userId ? task.assigneeId : task.creatorId;

    if (notifyUserId) {
      await this.notificationService.create(clinicId, notifyUserId, {
        type: 'NEW_TASK_COMMENT',
        title: 'Göreve Yorum Yapıldı',
        body: `${comment.user.firstName}: "${comment.content.substring(0, 30)}..."`,
        entityType: 'task',
        entityId: task.id,
      });
    }

    return comment;
  }
}
