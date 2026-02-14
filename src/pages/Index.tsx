import { useState } from "react";
import { Zap, Eye, Cpu, Loader2, Scan, Shield, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import AnalysisResult from "@/components/AnalysisResult";
import logo from "@/assets/logo.png";

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

const scanSteps = [
  { icon: Scan, label: "Scanning pixels..." },
  { icon: Shield, label: "Analyzing patterns..." },
  { icon: Fingerprint, label: "Checking forensics..." },
  { icon: Eye, label: "Finalizing verdict..." },
];

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const { toast } = useToast();

  const handleAnalyze = async (data: { imageBase64?: string; imageUrl?: string; previewUrl: string }) => {
    setIsLoading(true);
    setResult(null);
    setPreviewUrl(data.previewUrl);
    setScanStep(0);

    // Animate through scan steps
    const interval = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

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
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPreviewUrl("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-8 py-3">
          <a href="https://deeptrust-nine.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logo} alt="DeepTrust Logo" className="w-10 h-10 rounded-full object-cover" />
            <div className="leading-tight">
              <h1 className="font-semibold text-foreground text-base leading-none">DeepTrust</h1>
              <p className="text-xs text-muted-foreground mt-0.5">AI Image Detector</p>
            </div>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full">
        <AnimatePresence mode="wait">
          {!result && !isLoading && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Hero */}
              <div className="text-center mb-8">
                <motion.h2
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  Detect <span className="text-primary text-glow">AI-Generated</span> Images
                </motion.h2>
                <motion.p
                  className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Advanced forensic analysis powered by multimodal AI. Upload any image and get instant verification.
                </motion.p>
              </div>

              {/* Features */}
              <motion.div
                className="flex justify-center gap-3 sm:gap-4 mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                {features.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-4 sm:px-6 py-3 sm:py-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[11px] sm:text-xs font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <ImageUpload onAnalyze={handleAnalyze} isLoading={isLoading} />
              </motion.div>
            </motion.div>
          )}

          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 gap-8"
            >
              {/* Preview image with scanning overlay */}
              {previewUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg max-w-sm">
                  <img src={previewUrl} alt="Analyzing" className="w-full max-h-[300px] object-contain" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              )}

              {/* Scan steps */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  {scanSteps.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = i === scanStep;
                    const isDone = i < scanStep;
                    return (
                      <motion.div
                        key={i}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                          isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                        }`}
                        animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        <StepIcon className="w-5 h-5" />
                      </motion.div>
                    );
                  })}
                </div>
                <motion.p
                  key={scanStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-muted-foreground font-medium"
                >
                  {scanSteps[scanStep].label}
                </motion.p>
              </div>

              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </motion.div>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AnalysisResult data={result} imageUrl={previewUrl} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
          <span>© 2026 DeepTrust. All rights reserved.</span>
          <span>Uses advanced pattern recognition to detect AI-generated imagery</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
