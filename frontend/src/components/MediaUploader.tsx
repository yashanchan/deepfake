import { useState } from "react";
import { Upload, FileVideo, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    cloudinary: any;
  }
}

interface MediaUploaderProps {
  onUploadSuccess: (url: string, filename: string, resourceType: string) => void;
  isProcessing: boolean;
}

export const MediaUploader = ({ onUploadSuccess, isProcessing }: MediaUploaderProps) => {
  const [error, setError] = useState<string | null>(null);

  const openWidget = () => {
    if (typeof window === "undefined" || !window.cloudinary) {
      setError("Cloudinary widget not loaded. Please check your internet connection.");
      return;
    }

    // You can use standard VITE_ env vars, or fallback to NEXT_PUBLIC_ for compatibility
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || import.meta.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET";

    if (!cloudName) {
      setError("Cloudinary Cloud Name not configured. Add VITE_CLOUDINARY_CLOUD_NAME to .env");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        maxFileSize: 104857600, // 100MB
        multiple: false,
        resourceType: "auto",
        clientAllowedFormats: ["png", "jpeg", "jpg", "mp4", "avi", "mov", "mkv", "webm"],
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          onUploadSuccess(
            result.info.secure_url,
            result.info.original_filename,
            result.info.resource_type
          );
        } else if (error && error.message) {
          console.error("Cloudinary Upload Error:", error);
          setError(error.message);
        }
      }
    );
    widget.open();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onClick={isProcessing ? undefined : openWidget}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300",
          "bg-card/50 backdrop-blur-sm cursor-pointer",
          "border-border hover:border-primary/50 hover:bg-primary/5",
          isProcessing && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-primary p-6 rounded-full">
              <Upload className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Upload Media
          </h3>
          <p className="text-muted-foreground mb-4 text-center">
            Click to open secure cloud uploader
          </p>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span>PNG, JPG (max 10MB)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-primary" />
              <span>MP4, AVI, MOV (max 100MB)</span>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
