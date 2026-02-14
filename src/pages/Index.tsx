import { useState } from "react";
import { Zap, Eye, Cpu, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import AnalysisResult from "@/components/AnalysisResult";

interface AnalysisData {
  verdict: string;
  confidence: number;
  summary: string;
  issues: { name: string; description: string; severity: "HIGH" | "MEDIUM" | "LOW" }[];
  clear: string[];
}

const features = [
  { icon: Zap, label: "Instant Analysis" },
  { icon: Eye, label: "Multi-Signal Detection" },
  { icon: Cpu, label: "AI-Powered" },
];

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const { toast } = useToast();

  const handleAnalyze = async (data: { imageBase64?: string; imageUrl?: string; previewUrl: string }) => {
    setIsLoading(true);
    setResult(null);
    setPreviewUrl(data.previewUrl);

    try {
      const { data: resData, error } = await supabase.functions.invoke("analyze-image", {
        body: { imageBase64: data.imageBase64, imageUrl: data.imageUrl },
      });

      if (error) throw error;
      if (resData.error) throw new Error(resData.error);

      setResult(resData);
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setPreviewUrl("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPreviewUrl("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-6 py-4">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground leading-none">DeepTrust</h1>
            <p className="text-xs text-muted-foreground">AI Image Detector</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {!result && !isLoading && (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Detect <span className="text-primary">AI-Generated</span> Images
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Advanced forensic analysis powered by multimodal AI. Upload any image and get instant verification.
              </p>
            </div>

            {/* Features */}
            <div className="flex justify-center gap-4 mb-10">
              {features.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-4 shadow-sm"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </div>
              ))}
            </div>

            <ImageUpload onAnalyze={handleAnalyze} isLoading={isLoading} />
          </>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Analyzing image forensics...</p>
          </div>
        )}

        {result && <AnalysisResult data={result} imageUrl={previewUrl} onReset={handleReset} />}
      </main>
    </div>
  );
};

export default Index;
