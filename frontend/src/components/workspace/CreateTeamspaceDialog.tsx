'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { Check, Users, X, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTeamspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ICONS = ['🏢', '🚀', '💡', '🔥', '✨', '💻', '📈', '🔬', '🎨', '⚡', '🌿', '🏥'];

export function CreateTeamspaceDialog({ open, onOpenChange }: CreateTeamspaceDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [userSearch, setUserSearch] = useState('');
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
        mutationFn: async () => {
            const teamspace = await workspaceApi.createTeamspace({ name, description, icon: selectedIcon });
            if (selectedUsers.length > 0) {
                await workspaceApi.addTeamspaceMembers(teamspace.id, selectedUsers);
            }
            return teamspace;
        },
        onSuccess: () => {
            toast.success('Teamspace oluşturuldu!');
            queryClient.invalidateQueries({ queryKey: ['workspace-teamspaces'] });
            resetAndClose();
        },
        onError: () => toast.error('Teamspace oluşturulamadı'),
    });

    const resetAndClose = () => {
        setName('');
        setDescription('');
        setSelectedIcon(ICONS[0]);
        setSelectedUsers([]);
        setUserSearch('');
        onOpenChange(false);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('İsim zorunludur'); return; }
        createMutation.mutate();
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
            <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden bg-[#0a0d14] border-white/10 text-white rounded-2xl">
                <div className="flex h-[500px]">
                    {/* Sol Kısım: Detaylar */}
                    <div className="w-1/2 border-r border-white/10 p-6 flex flex-col">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                                <Building2 className="text-primary" size={20} />
                                Yeni Teamspace
                            </DialogTitle>
                            <DialogDescription className="text-white/50 text-sm">
                                Ekibiniz için yeni bir çalışma alanı oluşturun.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">İkon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICONS.slice(0, 8).map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setSelectedIcon(icon)}
                                            className={cn(
                                                "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border",
                                                selectedIcon === icon
                                                    ? "border-primary bg-primary/20"
                                                    : "border-white/5 bg-white/5 hover:bg-white/10"
                                            )}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">İsim *</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Örn: Doktorlar, Resepsiyon..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Açıklama (opsiyonel)</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Bu alanın amacı nedir?"
                                    rows={2}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sağ Kısım: Üyeler */}
                    <div className="w-1/2 p-6 flex flex-col bg-white/[0.02]">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="font-medium text-white/90 flex items-center gap-2">
                                <Users size={16} className="text-primary" /> Üyeler
                            </div>
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-md">
                                {selectedUsers.length} seçili
                            </span>
                        </div>

                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Çalışan ara..."
                                className="w-full pl-9 pr-3 py-2 bg-white/5 rounded-lg text-sm outline-none border border-white/10 focus:border-primary/50 text-white placeholder:text-white/30 transition-colors"
                            />
                        </div>

                        {/* Selected Chips */}
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {selectedUsers.map(uid => {
                                    const u = allUsers.find(x => x.id === uid);
                                    if (!u) return null;
                                    return (
                                        <span key={uid} className="flex items-center gap-1 bg-primary/20 text-primary text-[11px] rounded-full px-2 py-1 border border-primary/20">
                                            {u.firstName}
                                            <button onClick={() => toggleUser(uid)} className="hover:opacity-70 ml-1">
                                                <X size={10} />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-8 text-sm text-white/30">Sonuç bulunamadı</div>
                            ) : filteredUsers.map(user => {
                                const selected = selectedUsers.includes(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleUser(user.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group border",
                                            selected ? "bg-primary/10 border-primary/30" : "hover:bg-white/5 border-transparent"
                                        )}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] font-medium truncate text-white/90 group-hover:text-white">{user.firstName} {user.lastName}</div>
                                            <div className="text-[11px] text-white/40 truncate">{roleLabel(user.role)}</div>
                                        </div>
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                            selected ? "bg-primary border-primary text-[#0a0d14]" : "border-white/20 text-transparent"
                                        )}>
                                            <Check size={10} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-[#0a0d14]">
                    <Button variant="ghost" onClick={resetAndClose} className="text-white/60 hover:text-white hover:bg-white/5">İptal</Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending || !name.trim()} className="min-w-[120px]">
                        {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                    </Button>
                </div>
            </DialogContent>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}</style>
        </Dialog>
    );
}
