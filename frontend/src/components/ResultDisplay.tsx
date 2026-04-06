import { Shield, AlertTriangle, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResultDisplayProps {
  verdict: "REAL" | "FAKE" | "Unable to Predict";
  confidence: number | null;
  processingTime: number;
  probability_fake: number;
  media_type: string;
  file_name: string;
  onReset: () => void;
}

export const ResultDisplay = ({ 
  verdict, 
  confidence, 
  processingTime, 
  probability_fake, 
  media_type, 
  file_name, 
  onReset 
}: ResultDisplayProps) => {
  const isReal = verdict === "REAL";
  const isUncertain = verdict === "Unable to Predict";
  const isEdgeCase = confidence !== null && confidence >= 40 && confidence <= 60;
  
  const getVerdictColor = () => {
    if (isUncertain) return "warning";
    if (isReal && !isEdgeCase) return "success";
    if (!isReal && !isEdgeCase) return "destructive";
    return "warning";
  };
  
  const color = getVerdictColor();

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div
        className={cn(
          "p-12 rounded-2xl border-2 relative overflow-hidden",
          color === "success" && "bg-success/5 border-success shadow-glow-success",
          color === "destructive" && "bg-destructive/5 border-destructive shadow-glow-danger",
          color === "warning" && "bg-warning/5 border-warning"
        )}
      >
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div
            className={cn(
              "w-full h-full rounded-full blur-3xl",
              color === "success" && "bg-success",
              color === "destructive" && "bg-destructive",
              color === "warning" && "bg-warning"
            )}
          />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div
                className={cn(
                  "absolute inset-0 rounded-full blur-xl animate-pulse",
                  color === "success" && "bg-success/30",
                  color === "destructive" && "bg-destructive/30",
                  color === "warning" && "bg-warning/30"
                )}
              />
              <div
                className={cn(
                  "relative p-6 rounded-full",
                  color === "success" && "bg-gradient-success",
                  color === "destructive" && "bg-gradient-danger",
                  color === "warning" && "bg-warning"
                )}
              >
                {isUncertain ? (
                  <AlertTriangle className="w-12 h-12 text-white" />
                ) : isReal ? (
                  <CheckCircle className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2
              className={cn(
                "text-5xl font-bold mb-3",
                color === "success" && "text-success",
                color === "destructive" && "text-destructive",
                color === "warning" && "text-warning"
              )}
            >
              {verdict}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isUncertain
                ? "Unable to determine authenticity with confidence"
                : isReal
                ? "This media appears to be authentic"
                : "This media shows signs of manipulation"}
            </p>
          </div>
          
          <div className="space-y-6 mb-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Confidence Level</span>
                <span className="text-sm font-bold">
                  {confidence !== null ? `${confidence}%` : "N/A"}
                </span>
              </div>
              {confidence !== null && (
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-1000",
                      color === "success" && "bg-gradient-success shadow-glow-success",
                      color === "destructive" && "bg-gradient-danger shadow-glow-danger",
                      color === "warning" && "bg-warning"
                    )}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Media Type:</span>
                <span className="ml-2 font-medium capitalize">{media_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fake Probability:</span>
                <span className="ml-2 font-medium">
                  {Math.round(probability_fake * 100)}%
                </span>
              </div>
            </div>
            
            {isEdgeCase && (
              <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-warning mb-1">Edge Case Detected</p>
                  <p className="text-muted-foreground">
                    This result is near the detection threshold. Consider additional verification.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Processed in {processingTime}s using advanced AI detection</span>
            </div>
          </div>
          
          <Button
            onClick={onReset}
            className="w-full"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Analyze Another File
          </Button>
        </div>
      </div>
    </div>
  );
};
