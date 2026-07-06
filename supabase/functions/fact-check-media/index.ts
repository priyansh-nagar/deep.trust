import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i;

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

    let mediaContent: unknown;
    if (mediaBase64) {
      const mime = mediaMimeType || (mediaKind === "video" ? "video/mp4" : "audio/mpeg");
      mediaContent = {
        type: "image_url",
        image_url: { url: `data:${mime};base64,${mediaBase64}` },
      };
    } else if (videoUrl && YOUTUBE_URL_PATTERN.test(videoUrl)) {
      mediaContent = {
        type: "video",
        url: normalizeYouTubeUrl(videoUrl),
        mime_type: "video/mp4",
      };
    } else if (videoUrl) {
      mediaContent = {
        type: "image_url",
        image_url: { url: videoUrl },
      };
    }

    const systemPrompt = `You are a forensic fact-checker analyzing audio/video of people making statements. Your job is TWO parts:

PART 1 — DEEPFAKE / MISATTRIBUTION CHECK:
- Transcribe the key spoken statement (main claim only, not word-for-word full transcript).
- Identify the speaker if they are a recognizable public figure (politician, celebrity, executive, etc.). If unidentifiable, say so honestly.
- Using your training knowledge, assess whether this person has actually publicly said this thing, said something substantively similar, or whether the claim appears fabricated / misattributed / out-of-context. Cite the reasoning (known speeches, interviews, policy positions, timeframes).
- Verdicts: "Likely Authentic" | "Likely Misattributed or Deepfake" | "Partially Accurate / Out of Context" | "Unverifiable"
- Be honest about uncertainty. You do not have real-time internet access — say so if the claim is very recent or you cannot verify.

PART 2 — POLICY ANALYSIS (only if the statement is about a policy, law, regulation, or governance decision):
- Identify the policy topic and the country/state/region it applies to.
- List realistic pros (advantages) for that jurisdiction.
- List realistic cons (disadvantages) for that jurisdiction.
- List possible repercussions (short/long-term consequences, affected groups).
If the statement is NOT a policy claim, set is_policy_claim to false and omit policy_analysis.

Respond ONLY with valid JSON, no markdown fences. Schema:

{
  "speaker": "<name or 'Unidentified speaker'>",
  "speaker_confidence": "high" | "medium" | "low" | "unknown",
  "transcript_summary": "<1-3 sentences of the main statement>",
  "authenticity_verdict": "Likely Authentic" | "Likely Misattributed or Deepfake" | "Partially Accurate / Out of Context" | "Unverifiable",
  "authenticity_confidence": <1-100>,
  "authenticity_reasoning": "<2-4 sentences explaining what is known about this person saying this, referencing timeframes / known positions / speeches>",
  "known_sources": ["<brief reference to known speech/interview/document, e.g. 'State of the Union 2023', 'CNN interview April 2024'>"],
  "caveats": "<disclaimer about knowledge cutoff / uncertainty>",
  "is_policy_claim": true | false,
  "policy_analysis": {
    "topic": "<policy topic>",
    "region": "<country/state/region>",
    "pros": ["<pro 1>", "<pro 2>", "..."],
    "cons": ["<con 1>", "<con 2>", "..."],
    "repercussions": ["<repercussion 1>", "..."]
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
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
                text: "Analyze this media. Identify the speaker, extract the main claim, verify whether they actually said this, and if it's a policy claim provide pros/cons/repercussions. JSON only.",
              },
              mediaContent,
            ],
          },
        ],
        temperature: 0.2,
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
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(content);

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
