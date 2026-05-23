import api from './api';

export interface WorkspaceDocument {
    id: string;
    title: string;
    content: string;
    icon?: string;
    order: number;
    teamspaceId?: string;
    creatorId: string;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    collaborators?: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
    tasks?: any[];
}

export interface Teamspace {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    creatorId: string;
    members?: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
}

export const workspaceApi = {
    getDocuments: async () => {
        const response = await api.get('/workspace/documents');
        return response.data;
    },

    getDocument: async (id: string) => {
        const response = await api.get(`/workspace/documents/${id}`);
        return response.data;
    },

    createDocument: async (data: { title: string; content?: string, icon?: string, order?: number, teamspaceId?: string }) => {
        const response = await api.post('/workspace/documents', data);
        return response.data;
    },

    updateDocument: async (id: string, data: { title?: string; content?: string, icon?: string, order?: number, teamspaceId?: string }) => {
        const response = await api.patch(`/workspace/documents/${id}`, data);
        return response.data;
    },

    shareDocument: async (id: string, userIds: string[]) => {
        const response = await api.patch(`/workspace/documents/${id}/share`, { userIds });
        return response.data;
    },

    deleteDocument: async (id: string) => {
        const response = await api.delete(`/workspace/documents/${id}`);
        return response.data;
    },

    createTask: async (documentId: string, data: any) => {
        const response = await api.post('/tasks', { ...data, documentId });
        return response.data;
    },

    // Teamspace Methods
    getTeamspaces: async () => {
        const response = await api.get('/workspace/teamspaces');
        return response.data;
    },

    createTeamspace: async (data: { name: string; description?: string; icon?: string }) => {
        const response = await api.post('/workspace/teamspaces', data);
        return response.data;
    },

    deleteTeamspace: async (id: string) => {
        const response = await api.delete(`/workspace/teamspaces/${id}`);
        return response.data;
    },

    addTeamspaceMembers: async (teamspaceId: string, userIds: string[]) => {
        const response = await api.post(`/workspace/teamspaces/${teamspaceId}/members`, { userIds });
        return response.data;
    }
};
