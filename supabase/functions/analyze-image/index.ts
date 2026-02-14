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
    const { imageBase64, imageUrl } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For URL-based images, fetch and convert to base64 to avoid external URL issues
    let imageContent;
    if (imageBase64) {
      imageContent = { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } };
    } else if (imageUrl) {
      try {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          throw new Error(`Failed to fetch image from URL: ${imgResponse.status}`);
        }
        const imgBuffer = await imgResponse.arrayBuffer();
        const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
        const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
        imageContent = { type: "image_url" as const, image_url: { url: `data:${contentType};base64,${imgBase64}` } };
      } catch (fetchErr) {
        return new Response(JSON.stringify({ error: `Could not fetch image from URL: ${fetchErr.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const systemPrompt = `You are an expert forensic image analyst specializing in detecting AI-generated images. Analyze the provided image and determine whether it is AI-generated or a real photograph.

You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Use this exact schema:

{
  "verdict": "AI Generated" | "Likely AI Generated" | "Uncertain" | "Likely Real" | "Real",
  "confidence": <number 1-100, how confident the image is AI-generated. 100 = definitely AI, 1 = definitely real>,
  "summary": "<2-3 sentence explanation of your determination>",
  "issues": [
    {
      "name": "<issue name>",
      "description": "<detailed description of the issue found>",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "clear": [
    "<name of check that passed, e.g. 'Lighting Consistency', 'Edge Quality', 'Background Artifacts', 'Compression Artifacts', 'Semantic Errors'>"
  ]
}

Analyze these specific signals:
1. **Texture Anomalies**: Skin texture, hair detail, fabric weave - AI often produces unnaturally smooth or repetitive textures
2. **Anatomical Errors**: Hands, fingers, ears, teeth, symmetry issues common in AI
3. **Detail Coherence**: Text rendering, small objects, watch faces, jewelry details - AI struggles with fine details
4. **Lighting Inconsistencies**: Shadow direction, reflection consistency, light source coherence
5. **Background Artifacts**: Blending errors, impossible geometry, repeating patterns
6. **Edge Quality**: Boundary sharpness, halo effects, blending artifacts between subjects and background
7. **Compression Artifacts**: Real photos have natural JPEG artifacts; AI images have different noise patterns
8. **Semantic Errors**: Logically impossible elements, wrong proportions, physics violations

Be thorough and precise. Real photos can have imperfections too - don't flag natural photo artifacts as AI signals.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "AI Image Detector",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image for AI generation indicators. Respond with JSON only." },
              imageContent,
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
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
