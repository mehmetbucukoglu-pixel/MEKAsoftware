'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { BaseWidget } from './types';
import { User, Phone, Calendar, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { patientApi, Patient } from '@/lib/api';
import { useDebounce } from 'use-debounce';

interface PatientWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
}

export function PatientWidget({ widget, onChange, isReadOnly }: PatientWidgetProps) {
    const content = widget.content || { patientId: '' };
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch] = useDebounce(searchTerm, 300);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const { data: patient } = useQuery<Patient>({
        queryKey: ['patient', content.patientId],
        queryFn: () => patientApi.get(content.patientId).then(res => res.data),
        enabled: !!content.patientId,
    });

    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ['patients-search', debouncedSearch],
        queryFn: () => patientApi.list({ search: debouncedSearch, limit: 5 }).then(res => res.data.data),
        enabled: debouncedSearch.length > 1 && !content.patientId,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '8px',
                        background: 'rgba(88,166,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <User size={13} style={{ color: '#58a6ff' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
                        Hasta Kartı
                    </span>
                </div>
                {content.patientId && !isReadOnly && (
                    <button 
                        onClick={() => { onChange(widget.id, { patientId: '' }); setSearchTerm(''); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}
                    >
                        Değiştir
                    </button>
                )}
            </div>

            {!content.patientId ? (
                <div ref={searchRef} style={{ padding: '8px 0', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            placeholder="İsim veya Telefon No ile ara..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                            readOnly={isReadOnly}
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px', padding: '8px 10px 8px 32px', color: '#e6edf3',
                                fontSize: '0.8rem', outline: 'none', transition: 'border-color 0.15s',
                            }}
                        />
                        {isSearching && (
                            <Loader2 size={14} className="spin" style={{ position: 'absolute', right: '10px', top: '10px', color: 'rgba(255,255,255,0.3)' }} />
                        )}
                    </div>
                    
                    {isDropdownOpen && searchResults && searchResults.length > 0 && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                            background: 'rgba(20,24,30,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(16px)'
                        }}>
                            {searchResults.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        onChange(widget.id, { patientId: p.id });
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{
                                        width: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column',
                                        background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span style={{ fontSize: '0.85rem', color: '#e6edf3', fontWeight: 500 }}>{p.firstName} {p.lastName}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{p.phone}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : patient ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-muted)',
                            color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', fontWeight: 600
                        }}>
                            {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e6edf3' }}>
                                {patient.firstName} {patient.lastName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Phone size={10}/> {patient.phone}</span>
                                {patient.dateOfBirth && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Calendar size={10}/> {new Date(patient.dateOfBirth).getFullYear()}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Hasta yükleniyor veya bulunamadı...</div>
            )}
        </div>
    );
}
