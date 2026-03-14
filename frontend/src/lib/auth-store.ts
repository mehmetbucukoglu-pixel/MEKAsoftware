'use client';

import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'DOCTOR' | 'ASSISTANT' | 'ACCOUNTANT';
}

interface Clinic {
    id: string;
    name: string;
    slug: string;
    timezone?: string;
}

interface AuthState {
    user: User | null;
    clinic: Clinic | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loadUser: () => Promise<void>;
    setLoading: (loading: boolean) => void;
    isDoctor: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    clinic: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
        const { data } = await authApi.login({ email, password });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        set({ user: data.user, clinic: data.clinic, isAuthenticated: true, isLoading: false });
    },

    isDoctor: () => {
        const state = get();
        return state.user?.role === 'DOCTOR';
    },

    logout: async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, clinic: null, isAuthenticated: false });
    },

    loadUser: async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                set({ isLoading: false });
                return;
            }
            const { data } = await authApi.me();
            set({ user: data, clinic: data.clinic, isAuthenticated: true, isLoading: false });
        } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            set({ user: null, clinic: null, isAuthenticated: false, isLoading: false });
        }
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
