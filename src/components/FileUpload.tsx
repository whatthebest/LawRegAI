
"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, File as FileIcon, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  className?: string;
}

export function FileUpload({ value = [], onChange, className }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      onChange?.([...value, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange?.(newFiles);
  };
  
  const handleClearAll = () => {
    onChange?.([]);
  }

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <div 
        className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={handleTriggerUpload}
      >
        <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Drag & drop files here, or click to select files</p>
      </div>
      
      {value.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm">Selected Files:</h4>
            <Button variant="link" size="sm" onClick={handleClearAll} className="text-destructive">
                Clear all
            </Button>
          </div>
          <div className="space-y-2 rounded-md border p-2">
            {value.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)} className="h-6 w-6">
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
