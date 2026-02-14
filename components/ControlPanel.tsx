
import React, { useState, useMemo } from 'react';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode, ControlTab } from '../types';
import { PRESET_TRANSFORMATIONS_2D, PRESET_TRANSFORMATIONS_3D } from '../constants';
import MathFormula from './MathFormula';

interface ControlPanelProps {
  mode: DimensionMode;
  matrix2D: Matrix2x2; setMatrix2D: (m: Matrix2x2) => void;
  matrix3D: Matrix3x3; setMatrix3D: (m: Matrix3x3) => void;
  vectors2D: Vector2D[]; setVectors2D: (vecs: Vector2D[]) => void;
  vectors3D: Vector3D[]; setVectors3D: (vecs: Vector3D[]) => void;
  selectedVectorIdx: number;
  setSelectedVectorIdx: (idx: number) => void;
  scalar: number;
  setScalar: (s: number) => void;
  showGrid: boolean; setShowGrid: (b: boolean) => void;
  showOriginalGrid: boolean; setShowOriginalGrid: (b: boolean) => void;
  gridColor: string; setGridColor: (c: string) => void;
  originalGridColor: string; setOriginalGridColor: (c: string) => void;
  gridThickness: number; setGridThickness: (t: number) => void;
  originalGridThickness: number; setOriginalGridThickness: (t: number) => void;
  onResetMatrix: () => void;
  onResetVector: (index: number) => void;
  onResetAll: () => void;
  onTranspose: () => void;
  onShare: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<Exclude<ControlTab, 'operations'>>('transform');
  const [expanded, setExpanded] = useState({ matrix: true, scalar: true, vectors: true, presets: true });

  const toggleSection = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleMatrixChange = (row: number, col: number, val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    if (props.mode === '2D') {
      const newM = [...props.matrix2D.map(r => [...r])] as Matrix2x2;
      newM[row][col] = num;
      props.setMatrix2D(newM);
    } else {
      const newM = [...props.matrix3D.map(r => [...r])] as Matrix3x3;
      newM[row][col] = num;
      props.setMatrix3D(newM);
    }
  };

  const handleVectorChange = (index: number, field: string, val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    if (props.mode === '2D') {
      const newVectors = [...props.vectors2D];
      newVectors[index] = { ...newVectors[index], [field]: num } as Vector2D;
      props.setVectors2D(newVectors);
    } else {
      const newVectors = [...props.vectors3D];
      newVectors[index] = { ...newVectors[index], [field]: num } as Vector3D;
      props.setVectors3D(newVectors);
    }
  };

  const activeVectors = props.mode === '2D' ? props.vectors2D : props.vectors3D;

  const getVectorFormula = (v: Vector2D | Vector3D) => {
    if (props.mode === '2D') {
      const [[a, b], [c, d]] = props.matrix2D;
      const vx = (v as Vector2D).x;
      const vy = (v as Vector2D).y;
      const wx = (a * vx + b * vy) * props.scalar;
      const wy = (c * vx + d * vy) * props.scalar;
      return `${props.scalar.toFixed(1)} \\cdot A \\vec{v} = \\begin{pmatrix} ${wx.toFixed(1)} \\\\ ${wy.toFixed(1)} \\end{pmatrix}`;
    } else {
      const m = props.matrix3D;
      const v3 = v as Vector3D;
      const wx = (m[0][0] * v3.x + m[0][1] * v3.y + m[0][2] * v3.z) * props.scalar;
      const wy = (m[1][0] * v3.x + m[1][1] * v3.y + m[1][2] * v3.z) * props.scalar;
      const wz = (m[2][0] * v3.x + m[2][1] * v3.y + m[2][2] * v3.z) * props.scalar;
      return `${props.scalar.toFixed(1)} \\cdot A \\vec{v} = \\begin{pmatrix} ${wx.toFixed(1)} \\\\ ${wy.toFixed(1)} \\\\ ${wz.toFixed(1)} \\end{pmatrix}`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/20">
      <div className="flex border-b border-slate-800 bg-slate-900/60 shrink-0">
        {(['transform', 'settings'] as const).map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === t ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar">
        {activeTab === 'transform' && (
          <>
            {/* Matrix Section */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('matrix')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-indigo-500 transition-transform ${expanded.matrix ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Active Matrix (A)</h3>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={props.onTranspose} className="p-2 bg-slate-800 rounded text-[9px] font-bold hover:bg-slate-700 transition-colors" title="Transpose">T</button>
                  <button onClick={props.onResetMatrix} className="p-2 bg-slate-800 rounded text-[9px] font-bold hover:bg-slate-700 transition-colors" title="Reset Matrix">↺</button>
                </div>
              </div>
              
              {expanded.matrix && (
                <div className={`grid ${props.mode === '2D' ? 'grid-cols-2' : 'grid-cols-3'} gap-6 bg-slate-950/50 p-6 rounded-2xl border border-slate-800 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300`}>
                  {(props.mode === '2D' ? [0, 1] : [0, 1, 2]).map(r => 
                    (props.mode === '2D' ? [0, 1] : [0, 1, 2]).map(c => {
                      const val = props.mode === '2D' ? props.matrix2D[r][c] : props.matrix3D[r][c];
                      return (
                        <div key={`${r}-${c}`} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                            <span>[{r},{c}]</span>
                            <span className="text-indigo-400 font-bold">{val.toFixed(1)}</span>
                          </div>
                          <input 
                            type="range" 
                            min="-4" max="4" step="0.1" 
                            value={val}
                            onChange={(e) => handleMatrixChange(r, c, parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1.5 opacity-70 hover:opacity-100 transition-opacity"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>

            {/* Scalar Section */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('scalar')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-amber-500 transition-transform ${expanded.scalar ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Scalar Multiplier ($k$)</h3>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => props.setScalar(1.0)} className="p-2 bg-slate-800 rounded text-[9px] font-bold hover:bg-slate-700 transition-colors" title="Reset Scalar">↺</button>
                </div>
              </div>

              {expanded.scalar && (
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 shadow-inner space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-500">$k = $</span>
                    <span className="text-amber-400 font-bold">{props.scalar.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-4" max="4" step="0.1" 
                    value={props.scalar}
                    onChange={(e) => props.setScalar(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 opacity-70 hover:opacity-100 transition-opacity"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 font-bold">
                    <span>Negative</span><span>Neutral (1.0)</span><span>Positive</span>
                  </div>
                </div>
              )}
            </section>

            {/* Vectors Section */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('vectors')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-indigo-500 transition-transform ${expanded.vectors ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Vectors & Transformations</h3>
                </div>
              </div>
              
              {expanded.vectors && (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory custom-scrollbar-h animate-in fade-in slide-in-from-top-2 duration-300">
                  {activeVectors.map((v, i) => (
                    <div 
                      key={`${v.label}-${i}`} 
                      onClick={() => props.setSelectedVectorIdx(i)}
                      className={`min-w-[240px] p-4 rounded-xl border cursor-pointer group snap-center shadow-lg flex flex-col gap-4 transition-all ${props.selectedVectorIdx === i ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] shadow-current transition-transform ${props.selectedVectorIdx === i ? 'scale-125' : ''}`} style={{backgroundColor: v.color, color: v.color}} />
                           <span className={`text-[10px] font-black uppercase ${props.selectedVectorIdx === i ? 'text-indigo-400' : 'text-slate-200'}`}>{v.label}</span>
                           {props.selectedVectorIdx === i && <span className="text-[8px] bg-indigo-500 text-white px-1 rounded font-black uppercase">Main</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); props.onResetVector(i); }} className="text-[9px] text-slate-500 hover:text-rose-400 transition-colors">↺</button>
                      </div>

                      <div className="space-y-4" onClick={e => e.stopPropagation()}>
                        {['x', 'y', ...(props.mode === '3D' ? ['z'] : [])].map(axis => {
                          const axisVal = (v as any)[axis];
                          return (
                            <div key={axis} className="space-y-1.5">
                              <div className="flex justify-between px-1">
                                <span className="text-[8px] text-slate-600 font-black uppercase">{axis}</span>
                                <span className="text-[10px] font-mono text-indigo-300">{axisVal.toFixed(1)}</span>
                              </div>
                              <input
                                type="range"
                                min="-6" max="6" step="0.1"
                                value={axisVal}
                                onChange={(e) => handleVectorChange(i, axis, parseFloat(e.target.value))}
                                className="w-full accent-indigo-400 h-1"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-3 border-t border-slate-800/50 flex flex-col gap-2">
                         <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Transformation Result</span>
                         <div className="bg-slate-950/40 p-2 rounded border border-slate-800 overflow-x-auto scrollbar-hide">
                           <MathFormula 
                             formula={getVectorFormula(v)} 
                             className="text-[11px] font-mono scale-90 origin-left" 
                             style={{ color: v.color }} 
                           />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Presets Section */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('presets')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-indigo-500 transition-transform ${expanded.presets ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Transformation Presets</h3>
                </div>
              </div>

              {expanded.presets && (
                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar-h animate-in fade-in slide-in-from-top-2 duration-300">
                  {Object.keys(props.mode === '2D' ? PRESET_TRANSFORMATIONS_2D : PRESET_TRANSFORMATIONS_3D).map(n => (
                    <button key={n} onClick={() => props.mode === '2D' ? props.setMatrix2D(PRESET_TRANSFORMATIONS_2D[n]) : props.setMatrix3D(PRESET_TRANSFORMATIONS_3D[n])}
                      className="text-[9px] bg-indigo-500/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 px-4 py-2 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition-all font-bold shrink-0 whitespace-nowrap">
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <button onClick={props.onShare} className="w-full py-4 bg-slate-800/50 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase rounded-xl border border-slate-700 transition-all">
              Copy Workspace Link
            </button>
            <div className="flex flex-col gap-6 pt-6 border-t border-slate-800">
              
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visibility</h4>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={props.showGrid} onChange={(e) => props.setShowGrid(e.target.checked)} className="w-5 h-5 rounded-md bg-slate-950 border-slate-800 accent-indigo-600 focus:ring-0" />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 font-black uppercase transition-colors">Show Transformed Space</span>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={props.showOriginalGrid} onChange={(e) => props.setShowOriginalGrid(e.target.checked)} className="w-5 h-5 rounded-md bg-slate-950 border-slate-800 accent-slate-500 focus:ring-0" />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 font-black uppercase transition-colors">Show Identity Basis</span>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Space Styling</h4>
                <div className="flex flex-col gap-5">
                   {/* Transformed Grid Styling */}
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-[11px] text-slate-400 font-bold uppercase">Transformed Grid (Matrix)</span>
                       <input 
                         type="color" 
                         value={props.gridColor} 
                         onChange={(e) => props.setGridColor(e.target.value)} 
                         className="w-10 h-6 bg-transparent border-none cursor-pointer"
                       />
                     </div>
                     <input 
                       type="range" min="0.1" max="4" step="0.1" 
                       value={props.gridThickness} 
                       onChange={(e) => props.setGridThickness(parseFloat(e.target.value))}
                       className="w-full accent-indigo-500 h-1.5"
                     />
                     <div className="flex justify-between text-[8px] text-slate-600 font-bold">
                       <span>Fine</span><span>Thick ({props.gridThickness.toFixed(1)}px)</span>
                     </div>
                   </div>

                   {/* Original Grid Styling */}
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-[11px] text-slate-400 font-bold uppercase">Identity Basis Grid</span>
                       <input 
                         type="color" 
                         value={props.originalGridColor} 
                         onChange={(e) => props.setOriginalGridColor(e.target.value)} 
                         className="w-10 h-6 bg-transparent border-none cursor-pointer"
                       />
                     </div>
                     <input 
                       type="range" min="0.1" max="4" step="0.1" 
                       value={props.originalGridThickness} 
                       onChange={(e) => props.setOriginalGridThickness(parseFloat(e.target.value))}
                       className="w-full accent-slate-500 h-1.5"
                     />
                     <div className="flex justify-between text-[8px] text-slate-600 font-bold">
                       <span>Fine</span><span>Thick ({props.originalGridThickness.toFixed(1)}px)</span>
                     </div>
                   </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={props.onResetAll} className="text-rose-500/80 hover:text-rose-400 text-[10px] font-black uppercase transition-colors">Reset Lab</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        
        .custom-scrollbar-h::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar-h::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.2); }
        .custom-scrollbar-h::-webkit-scrollbar { height: 4px; background: rgba(30, 41, 59, 0.2); border-radius: 10px; }
        .custom-scrollbar-h::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ControlPanel;
