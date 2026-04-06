import { useState, useEffect } from "react";
import { Cpu, Zap, ShieldCheck, Brain, Layers, Activity, CircuitBoard, Grid3X3, Clock, GitMerge, Sparkles, CheckCircle2 } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { FilePreview } from "@/components/FilePreview";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultDisplay } from "@/components/ResultDisplay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";

type AppState = "upload" | "preview" | "processing" | "result";

interface AnalysisResult {
  verdict: "REAL" | "FAKE" | "Unable to Predict";
  confidence: number | null;
  processingTime: number;
  probability_fake: number;
  media_type: string;
  file_name: string;
}

const Index = () => {
  const [state, setState] = useState<AppState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setState("preview");
    toast({
      title: "File uploaded",
      description: `${file.name} is ready for analysis`,
    });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setState("upload");
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setState("processing");
    setProgress(0);
    
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 10, 95));
    }, 300);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", selectedFile);

      // TODO: Replace with your actual FastAPI backend URL
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

      clearInterval(progressInterval);
      setProgress(100);

      setResult({
        verdict: data.prediction,
        confidence: data.confidence ? Math.round(data.confidence * 100) : null,
        processingTime: parseFloat(processingTime),
        probability_fake: data.probability_fake,
        media_type: data.media_type,
        file_name: data.file_name,
      });

      setState("result");

      toast({
        title: "Analysis complete",
        description: `Media classified as ${data.prediction}`,
      });
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Analysis error:", error);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze media. Please try again.",
        variant: "destructive",
      });
      
      setState("preview");
      setProgress(0);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setProgress(0);
    setResult(null);
    setState("upload");
  };

  // Auto-start analysis when file is selected
  useEffect(() => {
    if (state === "preview" && selectedFile) {
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, selectedFile]);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Top Bar with Logo and Project Name */}
      <header className="sticky top-0 z-50">
        <div className="border-b border-border bg-background/80 backdrop-blur">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              {/* College Logo */}
              <div className="flex items-center">
                <img 
                  src="/college-logo.png" 
                  alt="College Logo" 
                  className="h-32 w-auto object-contain max-w-[400px]"
                  onError={(e) => {
                    // Fallback placeholder if logo doesn't exist
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = document.getElementById('logo-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
                <div 
                  id="logo-placeholder"
                  className="h-32 w-64 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-secondary/50"
                  style={{ display: 'none' }}
                >
                  <span className="text-base text-muted-foreground">College Logo</span>
                </div>
              </div>
              
              {/* Project Name and Theme Toggle */}
              <div className="flex items-center gap-4">
                <h1 className="text-5xl font-bold font-sans tracking-tight">
                  <span style={{ color: 'hsl(270 84% 64%)' }}>DeepGuard</span>
                  <span className="text-foreground"> AI</span>
                </h1>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Tag/Chip Centered */}
          <div className="w-full flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground/80">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Multi-Model AI Detection
            </div>
          </div>

          {/* Main Heading */}
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              <span className="text-primary">Deepfake Detection</span> Multi-Model System
            </h2>
          </div>

          {/* Dynamic Content Based on State */}
          <div className="mb-8">
            {state === "upload" && (
              <UploadZone onFileSelect={handleFileSelect} isProcessing={false} />
            )}

            {state === "preview" && selectedFile && (
              <FilePreview file={selectedFile} onRemove={handleRemoveFile} />
            )}

            {state === "processing" && <ProcessingState progress={progress} />}

            {state === "result" && result && (
              <ResultDisplay
                verdict={result.verdict}
                confidence={result.confidence}
                processingTime={result.processingTime}
                probability_fake={result.probability_fake}
                media_type={result.media_type}
                file_name={result.file_name}
                onReset={handleReset}
              />
            )}
          </div>

          {/* Hybrid Architecture Section */}
          <section className="mt-20">
            <div className="text-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Hybrid Architecture</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Multi-stage detection pipeline combining spatial, temporal, and contextual analysis
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Stage 1: Input Layer</h4>
                </div>
                <p className="text-sm text-muted-foreground">Face detection & frame extraction with MTCNN</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Stage 2: Feature Extraction</h4>
                </div>
                <p className="text-sm text-muted-foreground">ResNet-50 for spatial features, Transformers for patch relationships</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Stage 3: Temporal Analysis</h4>
                </div>
                <p className="text-sm text-muted-foreground">Bi-LSTM captures sequential inconsistencies across frames</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <GitMerge className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Stage 4: Fusion & Decision</h4>
                </div>
                <p className="text-sm text-muted-foreground">Transformer attention + classification head</p>
              </div>
            </div>
          </section>

          {/* Key Features Section */}
          <section className="mt-20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">Key Features</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Multi-Head Attention</p>
                    <p className="text-sm text-muted-foreground">Learns global contextual patterns to detect subtle manipulations</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Ensemble Fusion</p>
                    <p className="text-sm text-muted-foreground">Combines CNN, LSTM, and Transformer predictions</p>
                  </div>
                </li>
              </ul>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Attention Maps</p>
                    <p className="text-sm text-muted-foreground">Visualizes manipulated regions for explainable AI</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Real-time Processing</p>
                    <p className="text-sm text-muted-foreground">Optimized with ONNX/TensorRT for fast inference</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-4">
            <p className="text-center text-md text-muted-foreground">
              DeepGuard AI • Advanced deepfake detection powered by machine learning
            </p>
            
            {/* Group Members Section */}
            <div className="pt-4 border-t border-border/30">
              <p className="text-center text-base font-semibold text-foreground/70 mb-2">Developed by:</p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {/* TODO: Replace these placeholder names with your actual group member names */}
                <span className="text-md text-muted-foreground">Neha</span>
                <span className="text-md text-muted-foreground">Preetham</span>
                <span className="text-md text-muted-foreground">Shradha</span>
                <span className="text-md text-muted-foreground">Yash</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
