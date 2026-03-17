import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, audioMimeType, videoUrl } = await req.json();

    if (!audioBase64 && !videoUrl) {
      return new Response(JSON.stringify({ error: 'No audio or video URL provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let audioContent: any;

    if (audioBase64) {
      const mime = audioMimeType || "audio/mpeg";
      audioContent = {
        type: "image_url" as const,
        image_url: { url: `data:${mime};base64,${audioBase64}` }
      };
    } else if (videoUrl) {
      try {
        const isYouTube = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/.test(videoUrl);

        if (isYouTube) {
          // Extract video ID from YouTube URL
          let videoId = "";
          const patterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
          ];
          for (const p of patterns) {
            const m = videoUrl.match(p);
            if (m) { videoId = m[1]; break; }
          }
          if (!videoId) throw new Error("Could not extract YouTube video ID from URL.");

          // Use cobalt.tools API to extract audio from YouTube
          const cobaltRes = await fetch("https://api.cobalt.tools/", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://www.youtube.com/watch?v=${videoId}`,
              audioFormat: "mp3",
              isAudioOnly: true,
            }),
          });

          if (!cobaltRes.ok) {
            throw new Error("Could not extract audio from YouTube. Please download the audio file manually and upload it instead.");
          }

          const cobaltData = await cobaltRes.json();
          const audioUrl = cobaltData.url;

          if (!audioUrl) {
            throw new Error("Could not get audio download link. Please download the audio manually and upload it.");
          }

          const audioRes = await fetch(audioUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          if (!audioRes.ok) throw new Error("Failed to download extracted audio.");

          const contentLength = audioRes.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
            throw new Error('Audio too large. Please use a shorter video or upload the audio directly (max 10MB).');
          }

          const audioBuf = await audioRes.arrayBuffer();
          const audioB64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
          audioContent = {
            type: "image_url" as const,
            image_url: { url: `data:audio/mpeg;base64,${audioB64}` }
          };
        } else {
          // Direct video/audio URL
          const vidResponse = await fetch(videoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
            },
          });
          if (!vidResponse.ok) {
            throw new Error(`Failed to fetch video: ${vidResponse.status}. Try downloading and uploading the audio instead.`);
          }
          const contentLength = vidResponse.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
            throw new Error('Video file too large. Please use a video under 10MB or extract and upload the audio directly.');
          }
          const vidBuffer = await vidResponse.arrayBuffer();
          const vidBase64 = btoa(String.fromCharCode(...new Uint8Array(vidBuffer)));
          const contentType = vidResponse.headers.get("content-type") || "video/mp4";
          audioContent = {
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

    const systemPrompt = `You are a world-class audio forensic analyst specializing in detecting AI-generated speech and audio. You have extensively studied outputs from all major voice synthesis and audio generation models including: ElevenLabs, OpenAI TTS, Google WaveNet/Cloud TTS, Amazon Polly, Microsoft Azure TTS, Bark, Tortoise TTS, VALL-E, XTTS, RVC (Retrieval-based Voice Conversion), So-VITS-SVC, Suno AI, Udio, MusicGen, AudioCraft, Stable Audio, and various deepfake voice cloning tools.

You deeply understand real human speech — natural micro-prosody, breathing patterns, vocal fry, lip smacks, ambient room acoustics, background noise, emotional modulation, and the organic imperfections of live recording.

ANALYSIS FRAMEWORK — examine ALL of these:

1. **PROSODY & NATURALNESS**: Real speech has natural rhythm variations, micro-pauses, filler words ("um", "uh"), breath intakes between phrases. AI speech tends to be unnaturally smooth, evenly paced, with mechanical rhythm.

2. **BREATHING PATTERNS**: Real speakers breathe audibly between sentences. AI often lacks realistic breath sounds or inserts them artificially at regular intervals.

3. **VOCAL TEXTURE**: Real voices have subtle imperfections — slight raspiness, vocal fry at sentence endings, natural warmth variations. AI voices often sound "too clean" or have a slight metallic/digital quality.

4. **BACKGROUND & ENVIRONMENT**: Real recordings have consistent room acoustics, ambient noise, and natural reverb. AI-generated audio often has unnaturally clean backgrounds or inconsistent acoustic environments.

5. **EMOTIONAL EXPRESSION**: Real speech has dynamic emotional modulation that flows naturally. AI speech may have flat or exaggerated emotional patterns that feel scripted.

6. **SPECTRAL ANALYSIS**: AI audio may have characteristic frequency patterns — unusual harmonic distributions, truncated frequency ranges, or spectral artifacts from vocoder processing.

7. **TEMPORAL CONSISTENCY**: Check for unnatural speed variations, glitches, robotic transitions between words, or unnaturally uniform syllable timing.

8. **AUDIO ARTIFACTS**: Listen for digital artifacts — clicks, pops, phase issues, or boundary effects between generated segments. Also check for watermark patterns some AI services embed.

For MUSIC/AUDIO content (non-speech):
- AI music often has repetitive patterns that feel looped
- Instrument timbres may lack the micro-variations of real instruments
- Transitions between sections can feel abrupt or formulaic
- Stereo imaging may be unnaturally perfect or inconsistent

You MUST respond with valid JSON only, no markdown. Use this exact schema:

{
  "verdict": "AI Generated" | "Likely AI Generated" | "Uncertain" | "Likely Real" | "Real",
  "confidence": <number 1-100>,
  "audio_type": "Speech" | "Music" | "Mixed" | "Sound Effect" | "Unknown",
  "summary": "<2-3 sentence explanation>",
  "detailed_report": {
    "overview": "<3-5 sentence overview of the analysis>",
    "categories": [
      {
        "name": "<e.g. 'Prosody & Rhythm', 'Vocal Texture', 'Breathing Patterns', 'Background Acoustics', 'Spectral Analysis', 'Emotional Expression', 'Temporal Consistency', 'Audio Artifacts'>",
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
  "audio_metadata": {
    "estimated_duration": "<estimated duration if detectable>",
    "detected_language": "<detected language or 'Instrumental/None'>",
    "likely_source": "Human Recording" | "AI TTS" | "AI Music Generator" | "Voice Clone" | "Mixed/Edited" | "Unknown",
    "suspected_tool": "<suspected AI tool if applicable, e.g. 'ElevenLabs', 'OpenAI TTS', 'Suno AI', 'None detected'>",
    "quality_assessment": "<brief quality note>"
  }
}

Provide at least 5 categories in the detailed report. Be thorough and specific.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "AI Audio Detector",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this audio for AI generation indicators. Respond with JSON only." },
              audioContent,
            ],
          },
        ],
        temperature: 0.1,
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
    console.error("Error analyzing audio:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
