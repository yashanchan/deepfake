import { Loader2, Sparkles } from "lucide-react";

interface ProcessingStateProps {
  progress: number;
}

export const ProcessingState = ({ progress }: ProcessingStateProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="p-12 bg-card rounded-2xl border border-primary/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative" />
            <Sparkles className="w-6 h-6 text-primary absolute -top-2 -right-2 animate-pulse" />
          </div>
          
          <h3 className="text-2xl font-bold mb-2">Analyzing Media</h3>
          <p className="text-muted-foreground mb-6">
            Our AI is processing your file for authenticity...
          </p>
          
          <div className="w-full max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary font-semibold">{progress}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-500 shadow-glow"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            This may take a few moments depending on file size
          </p>
        </div>
      </div>
    </div>
  );
};
