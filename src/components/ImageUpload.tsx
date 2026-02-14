import { useState, useRef, useCallback } from "react";
import { Upload, Link, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
  onAnalyze: (data: { imageBase64?: string; imageUrl?: string; previewUrl: string }) => void;
  isLoading: boolean;
}

const ImageUpload = ({ onAnalyze, isLoading }: ImageUploadProps) => {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(",")[1];
      onAnalyze({ imageBase64: base64, previewUrl: result });
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
    onAnalyze({ imageUrl: url.trim(), previewUrl: url.trim() });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
            Upload
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
            URL
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
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Drag & drop an image</p>
            <p className="text-sm text-muted-foreground">or click to browse • PNG, JPG, WEBP supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Paste image URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="h-12"
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!url.trim() || isLoading}
              className="w-full h-12"
            >
              {isLoading ? "Analyzing..." : "Analyze Image"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
