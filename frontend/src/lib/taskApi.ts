import api from './api';

export interface TaskCreatorAssignee {
    id: string;
    firstName: string;
    lastName: string;
}

export interface TaskComment {
    id: string;
    content: string;
    createdAt: string;
    user: TaskCreatorAssignee;
}

export interface Task {
    id: string;
    clinicId: string;
    title: string;
    description: string | null;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate: string | null;
    creatorId: string;
    assigneeId: string | null;
    createdAt: string;
    updatedAt: string;
    assignee: TaskCreatorAssignee | null;
    creator: TaskCreatorAssignee;
    _count?: {
        comments: number;
    };
    comments?: TaskComment[]; // Only available on findOne
}

export const taskApi = {
    findAll: async (filters?: { assigneeId?: string; status?: string }): Promise<Task[]> => {
        const params = new URLSearchParams();
        if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
        if (filters?.status) params.append('status', filters.status);

        const response = await api.get(`/tasks?${params.toString()}`);
        return response.data;
    },

    findOne: async (id: string): Promise<Task> => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    },

    create: async (data: Partial<Task>): Promise<Task> => {
        const response = await api.post('/tasks', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Task>): Promise<Task> => {
        const response = await api.patch(`/tasks/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/tasks/${id}`);
    },

    addComment: async (taskId: string, content: string): Promise<TaskComment> => {
        const response = await api.post(`/tasks/${taskId}/comments`, { content });
        return response.data;
    }
};
