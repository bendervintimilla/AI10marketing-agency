'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UploadZone } from '@/components/media/UploadZone';
import { MediaLightbox } from '@/components/media/MediaLightbox';
import { Filter, Trash2, FileImage, CheckSquare, Square, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MediaLibraryPage() {
    const { user } = useAuth();
    const orgId = user?.orgId;

    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [previewAsset, setPreviewAsset] = useState<any | null>(null);

    const fetchAssets = useCallback(async () => {
        if (!orgId) return;
        try {
            setLoading(true);
            const url = new URL(`${API}/media`);
            url.searchParams.append('orgId', orgId);
            if (filterType !== 'ALL') {
                url.searchParams.append('type', filterType);
            }
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(url.toString(), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            setAssets(data.assets || []);
        } catch (error) {
            console.error('Failed to fetch assets', error);
        } finally {
            setLoading(false);
        }
    }, [filterType, orgId]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleDeleteSelected = async () => {
        if (!confirm('Are you sure you want to delete the selected items?')) return;

        try {
            const ids = Array.from(selectedIds);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            await Promise.all(
                ids.map(id =>
                    fetch(`${API}/media/${id}`, {
                        method: 'DELETE',
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    })
                )
            );
            setSelectedIds(new Set());
            fetchAssets();
        } catch (error) {
            console.error('Failed to delete assets', error);
            alert('Delete failed');
        }
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="max-w-7xl mx-auto p-2 md:p-4 text-[var(--color-text)]">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">Media Library</h1>
                    <p className="text-[var(--color-text-muted)] mt-2">Manage all your images, videos, and brand assets.</p>
                </div>
            </div>

            {orgId && (
                <div className="mb-10">
                    <UploadZone orgId={orgId} onUploadComplete={fetchAssets} />
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                    {['ALL', 'IMAGE', 'VIDEO'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                filterType === type
                                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
                            }`}
                        >
                            {type === 'ALL' ? 'All Assets' : type + 'S'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAssets}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition"
                    >
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>

                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                        >
                            <Trash2 className="w-4 h-4" /> Delete {selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''}
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCcw className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-[var(--color-surface)] rounded-2xl border-2 border-dashed border-[var(--color-border)]">
                    <FileImage className="w-16 h-16 text-[var(--color-text-subtle)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--color-text)]">No media found</h3>
                    <p className="text-[var(--color-text-muted)] max-w-sm text-center mt-2">Upload some files above to start building your media library.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {assets.map((asset) => {
                        const isSelected = selectedIds.has(asset.id);
                        return (
                            <div
                                key={asset.id}
                                className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                    isSelected
                                        ? 'border-violet-500 ring-4 ring-violet-500/20'
                                        : 'border-[var(--color-border)] hover:border-violet-500/50 hover:shadow-lg'
                                }`}
                                onClick={() => setPreviewAsset(asset)}
                            >
                                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/50 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between p-3 pointer-events-none">
                                    <div
                                        className="cursor-pointer pointer-events-auto"
                                        onClick={(e) => toggleSelect(asset.id, e)}
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="w-6 h-6 text-violet-400 bg-white/20 rounded-sm drop-shadow-md" />
                                        ) : (
                                            <Square className="w-6 h-6 text-white drop-shadow-md" />
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold text-white px-2 py-1 bg-black/40 rounded backdrop-blur-sm self-start shadow-sm">
                                        {asset.assetType}
                                    </span>
                                </div>

                                {asset.assetType === 'VIDEO' && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                <img
                                    src={asset.thumbnailUrl || asset.url}
                                    alt={asset.filename}
                                    className="w-full h-full object-cover bg-[var(--color-surface-raised)] transition-transform duration-500 group-hover:scale-105"
                                />

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white text-sm font-medium truncate drop-shadow-md">{asset.filename}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {previewAsset && (
                <MediaLightbox
                    asset={previewAsset}
                    onClose={() => setPreviewAsset(null)}
                />
            )}
        </div>
    );
}
