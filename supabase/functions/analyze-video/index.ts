import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const normalizeYouTubeUrl = (value: string) => {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    let videoId = "";

    if (host === "youtu.be") {
      videoId = pathParts[0] || "";
    } else if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
        videoId = pathParts[1] || "";
      }
    }

    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : value.trim();
  } catch {
    return value.trim();
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const buildVideoUrlContent = (url: string) => ({
  type: "video_url" as const,
  video_url: { url },
});

const sanitizeJsonResponse = (value: string) =>
  value
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();

const parseModelJson = (value: string) => {
  const cleaned = sanitizeJsonResponse(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart === -1 || objectEnd === -1 || objectEnd <= objectStart) {
      throw new Error("The analysis response could not be parsed.");
    }

    const extracted = cleaned.slice(objectStart, objectEnd + 1).replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(extracted);
  }
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const countCategoryFailures = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { status?: unknown }).status === "string" &&
          (item as { status: string }).status.toLowerCase() === "fail",
      ).length
    : 0;

const calibrateYouTubeVerdict = (analysis: Record<string, unknown>, isYouTube: boolean) => {
  if (!isYouTube) {
    return analysis;
  }

  const verdict = typeof analysis.verdict === "string" ? analysis.verdict : "Uncertain";
  const detailedReport =
    analysis.detailed_report && typeof analysis.detailed_report === "object"
      ? (analysis.detailed_report as Record<string, unknown>)
      : {};
  const videoMetadata =
    analysis.video_metadata && typeof analysis.video_metadata === "object"
      ? (analysis.video_metadata as Record<string, unknown>)
      : {};
  const observedContent = toStringArray(analysis.observed_content);
  const keyEvidence = toStringArray(detailedReport.key_evidence);
  const failCount = countCategoryFailures(detailedReport.categories);
  const hasSpecificObservations = observedContent.length >= 2;
  const hasDirectEvidence = keyEvidence.length >= 2;
  const likelySource = typeof videoMetadata.likely_source === "string" ? videoMetadata.likely_source : "Unknown";
  const suspectedTool = typeof videoMetadata.suspected_tool === "string" ? videoMetadata.suspected_tool : "None detected";
  const numericConfidence =
    typeof analysis.confidence === "number" && Number.isFinite(analysis.confidence)
      ? Math.max(1, Math.min(100, Math.round(analysis.confidence)))
      : 50;

  const downgradedConclusion =
    "The YouTube video did not provide enough scene-specific, repeatable evidence to support a high-confidence AI verdict, so the result has been downgraded to a more cautious assessment.";

  if (["AI Generated", "Likely AI Generated"].includes(verdict)) {
    if (!hasSpecificObservations || !hasDirectEvidence) {
      return {
        ...analysis,
        verdict: "Uncertain",
        confidence: Math.min(numericConfidence, 45),
        summary:
          "The available evidence from this YouTube video is not specific enough to support a reliable AI-generated verdict, so the result remains uncertain.",
        detailed_report: {
          ...detailedReport,
          overview:
            "The analysis returned generic forensic signals without enough scene-specific observations from the actual YouTube clip, which is not sufficient for a trustworthy synthetic-media verdict.",
          conclusion: downgradedConclusion,
        },
        video_metadata: {
          ...videoMetadata,
          likely_source: "Unknown",
          suspected_tool: "None detected",
        },
      };
    }

    if (failCount < 3 || (likelySource === "Unknown" && suspectedTool === "None detected" && numericConfidence > 78)) {
      return {
        ...analysis,
        verdict: "Likely AI Generated",
        confidence: Math.min(numericConfidence, 78),
        detailed_report: {
          ...detailedReport,
          conclusion:
            "Some suspicious signals were detected, but the evidence is not strong enough for a near-certain AI verdict after accounting for normal YouTube compression and editing artifacts.",
        },
      };
    }
  }

  return {
    ...analysis,
    confidence: verdict === "AI Generated" && numericConfidence > 92 ? 92 : numericConfidence,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoBase64, videoMimeType, videoUrl } = await req.json();

    if (!videoBase64 && !videoUrl) {
      return new Response(JSON.stringify({ error: "No video file or URL provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let videoContent: ReturnType<typeof buildVideoUrlContent>;
    const isYouTube = typeof videoUrl === "string" && YOUTUBE_URL_PATTERN.test(videoUrl);

    if (videoBase64) {
      const estimatedSize = (videoBase64.length * 3) / 4;
      if (estimatedSize > MAX_VIDEO_BYTES) {
        return new Response(JSON.stringify({ error: "Video file too large. Please upload a file under 20MB." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mime = videoMimeType || "video/mp4";
      videoContent = buildVideoUrlContent(`data:${mime};base64,${videoBase64}`);
    } else {
      try {
        if (isYouTube) {
          videoContent = buildVideoUrlContent(normalizeYouTubeUrl(videoUrl));
        } else {
          const vidResponse = await fetch(videoUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "*/*",
            },
          });

          if (!vidResponse.ok) {
            throw new Error(`Failed to fetch video: ${vidResponse.status}. Try downloading and uploading instead.`);
          }

          const contentLength = vidResponse.headers.get("content-length");
          if (contentLength && Number.parseInt(contentLength, 10) > MAX_VIDEO_BYTES) {
            throw new Error("Video file too large. Please use a video under 20MB.");
          }

          const vidBuffer = await vidResponse.arrayBuffer();
          const vidBase64 = arrayBufferToBase64(vidBuffer);
          const contentType = vidResponse.headers.get("content-type") || "video/mp4";
          videoContent = buildVideoUrlContent(`data:${contentType};base64,${vidBase64}`);
        }
      } catch (fetchErr: unknown) {
        return new Response(JSON.stringify({ error: `Could not fetch video: ${(fetchErr as Error).message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are a cautious multimedia authenticity analyst.

Your goal is to distinguish real captured video, edited/CGI content, and AI-generated video while minimizing false positives.

Important calibration rules:
- Do NOT assume a YouTube video is AI-generated unless you can point to multiple concrete, scene-specific artifacts visible in the actual clip.
- YouTube compression, sharpening halos, denoising, motion interpolation, stabilization, jump cuts, color grading, filters, green screen compositing, VFX, animation, low light noise, low bitrate, and heavy editing are NOT sufficient by themselves to call a video AI-generated.
- High confidence (90+) is only allowed when there are several strong and repeatable AI indicators across different categories and no ordinary filming/editing explanation fits.
- If the evidence is mixed, generic, or limited, return "Uncertain" or "Likely Real" instead of forcing an AI verdict.
- Before making any authenticity claim, identify at least 2 concrete observations unique to the clip itself (for example setting, actions, visible objects, camera behavior, scene composition). If you cannot do that, you must return "Uncertain" with confidence 45 or lower.
- Never treat cinematic style, music-video editing, CGI/VFX, animation, or stylization alone as proof of generative AI.

ANALYSIS FRAMEWORK — examine ALL of these:
1. FACIAL CONSISTENCY: face identity stability, eyes, mouth, teeth, hair boundaries.
2. MOTION & PHYSICS: natural inertia, momentum, body mechanics, motion blur.
3. TEMPORAL COHERENCE: frame-to-frame stability, flicker, morphing, object persistence.
4. HAND & BODY ANATOMY: finger count, limb proportions, pose continuity.
5. TEXT & SIGNAGE: readable, stable text and UI elements.
6. LIGHTING & SHADOWS: coherent light direction, reflections, shadows.
7. BACKGROUND & ENVIRONMENT: perspective stability, structural consistency, scene geometry.
8. AUDIO-VISUAL SYNC: lip sync, action/sound alignment, ambient consistency.
9. COMPRESSION & QUALITY: platform compression versus synthetic artifacts.
10. STYLE CONSISTENCY: consistent grading and visual intent versus accidental generative drift.

You MUST respond with valid JSON only, no markdown. Use this schema:
{
  "verdict": "AI Generated" | "Likely AI Generated" | "Uncertain" | "Likely Real" | "Real",
  "confidence": <number 1-100>,
  "observed_content": ["<2-4 concrete scene-specific observations from the clip>"] ,
  "video_type": "Live Action" | "Animation" | "Screen Recording" | "Mixed" | "Unknown",
  "summary": "<2-3 sentence explanation>",
  "detailed_report": {
    "overview": "<3-5 sentence overview of the analysis>",
    "categories": [
      {
        "name": "<e.g. 'Facial Consistency', 'Motion & Physics', 'Temporal Coherence', 'Hand & Body Anatomy', 'Text & Signage', 'Lighting & Shadows', 'Background Coherence', 'Audio-Visual Sync'>",
        "status": "pass" | "fail" | "warning" | "neutral",
        "finding": "<1-2 sentence finding>",
        "details": "<detailed paragraph>"
      }
    ],
    "key_evidence": ["<specific evidence supporting verdict>"],
    "conclusion": "<2-3 sentence conclusion>"
  },
  "issues": [
    {
      "name": "<issue name>",
      "description": "<description>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "clear": ["<check that passed>"],
  "video_metadata": {
    "estimated_duration": "<estimated duration if detectable>",
    "resolution_quality": "<quality assessment>",
    "likely_source": "Real Camera Recording" | "AI Video Generator" | "Deepfake" | "Screen Recording" | "Mixed/Edited" | "Unknown",
    "suspected_tool": "<suspected AI tool if applicable, e.g. 'Sora', 'Runway', 'HeyGen', 'None detected'>",
    "content_type": "<e.g. 'Talking Head', 'Landscape', 'Action Scene', 'Tutorial', etc.>"
  }
}

Provide at least 5 categories in the detailed report. Keep the reasoning evidence-based and balanced.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "AI Video Detector",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: isYouTube
                  ? "Analyze this YouTube video for authenticity. Be conservative, account for normal YouTube compression/editing artifacts, and only call it AI-generated if you can cite scene-specific evidence from the actual clip. Respond with JSON only."
                  : "Analyze this video for AI generation indicators. Examine visual quality, motion, facial features, physics, and temporal consistency. Respond with JSON only.",
              },
              videoContent,
            ],
          },
        ],
        temperature: 0.05,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseModelJson(content) as Record<string, unknown>;
    const analysis = calibrateYouTubeVerdict(parsed, isYouTube);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error analyzing video:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
