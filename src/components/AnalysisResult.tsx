import { XCircle, CheckCircle, AlertTriangle, HelpCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface Issue {
  name: string;
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

interface AnalysisData {
  verdict: string;
  confidence: number;
  summary: string;
  issues: Issue[];
  clear: string[];
}

interface AnalysisResultProps {
  data: AnalysisData;
  imageUrl: string;
  onReset: () => void;
}

const severityColor = {
  HIGH: "bg-destructive/10 border-destructive/30 text-destructive",
  MEDIUM: "bg-warning/10 border-warning/30 text-warning",
  LOW: "bg-warning/10 border-warning/20 text-warning",
};

const severityBadge = {
  HIGH: "bg-destructive text-destructive-foreground",
  MEDIUM: "bg-warning text-warning-foreground",
  LOW: "bg-secondary text-secondary-foreground",
};

const getVerdictIcon = (verdict: string) => {
  if (verdict.includes("Real")) return <CheckCircle className="w-6 h-6 text-success" />;
  if (verdict.includes("Uncertain")) return <HelpCircle className="w-6 h-6 text-warning" />;
  return <XCircle className="w-6 h-6 text-destructive" />;
};

const getVerdictColor = (verdict: string) => {
  if (verdict.includes("Real")) return "text-success";
  if (verdict.includes("Uncertain")) return "text-warning";
  return "text-destructive";
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const AnalysisResult = ({ data, imageUrl, onReset }: AnalysisResultProps) => {
  const aiPercentage = data.confidence;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto space-y-6"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      {/* Image Preview */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Analyzed Image</h3>
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Analysis
          </button>
        </div>
        <div className="p-4 bg-secondary/30 flex items-center justify-center min-h-[250px] max-h-[400px]">
          <img src={imageUrl} alt="Analyzed" className="max-h-[380px] rounded-lg object-contain" />
        </div>
      </motion.div>

      {/* Verdict */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getVerdictIcon(data.verdict)}
            <div>
              <p className="text-sm text-muted-foreground">Verdict</p>
              <p className={`text-lg font-bold ${getVerdictColor(data.verdict)}`}>{data.verdict}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">AI Confidence</p>
            <motion.p
              className="text-3xl font-bold text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {aiPercentage}%
            </motion.p>
          </div>
        </div>
        {/* Bar */}
        <div className="relative h-3 rounded-full overflow-hidden gradient-bar">
          <motion.div
            className="absolute top-0 h-full w-1 bg-foreground rounded-full shadow-lg"
            initial={{ left: "0%" }}
            animate={{ left: `${aiPercentage}%` }}
            transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Real</span>
          <span>AI Generated</span>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
      </motion.div>

      {/* Detection Signals */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="text-lg">🔍</span> Detection Signals
        </h3>

        {data.issues.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">Issues Detected</p>
            <div className="space-y-3">
              {data.issues.map((issue, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className={`rounded-xl border p-4 ${severityColor[issue.severity]}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold text-sm">{issue.name}</span>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed">{issue.description}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md whitespace-nowrap ${severityBadge[issue.severity]}`}>
                      {issue.severity}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {data.clear.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-success uppercase tracking-wider mb-3">Clear</p>
            <div className="grid grid-cols-2 gap-2">
              {data.clear.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2"
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AnalysisResult;
