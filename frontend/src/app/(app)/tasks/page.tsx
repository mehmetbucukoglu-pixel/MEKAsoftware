'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi, WorkspaceDocument } from '@/lib/workspaceApi';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { Loader2, FileText, Share2, Image as ImageIcon, ListTodo } from 'lucide-react';
import { PageHeader } from '@/lib/page-header';
import { useAuthStore } from '@/lib/auth-store';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function WorkspacePage() {
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { clinic } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch All Documents
    const { data: documents = [], isLoading: loading } = useQuery({
        queryKey: ['workspace-documents'],
        queryFn: workspaceApi.getDocuments,
    });

    const selectedDoc = documents.find((d: WorkspaceDocument) => d.id === selectedDocId);

    // Mutations
    const createDocMutation = useMutation({
        mutationFn: (teamspaceId?: string) => workspaceApi.createDocument({
            title: 'Yeni Çalışma Alanı',
            content: '[]',
            order: documents.length,
            teamspaceId
        }),
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
            setSelectedDocId(newDoc.id);
            if (!isSidebarOpen) setIsSidebarOpen(true);
            toast.success('Yeni alan oluşturuldu');
        }
    });

    const deleteDocMutation = useMutation({
        mutationFn: workspaceApi.deleteDocument,
        onSuccess: (_, deletedId) => {
            queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
            if (selectedDocId === deletedId) {
                setSelectedDocId(null);
            }
            toast.success('Sayfa silindi');
        }
    });

    const updateDocSettingsMutation = useMutation({
        mutationFn: ({ id, icon }: { id: string, icon: string }) => workspaceApi.updateDocument(id, { icon }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
            toast.success('Ayar güncellendi');
        }
    });

    const handleCreateDoc = (teamspaceId?: string) => createDocMutation.mutate(teamspaceId);

    const handleDeleteDoc = (id: string) => {
        if (confirm('Bu sayfayı kalıcı olarak silmek istediğinize emin misiniz?')) {
            deleteDocMutation.mutate(id);
        }
    };

    const handleSettingsClick = (id: string) => {
        setIsSettingsOpen(true);
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-[#F5F5F7] dark:bg-[#1C1C1E] text-foreground">
            {/* Header via Portal */}
            <PageHeader
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isSidebarOpen && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSidebarOpen(true)}
                                style={{ padding: '4px', marginRight: '4px' }}
                            >
                                <PanelLeftOpen className="h-4 w-4" />
                            </Button>
                        )}
                        <ListTodo size={18} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Workspace</h1>
                    </div>
                }
                actions={
                    isSidebarOpen && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSidebarOpen(false)}
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <PanelLeftClose className="h-4 w-4 mr-2" />
                            Sidebar'ı Kapat
                        </Button>
                    )
                }
            />

            <WorkspaceSidebar
                documents={documents}
                loading={loading}
                selectedDocId={selectedDocId}
                onSelectDoc={setSelectedDocId}
                onCreateDoc={handleCreateDoc}
                onDeleteDoc={handleDeleteDoc}
                onSettingsClick={handleSettingsClick}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <div className="flex-1 flex flex-col relative h-full bg-background/50 rounded-tl-xl border-l border-t border-border/40 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] transition-all overflow-hidden z-10">

                {selectedDoc ? (
                    <WorkspaceEditor
                        document={selectedDoc}
                        onDelete={handleDeleteDoc}
                        isSidebarClosed={!isSidebarOpen}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-accent/5">
                        <div className="bg-card w-20 h-20 rounded-3xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 transform -rotate-6 border border-border/30">
                            <FileText className="h-10 w-10 text-primary opacity-60" />
                        </div>
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-2">{clinic?.name || 'Klinik'}</h3>
                        <p className="max-w-[400px] text-center text-[15px] opacity-80 leading-relaxed">
                            Sol taraftaki menüden bir doküman seçin veya yeni bir boş çalışma alanı oluşturarak ekibinizle ortak notlar ve görevler eklemeye başlayın.
                        </p>
                        <Button onClick={() => handleCreateDoc()} className="mt-8 rounded-full shadow-md gap-2 px-6" size="default" variant="secondary">
                            Hemen Başla
                        </Button>
                    </div>
                )}
            </div>

            {/* Simple Settings Dialog for the active document */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>Sayfa Ayarları</DialogTitle>
                        <DialogDescription>
                            {selectedDoc?.title} sayfasının görünümünü ve paylaşım izinlerini ayarlayın.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium flex justify-end items-center gap-2 text-muted-foreground">
                                <ImageIcon className="w-4 h-4" /> İkon
                            </label>
                            <Input
                                id="icon"
                                defaultValue={selectedDoc?.icon || ''}
                                className="col-span-3 text-2xl h-12 bg-accent/30 border-border/50 rounded-xl"
                                placeholder="🚀"
                                onBlur={(e) => {
                                    if (selectedDoc && e.target.value !== selectedDoc.icon) {
                                        updateDocSettingsMutation.mutate({ id: selectedDoc.id, icon: e.target.value });
                                    }
                                }}
                            />
                        </div>
                        <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border/50 rounded-xl bg-accent/10 mt-4">
                            <Share2 className="w-8 h-8 text-primary/40 mb-3" />
                            <p className="text-sm font-medium text-foreground">Ortak Çalışma (Yakında)</p>
                            <p className="text-xs text-muted-foreground mt-1 text-center max-w-[250px]">Bu sayfaya diğer klinisyenleri davet etme özelliği entegre ediliyor.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
