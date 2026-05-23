export type WidgetType = 'note' | 'task' | 'table' | 'prescription' | 'file' | 'link' | 'patient' | 'title';

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

export interface PrescriptionItem {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string;
}

export interface PrescriptionContent {
    prescriptions: PrescriptionItem[];
}

export interface FileAttachment {
    id: string;
    name: string;
    type: string;
    dataUrl: string;
}

export interface FileContent {
    files: FileAttachment[];
}

export interface LinkContent {
    url: string;
    title?: string;
}
