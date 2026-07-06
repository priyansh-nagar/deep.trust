import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

const normalizeYouTubeUrl = (value: string) => {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const parts = parsed.pathname.split("/").filter(Boolean);
    let id = "";
    if (host === "youtu.be") id = parts[0] || "";
    else if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") || "";
      else if (parts[0] === "shorts" || parts[0] === "embed") id = parts[1] || "";
    }
    return id ? `https://www.youtube.com/watch?v=${id}` : value.trim();
  } catch {
    return value.trim();
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const buildVideoUrlContent = (url: string) => ({
  type: "video_url" as const,
  video_url: { url },
});

const buildImageUrlContent = (url: string) => ({
  type: "image_url" as const,
  image_url: { url },
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
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e <= s) throw new Error("The fact-check response could not be parsed.");
    return JSON.parse(cleaned.slice(s, e + 1).replace(/,\s*([}\]])/g, "$1"));
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mediaBase64, mediaMimeType, videoUrl, mediaKind } = await req.json();

    if (!mediaBase64 && !videoUrl) {
      return new Response(JSON.stringify({ error: "No media provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isYouTube = typeof videoUrl === "string" && YOUTUBE_URL_PATTERN.test(videoUrl);
    let mediaContent:
      | ReturnType<typeof buildVideoUrlContent>
      | ReturnType<typeof buildImageUrlContent>;

    if (mediaBase64) {
      const estimatedSize = (mediaBase64.length * 3) / 4;
      if (estimatedSize > MAX_MEDIA_BYTES) {
        return new Response(JSON.stringify({ error: "Media file too large." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const mime = mediaMimeType || (mediaKind === "video" ? "video/mp4" : "audio/mpeg");
      const dataUrl = `data:${mime};base64,${mediaBase64}`;
      mediaContent =
        mediaKind === "video" ? buildVideoUrlContent(dataUrl) : buildImageUrlContent(dataUrl);
    } else if (isYouTube) {
      mediaContent = buildVideoUrlContent(normalizeYouTubeUrl(videoUrl));
    } else {
      try {
        const resp = await fetch(videoUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "*/*",
          },
        });
        if (!resp.ok) throw new Error(`Failed to fetch media: ${resp.status}`);
        const contentLength = resp.headers.get("content-length");
        if (contentLength && Number.parseInt(contentLength, 10) > MAX_MEDIA_BYTES) {
          throw new Error("Media file too large.");
        }
        const buf = await resp.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const ct = resp.headers.get("content-type") || (mediaKind === "video" ? "video/mp4" : "audio/mpeg");
        const dataUrl = `data:${ct};base64,${b64}`;
        mediaContent =
          mediaKind === "video" ? buildVideoUrlContent(dataUrl) : buildImageUrlContent(dataUrl);
      } catch (fetchErr: unknown) {
        return new Response(
          JSON.stringify({ error: `Could not fetch media: ${(fetchErr as Error).message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const systemPrompt = `You are a cautious forensic fact-checker analyzing audio/video of people making statements. Your job has TWO parts.

CALIBRATION RULES (very important):
- Do NOT assume a clip is a deepfake or misattributed unless you can point to concrete, scene-specific reasons based on what you actually hear/see and what you know about the speaker.
- Ordinary compression, editing, background music, translation, or clipping is NOT evidence of a deepfake by itself.
- High confidence (85+) requires multiple strong, specific reasons (e.g. the claim directly contradicts the speaker's well-documented public position in the relevant timeframe, the voice/appearance clearly does not match, etc.).
- If evidence is mixed, generic, or you cannot identify the speaker with reasonable certainty, return "Unverifiable" with confidence 50 or lower rather than forcing a verdict.
- Before making any authenticity claim, identify at least 2 concrete observations unique to this clip (setting, phrasing, visible context, spoken specifics). If you cannot, return "Unverifiable".

PART 1 — DEEPFAKE / MISATTRIBUTION CHECK:
- Transcribe the key spoken statement (main claim only, not word-for-word).
- Identify the speaker if they are a recognizable public figure. If unidentifiable, say so honestly.
- Using your training knowledge, assess whether this person has actually publicly said this, said something substantively similar, or whether the claim appears fabricated / misattributed / out-of-context. Cite reasoning (known speeches, interviews, policy positions, timeframes).
- Verdicts: "Likely Authentic" | "Likely Misattributed or Deepfake" | "Partially Accurate / Out of Context" | "Unverifiable"
- Be honest about uncertainty. You do not have real-time internet access — say so if the claim is very recent.

PART 2 — POLICY ANALYSIS (only if the statement is about a policy, law, regulation, or governance decision):
- Identify the policy topic and the country/state/region it applies to.
- List realistic pros, cons, and possible repercussions for that jurisdiction.
If the statement is NOT a policy claim, set is_policy_claim to false and omit policy_analysis.

Respond ONLY with valid JSON, no markdown fences. Schema:

{
  "speaker": "<name or 'Unidentified speaker'>",
  "speaker_confidence": "high" | "medium" | "low" | "unknown",
  "transcript_summary": "<1-3 sentences of the main statement>",
  "authenticity_verdict": "Likely Authentic" | "Likely Misattributed or Deepfake" | "Partially Accurate / Out of Context" | "Unverifiable",
  "authenticity_confidence": <1-100>,
  "authenticity_reasoning": "<2-4 sentences with specific reasoning, timeframes, known positions>",
  "known_sources": ["<brief reference to known speech/interview/document>"],
  "caveats": "<disclaimer about knowledge cutoff / uncertainty>",
  "is_policy_claim": true | false,
  "policy_analysis": {
    "topic": "<policy topic>",
    "region": "<country/state/region>",
    "pros": ["<pro 1>", "<pro 2>"],
    "cons": ["<con 1>", "<con 2>"],
    "repercussions": ["<repercussion 1>"]
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "DeepTrust Fact Check",
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
                  ? "Fact-check this YouTube clip. Identify the speaker, extract the main claim, verify against known statements, and if it is a policy claim provide pros/cons/repercussions. Be conservative and cite scene-specific reasoning. JSON only."
                  : "Fact-check this media. Identify the speaker, extract the main claim, verify against known statements, and if it is a policy claim provide pros/cons/repercussions. JSON only.",
              },
              mediaContent,
            ],
          },
        ],
        temperature: 0.05,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: `AI API error [${response.status}]: ${errText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const result = parseModelJson(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("fact-check-media error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
