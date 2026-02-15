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

    const systemPrompt = `You are a world-class forensic image analyst with deep expertise in detecting AI-generated and deepfake images. You have studied outputs from all major generative models including Stable Diffusion, DALL-E, Midjourney, Firefly, Flux, and GAN-based generators. You also understand real photography deeply — camera sensors, lens optics, lighting physics, JPEG compression, and natural imperfections.

Your task: Determine whether the provided image is AI-generated or a real photograph.

You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Use this exact schema:

{
  "verdict": "AI Generated" | "Likely AI Generated" | "Uncertain" | "Likely Real" | "Real",
  "confidence": <number 1-100, how confident you are in your verdict. 100 = absolutely certain in your verdict, 1 = barely any confidence in your verdict>,
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

CRITICAL ANALYSIS FRAMEWORK — analyze ALL of these in order:

1. **EXIF & Compression Signatures**: Real photos exhibit natural JPEG quantization artifacts, sensor noise patterns, and chromatic aberration from lenses. AI images have unnaturally uniform noise or no sensor noise at all. Look for telltale signs of camera sensor origin vs synthetic generation.

2. **Texture & Surface Analysis**: Examine skin pores, hair strands, fabric weave, wood grain, concrete texture at pixel level. AI models (especially diffusion models) produce textures that are either too smooth, have repeating micro-patterns, or lack the natural randomness of real-world surfaces.

3. **Anatomical & Biological Accuracy**: Count fingers carefully. Check ear symmetry, teeth regularity, iris patterns, nail shapes, skin fold consistency. AI frequently produces 6 fingers, asymmetric ears, teeth that blend together, or impossibly smooth skin.

4. **Fine Detail Coherence**: Examine text in the image, watch faces, jewelry, buttons, zippers, shoelaces, glasses frames. AI struggles with small structured details — text is often garbled, watch hands don't make sense, jewelry has impossible geometry.

5. **Lighting Physics**: Trace every light source. Check shadow directions, highlight positions, specular reflections, ambient occlusion. All shadows must be consistent with the same light sources. AI often has contradictory shadow directions or missing shadows.

6. **Edge & Boundary Analysis**: Look at boundaries between subjects and backgrounds, hair edges, clothing edges. AI produces characteristic soft blending, halo effects, or unnaturally sharp cutouts at these boundaries.

7. **Background & Environment**: Check for repeating patterns, impossible architecture, floating objects, perspective inconsistencies, blurred areas that don't follow depth-of-field physics. AI backgrounds often contain nonsensical geometry.

8. **Semantic & Physical Plausibility**: Verify that the scene makes physical sense. Check reflections match the scene, water behavior is realistic, gravity is respected, proportions are anatomically correct. AI often creates semantically impossible scenes.

9. **Color & Tonal Analysis**: Check for over-saturated or HDR-like tone mapping common in AI images. Real photos have natural color transitions, film/sensor-specific color science. AI tends toward unnaturally vibrant or perfectly balanced colors.

10. **Contextual Clues**: Brand logos, license plates, screen content, newspaper text — these are extremely hard for AI to get right. Their presence and accuracy is a strong indicator of authenticity.

CRITICAL RULES FOR ACCURACY:
- Real photographs OFTEN have imperfections (motion blur, noise, red-eye, bad lighting). These are NOT signs of AI generation — they are signs of authenticity.
- Celebrity/famous person photos taken in real settings (sports events, public appearances) with natural camera artifacts are almost certainly real.
- Group photos with consistent lighting across all subjects and natural interaction poses strongly suggest real photos.
- If the image looks like a typical smartphone or DSLR photo with natural compression, sensor noise, and lens characteristics, lean toward Real.
- Only flag issues you are genuinely confident about. Do not manufacture false positives.
- When uncertain, prefer "Likely Real" over "Uncertain" for photos showing strong camera-origin signals.
- Your confidence score reflects how sure you are about YOUR VERDICT, not how AI-like the image is.

Be extremely thorough. False positives (calling real images AI) are as harmful as false negatives.`;


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
