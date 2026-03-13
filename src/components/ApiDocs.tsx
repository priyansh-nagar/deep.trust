import { useState } from "react";
import { Code, Send, FileJson, Key, Copy, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const requestExample = `{
  "imageBase64": "iVBORw0KGgo...",
  // OR
  "imageUrl": "https://example.com/photo.jpg"
}`;

const responseExample = `{
  "verdict": "AI Generated",
  "confidence": 92,
  "summary": "The image shows multiple indicators of AI generation...",
  "issues": [
    {
      "name": "Skin Texture Anomaly",
      "description": "Unnaturally smooth skin with no visible pores",
      "severity": "HIGH"
    }
  ],
  "clear": [
    "Lighting Consistency",
    "Background Coherence"
  ],
  "metadata": {
    "exif_present": false,
    "software_fingerprint": "Midjourney v6",
    "compression_analysis": "Clean encoding suggesting AI pipeline",
    "provenance_signals": "No camera-origin metadata detected",
    "tampering_indicators": "No tampering detected",
    "metadata_verdict": "Signals consistent with AI generation"
  }
}`;

const curlExample = `curl -X POST \\
  https://xtmofdvixsleolfrmsej.supabase.co/functions/v1/analyze-image \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "imageUrl": "https://example.com/photo.jpg"
  }'`;

const fetchExample = `const response = await fetch(
  "https://xtmofdvixsleolfrmsej.supabase.co/functions/v1/analyze-image",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl: "https://example.com/photo.jpg",
    }),
  }
);

const result = await response.json();
console.log(result.verdict, result.confidence);`;

const paramDocs = [
  { name: "imageBase64", type: "string", required: false, desc: "Base64-encoded image data (without data URI prefix)" },
  { name: "imageUrl", type: "string", required: false, desc: "Public URL of the image to analyze" },
];

const responseDocs = [
  { name: "verdict", type: "string", desc: '"AI Generated" | "Likely AI Generated" | "Uncertain" | "Likely Real" | "Real"' },
  { name: "confidence", type: "number", desc: "Confidence score from 1–100" },
  { name: "summary", type: "string", desc: "Human-readable explanation of the determination" },
  { name: "issues", type: "array", desc: "Detected issues with name, description, and severity (HIGH/MEDIUM/LOW)" },
  { name: "clear", type: "string[]", desc: "List of checks that passed without issues" },
  { name: "metadata", type: "object", desc: "Forensic metadata including EXIF, compression, and provenance analysis" },
];

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="bg-secondary/80 border border-border rounded-xl p-4 overflow-x-auto text-sm font-mono text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const ApiDocs = () => {
  return (
    <motion.section
      className="mt-16 pt-12 border-t border-border"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 mb-4">
          <Code className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Developer API</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">API Documentation</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Integrate DeepTrust's AI detection into your own applications with our REST API.
        </p>
      </div>

      {/* Endpoint */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-mono text-xs">POST</Badge>
          <code className="text-sm font-mono text-foreground">/functions/v1/analyze-image</code>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          Analyzes an image for AI-generation indicators using multimodal forensic analysis.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Key className="w-3.5 h-3.5" />
          <span>Requires <code className="text-foreground bg-secondary px-1.5 py-0.5 rounded">Authorization: Bearer YOUR_API_KEY</code> header</span>
        </div>
      </div>

      {/* Tabs for request/response/code */}
      <Tabs defaultValue="request" className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-border bg-secondary/50 p-0 h-auto">
          <TabsTrigger value="request" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 py-3">
            <Send className="w-3.5 h-3.5" />
            Request
          </TabsTrigger>
          <TabsTrigger value="response" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 py-3">
            <FileJson className="w-3.5 h-3.5" />
            Response
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 py-3">
            <Code className="w-3.5 h-3.5" />
            Examples
          </TabsTrigger>
        </TabsList>

        <div className="p-5 sm:p-6">
          {/* Request Tab */}
          <TabsContent value="request" className="mt-0">
            <h3 className="text-sm font-semibold text-foreground mb-3">Request Body</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Provide either <code className="text-foreground bg-secondary px-1 py-0.5 rounded">imageBase64</code> or <code className="text-foreground bg-secondary px-1 py-0.5 rounded">imageUrl</code>. At least one is required.
            </p>

            {/* Param table */}
            <div className="border border-border rounded-xl overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parameter</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {paramDocs.map((p) => (
                    <tr key={p.name} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{p.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CodeBlock code={requestExample} language="json" />
          </TabsContent>

          {/* Response Tab */}
          <TabsContent value="response" className="mt-0">
            <h3 className="text-sm font-semibold text-foreground mb-3">Response Schema</h3>

            <div className="border border-border rounded-xl overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {responseDocs.map((r) => (
                    <tr key={r.name} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CodeBlock code={responseExample} language="json" />
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="mt-0">
            <h3 className="text-sm font-semibold text-foreground mb-3">cURL</h3>
            <CodeBlock code={curlExample} language="bash" />

            <h3 className="text-sm font-semibold text-foreground mt-6 mb-3">JavaScript (fetch)</h3>
            <CodeBlock code={fetchExample} language="javascript" />
          </TabsContent>
        </div>
      </Tabs>
    </motion.section>
  );
};

export default ApiDocs;
