'use client';

import * as React from 'react';
import { useRef, useCallback } from 'react';
import { BaseWidget, FileContent, FileAttachment } from './types';
import { Upload, X, FileUp, Paperclip } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FileWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
}

export function FileWidget({ widget, onChange, isReadOnly }: FileWidgetProps) {
    const content = (widget.content as FileContent) || { files: [] };
    const files: FileAttachment[] = content.files || [];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateFiles = useCallback((next: FileAttachment[]) => {
        onChange(widget.id, { files: next });
    }, [onChange, widget.id]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly) return;
        const fileList = e.target.files;
        if (!fileList) return;
        Array.from(fileList).forEach(f => {
            const reader = new FileReader();
            reader.onload = () => {
                const attachment: FileAttachment = {
                    id: uuidv4(),
                    name: f.name,
                    type: f.type,
                    dataUrl: reader.result as string,
                };
                updateFiles([...files, attachment]);
            };
            reader.readAsDataURL(f);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (fid: string) => {
        if (isReadOnly) return;
        updateFiles(files.filter(f => f.id !== fid));
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '8px',
                    background: 'rgba(255,121,198,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Paperclip size={13} style={{ color: '#ff79c6' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
                    Dosyalar
                </span>
            </div>

            <input ref={fileInputRef} type="file" multiple accept="*/*" onChange={handleFileUpload} style={{ display: 'none' }} />

            {/* File list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {files.map(f => (
                    <div key={f.id} style={{ position: 'relative' }}>
                        {f.type.startsWith('image/') ? (
                            <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
                                <img src={f.dataUrl} alt={f.name}
                                    style={{ width: '100%', borderRadius: '10px', display: 'block' }} loading="lazy" />
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '16px 10px 8px',
                                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                    {!isReadOnly && (
                                        <button onClick={() => removeFile(f.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                                background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <FileUp size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.8rem', color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.name}
                                </span>
                                {!isReadOnly && (
                                    <button onClick={() => removeFile(f.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)' }}>
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Upload button */}
            {!isReadOnly && (
                <button onClick={() => fileInputRef.current?.click()} style={{
                    marginTop: files.length > 0 ? '8px' : '0', display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: '1px dashed rgba(255,121,198,0.2)',
                    borderRadius: '8px', padding: '10px 12px', cursor: 'pointer',
                    color: 'rgba(255,121,198,0.5)', fontSize: '0.75rem', width: '100%', justifyContent: 'center',
                    transition: 'all 0.15s',
                }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,121,198,0.4)'; e.currentTarget.style.background = 'rgba(255,121,198,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,121,198,0.2)'; e.currentTarget.style.background = 'none'; }}
                >
                    <Upload size={13} /> Dosya Yükle
                </button>
            )}

            {files.length === 0 && (
                <div style={{ padding: '6px 0 0', textAlign: 'center', color: 'rgba(255,255,255,0.12)', fontSize: '0.8rem' }}>
                    Dosya yüklemek için tıklayın
                </div>
            )}
        </div>
    );
}
