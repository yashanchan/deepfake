import { X, FileVideo, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

export const FilePreview = ({ file, onRemove }: FilePreviewProps) => {
  const isVideo = file.type.startsWith("video/");
  const previewUrl = URL.createObjectURL(file);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-card rounded-2xl border border-border">
      <div className="flex items-start gap-4">
        <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
          {isVideo ? (
            <video
              src={previewUrl}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-2 left-2">
            {isVideo ? (
              <FileVideo className="w-6 h-6 text-primary" />
            ) : (
              <ImageIcon className="w-6 h-6 text-primary" />
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-lg truncate mb-1">{file.name}</h4>
          <p className="text-sm text-muted-foreground mb-2">
            {isVideo ? "Video" : "Image"} • {formatFileSize(file.size)}
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Ready</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
