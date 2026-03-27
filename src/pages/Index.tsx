import { useState, useRef, useMemo } from "react";
import { Zap, Eye, Cpu, Loader2, Scan, Shield, Fingerprint, Image, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParallax } from "@/hooks/use-parallax";
import ImageUpload from "@/components/ImageUpload";
import AudioUpload from "@/components/AudioUpload";
import AnalysisResult from "@/components/AnalysisResult";
import AudioAnalysisResult from "@/components/AudioAnalysisResult";
import ApiDocs from "@/components/ApiDocs";
import logo from "@/assets/logo.png";

import type { AnalysisData } from "@/components/AnalysisResult";
import type { AudioAnalysisData } from "@/components/AudioAnalysisResult";

const features = [
  { icon: Zap, label: "Instant Analysis" },
  { icon: Eye, label: "Multi-Signal Detection" },
  { icon: Cpu, label: "AI-Powered" },
];

const imageScanSteps = [
  { icon: Scan, label: "Scanning pixels..." },
  { icon: Shield, label: "Analyzing patterns..." },
  { icon: Fingerprint, label: "Checking forensics..." },
  { icon: Eye, label: "Finalizing verdict..." },
];

const audioScanSteps = [
  { icon: Music, label: "Processing audio..." },
  { icon: Shield, label: "Analyzing waveforms..." },
  { icon: Fingerprint, label: "Checking vocal patterns..." },
  { icon: Eye, label: "Finalizing verdict..." },
];

const Index = () => {
  const [detectionMode, setDetectionMode] = useState<"image" | "audio">("image");
  const [isLoading, setIsLoading] = useState(false);
  const [imageResult, setImageResult] = useState<AnalysisData | null>(null);
  const [audioResult, setAudioResult] = useState<AudioAnalysisData | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [audioFileName, setAudioFileName] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const { toast } = useToast();

  const cyberDepthRef = useRef<HTMLDivElement>(null);
  const neuralOverlayRef = useRef<HTMLDivElement>(null);
  const gradientLayerRef = useRef<HTMLDivElement>(null);
  const starfieldRef = useRef<HTMLDivElement>(null);

  useParallax({
    cyberDepth: cyberDepthRef,
    neuralOverlay: neuralOverlayRef,
    gradientLayer: gradientLayerRef,
    starfield: starfieldRef,
  });

  // Generate stars deterministically
  const stars = useMemo(() => 
    Array.from({ length: 80 }, (_, i) => ({
      left: `${(i * 37 + 13) % 100}%`,
      top: `${(i * 53 + 7) % 100}%`,
      size: (i % 3) + 1,
      duration: `${2 + (i % 4)}s`,
      maxOpacity: 0.3 + (i % 5) * 0.12,
      delay: `${(i % 7) * 0.5}s`,
    })), []
  );

  const scanSteps = detectionMode === "image" ? imageScanSteps : audioScanSteps;

  const handleImageAnalyze = async (data: { imageBase64?: string; imageUrl?: string; previewUrl: string }) => {
    setIsLoading(true);
    setImageResult(null);
    setPreviewUrl(data.previewUrl);
    setScanStep(0);

    const interval = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const { data: resData, error } = await supabase.functions.invoke("analyze-image", {
        body: { imageBase64: data.imageBase64, imageUrl: data.imageUrl },
      });
      if (error) throw error;
      if (resData.error) throw new Error(resData.error);
      setImageResult(resData);
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message || "Something went wrong.", variant: "destructive" });
      setPreviewUrl("");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleAudioAnalyze = async (data: { audioBase64?: string; audioMimeType?: string; videoUrl?: string; fileName: string }) => {
    setIsLoading(true);
    setAudioResult(null);
    setAudioFileName(data.fileName);
    setScanStep(0);

    const interval = setInterval(() => {
      setScanStep((prev) => (prev < audioScanSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const { data: resData, error } = await supabase.functions.invoke("analyze-audio", {
        body: { audioBase64: data.audioBase64, audioMimeType: data.audioMimeType, videoUrl: data.videoUrl },
      });
      if (error) throw error;
      if (resData.error) throw new Error(resData.error);
      setAudioResult(resData);
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message || "Something went wrong.", variant: "destructive" });
      setAudioFileName("");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImageResult(null);
    setAudioResult(null);
    setPreviewUrl("");
    setAudioFileName("");
  };

  const hasResult = detectionMode === "image" ? imageResult : audioResult;

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      {/* Starfield */}
      <div ref={starfieldRef} className="starfield">
        {stars.map((star, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              '--duration': star.duration,
              '--max-opacity': star.maxOpacity,
              animationDelay: star.delay,
            } as React.CSSProperties}
          />
        ))}
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />
      </div>
      <div ref={cyberDepthRef} className="parallax-blur-shapes mobile-drift-blur" />
      <div ref={neuralOverlayRef} className="neural-overlay mobile-drift-neural" />
      <div ref={gradientLayerRef} className="gradient-layer mobile-drift-gradient" />

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-8 py-3">
          <a href="https://deeptrust-nine.vercel.app/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logo} alt="DeepTrust Logo" className="w-10 h-10 rounded-full object-cover" />
            <div className="leading-tight">
              <h1 className="font-semibold text-foreground text-base leading-none">DeepTrust</h1>
              <p className="text-xs text-muted-foreground mt-0.5">AI Content Detector</p>
            </div>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full relative z-10">
        <AnimatePresence mode="wait">
          {!hasResult && !isLoading && (
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
                  Detect <span className="text-primary text-glow">AI-Generated</span> Content
                </motion.h2>
                <motion.p
                  className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Advanced forensic analysis powered by multimodal AI. Upload any image or audio and get instant verification.
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

              {/* Detection Mode Toggle */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <div className="flex rounded-xl bg-secondary p-1 w-full max-w-sm">
                  <button
                    onClick={() => setDetectionMode("image")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                      detectionMode === "image"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Image className="w-4 h-4" />
                    Image Detection
                  </button>
                  <button
                    onClick={() => setDetectionMode("audio")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                      detectionMode === "audio"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    Audio Detection
                  </button>
                </div>
              </motion.div>

              <motion.div
                key={detectionMode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                {detectionMode === "image" ? (
                  <ImageUpload onAnalyze={handleImageAnalyze} isLoading={isLoading} />
                ) : (
                  <AudioUpload onAnalyze={handleAudioAnalyze} isLoading={isLoading} />
                )}
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
              {detectionMode === "image" && previewUrl && (
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

              {detectionMode === "audio" && (
                <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg p-8 bg-card">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Music className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{audioFileName}</p>
                      <p className="text-xs text-muted-foreground">Analyzing audio content...</p>
                    </div>
                  </div>
                  {/* Audio waveform animation */}
                  <div className="flex items-end justify-center gap-1 mt-6 h-12">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-primary rounded-full"
                        animate={{ height: [8, Math.random() * 40 + 8, 8] }}
                        transition={{ duration: 0.8 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
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

          {imageResult && detectionMode === "image" && (
            <motion.div
              key="image-result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AnalysisResult data={imageResult} imageUrl={previewUrl} onReset={handleReset} />
            </motion.div>
          )}

          {audioResult && detectionMode === "audio" && (
            <motion.div
              key="audio-result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AudioAnalysisResult data={audioResult} fileName={audioFileName} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>

        <ApiDocs />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-4 sm:px-8 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
          <span>© 2026 DeepTrust. All rights reserved.</span>
          <span>Advanced AI detection for images and audio content</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
