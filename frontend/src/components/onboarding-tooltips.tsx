'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const ONBOARDING_KEY = 'onboarding_completed';

interface OnboardingStep {
    target: string; // CSS selector
    title: string;
    description: string;
    position: 'bottom' | 'right' | 'left' | 'top';
}

const STEPS: OnboardingStep[] = [
    {
        target: 'nav',
        title: 'Navigasyon',
        description: 'Buradan tüm modüllere hızlıca erişebilirsiniz.',
        position: 'right',
    },
    {
        target: '[data-onboarding="quick-search"]',
        title: 'Hızlı Arama',
        description: 'Ctrl+K ile istediğiniz hastayı veya sayfayı anında bulun.',
        position: 'bottom',
    },
    {
        target: '[data-onboarding="kpi-cards"]',
        title: 'KPI Kartları',
        description: 'Bu kartları özelleştirebilirsiniz — Düzenle butonuna tıklayın.',
        position: 'bottom',
    },
    {
        target: '[data-onboarding="workspace-link"]',
        title: 'Workspace',
        description: 'Ekibinizle notlar ve görevler oluşturmak için Workspace\'i kullanın.',
        position: 'right',
    },
    {
        target: '[data-onboarding="patients-link"]',
        title: 'Hasta Notları',
        description: 'Hasta profilinde Canvas sekmesinden serbest notlar, görevler ve tablolar oluşturabilirsiniz.',
        position: 'right',
    },
];

export function OnboardingTooltips() {
    const [currentStep, setCurrentStep] = useState(-1); // -1 = not started / completed
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Only show on desktop
        if (window.innerWidth < 768) return;

        const completed = localStorage.getItem(ONBOARDING_KEY);
        if (!completed) {
            // Small delay for DOM to be ready
            const timer = setTimeout(() => setCurrentStep(0), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const updateTargetRect = useCallback(() => {
        if (currentStep < 0 || currentStep >= STEPS.length) return;
        const step = STEPS[currentStep];
        const el = document.querySelector(step.target);
        if (el) {
            setTargetRect(el.getBoundingClientRect());
        } else {
            setTargetRect(null);
        }
    }, [currentStep]);

    useEffect(() => {
        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        return () => window.removeEventListener('resize', updateTargetRect);
    }, [updateTargetRect]);

    const finish = () => {
        setCurrentStep(-1);
        localStorage.setItem(ONBOARDING_KEY, 'true');
    };

    const next = () => {
        if (currentStep >= STEPS.length - 1) {
            finish();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const prev = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    if (currentStep < 0 || !targetRect) return null;

    const step = STEPS[currentStep];

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        const gap = 12;
        const base: React.CSSProperties = { position: 'fixed', zIndex: 10002 };

        switch (step.position) {
            case 'bottom':
                return { ...base, top: targetRect.bottom + gap, left: targetRect.left + targetRect.width / 2, transform: 'translateX(-50%)' };
            case 'top':
                return { ...base, bottom: window.innerHeight - targetRect.top + gap, left: targetRect.left + targetRect.width / 2, transform: 'translateX(-50%)' };
            case 'right':
                return { ...base, top: targetRect.top + targetRect.height / 2, left: targetRect.right + gap, transform: 'translateY(-50%)' };
            case 'left':
                return { ...base, top: targetRect.top + targetRect.height / 2, right: window.innerWidth - targetRect.left + gap, transform: 'translateY(-50%)' };
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.55)',
                    transition: 'opacity 0.3s',
                }}
                onClick={finish}
            />

            {/* Spotlight cutout */}
            <div
                style={{
                    position: 'fixed',
                    top: targetRect.top - 6,
                    left: targetRect.left - 6,
                    width: targetRect.width + 12,
                    height: targetRect.height + 12,
                    borderRadius: '12px',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                    zIndex: 10001,
                    pointerEvents: 'none',
                    transition: 'all 0.3s ease',
                }}
            />

            {/* Tooltip */}
            <div
                style={{
                    ...getTooltipStyle(),
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    minWidth: '260px',
                    maxWidth: '320px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                }}
            >
                {/* Close */}
                <button
                    onClick={finish}
                    style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '4px',
                    }}
                >
                    <X size={14} />
                </button>

                <h4 style={{ margin: '0 0 6px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {step.title}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {step.description}
                </p>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {currentStep + 1} / {STEPS.length}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {currentStep > 0 && (
                            <button
                                onClick={prev}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500,
                                    background: 'transparent', border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)', cursor: 'pointer',
                                }}
                            >
                                <ChevronLeft size={12} /> Geri
                            </button>
                        )}
                        <button
                            onClick={next}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                background: 'var(--primary)', border: 'none',
                                color: '#fff', cursor: 'pointer',
                            }}
                        >
                            {currentStep >= STEPS.length - 1 ? 'Bitir' : 'İleri'}
                            {currentStep < STEPS.length - 1 && <ChevronRight size={12} />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
