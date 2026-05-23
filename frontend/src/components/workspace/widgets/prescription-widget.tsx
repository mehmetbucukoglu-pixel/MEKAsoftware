'use client';

import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import { BaseWidget, PrescriptionContent, PrescriptionItem } from './types';
import { Plus, X, Pill } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface PrescriptionWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
}

export function PrescriptionWidget({ widget, onChange, isReadOnly }: PrescriptionWidgetProps) {
    const content = (widget.content as PrescriptionContent) || { prescriptions: [] };
    const prescriptions: PrescriptionItem[] = content.prescriptions || [];

    const updatePrescriptions = useCallback((next: PrescriptionItem[]) => {
        onChange(widget.id, { prescriptions: next });
    }, [onChange, widget.id]);

    const addPrescription = () => {
        if (isReadOnly) return;
        const p: PrescriptionItem = { id: uuidv4(), name: '', dosage: '', frequency: '', duration: '', notes: '' };
        updatePrescriptions([...prescriptions, p]);
    };

    const updateField = (pid: string, field: keyof PrescriptionItem, value: string) => {
        if (isReadOnly) return;
        updatePrescriptions(prescriptions.map(p => p.id === pid ? { ...p, [field]: value } : p));
    };

    const removePrescription = (pid: string) => {
        if (isReadOnly) return;
        updatePrescriptions(prescriptions.filter(p => p.id !== pid));
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
                    background: 'rgba(126,231,135,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Pill size={13} style={{ color: '#7ee787' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
                    Reçete / İlaç
                </span>
            </div>

            {/* Prescription list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {prescriptions.map(p => (
                    <div key={p.id} style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px',
                        border: '1px solid rgba(255,255,255,0.06)', position: 'relative',
                        transition: 'border-color 0.15s',
                    }}>
                        {!isReadOnly && (
                            <button onClick={() => removePrescription(p.id)}
                                style={{
                                    position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none',
                                    cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '2px',
                                    transition: 'color 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,80,80,0.7)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}
                            >
                                <X size={11} />
                            </button>
                        )}
                        <input
                            value={p.name}
                            onChange={(e) => updateField(p.id, 'name', e.target.value)}
                            placeholder="İlaç adı"
                            readOnly={isReadOnly}
                            style={{
                                background: 'transparent', border: 'none', outline: 'none',
                                color: '#7ee787', fontSize: '0.875rem', fontWeight: 600, width: '85%', marginBottom: '6px',
                            }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            {([
                                { field: 'dosage' as const, placeholder: 'Doz (ör: 2x1)' },
                                { field: 'frequency' as const, placeholder: 'Sıklık' },
                                { field: 'duration' as const, placeholder: 'Süre' },
                            ]).map(({ field, placeholder }) => (
                                <input key={field}
                                    value={p[field]}
                                    onChange={(e) => updateField(p.id, field, e.target.value)}
                                    placeholder={placeholder}
                                    readOnly={isReadOnly}
                                    style={{
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '6px', padding: '4px 8px', color: '#e6edf3', fontSize: '0.75rem', outline: 'none',
                                        transition: 'border-color 0.15s',
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(126,231,135,0.3)'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                />
                            ))}
                        </div>
                        <input value={p.notes}
                            onChange={(e) => updateField(p.id, 'notes', e.target.value)}
                            placeholder="Notlar (ör: Yemeklerden sonra alınmalı)"
                            readOnly={isReadOnly}
                            style={{
                                background: 'transparent', border: 'none', outline: 'none',
                                color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', width: '100%',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Add button */}
            {!isReadOnly && (
                <button onClick={addPrescription} style={{
                    marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: '1px dashed rgba(126,231,135,0.2)',
                    borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                    color: 'rgba(126,231,135,0.5)', fontSize: '0.75rem', width: '100%', justifyContent: 'center',
                    transition: 'all 0.15s',
                }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(126,231,135,0.4)'; e.currentTarget.style.background = 'rgba(126,231,135,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(126,231,135,0.2)'; e.currentTarget.style.background = 'none'; }}
                >
                    <Plus size={13} /> İlaç Ekle
                </button>
            )}

            {prescriptions.length === 0 && (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'rgba(255,255,255,0.12)', fontSize: '0.8rem' }}>
                    Henüz ilaç eklenmedi
                </div>
            )}
        </div>
    );
}
