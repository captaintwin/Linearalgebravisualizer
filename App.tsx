
import React, { useState, useMemo, useEffect } from 'react';
import VectorCanvas from './components/VectorCanvas';
import VectorCanvas3D from './components/VectorCanvas3D';
import ControlPanel from './components/ControlPanel';
import MathFormula from './components/MathFormula';
import GeminiInsights from './components/GeminiInsights';
import { getMatrixInsights } from './services/geminiService';
import { 
  INITIAL_MATRIX_2D, INITIAL_VECTORS_2D, 
  INITIAL_MATRIX_3D, INITIAL_VECTORS_3D 
} from './constants';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode, GeminiInsight } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<DimensionMode>('2D');
  const [matrix2D, setMatrix2D] = useState<Matrix2x2>(INITIAL_MATRIX_2D);
  const [matrixB2D, setMatrixB2D] = useState<Matrix2x2>(INITIAL_MATRIX_2D);
  const [vectors2D, setVectors2D] = useState<Vector2D[]>(INITIAL_VECTORS_2D);
  
  const [matrix3D, setMatrix3D] = useState<Matrix3x3>(INITIAL_MATRIX_3D);
  const [vectors3D, setVectors3D] = useState<Vector3D[]>(INITIAL_VECTORS_3D);
  
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [insight, setInsight] = useState<GeminiInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    try {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const data = JSON.parse(atob(hash));
        if (data.mode) setMode(data.mode);
        if (data.matrix2D) setMatrix2D(data.matrix2D);
        if (data.vectors2D) setVectors2D(data.vectors2D);
        if (data.matrix3D) setMatrix3D(data.matrix3D);
        if (data.vectors3D) setVectors3D(data.vectors3D);
      }
    } catch (e) {
      console.warn("Restore failed", e);
    }
  }, []);

  const handleAnalyze = async () => {
    setLoadingInsights(true);
    const matrix = mode === '2D' ? matrix2D : matrix3D;
    const vectors = mode === '2D' ? vectors2D : vectors3D;
    try {
      const result = await getMatrixInsights(matrix, vectors);
      setInsight(result);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const matrixStats = useMemo(() => {
    if (mode === '2D') {
      const [[a, b], [c, d]] = matrix2D;
      const det = a * d - b * c;
      const trace = a + d;
      const disc = Math.pow(trace, 2) - 4 * det;
      return { det, trace, disc };
    } else {
      const m = matrix3D.flat();
      const det = m[0]*(m[4]*m[8]-m[5]*m[7]) - m[1]*(m[3]*m[8]-m[5]*m[6]) + m[2]*(m[3]*m[7]-m[4]*m[6]);
      const trace = matrix3D[0][0] + matrix3D[1][1] + matrix3D[2][2];
      return { det, trace, disc: 0 };
    }
  }, [matrix2D, matrix3D, mode]);

  const headerFormula = useMemo(() => {
    if (mode === '2D') {
      const [[a, b], [c, d]] = matrix2D;
      const v = vectors2D[2] || vectors2D[0] || { x: 0, y: 0 };
      const rx = a * v.x + b * v.y;
      const ry = c * v.x + d * v.y;
      return `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix} \\begin{pmatrix} ${v.x} \\\\ ${v.y} \\end{pmatrix} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\end{pmatrix}`;
    }
    return `\\text{3D Matrix Engine}`;
  }, [matrix2D, vectors2D, mode]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </div>
          <h1 className="text-sm font-black uppercase tracking-tighter">Linear Lab <span className="text-indigo-400">v1.2</span></h1>
        </div>
        <div className="flex bg-slate-800/50 rounded-full p-1 border border-white/5">
          {(['2D', '3D'] as DimensionMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-6 py-1 rounded-full text-[10px] font-black transition-all ${mode === m ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-400 hover:text-white'}`}>{m}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:row overflow-hidden relative lg:flex-row">
        <aside className="lg:w-96 border-r border-white/5 flex flex-col bg-slate-900/20 z-10 shrink-0">
          <ControlPanel 
            mode={mode}
            matrix2D={matrix2D} setMatrix2D={setMatrix2D}
            matrixB2D={matrixB2D} setMatrixB2D={setMatrixB2D}
            matrix3D={matrix3D} setMatrix3D={setMatrix3D}
            vectors2D={vectors2D} setVectors2D={setVectors2D}
            vectors3D={vectors3D} setVectors3D={setVectors3D}
            showGrid={showGrid} setShowGrid={setShowGrid}
            onResetMatrix={() => mode === '2D' ? setMatrix2D(INITIAL_MATRIX_2D) : setMatrix3D(INITIAL_MATRIX_3D)}
            onResetVector={(i) => mode === '2D' ? setVectors2D(v => { const n = [...v]; n[i] = {...INITIAL_VECTORS_2D[i]}; return n; }) : setVectors3D(v => { const n = [...v]; n[i] = {...INITIAL_VECTORS_3D[i]}; return n; })}
            onResetAll={() => { setMatrix2D(INITIAL_MATRIX_2D); setMatrix3D(INITIAL_MATRIX_3D); setVectors2D([...INITIAL_VECTORS_2D]); setVectors3D([...INITIAL_VECTORS_3D]); setInsight(null); window.location.hash = ''; }}
            onTranspose={() => mode === '2D' ? setMatrix2D([[matrix2D[0][0], matrix2D[1][0]], [matrix2D[0][1], matrix2D[1][1]]]) : setMatrix3D([[matrix3D[0][0], matrix3D[1][0], matrix3D[2][0]], [matrix3D[0][1], matrix3D[1][1], matrix3D[2][1]], [matrix3D[0][2], matrix3D[1][2], matrix3D[2][2]]])}
            onMultiply={() => { if(mode==='2D'){const A=matrix2D,B=matrixB2D;setMatrix2D([[A[0][0]*B[0][0]+A[0][1]*B[1][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]],[A[1][0]*B[0][0]+A[1][1]*B[1][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]]])}}}
            onShare={() => {const hash=btoa(JSON.stringify({mode,matrix2D,vectors2D,matrix3D,vectors3D})); window.location.hash=hash; navigator.clipboard.writeText(window.location.href).then(()=>alert("Copied!"))}}
          />
        </aside>

        <section className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto bg-slate-950">
          <div className="h-[400px] lg:h-auto lg:flex-1 relative rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="absolute top-6 left-6 z-30 pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                <div className="text-[10px] text-indigo-400 font-black uppercase mb-2 tracking-widest">Transformation Matrix</div>
                <MathFormula formula={headerFormula} className="text-white text-base md:text-xl font-mono" />
              </div>
            </div>

            <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
               <div className="bg-slate-900/80 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-xl space-y-2 min-w-[120px]">
                 <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500"><span>det(A)</span><span className="text-indigo-400 font-mono">{matrixStats.det.toFixed(2)}</span></div>
                 <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500"><span>tr(A)</span><span className="text-emerald-400 font-mono">{matrixStats.trace.toFixed(2)}</span></div>
                 {mode === '2D' && (
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500"><span>disc(A)</span><span className="text-rose-400 font-mono">{matrixStats.disc.toFixed(2)}</span></div>
                 )}
               </div>
            </div>

            {mode === '2D' ? (
              <VectorCanvas matrix={matrix2D} vectors={vectors2D} setVectors={setVectors2D} showGrid={showGrid} />
            ) : (
              <VectorCanvas3D matrix={matrix3D} vectors={vectors3D} setVectors={setVectors3D} showGrid={showGrid} />
            )}
          </div>

          <div className="shrink-0 max-w-4xl mx-auto w-full">
            {insight ? <GeminiInsights insight={insight} loading={loadingInsights} /> : (
              <button onClick={handleAnalyze} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                {loadingInsights ? 'Processing Matrix Analysis...' : 'Deep Dive with Gemini AI'}
              </button>
            )}
            {insight && <button onClick={()=>setInsight(null)} className="mt-4 text-[10px] text-slate-500 uppercase font-black w-full hover:text-slate-300">Reset Insights</button>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
