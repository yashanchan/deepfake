import { useCallback, useState } from "react";
import { Upload, FileVideo, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const UploadZone = ({ onFileSelect, isProcessing }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const imageTypes = ["image/png", "image/jpeg", "image/jpg"];
    const videoTypes = ["video/mp4", "video/avi", "video/quicktime"];
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB

    if (imageTypes.includes(file.type)) {
      if (file.size > maxImageSize) {
        return "Image size must be less than 10MB";
      }
    } else if (videoTypes.includes(file.type)) {
      if (file.size > maxVideoSize) {
        return "Video size must be less than 100MB";
      }
    } else {
      return "Please upload a PNG, JPG, JPEG, MP4, AVI, or MOV file";
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300",
          "bg-card/50 backdrop-blur-sm",
          isDragging
            ? "border-primary bg-primary/10 shadow-glow scale-105"
            : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/png,image/jpeg,image/jpg,video/mp4,video/avi,video/quicktime"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
        
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-primary p-6 rounded-full">
              <Upload className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Upload Media for Analysis
          </h3>
          <p className="text-muted-foreground mb-4 text-center">
            Drag and drop or click to select
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
        </label>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
