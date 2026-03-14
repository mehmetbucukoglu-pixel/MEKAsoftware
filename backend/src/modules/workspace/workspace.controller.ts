import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateDocumentDto, UpdateDocumentDto, ShareDocumentDto } from './dto/document.dto';
import { CreateTeamspaceDto, AddTeamspaceMembersDto } from './dto/teamspace.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('workspace')
export class WorkspaceController {
    constructor(private readonly workspaceService: WorkspaceService) { }

    @Post('documents')
    create(@CurrentUser() user: any, @Body() createDto: CreateDocumentDto) {
        console.log('Incoming create document request:', { userId: user?.userId, clinicId: user?.clinicId, createDto });
        return this.workspaceService.createDocument(user.clinicId, user.userId, createDto);
    }

    @Get('documents')
    findAll(@CurrentUser() user: any) {
        return this.workspaceService.findAllDocuments(user.clinicId, user.userId);
    }

    @Get('documents/:id')
    findOne(@CurrentUser() user: any, @Param('id') id: string) {
        return this.workspaceService.findOneDocument(user.clinicId, id);
    }

    @Patch('documents/:id')
    update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateDto: UpdateDocumentDto) {
        return this.workspaceService.updateDocument(user.clinicId, id, updateDto);
    }

    @Patch('documents/:id/share')
    share(@CurrentUser() user: any, @Param('id') id: string, @Body() shareDto: ShareDocumentDto) {
        return this.workspaceService.shareDocument(user.clinicId, id, shareDto);
    }

    @Delete('documents/:id')
    remove(@CurrentUser() user: any, @Param('id') id: string) {
        return this.workspaceService.removeDocument(user.clinicId, id);
    }

    // =====================================
    // TEAMSPACE ENDPOINTS
    // =====================================

    @Post('teamspaces')
    createTeamspace(@CurrentUser() user: any, @Body() createDto: CreateTeamspaceDto) {
        return this.workspaceService.createTeamspace(user.clinicId, user.userId, createDto);
    }

    @Get('teamspaces')
    findAllTeamspaces(@CurrentUser() user: any) {
        return this.workspaceService.findAllTeamspaces(user.clinicId, user.userId);
    }

    @Post('teamspaces/:id/members')
    addTeamspaceMembers(@CurrentUser() user: any, @Param('id') id: string, @Body() addMembersDto: AddTeamspaceMembersDto) {
        return this.workspaceService.addTeamspaceMembers(user.clinicId, id, addMembersDto);
    }
}
