import { useState, useRef, useCallback } from "react";
import { Upload, Link, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AudioUploadProps {
  onAnalyze: (data: { audioBase64?: string; audioMimeType?: string; videoUrl?: string; fileName: string }) => void;
  isLoading: boolean;
}

const AUDIO_TYPES = [
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/m4a",
  "audio/ogg", "audio/flac", "audio/aac", "audio/webm",
];

const AudioUpload = ({ onAnalyze, isLoading }: AudioUploadProps) => {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("audio/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(",")[1];
      onAnalyze({ audioBase64: base64, audioMimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  }, [onAnalyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUrlSubmit = () => {
    if (!url.trim()) return;
    onAnalyze({ videoUrl: url.trim(), fileName: "Video URL" });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm glass-card">
        {/* Toggle */}
        <div className="flex rounded-xl bg-secondary p-1 mb-6">
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
              mode === "upload"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Audio
          </button>
          <button
            onClick={() => setMode("url")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
              mode === "url"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link className="w-4 h-4" />
            Video URL
          </button>
        </div>

        {mode === "upload" ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-secondary/50"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Music className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Drag & drop an audio file</p>
            <p className="text-sm text-muted-foreground">or click to browse • MP3, WAV, M4A, OGG, FLAC supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={AUDIO_TYPES.join(",")}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Paste YouTube or direct video URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Supports YouTube links and direct video URLs (MP4, WebM). Audio will be extracted and analyzed. Max 10MB.
            </p>
            <Button
              onClick={handleUrlSubmit}
              disabled={!url.trim() || isLoading}
              className="w-full h-12"
            >
              {isLoading ? "Analyzing..." : "Analyze Audio"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioUpload;
