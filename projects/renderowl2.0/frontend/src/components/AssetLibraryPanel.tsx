'use client';

import React, { useState, useRef } from 'react';
import { useAssetLibrary, useAssetUpload } from '@/integrations/assets';
import { Asset, AssetType } from '@/types/integration';
import { 
  Upload, 
  Image, 
  Film, 
  Music, 
  Search, 
  X, 
  Loader2,
  Grid,
  List,
  Trash2,
  MoreVertical
} from 'lucide-react';

interface AssetLibraryPanelProps {
  projectId: string;
  onAssetSelect?: (asset: Asset) => void;
  selectedAssetIds?: string[];
  className?: string;
}

const ASSET_TYPE_ICONS: Record<AssetType, React.ElementType> = {
  image: Image,
  video: Film,
  audio: Music,
  font: () => <span className="text-xs font-bold">T</span>,
  template: () => <span className="text-xs font-bold">Tpl</span>,
};

export const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({
  projectId,
  onAssetSelect,
  selectedAssetIds = [],
  className = '',
}) => {
  const { assets, isLoading, loadAssets, deleteAsset } = useAssetLibrary(projectId);
  const { uploads, upload, uploadMultiple } = useAssetUpload();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter(asset => {
    const matchesType = selectedType === 'all' || asset.type === selectedType;
    const matchesSearch = !searchQuery || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const type: AssetType = fileArray[0].type.startsWith('video/') 
      ? 'video' 
      : fileArray[0].type.startsWith('audio/')
      ? 'audio'
      : 'image';

    if (fileArray.length === 1) {
      await upload(fileArray[0], type, projectId);
    } else {
      await uploadMultiple(fileArray, type, projectId);
    }

    // Refresh assets
    await loadAssets();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Asset Library</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-muted' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-muted' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-lg border bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          {(['all', 'image', 'video', 'audio'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`
                px-3 py-1 text-sm rounded-full border capitalize
                ${selectedType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="
            w-full py-2 px-4 rounded-lg
            border-2 border-dashed border-border
            hover:border-primary hover:bg-primary/5
            transition-colors
            flex items-center justify-center gap-2
            text-sm
          "
        >
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Active Uploads */}
      {uploads.length > 0 && (
        <div className="p-4 border-b bg-muted/50 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Uploading {uploads.length} file(s)</div>
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="truncate flex-1">{upload.file.name}</span>
              <span className="text-muted-foreground">{upload.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Asset Grid/List */}
      <div
        className="flex-1 overflow-y-auto p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-10">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium">Drop files to upload</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Image className="w-12 h-12 mb-4 opacity-50" />
            <p>No assets found</p>
            <p className="text-sm">Upload files or drag & drop here</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredAssets.map((asset) => (
              <AssetGridItem
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetIds.includes(asset.id)}
                onSelect={() => onAssetSelect?.(asset)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAssets.map((asset) => (
              <AssetListItem
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetIds.includes(asset.id)}
                onSelect={() => onAssetSelect?.(asset)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Asset Grid Item
const AssetGridItem: React.FC<{
  asset: Asset;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ asset, isSelected, onSelect, onDelete }) => {
  const Icon = ASSET_TYPE_ICONS[asset.type];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`
        relative aspect-square rounded-lg border overflow-hidden cursor-pointer
        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
      `}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0 bg-muted flex items-center justify-center">
        {asset.urls.thumbnail ? (
          <img
            src={asset.urls.thumbnail}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-white text-xs truncate">{asset.name}</div>
        <div className="text-white/60 text-[10px] uppercase">{asset.type}</div>
      </div>

      {/* Menu */}
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded bg-black/50 text-white hover:bg-black/70"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border py-1 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Asset List Item
const AssetListItem: React.FC<{
  asset: Asset;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ asset, isSelected, onSelect, onDelete }) => {
  const Icon = ASSET_TYPE_ICONS[asset.type];

  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center gap-3 p-2 rounded-lg border cursor-pointer
        ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
      `}
    >
      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
        {asset.urls.thumbnail ? (
          <img
            src={asset.urls.thumbnail}
            alt={asset.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <Icon className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{asset.name}</div>
        <div className="text-xs text-muted-foreground">
          {asset.type} • {(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 text-muted-foreground hover:text-red-500"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AssetLibraryPanel;
