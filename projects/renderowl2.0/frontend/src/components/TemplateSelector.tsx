'use client';

import React, { useState } from 'react';
import { useTemplates, BUILT_IN_TEMPLATES } from '@/integrations';
import type { Template } from '@/types';
import { Check, Sparkles, Lock } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (templateId: string, variables: Record<string, unknown>) => void;
  selectedTemplateId?: string;
  className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  selectedTemplateId,
  className = '',
}) => {
  const [selectedId, setSelectedId] = useState(selectedTemplateId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const categories = ['All', 'Social', 'Podcast', 'Education', 'Cinematic'];
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTemplates = activeCategory === 'All'
    ? BUILT_IN_TEMPLATES
    : BUILT_IN_TEMPLATES.filter(t => 
        t.category.toLowerCase() === activeCategory.toLowerCase()
      );

  const handleSelect = (template: Template) => {
    if (template.isPremium) return; // TODO: Check user subscription
    setSelectedId(template.id);
    onSelect(template.id, {});
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose a Template</h2>
        <p className="text-muted-foreground">
          Select a template to get started with pre-configured styles
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${activeCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Blank Option */}
        <button
          onClick={() => handleSelect({ id: 'blank', name: 'Blank', isDefault: false, isPremium: false, category: 'blank', style: {}, defaultTracks: [], variables: [], createdAt: '', updatedAt: '', description: 'Start from scratch', thumbnailUrl: '' })}
          className={`
            relative aspect-video rounded-lg border-2 border-dashed 
            flex flex-col items-center justify-center gap-2
            transition-all hover:border-primary hover:bg-primary/5
            ${selectedId === 'blank' ? 'border-primary bg-primary/10' : 'border-border'}
          `}
        >
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-2xl">+</span>
          </div>
          <span className="font-medium">Start from Scratch</span>
          {selectedId === 'blank' && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </button>

        {/* Template Cards */}
        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            onMouseEnter={() => setHoveredId(template.id)}
            onMouseLeave={() => setHoveredId(null)}
            disabled={template.isPremium}
            className={`
              relative aspect-video rounded-lg overflow-hidden border-2
              transition-all text-left
              ${selectedId === template.id 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
              }
              ${template.isPremium ? 'opacity-75 cursor-not-allowed' : ''}
            `}
          >
            {/* Thumbnail Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background">
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  background: `linear-gradient(135deg, ${template.style.highlightColor}22, transparent)`,
                }}
              />
            </div>

            {/* Content */}
            <div className="relative p-4 h-full flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {template.description}
                  </p>
                </div>

                {template.isPremium && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Lock className="w-3 h-3" />
                    <span className="text-xs font-medium">Pro</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="mt-auto flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs bg-background/80 rounded">
                  {template.style.highlightMode}
                </span>
                {template.isDefault && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Sparkles className="w-3 h-3" />
                    Default
                  </span>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedId === template.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
