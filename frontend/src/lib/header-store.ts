import { create } from 'zustand';
import React from 'react';

interface HeaderStore {
    title: React.ReactNode | null;
    actions: React.ReactNode | null;
    setTitle: (title: React.ReactNode | null) => void;
    setActions: (actions: React.ReactNode | null) => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
    title: null,
    actions: null,
    setTitle: (title) => set({ title }),
    setActions: (actions) => set({ actions }),
}));
