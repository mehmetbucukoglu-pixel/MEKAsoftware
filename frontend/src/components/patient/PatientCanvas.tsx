'use client';

import * as React from 'react';
import { WorkspaceEditor } from '../workspace/WorkspaceEditor';

interface PatientCanvasProps {
    patientId: string;
    initialContent?: string;
    onSave: (json: string) => void;
}

export function PatientCanvas({ patientId, initialContent, onSave }: PatientCanvasProps) {
    return (
        <div style={{ height: 'calc(100vh - 200px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <WorkspaceEditor
                mode="clinical"
                initialContent={initialContent}
                onSaveClinical={onSave}
            />
        </div>
    );
}
