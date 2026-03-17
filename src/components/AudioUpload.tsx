import { useState, useRef, useCallback } from "react";
import { Upload, Link, Music, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface AudioUploadProps {
  onAnalyze: (data: { audioBase64?: string; audioMimeType?: string; videoUrl?: string; fileName: string }) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const COMPRESS_THRESHOLD = 5 * 1024 * 1024; // 5MB

const AUDIO_TYPES = [
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/m4a",
  "audio/ogg", "audio/flac", "audio/aac", "audio/webm",
];

// Compress audio using AudioContext by re-encoding to lower quality
async function compressAudio(file: File, onProgress?: (p: number) => void): Promise<{ base64: string; mimeType: string }> {
  onProgress?.(10);
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(20);

  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch {
    // If decoding fails, just return the original file as base64
    onProgress?.(90);
    const base64 = await fileToBase64(file);
    onProgress?.(100);
    audioContext.close();
    return { base64, mimeType: file.type || "audio/mpeg" };
  }

  onProgress?.(40);

  // Downsample to mono 16kHz to reduce size significantly
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  onProgress?.(50);
  const renderedBuffer = await offlineCtx.startRendering();
  onProgress?.(70);

  // Encode as WAV (simple, reliable)
  const wavBlob = audioBufferToWav(renderedBuffer);
  onProgress?.(85);

  const base64 = await blobToBase64(wavBlob);
  onProgress?.(100);

  audioContext.close();
  return { base64, mimeType: "audio/wav" };
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuf = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuf);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([arrayBuf], { type: 'audio/wav' });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const AudioUpload = ({ onAnalyze, isLoading }: AudioUploadProps) => {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
      return;
    }

    if (file.size > COMPRESS_THRESHOLD) {
      // Compress
      setCompressing(true);
      setCompressProgress(0);
      try {
        const { base64, mimeType } = await compressAudio(file, setCompressProgress);
        onAnalyze({ audioBase64: base64, audioMimeType: mimeType, fileName: file.name });
      } catch (err) {
        setError("Failed to compress audio. Try a smaller file.");
      } finally {
        setCompressing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(",")[1];
        onAnalyze({ audioBase64: base64, audioMimeType: file.type, fileName: file.name });
      };
      reader.readAsDataURL(file);
    }
  }, [onAnalyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUrlSubmit = () => {
    if (!url.trim()) return;
    setError("");
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

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {compressing && (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">Compressing audio for analysis...</p>
            <Progress value={compressProgress} className="h-2" />
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
              <Music className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Drag & drop an audio file</p>
            <p className="text-sm text-muted-foreground">or click to browse • MP3, WAV, M4A, OGG, FLAC supported • Max 10MB</p>
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
