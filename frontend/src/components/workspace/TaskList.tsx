'use client';

import { useState } from 'react';
import { TaskRow } from './TaskRow';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    status: string;
    assignee?: { firstName: string; lastName: string };
}

interface TaskListProps {
    title: string;
    tasks: Task[];
    onAddTask: (title: string) => void;
    onToggleTask: (id: string, status: string) => void;
    onDeleteTask: (id: string) => void;
    onUpdateTask: (id: string, title: string) => void;
    onOpenDetail: (task: Task) => void;
}

export function TaskList({ title, tasks, onAddTask, onToggleTask, onDeleteTask, onUpdateTask, onOpenDetail }: TaskListProps) {
    const [newTitle, setNewTitle] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim()) {
            onAddTask(newTitle);
            setNewTitle('');
        }
    };

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between px-6 mb-3">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    {title}
                    <span className="bg-muted-foreground/10 text-muted-foreground/60 text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                        {tasks.length}
                    </span>
                </h3>
            </div>

            <div className="space-y-0.5">
                {tasks.map(task => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        onToggleStatus={onToggleTask}
                        onDelete={onDeleteTask}
                        onUpdateTitle={onUpdateTask}
                        onOpenDetail={() => onOpenDetail(task)}
                    />
                ))}

                {/* Ghost Row / Quick Create */}
                <form
                    onSubmit={handleSubmit}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg transition-all",
                        isInputFocused ? "bg-accent/20" : "hover:bg-accent/10"
                    )}
                >
                    <Plus className={cn("h-4 w-4 transition-colors", isInputFocused ? "text-primary" : "text-muted-foreground/30")} />
                    <Input
                        placeholder="Yeni görev..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        className="h-7 text-sm bg-transparent border-none focus-visible:ring-0 p-0 shadow-none placeholder:text-muted-foreground/20"
                    />
                </form>
            </div>
        </div>
    );
}
