export type WidgetType = 'note' | 'task' | 'table';

export interface BaseWidget {
    id: string;
    type: WidgetType;
    content: any; // Type-specific content
}

export interface NoteContent {
    text: string;
}

export interface TaskContent {
    tasks: {
        id: string;
        title: string;
        completed: boolean;
        assigneeId?: string;
        assigneeName?: string;
        dueDate?: string; // ISO date string
    }[];
}

export interface TableContent {
    headers: string[];
    rows: string[][];
}
