'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { workspaceApi } from '@/lib/workspaceApi';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Check, Users, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTeamspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ICONS = ['🏢', '🚀', '💡', '🔥', '✨', '💻', '📈', '🔬', '🎨', '⚡', '🌿', '🏥'];

export function CreateTeamspaceDialog({ open, onOpenChange }: CreateTeamspaceDialogProps) {
    const [step, setStep] = useState<'details' | 'members'>('details');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [createdTeamspaceId, setCreatedTeamspaceId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch all clinic users
    const { data: allUsers = [] } = useQuery<any[]>({
        queryKey: ['clinic-users'],
        queryFn: async () => {
            const { data } = await api.get('/users');
            return data;
        },
        enabled: open,
    });

    const filteredUsers = allUsers.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const createMutation = useMutation({
        mutationFn: () => workspaceApi.createTeamspace({ name, description, icon: selectedIcon }),
        onSuccess: async (data) => {
            setCreatedTeamspaceId(data.id);
            setStep('members');
        },
        onError: () => toast.error('Teamspace oluşturulamadı'),
    });

    const addMembersMutation = useMutation({
        mutationFn: (teamspaceId: string) =>
            workspaceApi.addTeamspaceMembers(teamspaceId, selectedUsers),
        onSuccess: () => {
            toast.success('Teamspace oluşturuldu!');
            queryClient.invalidateQueries({ queryKey: ['workspace-teamspaces'] });
            resetAndClose();
        },
        onError: () => {
            toast.error('Üyeler eklenemedi');
            queryClient.invalidateQueries({ queryKey: ['workspace-teamspaces'] });
            resetAndClose();
        },
    });

    const resetAndClose = () => {
        setName('');
        setDescription('');
        setSelectedIcon(ICONS[0]);
        setSelectedUsers([]);
        setUserSearch('');
        setCreatedTeamspaceId(null);
        setStep('details');
        onOpenChange(false);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('İsim zorunludur'); return; }
        createMutation.mutate();
    };

    const handleFinish = () => {
        if (createdTeamspaceId) {
            if (selectedUsers.length > 0) {
                addMembersMutation.mutate(createdTeamspaceId);
            } else {
                toast.success('Teamspace oluşturuldu!');
                queryClient.invalidateQueries({ queryKey: ['workspace-teamspaces'] });
                resetAndClose();
            }
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const roleLabel = (role: string) => {
        if (role === 'ADMIN') return 'Admin';
        if (role === 'DOCTOR') return 'Doktor';
        return 'Asistan';
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
            <DialogContent className="sm:max-w-[500px]">
                {step === 'details' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Yeni Teamspace Oluştur</DialogTitle>
                            <DialogDescription>
                                Klinik çalışanlarının birlikte çalışabileceği bir alan oluşturun.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="grid gap-4 py-4">
                                {/* Icon picker */}
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">İkon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ICONS.map(icon => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setSelectedIcon(icon)}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all border-2",
                                                    selectedIcon === icon
                                                        ? "border-primary bg-primary/10"
                                                        : "border-transparent bg-muted/30 hover:bg-muted/60"
                                                )}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Name */}
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">İsim *</label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Doktorlar, Asistanlar, Yönetim..."
                                        autoFocus
                                    />
                                </div>
                                {/* Description */}
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Açıklama (opsiyonel)</label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Bu alan ne için?"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetAndClose}>İptal</Button>
                                <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                                    {createMutation.isPending ? 'Oluşturuluyor...' : 'Devam →'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Users size={18} /> Üye Ekle
                            </DialogTitle>
                            <DialogDescription>
                                <strong>{name}</strong> teamspace'ine klinik çalışanlarını ekleyin. Atlayabilirsiniz.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-2 space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Çalışan ara..."
                                    className="w-full pl-8 pr-3 py-2 bg-muted/30 rounded-lg text-sm outline-none border border-border focus:border-primary transition-colors"
                                />
                            </div>

                            {/* Selected chips */}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedUsers.map(uid => {
                                        const u = allUsers.find(x => x.id === uid);
                                        if (!u) return null;
                                        return (
                                            <span key={uid} className="flex items-center gap-1 bg-primary/10 text-primary text-xs rounded-full px-2 py-1">
                                                {u.firstName} {u.lastName}
                                                <button onClick={() => toggleUser(uid)} className="hover:opacity-70">
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* User list */}
                            <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center py-6 text-sm text-muted-foreground">Çalışan bulunamadı</div>
                                ) : filteredUsers.map(user => {
                                    const selected = selectedUsers.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                                selected ? "bg-primary/10" : "hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{user.firstName} {user.lastName}</div>
                                                <div className="text-xs text-muted-foreground truncate">{roleLabel(user.role)} · {user.email}</div>
                                            </div>
                                            {selected && <Check size={15} className="text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleFinish} disabled={addMembersMutation.isPending}>Atla</Button>
                            <Button onClick={handleFinish} disabled={addMembersMutation.isPending || selectedUsers.length === 0}>
                                {addMembersMutation.isPending
                                    ? 'Ekleniyor...'
                                    : `${selectedUsers.length > 0 ? `${selectedUsers.length} üye ekle` : 'Tamamla'}`}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
