import { useState, useRef, useCallback } from "react";
import { Upload, Link, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { blobToBase64, fetchRemoteBlob, getUrlDisplayName, isYouTubeUrl } from "@/lib/media-url";

interface VideoUploadProps {
  onAnalyze: (data: { videoBase64?: string; videoMimeType?: string; videoUrl?: string; fileName: string }) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const VIDEO_TYPES = [
  "video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "video/x-ms-wmv", "video/webm", "video/avi",
];

const VIDEO_ACCEPT = ".mp4,.mov,.avi,.mkv,.wmv,.webm";

const VideoUpload = ({ onAnalyze, isLoading }: VideoUploadProps) => {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.`);
      return;
    }

    setProcessing(true);
    setProcessProgress(20);
    try {
      const base64 = await blobToBase64(file);
      setProcessProgress(80);
      onAnalyze({ videoBase64: base64, videoMimeType: file.type, fileName: file.name });
      setProcessProgress(100);
    } catch {
      setError("Failed to process video file.");
    } finally {
      setProcessing(false);
    }
  }, [onAnalyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUrlSubmit = useCallback(async () => {
    if (!url.trim()) return;

    const normalizedUrl = url.trim();
    const fileName = getUrlDisplayName(normalizedUrl, "Video URL");
    setError("");

    if (isYouTubeUrl(normalizedUrl)) {
      onAnalyze({ videoUrl: normalizedUrl, fileName });
      return;
    }

    setProcessing(true);
    setProcessProgress(20);

    try {
      const remoteBlob = await fetchRemoteBlob(normalizedUrl, "video/*,*/*;q=0.8");
      const mimeType = remoteBlob.type.toLowerCase();

      if (!mimeType.startsWith("video/")) {
        throw new Error("This link doesn't point to a video file.");
      }

      if (remoteBlob.size > MAX_FILE_SIZE) {
        throw new Error(`Linked video is too large (${(remoteBlob.size / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.`);
      }

      const remoteFile = new File([remoteBlob], fileName, {
        type: remoteBlob.type || "video/mp4",
      });

      setProcessProgress(75);
      const base64 = await blobToBase64(remoteFile);
      setProcessProgress(100);

      onAnalyze({
        videoBase64: base64,
        videoMimeType: remoteFile.type || "video/mp4",
        fileName: remoteFile.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load that video link.";

      if (message.includes("Using the direct link fallback instead.")) {
        onAnalyze({ videoUrl: normalizedUrl, fileName });
      } else {
        setError(message);
      }
    } finally {
      setProcessing(false);
    }
  }, [onAnalyze, url]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm glass-card">
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
            Upload Video
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

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {processing && (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">Processing video for analysis...</p>
            <Progress value={processProgress} className="h-2" />
          </div>
        )}

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
              <Video className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Drag & drop a video file</p>
            <p className="text-sm text-muted-foreground">or click to browse • MP4, MOV, AVI, MKV, WMV supported • Max 20MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={VIDEO_ACCEPT}
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
              Supports YouTube links and direct video URLs. Video frames will be analyzed for AI-generated content.
            </p>
            <Button
              onClick={handleUrlSubmit}
              disabled={!url.trim() || isLoading || processing}
              className="w-full h-12"
            >
              {processing ? "Preparing link..." : isLoading ? "Analyzing..." : "Analyze Video"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
