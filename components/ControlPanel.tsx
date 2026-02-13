
import React, { useState, useMemo } from 'react';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode, ControlTab } from '../types';
import { PRESET_TRANSFORMATIONS_2D, PRESET_TRANSFORMATIONS_3D } from '../constants';
import MathFormula from './MathFormula';

interface ControlPanelProps {
  mode: DimensionMode;
  matrix2D: Matrix2x2; setMatrix2D: (m: Matrix2x2) => void;
  matrixB2D: Matrix2x2; setMatrixB2D: (m: Matrix2x2) => void;
  matrix3D: Matrix3x3; setMatrix3D: (m: Matrix3x3) => void;
  vectors2D: Vector2D[]; setVectors2D: React.Dispatch<React.SetStateAction<Vector2D[]>>;
  vectors3D: Vector3D[]; setVectors3D: React.Dispatch<React.SetStateAction<Vector3D[]>>;
  showGrid: boolean; setShowGrid: (b: boolean) => void;
  onResetMatrix: () => void;
  onResetVector: (index: number) => void;
  onResetAll: () => void;
  onTranspose: () => void;
  onMultiply: () => void;
  onShare: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<ControlTab>('transform');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    matrix: true,
    transformations: true,
    vectors: true,
    presets: false,
    concepts: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const matrixStats = useMemo(() => {
    if (props.mode === '2D') {
      const [[a, b], [c, d]] = props.matrix2D;
      const det = a * d - b * c;
      const trace = a + d;
      const discriminant = Math.pow(trace, 2) - 4 * det;
      
      let eigenvalues: string[] = [];
      if (discriminant >= 0) {
        const l1 = (trace + Math.sqrt(discriminant)) / 2;
        const l2 = (trace - Math.sqrt(discriminant)) / 2;
        eigenvalues = [l1.toFixed(2), l2.toFixed(2)];
      } else {
        const real = (trace / 2).toFixed(2);
        const imag = (Math.sqrt(-discriminant) / 2).toFixed(2);
        eigenvalues = [`${real} + ${imag}i`, `${real} - ${imag}i`];
      }

      return { det, trace, discriminant, eigenvalues };
    }
    return null;
  }, [props.matrix2D, props.mode]);

  const vectorCalculations = useMemo(() => {
    try {
      if (props.mode === '2D') {
        const [[a, b], [c, d]] = props.matrix2D;
        return props.vectors2D.map(v => {
          const rx = a * v.x + b * v.y;
          const ry = c * v.x + d * v.y;
          return {
            label: v.label,
            color: v.color,
            formula: `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix} \\begin{pmatrix} ${v.x} \\\\ ${v.y} \\end{pmatrix} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\end{pmatrix}`
          };
        });
      } else {
        const m = props.matrix3D;
        return props.vectors3D.map(v => {
          const rx = m[0][0]*v.x + m[0][1]*v.y + m[0][2]*v.z;
          const ry = m[1][0]*v.x + m[1][1]*v.y + m[1][2]*v.z;
          const rz = m[2][0]*v.x + m[2][1]*v.y + m[2][2]*v.z;
          return {
            label: v.label,
            color: v.color,
            formula: `A \\vec{${v.label.replace('̂', '')}} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\\\ ${rz.toFixed(1)} \\end{pmatrix}`
          };
        });
      }
    } catch (e) {
      return [];
    }
  }, [props.matrix2D, props.matrix3D, props.vectors2D, props.vectors3D, props.mode]);

  const vectorMetrics = useMemo(() => {
    const currentVectors = props.mode === '2D' ? props.vectors2D : props.vectors3D;
    return currentVectors.map(v => {
      const norm = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2) + (('z' in v) ? Math.pow((v as any).z, 2) : 0));
      return { label: v.label, norm: norm.toFixed(2), color: v.color };
    });
  }, [props.vectors2D, props.vectors3D, props.mode]);

  const handleMatrixChange = (row: number, col: number, val: string, isB = false) => {
    const num = parseFloat(val) || 0;
    if (props.mode === '2D') {
      const target = isB ? props.matrixB2D : props.matrix2D;
      const newM = [...target.map(r => [...r])] as Matrix2x2;
      newM[row][col] = num;
      isB ? props.setMatrixB2D(newM) : props.setMatrix2D(newM);
    } else {
      const newM = [...props.matrix3D.map(r => [...r])] as Matrix3x3;
      newM[row][col] = num;
      props.setMatrix3D(newM);
    }
  };

  const handleVectorChange = (index: number, field: string, val: string) => {
    const num = parseFloat(val) || 0;
    if (props.mode === '2D') {
      props.setVectors2D(prev => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: num };
        return next;
      });
    } else {
      props.setVectors3D(prev => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: num };
        return next;
      });
    }
  };

  const SectionHeader = ({ id, title, actions }: { id: string, title: string, actions?: React.ReactNode }) => (
    <div className="flex justify-between items-center mb-2 group/header">
      <button 
        onClick={() => toggleSection(id)}
        className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors"
      >
        <svg 
          className={`w-3 h-3 transition-transform duration-300 ${expandedSections[id] ? 'rotate-90' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="9 5l7 7-7 7" />
        </svg>
        {title}
      </button>
      <div className="flex gap-2">
        {actions}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-900/20">
      <div className="flex border-b border-slate-800 bg-slate-900/60 shrink-0">
        {(['transform', 'concepts', 'operations', 'settings'] as ControlTab[]).map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === t ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 scrollbar-hide">
        {activeTab === 'transform' && (
          <>
            <section className="space-y-4">
              <SectionHeader 
                id="matrix" 
                title="Active Matrix (A)" 
                actions={
                  <>
                    <button onClick={props.onTranspose} title="Transpose" className="text-[9px] bg-slate-800 p-1.5 rounded hover:bg-slate-700 text-slate-400 font-bold transition-colors">T</button>
                    <button onClick={props.onResetMatrix} title="Reset" className="text-[9px] bg-slate-800 p-1.5 rounded hover:bg-slate-700 text-slate-400 font-bold transition-colors">↺</button>
                  </>
                }
              />
              <div className={`transition-all duration-300 overflow-hidden ${expandedSections.matrix ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="relative p-1 mt-2">
                  <div className="absolute -left-1 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-indigo-500/40 rounded-l"></div>
                  <div className="absolute -right-1 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-indigo-500/40 rounded-r"></div>
                  <div className={`grid ${props.mode === '2D' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 bg-slate-950/40 p-3 rounded-md`}>
                    {(props.mode === '2D' ? [0, 1] : [0, 1, 2]).map(r => 
                      (props.mode === '2D' ? [0, 1] : [0, 1, 2]).map(c => (
                        <input key={`${r}-${c}`} type="number" step="0.1" value={props.mode === '2D' ? props.matrix2D[r][c] : props.matrix3D[r][c]}
                          onChange={(e) => handleMatrixChange(r, c, e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded py-2 text-center text-indigo-400 font-mono text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-indigo-950/30 outline-none transition-all"
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader id="transformations" title="Vector Transformations" />
              <div className={`transition-all duration-500 overflow-hidden ${expandedSections.transformations ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-3 mt-2">
                  {vectorCalculations.map((calc, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-4 shadow-lg overflow-hidden transition-all hover:bg-slate-900/80">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: calc.color }} />
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Vector {calc.label}</span>
                      </div>
                      <div className="flex justify-center overflow-x-auto scrollbar-hide py-1">
                        <MathFormula formula={calc.formula} className="text-white text-xs scale-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader id="vectors" title="Input Vectors" />
              <div className={`transition-all duration-500 overflow-hidden ${expandedSections.vectors ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-3 mt-2">
                  {(props.mode === '2D' ? props.vectors2D : props.vectors3D).map((vec, i) => (
                    <div key={`${vec.label}-${i}`} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 group/vec">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: vec.color}} />
                          <span className="text-[10px] font-black uppercase text-slate-300">Vector {vec.label}</span>
                        </div>
                        <button onClick={() => props.onResetVector(i)} className="text-[8px] opacity-0 group-hover/vec:opacity-100 text-slate-500 hover:text-white uppercase font-bold transition-all">Reset</button>
                      </div>
                      <div className={`grid ${props.mode === '2D' ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                        {['x', 'y', ...(props.mode === '3D' ? ['z'] : [])].map(axis => (
                          <div key={axis} className="flex flex-col gap-1">
                            <span className="text-[8px] text-slate-600 font-bold uppercase ml-1">{axis}</span>
                            <input type="number" step="0.1" value={(vec as any)[axis]}
                              onChange={(e) => handleVectorChange(i, axis, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-indigo-500/50 font-mono text-slate-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader id="presets" title="Preset Library" />
              <div className={`transition-all duration-300 overflow-hidden ${expandedSections.presets ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(props.mode === '2D' ? PRESET_TRANSFORMATIONS_2D : PRESET_TRANSFORMATIONS_3D).map(([name, m]) => (
                    <button
                      key={name}
                      onClick={() => props.mode === '2D' ? props.setMatrix2D(m as Matrix2x2) : props.setMatrix3D(m as Matrix3x3)}
                      className="text-[9px] py-2 px-1 bg-slate-800 hover:bg-indigo-600 rounded text-slate-400 hover:text-white font-bold transition-all truncate"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'concepts' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <SectionHeader id="concepts" title="Mathematical Properties" />
              <div className={`transition-all duration-300 overflow-hidden ${expandedSections.concepts ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 mt-2">
                  {matrixStats && (
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Characteristic Equation</div>
                        <MathFormula formula={`\\lambda^2 - ${matrixStats.trace.toFixed(2)}\\lambda + ${matrixStats.det.toFixed(2)} = 0`} className="text-xs text-indigo-300" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Discriminant (D)</div>
                          <div className="text-sm font-mono text-white">{matrixStats.discriminant.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Eigenvalues (\lambda)</div>
                          <div className="text-xs font-mono text-emerald-400 flex flex-col">
                            {matrixStats.eigenvalues.map((v, i) => <span key={i}>\lambda_{i+1} = {v}</span>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase font-black mb-3 tracking-widest">Vector Norms (L2)</div>
                    <div className="space-y-2">
                      {vectorMetrics.map((m, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-800/50">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                            <span className="text-[10px] text-slate-300 font-bold uppercase">{m.label}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">||v|| = {m.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6">
            {props.mode === '2D' ? (
              <section>
                <SectionHeader id="composition" title="Composition (A * B)" />
                <div className={`transition-all duration-300 overflow-hidden ${expandedSections.composition ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="mt-2">
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800 mb-4">
                      {[0, 1].map(r => [0, 1].map(c => (
                        <input key={`b-${r}-${c}`} type="number" step="0.1" value={props.matrixB2D[r][c]}
                          onChange={(e) => handleMatrixChange(r, c, e.target.value, true)}
                          className="bg-slate-950 border border-slate-700 rounded py-2 text-center text-emerald-400 font-mono text-xs outline-none"
                        />
                      )))}
                    </div>
                    <button onClick={props.onMultiply} className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/30 transition-all">
                      Compose Transformations
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <div className="text-[10px] text-slate-500 text-center py-10 uppercase font-black tracking-widest opacity-30 italic">3D matrix multiplication is disabled in this preview</div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <button onClick={props.onShare} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase rounded-lg border border-slate-700 transition-all">
              Copy Lab Link
            </button>
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={props.showGrid} onChange={(e) => props.setShowGrid(e.target.checked)} className="w-5 h-5 rounded bg-slate-950 accent-indigo-500" />
                <span className="text-[11px] text-slate-500 font-black uppercase">Show Grid</span>
              </label>
              <button onClick={props.onResetAll} className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase">Clear All</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
