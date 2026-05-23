'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Loader2, X } from 'lucide-react';
import { patientApi, Patient } from '@/lib/api';
import { formatPhone } from '@/lib/format';

interface PatientSearchInputProps {
    onSelect: (patient: Patient | null) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    initialPatientId?: string;
}

export default function PatientSearchInput({
    onSelect,
    placeholder = "Hasta adı, TC veya telefon ile ara...",
    label = "Hasta Seçimi",
    required = false,
    initialPatientId
}: PatientSearchInputProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial load if patientId is provided
    useEffect(() => {
        if (initialPatientId && !selectedPatient) {
            // Fetch single patient if needed, or if we have it in list
            patientApi.get(initialPatientId).then(res => {
                const p = res.data;
                setSelectedPatient(p);
                setQuery(`${p.firstName} ${p.lastName}`);
            }).catch(() => { });
        }
    }, [initialPatientId]);

    // Search logic with debounce
    useEffect(() => {
        if (!query || query.length < 2 || selectedPatient) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await patientApi.list({ search: query, limit: 5 });
                setResults(res.data.data);
                setIsOpen(true);
            } catch (err) {
                console.error("Arama hatası", err);
            } finally {
                setIsLoading(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query, selectedPatient]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (patient: Patient) => {
        setSelectedPatient(patient);
        setQuery(`${patient.firstName} ${patient.lastName}`);
        setIsOpen(false);
        onSelect(patient);
    };

    const handleClear = () => {
        setSelectedPatient(null);
        setQuery('');
        setResults([]);
        onSelect(null);
    };

    return (
        <div className="form-group" style={{ position: 'relative' }} ref={containerRef}>
            {label && <label>{label}</label>}
            <div style={{ position: 'relative' }}>
                <Search
                    size={16}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: '38px', paddingRight: selectedPatient ? '38px' : '12px' }}
                    placeholder={placeholder}
                    required={required && !selectedPatient}
                    value={query}
                    autoComplete="off"
                    onChange={(e) => {
                        if (selectedPatient) {
                            setSelectedPatient(null);
                            onSelect(null);
                        }
                        setQuery(e.target.value);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                />

                {isLoading && (
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                        <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />
                    </div>
                )}

                {selectedPatient && !isLoading && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && results.length > 0 && !selectedPatient && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', marginTop: '4px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 1100,
                    maxHeight: '200px', overflowY: 'auto'
                }}>
                    {results.map(p => (
                        <div
                            key={p.id}
                            onClick={() => handleSelect(p)}
                            style={{
                                display: 'flex', alignItems: 'center', padding: '10px 12px',
                                cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'var(--primary-muted)', color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginRight: '10px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                                {p.firstName[0]}{p.lastName[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.firstName} {p.lastName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                                    <span>Tel: {formatPhone(p.phone)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
