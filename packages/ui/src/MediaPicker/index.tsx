import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, Image as ImageIcon, Video, Search } from 'lucide-react';

export interface MediaAsset {
    id: string;
    url: string;
    thumbnailUrl?: string;
    filename: string;
    fileType: string;
    assetType: string;
}

export interface MediaPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (assets: MediaAsset[]) => void;
    orgId: string;
    apiBaseUrl?: string; // e.g., 'http://localhost:3001'
    multiple?: boolean;
    allowedTypes?: string[]; // e.g., ['IMAGE', 'VIDEO']
}

export function MediaPicker({
    open,
    onClose,
    onSelect,
    orgId,
    apiBaseUrl = 'http://localhost:3001',
    multiple = false,
    allowedTypes = ['IMAGE', 'VIDEO', 'LOGO']
}: MediaPickerProps) {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
    const [filterType, setFilterType] = useState<string>('ALL');

    const fetchAssets = useCallback(async () => {
        try {
            setLoading(true);
            const url = new URL(`${apiBaseUrl}/media`);
            url.searchParams.append('orgId', orgId);
            if (filterType !== 'ALL') {
                url.searchParams.append('type', filterType);
            }
            const res = await fetch(url.toString());
            const data = await res.json();

            let fetched = data.assets || [];
            if (allowedTypes && allowedTypes.length > 0) {
                fetched = fetched.filter((a: MediaAsset) => allowedTypes.includes(a.assetType));
            }
            setAssets(fetched);
        } catch (error) {
            console.error('Failed to fetch assets for picker', error);
        } finally {
            setLoading(false);
        }
    }, [orgId, filterType, apiBaseUrl, allowedTypes]);

    useEffect(() => {
        if (open) {
            fetchAssets();
            setSelectedAssets([]);
        }
    }, [open, fetchAssets]);

    if (!open) return null;

    const toggleSelect = (asset: MediaAsset) => {
        if (!multiple) {
            setSelectedAssets([asset]);
            return;
        }

        const exists = selectedAssets.find(a => a.id === asset.id);
        if (exists) {
            setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
        } else {
            setSelectedAssets([...selectedAssets, asset]);
        }
    };

    const handleConfirm = () => {
        onSelect(selectedAssets);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Select Media</h2>
                        <p className="text-xs text-gray-500 mt-1">Choose assets from your library</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b flex items-center gap-4 bg-white">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilterType('ALL')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            All
                        </button>
                        {allowedTypes.includes('IMAGE') && (
                            <button
                                onClick={() => setFilterType('IMAGE')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === 'IMAGE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <ImageIcon className="w-3.5 h-3.5" /> Images
                            </button>
                        )}
                        {allowedTypes.includes('VIDEO') && (
                            <button
                                onClick={() => setFilterType('VIDEO')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === 'VIDEO' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <Video className="w-3.5 h-3.5" /> Videos
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Search className="w-8 h-8 mb-4 animate-pulse" />
                            <p>Loading your media...</p>
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                            <p>No media found. Upload some to your library first.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {assets.map((asset) => {
                                const isSelected = selectedAssets.some(a => a.id === asset.id);
                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => toggleSelect(asset)}
                                        className={`relative aspect-square rounded-lg border-2 cursor-pointer transition overflow-hidden bg-white ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <img
                                            src={asset.thumbnailUrl || asset.url}
                                            alt={asset.filename}
                                            className={`w-full h-full object-cover transition-transform ${isSelected ? 'scale-105' : 'hover:scale-105'}`}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition duration-300" />

                                        {isSelected && (
                                            <div className="absolute top-2 left-2 z-10 bg-white rounded-full">
                                                <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                            </div>
                                        )}

                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 backdrop-blur-sm">
                                            <p className="text-white text-[10px] truncate">{asset.filename}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedAssets.length === 0}
                            className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                        >
                            Insert Media
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
