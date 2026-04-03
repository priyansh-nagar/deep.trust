import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i;

const normalizeYouTubeUrl = (value: string) => {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    let videoId = '';

    if (host === 'youtu.be') {
      videoId = pathParts[0] || '';
    } else if (host.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (pathParts[0] === 'shorts' || pathParts[0] === 'embed') {
        videoId = pathParts[1] || '';
      }
    }

    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : value.trim();
  } catch {
    return value.trim();
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoBase64, videoMimeType, videoUrl } = await req.json();

    if (!videoBase64 && !videoUrl) {
      return new Response(JSON.stringify({ error: 'No video file or URL provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    let videoContent: any;

    if (videoBase64) {
      const estimatedSize = (videoBase64.length * 3) / 4;
      if (estimatedSize > 25 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Video file too large. Please upload a file under 20MB.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const mime = videoMimeType || "video/mp4";
      videoContent = {
        type: "image_url" as const,
        image_url: { url: `data:${mime};base64,${videoBase64}` }
      };
    } else if (videoUrl) {
      try {
        const isYouTube = YOUTUBE_URL_PATTERN.test(videoUrl);

        if (isYouTube) {
          const normalizedYouTubeUrl = normalizeYouTubeUrl(videoUrl);

          videoContent = {
            type: "video" as const,
            url: normalizedYouTubeUrl,
            mime_type: "video/mp4",
          };
        } else {
          const vidResponse = await fetch(videoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
            },
          });
          if (!vidResponse.ok) {
            throw new Error(`Failed to fetch video: ${vidResponse.status}. Try downloading and uploading instead.`);
          }
          const contentLength = vidResponse.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
            throw new Error('Video file too large. Please use a video under 20MB.');
          }
          const vidBuffer = await vidResponse.arrayBuffer();
          const vidBase64 = arrayBufferToBase64(vidBuffer);
          const contentType = vidResponse.headers.get("content-type") || "video/mp4";
          videoContent = {
            type: "image_url" as const,
            image_url: { url: `data:${contentType};base64,${vidBase64}` }
          };
        }
      } catch (fetchErr: unknown) {
        return new Response(JSON.stringify({ error: `Could not fetch video: ${(fetchErr as Error).message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const systemPrompt = `You are a world-class video forensic analyst specializing in detecting AI-generated video content. You have studied outputs from all major video generation models including: Sora, Runway Gen-2/Gen-3, Pika Labs, Stable Video Diffusion, Kling AI, Luma Dream Machine, HeyGen, Synthesia, D-ID, Midjourney Video, and various deepfake tools (DeepFaceLab, FaceSwap, etc.).

ANALYSIS FRAMEWORK — examine ALL of these:

1. **FACIAL CONSISTENCY**: Check for face morphing artifacts, inconsistent facial features across frames, unnatural eye movements, teeth anomalies, hair-face boundary issues.

2. **MOTION & PHYSICS**: Real videos follow natural physics — gravity, momentum, inertia. AI videos often have objects that float, slide unnaturally, or have inconsistent motion blur.

3. **TEMPORAL COHERENCE**: Check frame-to-frame consistency. AI videos may have flickering textures, morphing backgrounds, or objects that appear/disappear.

4. **HAND & BODY ANATOMY**: AI struggles with hands (wrong finger count, fused digits), body proportions, and complex poses. Check for anatomical correctness.

5. **TEXT & SIGNAGE**: AI-generated videos often have garbled, inconsistent, or morphing text in signs, labels, or screens.

6. **LIGHTING & SHADOWS**: Check for consistent light sources, shadow direction, reflection accuracy, and overall lighting coherence across the scene.

7. **BACKGROUND & ENVIRONMENT**: Look for warping backgrounds, inconsistent perspectives, morphing architectural elements, or unnatural environmental details.

8. **AUDIO-VISUAL SYNC**: If audio is present, check lip sync accuracy, sound-action correspondence, and ambient sound consistency.

9. **COMPRESSION & QUALITY**: AI videos may have unusual compression patterns, resolution inconsistencies, or quality variations across the frame.

10. **STYLE CONSISTENCY**: Check for consistent artistic style, color grading, and visual tone throughout the video.

You MUST respond with valid JSON only, no markdown. Use this exact schema:

{
  "verdict": "AI Generated" | "Likely AI Generated" | "Uncertain" | "Likely Real" | "Real",
  "confidence": <number 1-100>,
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

Provide at least 5 categories in the detailed report. Be thorough and specific.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
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
              { type: "text", text: "Analyze this video for AI generation indicators. Examine visual quality, motion, facial features, physics, and temporal consistency. Respond with JSON only." },
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
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error("Error analyzing video:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
