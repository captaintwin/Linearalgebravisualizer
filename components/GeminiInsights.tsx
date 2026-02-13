
import React from 'react';
import { GeminiInsight } from '../types';
import MathFormula from './MathFormula';

interface GeminiInsightsProps {
  insight: GeminiInsight | null;
  loading: boolean;
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ insight, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6 bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="h-6 bg-slate-700 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!insight) return null;

  // Helper to detect and wrap math segments
  const renderRichText = (text: string) => {
    const parts = text.split(/(\$[^\$]+\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return <MathFormula key={i} formula={part.slice(1, -1)} className="text-indigo-300 font-bold" />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700 backdrop-blur-sm shadow-xl transition-all hover:border-slate-600">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight">{insight.title}</h2>
      </div>
      
      <p className="text-slate-300 leading-relaxed mb-6 text-sm">
        {renderRichText(insight.explanation)}
      </p>

      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mathematical Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insight.mathDetails.map((detail, idx) => (
            <div key={idx} className="flex items-start gap-3 text-[13px] text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-900/80 transition-colors">
              <span className="text-indigo-500 mt-1 font-black">#</span>
              <div className="flex-1">{renderRichText(detail)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeminiInsights;
