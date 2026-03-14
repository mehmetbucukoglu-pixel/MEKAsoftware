'use client';

import * as React from 'react';
import { BaseWidget, TableContent } from './types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface TableWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
}

export function TableWidget({ widget, onChange, isReadOnly }: TableWidgetProps) {
    const content = (widget.content as TableContent) || { headers: ['Sütun 1', 'Sütun 2'], rows: [['', '']] };

    const headers = content.headers || ['Sütun 1', 'Sütun 2'];
    const rows = content.rows || [['', '']];

    const updateTable = (newHeaders: string[], newRows: string[][]) => {
        onChange(widget.id, { headers: newHeaders, rows: newRows });
    };

    const handleHeaderChange = (index: number, value: string) => {
        if (isReadOnly) return;
        const newHeaders = [...headers];
        newHeaders[index] = value;
        updateTable(newHeaders, rows);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        if (isReadOnly) return;
        const newRows = [...rows];
        newRows[rowIndex] = [...newRows[rowIndex]];
        newRows[rowIndex][colIndex] = value;
        updateTable(headers, newRows);
    };

    const addRow = () => {
        if (isReadOnly) return;
        const newRow = new Array(headers.length).fill('');
        updateTable(headers, [...rows, newRow]);
    };

    const addColumn = () => {
        if (isReadOnly) return;
        const newHeaders = [...headers, `Sütun ${headers.length + 1}`];
        const newRows = rows.map(row => [...row, '']);
        updateTable(newHeaders, newRows);
    };

    const removeRow = (rowIndex: number) => {
        if (isReadOnly || rows.length <= 1) return;
        const newRows = rows.filter((_, i) => i !== rowIndex);
        updateTable(headers, newRows);
    };

    const removeColumn = (colIndex: number) => {
        if (isReadOnly || headers.length <= 1) return;
        const newHeaders = headers.filter((_, i) => i !== colIndex);
        const newRows = rows.map(row => row.filter((_, i) => i !== colIndex));
        updateTable(newHeaders, newRows);
    };

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-border/10 bg-card/5">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted/20 text-muted-foreground uppercase text-xs">
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index} className="px-4 py-3 border-b border-border/10 relative group min-w-[150px]">
                                <Input
                                    value={header}
                                    onChange={(e) => handleHeaderChange(index, e.target.value)}
                                    readOnly={isReadOnly}
                                    className="bg-transparent border-none p-0 h-auto font-bold uppercase focus-visible:ring-0"
                                />
                                {!isReadOnly && headers.length > 1 && (
                                    <button onClick={() => removeColumn(index)} className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-destructive">
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </th>
                        ))}
                        {!isReadOnly && (
                            <th className="px-4 py-3 border-b border-border/10 w-[50px]">
                                <Button variant="ghost" size="icon" onClick={addColumn} className="h-6 w-6">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-border/5 group relative">
                            {row.map((cell, colIndex) => (
                                <td key={colIndex} className="px-4 py-2 border-r border-border/5 last:border-0 relative group/cell">
                                    <Input
                                        value={cell}
                                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                        readOnly={isReadOnly}
                                        className="bg-transparent border-none p-0 h-8 focus-visible:ring-0 rounded-none w-full"
                                        placeholder="..."
                                    />
                                </td>
                            ))}
                            {!isReadOnly && (
                                <td className="px-2 py-2">
                                    <Button variant="ghost" size="icon" onClick={() => removeRow(rowIndex)} className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive">
                                        <X className="h-3 w-3" />
                                    </Button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {!isReadOnly && (
                <div className="p-2 border-t border-border/5">
                    <Button variant="ghost" size="sm" onClick={addRow} className="text-xs text-muted-foreground">
                        <Plus className="h-3 w-3 mr-1" /> Satır Ekle
                    </Button>
                </div>
            )}
        </div>
    );
}
