'use client';

import { useEffect } from 'react';
import { useHeaderStore } from './header-store';

export function PageHeader({ title, actions }: { title: React.ReactNode, actions?: React.ReactNode }) {
    const setTitle = useHeaderStore(s => s.setTitle);
    const setActions = useHeaderStore(s => s.setActions);

    useEffect(() => {
        setTitle(title);
        setActions(actions || null);
        return () => {
            setTitle(null);
            setActions(null);
        };
    }, [title, actions, setTitle, setActions]);

    return null;
}
