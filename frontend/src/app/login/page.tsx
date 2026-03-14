'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message?.[0] || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-base)',
            padding: '20px',
            overflow: 'auto',
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'fixed', top: '-20%', right: '-10%',
                width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'fixed', bottom: '-15%', left: '-5%',
                width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none',
            }} />

            <div className="animate-fadeIn" style={{
                width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <img
                        src="/logo.png"
                        alt="MEKA"
                        style={{
                            height: '64px',
                            width: 'auto',
                            objectFit: 'contain',
                            marginBottom: '16px',
                        }}
                    />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>MEKA</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                        Klinik yönetim paneline giriş yapın
                    </p>
                </div>

                {/* Login Card */}
                <div className="card" style={{ padding: '32px' }}>
                    <form onSubmit={handleSubmit}>
                        {/* Error message */}
                        {error && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                color: 'var(--error)', fontSize: '0.8125rem', marginBottom: '20px',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label" htmlFor="email">E-posta</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                placeholder="ornek@klinik.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '24px' }}>
                            <label className="label" htmlFor="password">Şifre</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '42px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                        padding: '4px',
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? (
                                <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }} />
                            ) : (
                                <>
                                    Giriş Yap
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Demo info */}
                <div style={{
                    marginTop: '20px', padding: '16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-muted)', border: '1px solid rgba(6,182,212,0.2)',
                    fontSize: '0.8125rem', color: 'var(--text-secondary)',
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                        Demo Giriş Bilgileri
                    </div>
                    <div style={{ display: 'grid', gap: '4px' }}>
                        <div>Admin: <span style={{ color: 'var(--text-primary)' }}>admin@demo.com / Admin123!</span></div>
                        <div>Doktor: <span style={{ color: 'var(--text-primary)' }}>doctor@demo.com / Doctor123!</span></div>
                        <div>Asistan: <span style={{ color: 'var(--text-primary)' }}>asistan@demo.com / Assist123!</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
