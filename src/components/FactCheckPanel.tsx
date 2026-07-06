import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, Scale, MapPin, User, Quote, BookOpen, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FactCheckPayload {
  mediaBase64?: string;
  mediaMimeType?: string;
  videoUrl?: string;
  mediaKind: "audio" | "video";
}

interface PolicyAnalysis {
  topic?: string;
  region?: string;
  pros?: string[];
  cons?: string[];
  repercussions?: string[];
}

interface FactCheckResult {
  speaker?: string;
  speaker_confidence?: string;
  transcript_summary?: string;
  authenticity_verdict?: string;
  authenticity_confidence?: number;
  authenticity_reasoning?: string;
  known_sources?: string[];
  caveats?: string;
  is_policy_claim?: boolean;
  policy_analysis?: PolicyAnalysis;
}

const verdictStyle = (v?: string) => {
  const t = (v || "").toLowerCase();
  if (t.includes("authentic")) return { color: "text-success", bg: "bg-success/10 border-success/30", Icon: ShieldCheck };
  if (t.includes("deepfake") || t.includes("misattributed")) return { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", Icon: ShieldAlert };
  if (t.includes("partial") || t.includes("context")) return { color: "text-warning", bg: "bg-warning/10 border-warning/30", Icon: ShieldQuestion };
  return { color: "text-muted-foreground", bg: "bg-secondary/40 border-border", Icon: ShieldQuestion };
};

const FactCheckPanel = ({ payload }: { payload: FactCheckPayload | null }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const { toast } = useToast();

  const runCheck = async () => {
    if (!payload) {
      toast({ title: "Unavailable", description: "No source media stored for this analysis.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("fact-check-media", {
        body: payload,
      });
      if (error) throw error;
      if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
      setResult(data as FactCheckResult);
    } catch (err: unknown) {
      toast({ title: "Fact-Check Failed", description: (err as Error).message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const style = verdictStyle(result?.authenticity_verdict);
  const VerdictIcon = style.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Deepfake & Fact Check</h3>
            <p className="text-xs text-muted-foreground">Did this person actually say this? Plus policy analysis if applicable.</p>
          </div>
        </div>
        {!result && (
          <button
            onClick={runCheck}
            disabled={loading || !payload}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? "Checking..." : "Run Fact Check"}
          </button>
        )}
        {result && (
          <button
            onClick={runCheck}
            disabled={loading}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Re-run
          </button>
        )}
      </div>

      {!result && !loading && (
        <p className="text-xs text-muted-foreground bg-secondary/30 border border-border rounded-lg p-3">
          Note: Uses the AI model's training knowledge to verify whether the speaker is a recognizable public figure and whether they've actually made this statement. Best for public/political statements. Not a substitute for live news verification.
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cross-referencing with known statements...</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Speaker + claim */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Identified Speaker
              </p>
              <p className="text-sm font-medium text-foreground">{result.speaker || "Unidentified"}</p>
              {result.speaker_confidence && (
                <p className="text-[11px] text-muted-foreground mt-1">Confidence: {result.speaker_confidence}</p>
              )}
            </div>
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5" /> Main Claim
              </p>
              <p className="text-sm text-foreground leading-relaxed">{result.transcript_summary || "—"}</p>
            </div>
          </div>

          {/* Verdict */}
          <div className={`rounded-xl border p-4 ${style.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <VerdictIcon className={`w-5 h-5 ${style.color}`} />
                <p className={`font-bold ${style.color}`}>{result.authenticity_verdict || "Unverifiable"}</p>
              </div>
              {typeof result.authenticity_confidence === "number" && (
                <span className={`text-sm font-bold ${style.color}`}>{result.authenticity_confidence}%</span>
              )}
            </div>
            {result.authenticity_reasoning && (
              <p className="text-sm text-foreground leading-relaxed">{result.authenticity_reasoning}</p>
            )}
          </div>

          {/* Known sources */}
          {result.known_sources && result.known_sources.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Referenced Sources
              </p>
              <div className="space-y-2">
                {result.known_sources.map((s, i) => (
                  <div key={i} className="text-sm text-foreground bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                    • {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy analysis */}
          {result.is_policy_claim && result.policy_analysis && (
            <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <p className="font-semibold text-foreground text-sm">Policy Analysis</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {result.policy_analysis.topic && <span>Topic: <span className="text-foreground font-medium">{result.policy_analysis.topic}</span></span>}
                {result.policy_analysis.region && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {result.policy_analysis.region}</span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {result.policy_analysis.pros && result.policy_analysis.pros.length > 0 && (
                  <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                    <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Pros
                    </p>
                    <ul className="space-y-1.5">
                      {result.policy_analysis.pros.map((p, i) => (
                        <li key={i} className="text-sm text-foreground leading-relaxed">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.policy_analysis.cons && result.policy_analysis.cons.length > 0 && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                    <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" /> Cons
                    </p>
                    <ul className="space-y-1.5">
                      {result.policy_analysis.cons.map((c, i) => (
                        <li key={i} className="text-sm text-foreground leading-relaxed">• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {result.policy_analysis.repercussions && result.policy_analysis.repercussions.length > 0 && (
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                  <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Possible Repercussions
                  </p>
                  <ul className="space-y-1.5">
                    {result.policy_analysis.repercussions.map((r, i) => (
                      <li key={i} className="text-sm text-foreground leading-relaxed">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result.caveats && (
            <p className="text-[11px] text-muted-foreground italic border-t border-border pt-3">
              {result.caveats}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default FactCheckPanel;
