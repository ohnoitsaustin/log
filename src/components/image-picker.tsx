"use client";

import { useRef, useState, useCallback } from "react";
import { MAX_IMAGES_PER_ENTRY, MAX_FILE_SIZE } from "@/lib/media";

export interface SelectedImage {
  file: File;
  previewUrl: string;
}

export function ImagePicker({
  images,
  onChange,
  maxImages = MAX_IMAGES_PER_ENTRY,
  disabled = false,
}: {
  images: SelectedImage[];
  onChange: (images: SelectedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );

      const oversized = fileArray.filter((f) => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        setSizeError(`${oversized.length} image${oversized.length > 1 ? "s" : ""} exceeded 20 MB limit`);
        return;
      }
      setSizeError(null);

      const remaining = maxImages - images.length;
      const toAdd = fileArray.slice(0, remaining);

      const newImages: SelectedImage[] = toAdd.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      onChange([...images, ...newImages]);
    },
    [images, maxImages, onChange],
  );

  function handleRemove(index: number) {
    const removed = images[index];
    URL.revokeObjectURL(removed.previewUrl);
    onChange(images.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  const canAdd = images.length < maxImages && !disabled;

  return (
    <div className="space-y-2">
      {/* Preview grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img.previewUrl}
                alt={`Selected ${i + 1}`}
                className="h-20 w-20 rounded-md object-cover border border-foreground/10"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={disabled}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                aria-label={`Remove image ${i + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {sizeError && (
        <p className="text-xs text-red-500">{sizeError}</p>
      )}

      {/* Drop zone / add button */}
      {canAdd && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex items-center justify-center rounded-md border border-dashed px-4 py-3 text-sm cursor-pointer transition-colors ${
            dragOver
              ? "border-foreground/40 bg-foreground/5"
              : "border-foreground/20 hover:border-foreground/30 hover:bg-foreground/5"
          }`}
        >
          <span className="text-foreground/40">
            {images.length === 0
              ? "Add images (up to 4)"
              : `Add more (${maxImages - images.length} remaining)`}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
