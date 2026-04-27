'use client';

import React, { useState, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadZoneProps {
    orgId: string;
    onUploadComplete: () => void;
}

export function UploadZone({ orgId, onUploadComplete }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const uploadFile = async (file: File) => {
        try {
            setUploading(true);
            setProgress(10);

            const assetType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

            // 1. Get presigned URL
            const res = await fetch('http://localhost:3001/media/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    filename: file.name,
                    type: file.type,
                    assetType
                })
            });

            const { url, key } = await res.json();
            setProgress(30);

            // 2. Upload directly to S3
            await fetch(url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });
            setProgress(80);

            // 3. Confirm upload
            await fetch('http://localhost:3001/media/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    key,
                    filename: file.name,
                    fileType: file.type,
                    assetType
                })
            });

            setProgress(100);
            setTimeout(() => {
                setUploading(false);
                setProgress(0);
                onUploadComplete();
            }, 1000);

        } catch (error) {
            console.error('Upload failed', error);
            setUploading(false);
            setProgress(0);
            alert('Upload failed. See console for details.');
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            uploadFile(file);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    };

    return (
        <div
            className={`relative w-full p-8 border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'} flex flex-col items-center justify-center`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInput}
                disabled={uploading}
                accept="image/*,video/*"
            />

            {!uploading ? (
                <>
                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <UploadCloud className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Click or drag file to this area to upload</p>
                    <p className="text-xs text-gray-500 mt-2">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files</p>
                </>
            ) : (
                <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm border w-full max-w-sm">
                    <div className="flex items-center gap-3 w-full mb-3">
                        <FileIcon className="w-8 h-8 text-blue-500" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Uploading...</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                        {progress === 100 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        )}
                    </div>
                    <p className="text-xs text-gray-500">{progress}% Processing API requests</p>
                </div>
            )}
        </div>
    );
}
