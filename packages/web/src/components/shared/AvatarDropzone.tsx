"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

interface AvatarDropzoneProps {
  name?: string | null;
  email?: string;
  avatarUrl?: string | null;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  size?: "lg" | "xl";
  className?: string;
}

export function AvatarDropzone({
  name,
  email,
  avatarUrl,
  uploading = false,
  onFileSelect,
  size = "xl",
  className,
}: AvatarDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || uploading) return;
      onFileSelect(file);
    },
    [onFileSelect, uploading],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className={cn("relative", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!uploading) inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "group relative cursor-pointer rounded-full outline-none ring-offset-2 transition-all focus-visible:ring-2 focus-visible:ring-primary",
          dragging && "ring-2 ring-primary ring-offset-2",
          uploading && "pointer-events-none opacity-70",
        )}
        aria-label="Arrastra una imagen o haz clic para subir tu avatar"
      >
        <UserAvatar name={name} email={email} avatarUrl={avatarUrl} size={size} />

        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-full bg-primary/75 text-primary-foreground transition-opacity",
            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="mt-1 max-w-[5.5rem] text-center text-[10px] font-medium leading-tight">
                Arrastra o suelta
              </span>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <p className="mt-2 text-center text-xs text-muted-foreground sm:text-left">
        JPG, PNG o WebP · máx. 2 MB
      </p>
    </div>
  );
}
