
// App.tsx
import React, { useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import VectorCanvas from './components/VectorCanvas';
import VectorCanvas3D from './components/VectorCanvas3D';
import ControlPanel from './components/ControlPanel';
import MathFormula from './components/MathFormula';
import { 
  INITIAL_MATRIX_2D, INITIAL_VECTORS_2D, 
  INITIAL_MATRIX_3D, INITIAL_VECTORS_3D 
} from './constants';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode } from './types';

const STORAGE_KEY = 'linear_lab_stable_v1';

const App: React.FC = () => {
  const [mode, setMode] = useState<DimensionMode>('2D');
  const [matrix2D, setMatrix2D] = useState<Matrix2x2>(INITIAL_MATRIX_2D);
  const [vectors2D, setVectors2D] = useState<Vector2D[]>(INITIAL_VECTORS_2D);
  const [matrix3D, setMatrix3D] = useState<Matrix3x3>(INITIAL_MATRIX_3D);
  const [vectors3D, setVectors3D] = useState<Vector3D[]>(INITIAL_VECTORS_3D);
  const [selectedVectorIdx, setSelectedVectorIdx] = useState<number>(0);
  const [scalar, setScalar] = useState<number>(1.0);
  
  // UI States
  const [isKernelCollapsed, setIsKernelCollapsed] = useState<boolean>(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState<boolean>(false);

  // Settings
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showOriginalGrid, setShowOriginalGrid] = useState<boolean>(true);
  const [showEigenvectors, setShowEigenvectors] = useState<boolean>(true); 
  const [gridColor, setGridColor] = useState<string>('#6366f1');
  const [originalGridColor, setOriginalGridColor] = useState<string>('#ffffff');
  const [gridThickness, setGridThickness] = useState<number>(2.0);
  const [originalGridThickness, setOriginalGridThickness] = useState<number>(1.0);
  
  const [lastSaved, setLastSaved] = useState<string>('');

  // Initial recovery
  useEffect(() => {
    const loadSavedState = () => {
      try {
        const hash = window.location.hash.substring(1);
        let data = null;
        
        if (hash) {
          data = JSON.parse(atob(hash));
        } else {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) data = JSON.parse(local);
        }

        if (data) {
          if (data.mode) setMode(data.mode);
          if (data.matrix2D) setMatrix2D(data.matrix2D);
          if (data.vectors2D) setVectors2D(data.vectors2D);
          if (data.matrix3D) setMatrix3D(data.matrix3D);
          if (data.vectors3D) setVectors3D(data.vectors3D);
          if (data.scalar !== undefined) setScalar(data.scalar);
          if (data.showEigenvectors !== undefined) setShowEigenvectors(data.showEigenvectors);
          if (data.gridColor) setGridColor(data.gridColor);
          if (data.isKernelCollapsed !== undefined) setIsKernelCollapsed(data.isKernelCollapsed);
          if (data.isPropertiesCollapsed !== undefined) setIsPropertiesCollapsed(data.isPropertiesCollapsed);
        }
      } catch (e) {
        console.warn("State recovery failed", e);
      }
    };
    loadSavedState();
  }, []);

  // Sync state
  useEffect(() => {
    const stateToSave = { 
      mode, matrix2D, vectors2D, matrix3D, vectors3D, 
      scalar, showEigenvectors, gridColor, showOriginalGrid,
      isKernelCollapsed, isPropertiesCollapsed
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    setLastSaved(new Date().toLocaleTimeString());
  }, [mode, matrix2D, vectors2D, matrix3D, vectors3D, scalar, showEigenvectors, gridColor, showOriginalGrid, isKernelCollapsed, isPropertiesCollapsed]);

  const handleShare = () => {
    const state = { 
      mode, matrix2D, vectors2D, matrix3D, vectors3D, 
      selectedVectorIdx, scalar, showOriginalGrid, gridColor, originalGridColor,
      gridThickness, originalGridThickness, showEigenvectors, isKernelCollapsed, isPropertiesCollapsed
    };
    const hash = btoa(JSON.stringify(state));
    window.location.hash = hash;
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("Snapshot link created! State (including collapsed panels) is preserved.");
    });
  };

  const handleResetMatrix = () => {
    if (mode === '2D') setMatrix2D(INITIAL_MATRIX_2D);
    else setMatrix3D(INITIAL_MATRIX_3D);
  };

  const handleTranspose = () => {
    if (mode === '2D') {
      const [[a, b], [c, d]] = matrix2D;
      setMatrix2D([[a, c], [b, d]]);
    } else {
      const [[a11, a12, a13], [a21, a22, a23], [a31, a32, a33]] = matrix3D;
      setMatrix3D([[a11, a21, a31], [a12, a22, a32], [a13, a23, a33]]);
    }
  };

  const matrixStats = useMemo(() => {
    if (mode === '2D') {
      const [[a, b], [c, d]] = matrix2D.map(row => row.map(v => v * scalar)) as Matrix2x2;
      const det = a * d - b * c;
      const trace = a + d;
      const disc = trace * trace - 4 * det;
      const charEq = `\\lambda^2 - ${trace.toFixed(2)}\\lambda + ${det.toFixed(2)} = 0`;
      
      let eigenvalues = null;
      if (disc >= 0) {
        const l1 = (trace + Math.sqrt(disc)) / 2;
        const l2 = (trace - Math.sqrt(disc)) / 2;
        const findV = (l: number) => {
          if (Math.abs(b) > 1e-4) return { x: l - d, y: b };
          if (Math.abs(c) > 1e-4) return { x: c, y: l - a };
          return l === a ? { x: 1, y: 0 } : { x: 0, y: 1 };
        };
        eigenvalues = [
          { val: l1, vec: findV(l1), color: '#fbbf24' },
          { val: l2, vec: findV(l2), color: '#fb7185' }
        ];
      }
      return { det, trace, eigenvalues, charEq };
    } else {
      const m = matrix3D.flat().map(v => v * scalar);
      const [a11, a12, a13, a21, a22, a23, a31, a32, a33] = m;
      const det = a11*(a22*a33 - a23*a32) - a12*(a21*a33 - a23*a31) + a13*(a21*a32 - a22*a31);
      const trace = a11 + a22 + a33;
      const sumMinors = (a11*a22 - a12*a21) + (a11*a33 - a13*a31) + (a22*a33 - a23*a32);
      const charEq = `-\\lambda^3 + ${trace.toFixed(2)}\\lambda^2 - ${sumMinors.toFixed(2)}\\lambda + ${det.toFixed(2)} = 0`;

      const findRoots = () => {
        const roots: number[] = [];
        const f = (l: number) => -Math.pow(l, 3) + trace*Math.pow(l, 2) - sumMinors*l + det;
        for (let i = -20; i <= 20; i += 0.5) {
          if (f(i) * f(i+0.5) <= 0) {
            let low = i, high = i+0.5;
            for(let j=0; j<10; j++) {
              let mid = (low+high)/2;
              if (f(low)*f(mid) <= 0) high = mid; else low = mid;
            }
            const r = (low+high)/2;
            if (roots.length === 0 || Math.abs(roots[roots.length-1] - r) > 0.1) roots.push(r);
          }
        }
        return roots;
      };

      const roots = findRoots();
      const colors = ['#fbbf24', '#fb7185', '#2dd4bf'];
      const eigenvalues = roots.map((r, i) => {
        const v1 = new THREE.Vector3(a11 - r, a12, a13);
        const v2 = new THREE.Vector3(a21, a22 - r, a23);
        const v3 = new THREE.Vector3(a31, a32, a33 - r);
        let vec = new THREE.Vector3().crossVectors(v1, v2);
        if (vec.length() < 1e-3) vec = new THREE.Vector3().crossVectors(v1, v3);
        if (vec.length() < 1e-3) vec = new THREE.Vector3().crossVectors(v2, v3);
        if (vec.length() < 1e-3) vec = new THREE.Vector3(1,0,0);
        vec.normalize();
        return { val: r, vec: { x: vec.x, y: vec.y, z: vec.z }, color: colors[i % 3] };
      });

      return { det, trace, eigenvalues, charEq };
    }
  }, [matrix2D, matrix3D, mode, scalar]);

  const transformationMainFormula = useMemo(() => {
    if (mode === '2D') {
      const [[a, b], [c, d]] = matrix2D;
      const v = vectors2D[selectedVectorIdx] || vectors2D[0];
      const rx = (a * v.x + b * v.y) * scalar;
      const ry = (c * v.x + d * v.y) * scalar;
      return `${scalar.toFixed(1)} \\cdot \\begin{pmatrix} ${a.toFixed(1)} & ${b.toFixed(1)} \\\\ ${c.toFixed(1)} & ${d.toFixed(1)} \\end{pmatrix} \\begin{pmatrix} ${v.x.toFixed(1)} \\\\ ${v.y.toFixed(1)} \\end{pmatrix} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\end{pmatrix}`;
    } else {
      const m = matrix3D;
      const v = vectors3D[selectedVectorIdx] || vectors3D[0];
      const rx = (m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z) * scalar;
      const ry = (m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z) * scalar;
      const rz = (m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z) * scalar;
      return `${scalar.toFixed(1)} \\cdot \\begin{pmatrix} ${m[0][0].toFixed(1)} & ${m[0][1].toFixed(1)} & ${m[0][2].toFixed(1)} \\\\ ${m[1][0].toFixed(1)} & ${m[1][1].toFixed(1)} & ${m[1][2].toFixed(1)} \\\\ ${m[2][0].toFixed(1)} & ${m[2][1].toFixed(1)} & ${m[2][2].toFixed(1)} \\end{pmatrix} \\begin{pmatrix} ${v.x.toFixed(1)} \\\\ ${v.y.toFixed(1)} \\\\ ${v.z.toFixed(1)} \\end{pmatrix} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\\\ ${rz.toFixed(1)} \\end{pmatrix}`;
    }
  }, [matrix2D, matrix3D, vectors2D, vectors3D, mode, selectedVectorIdx, scalar]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between z-20 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-500/20 shadow-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Linear Lab</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workspace active • {lastSaved}</span>
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-800/80 rounded-xl p-1.5 border border-slate-700/50 shadow-inner">
          {['2D', '3D'].map(m => (
            <button 
              key={m} 
              onClick={() => { setMode(m as DimensionMode); setSelectedVectorIdx(0); }} 
              className={`px-6 py-1.5 rounded-lg text-xs font-black transition-all duration-300 ${mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <aside className="flex-1 lg:w-96 bg-slate-900/40 border-t lg:border-t-0 lg:border-r border-slate-800 overflow-hidden order-2 lg:order-1 flex flex-col">
          <ControlPanel 
            mode={mode}
            matrix2D={matrix2D} setMatrix2D={setMatrix2D}
            matrix3D={matrix3D} setMatrix3D={setMatrix3D}
            vectors2D={vectors2D} setVectors2D={setVectors2D}
            vectors3D={vectors3D} setVectors3D={setVectors3D}
            selectedVectorIdx={selectedVectorIdx}
            setSelectedVectorIdx={setSelectedVectorIdx}
            scalar={scalar}
            setScalar={setScalar}
            showGrid={showGrid} setShowGrid={setShowGrid}
            showOriginalGrid={showOriginalGrid} setShowOriginalGrid={setShowOriginalGrid}
            showEigenvectors={showEigenvectors} setShowEigenvectors={setShowEigenvectors}
            gridColor={gridColor} setGridColor={setGridColor}
            originalGridColor={originalGridColor} setOriginalGridColor={setOriginalGridColor}
            gridThickness={gridThickness} setGridThickness={setGridThickness}
            originalGridThickness={originalGridThickness} setOriginalGridThickness={setOriginalGridThickness}
            onResetMatrix={handleResetMatrix}
            onResetVector={(i) => {
              if (mode === '2D') {
                const v = [...vectors2D]; v[i] = {...INITIAL_VECTORS_2D[i]}; setVectors2D(v);
              } else {
                const v = [...vectors3D]; v[i] = {...INITIAL_VECTORS_3D[i]}; setVectors3D(v);
              }
            }}
            onResetAll={() => { 
              handleResetMatrix(); 
              setVectors2D([...INITIAL_VECTORS_2D]); 
              setVectors3D([...INITIAL_VECTORS_3D]);
              setScalar(1.0);
              setShowEigenvectors(true);
              localStorage.removeItem(STORAGE_KEY);
              window.location.hash = '';
            }}
            onTranspose={handleTranspose}
            onShare={handleShare}
          />
        </aside>

        <div className="flex-[1.5] lg:flex-1 p-4 lg:p-8 flex flex-col gap-8 overflow-y-auto order-1 lg:order-2 bg-slate-950 relative z-10 custom-scrollbar">
          <div className="h-64 sm:h-[400px] lg:flex-1 relative group shrink-0 rounded-2xl overflow-hidden border border-slate-800/50 shadow-2xl">
            
            {/* Overlay Formula (Kernel) */}
            <div 
              className={`absolute top-6 left-6 z-30 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 ${isKernelCollapsed ? 'w-12 h-12 p-0 flex items-center justify-center cursor-pointer hover:bg-slate-800' : 'p-5 max-w-[90%] overflow-x-auto border-indigo-500/20'}`}
              onClick={() => isKernelCollapsed && setIsKernelCollapsed(false)}
            >
               {!isKernelCollapsed ? (
                 <>
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Transformation Kernel
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsKernelCollapsed(true); }}
                      className="text-slate-500 hover:text-white transition-colors ml-4"
                      title="Minimize"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                  </div>
                  <MathFormula formula={transformationMainFormula} className="text-sm md:text-lg text-white font-mono" />
                 </>
               ) : (
                 <button className="text-indigo-400 animate-pulse" title="Expand Kernel">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                 </button>
               )}
            </div>

            {/* Matrix Properties Overlay */}
            <div 
              className={`absolute bottom-6 right-6 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-300 ${isPropertiesCollapsed ? 'w-12 h-12 p-0 flex items-center justify-center cursor-pointer hover:bg-slate-800' : 'p-6 min-w-[240px] pointer-events-auto'}`}
              onClick={() => isPropertiesCollapsed && setIsPropertiesCollapsed(false)}
            >
              {!isPropertiesCollapsed ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Linear Properties</span>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-[9px] text-indigo-400 font-bold border border-indigo-500/20 uppercase">Real-Time</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsPropertiesCollapsed(true); }}
                        className="text-slate-500 hover:text-white transition-colors"
                        title="Minimize"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Det(A)</span>
                        <div className={`text-base font-mono font-black ${Math.abs(matrixStats.det) < 0.01 ? 'text-rose-400' : 'text-indigo-400'}`}>
                          {matrixStats.det.toFixed(3)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Trace(A)</span>
                        <div className="text-base font-mono font-black text-indigo-300">
                          {matrixStats.trace.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-2">Char Polynomial</span>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 overflow-x-auto flex justify-center">
                        <MathFormula formula={matrixStats.charEq} className="text-xs text-white" />
                      </div>
                    </div>

                    {matrixStats.eigenvalues && matrixStats.eigenvalues.length > 0 && (
                      <div className="pt-4 border-t border-slate-800 space-y-3">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block">Eigenvalues (λ)</span>
                        <div className="flex flex-wrap gap-2">
                          {matrixStats.eigenvalues.map((ev, i) => (
                            <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{backgroundColor: ev.color}} />
                               <span className="text-xs font-mono font-bold" style={{color: ev.color}}>{ev.val.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button className="text-slate-400" title="Expand Properties">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              )}
            </div>

            {mode === '2D' ? (
              <VectorCanvas 
                matrix={matrix2D} 
                vectors={vectors2D} 
                setVectors={setVectors2D} 
                scalar={scalar}
                showGrid={showGrid} 
                showOriginalGrid={showOriginalGrid} 
                showEigenvectors={showEigenvectors}
                gridColor={gridColor} 
                originalGridColor={originalGridColor}
                gridThickness={gridThickness}
                originalGridThickness={originalGridThickness}
              />
            ) : (
              <VectorCanvas3D 
                matrix={matrix3D} 
                vectors={vectors3D} 
                setVectors={setVectors3D} 
                scalar={scalar}
                showGrid={showGrid} 
                showOriginalGrid={showOriginalGrid}
                showEigenvectors={showEigenvectors}
                gridColor={gridColor} 
                originalGridColor={originalGridColor}
                gridThickness={gridThickness}
                originalGridThickness={originalGridThickness}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
