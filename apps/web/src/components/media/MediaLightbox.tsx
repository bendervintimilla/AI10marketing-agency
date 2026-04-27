'use client';

import React from 'react';
import { X, Calendar, FileType, HardDrive, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface MediaAsset {
    id: string;
    url: string;
    thumbnailUrl?: string;
    filename: string;
    fileType: string;
    assetType: string;
    tags: string[];
    metadata?: any;
    createdAt: string;
}

interface MediaLightboxProps {
    asset: MediaAsset;
    onClose: () => void;
}

export function MediaLightbox({ asset, onClose }: MediaLightboxProps) {
    const { metadata } = asset;

    const formatSize = (bytes: number) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Media Preview Area */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center min-h-[300px] md:min-h-full overflow-hidden p-6">
                    {asset.assetType === 'VIDEO' ? (
                        <video
                            src={asset.url}
                            controls
                            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                        />
                    ) : (
                        <img
                            src={asset.url}
                            alt={asset.filename}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                        />
                    )}
                </div>

                {/* Details Sidebar */}
                <div className="w-full md:w-80 bg-white border-l p-6 shrink-0 overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 break-all">
                        {asset.filename}
                    </h3>
                    <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-6">
                        {asset.assetType}
                    </span>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{format(new Date(asset.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FileType className="w-4 h-4 text-gray-400" />
                            <span>{asset.fileType}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <HardDrive className="w-4 h-4 text-gray-400" />
                            <span>{formatSize(metadata?.size)}</span>
                        </div>

                        {metadata?.width && metadata?.height && (
                            <div className="pt-2 border-t mt-4 text-sm text-gray-600">
                                <span className="block text-xs uppercase text-gray-400 font-bold mb-1">Dimensions</span>
                                {metadata.width} x {metadata.height} px
                            </div>
                        )}

                        {metadata?.duration ? (
                            <div className="pt-2 border-t mt-4 text-sm text-gray-600">
                                <span className="block text-xs uppercase text-gray-400 font-bold mb-1">Duration</span>
                                {Math.round(metadata.duration)} seconds
                            </div>
                        ) : null}

                        <div className="pt-4 border-t mt-6">
                            <h4 className="text-xs uppercase text-gray-400 font-bold mb-3 flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" /> Auto-Generated Tags
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {asset.tags && asset.tags.length > 0 ? (
                                    asset.tags.map((tag, i) => (
                                        <span key={i} className="bg-gray-100 border text-gray-700 px-2 py-1 rounded-md text-xs">
                                            {tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-400 text-xs italic">No tags available</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
