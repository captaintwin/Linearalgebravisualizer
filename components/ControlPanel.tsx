
import React, { useState, useMemo } from 'react';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode, ControlTab } from '../types';
import { PRESET_TRANSFORMATIONS_2D, PRESET_TRANSFORMATIONS_3D } from '../constants';
import MathFormula from './MathFormula';

interface ControlPanelProps {
  mode: DimensionMode;
  matrix2D: Matrix2x2; setMatrix2D: (m: Matrix2x2) => void;
  matrixB2D: Matrix2x2; setMatrixB2D: (m: Matrix2x2) => void;
  matrix3D: Matrix3x3; setMatrix3D: (m: Matrix3x3) => void;
  vectors2D: Vector2D[]; setVectors2D: (v: Vector2D[]) => void;
  vectors3D: Vector3D[]; setVectors3D: (v: Vector3D[]) => void;
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
      const newVectors = [...props.vectors2D];
      newVectors[index] = { ...newVectors[index], [field]: num } as Vector2D;
      props.setVectors2D(newVectors);
    } else {
      const newVectors = [...props.vectors3D];
      newVectors[index] = { ...newVectors[index], [field]: num } as Vector3D;
      props.setVectors3D(newVectors);
    }
  };

  const calculationDetails = useMemo(() => {
    if (props.mode === '2D') {
      const [[a, b], [c, d]] = props.matrix2D;
      const v = props.vectors2D[2] || props.vectors2D[0];
      const rx = a * v.x + b * v.y;
      const ry = c * v.x + d * v.y;
      
      return {
        main: `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix} \\begin{pmatrix} ${v.x} \\\\ ${v.y} \\end{pmatrix} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\end{pmatrix}`,
        steps: [
          `x' = ${a}(${v.x}) + ${b}(${v.y}) = ${rx.toFixed(2)}`,
          `y' = ${c}(${v.x}) + ${d}(${v.y}) = ${ry.toFixed(2)}`
        ],
        vectorLabel: v.label
      };
    } else {
      const m = props.matrix3D;
      const v = props.vectors3D[0];
      const rx = m[0][0]*v.x + m[0][1]*v.y + m[0][2]*v.z;
      const ry = m[1][0]*v.x + m[1][1]*v.y + m[1][2]*v.z;
      const rz = m[2][0]*v.x + m[2][1]*v.y + m[2][2]*v.z;
      return {
        main: `A \\vec{v} = \\vec{w}`,
        steps: [
          `x' = ${rx.toFixed(2)}`,
          `y' = ${ry.toFixed(2)}`,
          `z' = ${rz.toFixed(2)}`
        ],
        vectorLabel: v.label
      };
    }
  }, [props.matrix2D, props.matrix3D, props.vectors2D, props.vectors3D, props.mode]);

  return (
    <div className="flex flex-col h-full bg-slate-900/20">
      <div className="flex border-b border-slate-800 bg-slate-900/60">
        {(['transform', 'operations', 'settings'] as ControlTab[]).map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === t ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8">
        {activeTab === 'transform' && (
          <>
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Matrix (A)</h3>
                <div className="flex gap-2">
                  <button onClick={props.onTranspose} className="text-[9px] bg-slate-800 p-1.5 rounded hover:bg-slate-700 text-slate-400 font-bold">Transpose</button>
                  <button onClick={props.onResetMatrix} className="text-[9px] bg-slate-800 p-1.5 rounded hover:bg-slate-700 text-slate-400 font-bold">Reset</button>
                </div>
              </div>
              
              <div className="relative group p-1">
                <div className="absolute -left-1 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-indigo-500/30 rounded-l"></div>
                <div className="absolute -right-1 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-indigo-500/30 rounded-r"></div>
                
                <div className={`grid ${props.mode === '2D' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 bg-slate-950/40 p-2 rounded`}>
                  {(props.mode === '2D' ? [0, 1] : [0, 1, 2]).map(r => 
                    (props.mode === '2D' ? [0, 1] : [0, 1, 2]).map(c => (
                      <input key={`${r}-${c}`} type="number" step="0.1" value={props.mode === '2D' ? props.matrix2D[r][c] : props.matrix3D[r][c]}
                        onChange={(e) => handleMatrixChange(r, c, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded py-1.5 text-center text-indigo-400 font-mono text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      />
                    ))
                  )}
                </div>
              </div>

              {/* SECTION FOR FORMULAS UNDER THE MATRIX */}
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest border-b border-indigo-500/10 pb-2">
                  Calculation Breakdown: Vector {calculationDetails.vectorLabel}
                </div>
                
                <div className="flex justify-center py-2 overflow-x-auto scrollbar-hide">
                  <MathFormula formula={calculationDetails.main} className="text-white text-sm" />
                </div>

                <div className="space-y-1.5">
                  {calculationDetails.steps.map((step, idx) => (
                    <div key={idx} className="bg-slate-950/40 px-3 py-2 rounded border border-white/5 flex items-center justify-between">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Coord {idx === 0 ? 'X' : idx === 1 ? 'Y' : 'Z'}</span>
                      <MathFormula formula={step} className="text-[11px] text-slate-300 font-mono" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Active Vectors</h3>
              <div className="space-y-3">
                {(props.mode === '2D' ? props.vectors2D : props.vectors3D).map((v, i) => (
                  <div key={v.label} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 group/vec">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full" style={{backgroundColor: v.color}} />
                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Vector {v.label}</span>
                      </div>
                      <button 
                        onClick={() => props.onResetVector(i)}
                        className="text-[8px] opacity-0 group-hover/vec:opacity-100 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-700 transition-all uppercase font-bold"
                      >
                        Reset
                      </button>
                    </div>
                    <div className={`grid ${props.mode === '2D' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                      {['x', 'y', ...(props.mode === '3D' ? ['z'] : [])].map(axis => (
                        <div key={axis} className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-600 font-bold uppercase">{axis}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={(v as any)[axis]}
                            onChange={(e) => handleVectorChange(i, axis, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-indigo-500/50 font-mono text-slate-300 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Presets & Bases</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(props.mode === '2D' ? PRESET_TRANSFORMATIONS_2D : PRESET_TRANSFORMATIONS_3D).map(n => (
                  <button key={n} onClick={() => props.mode === '2D' ? props.setMatrix2D(PRESET_TRANSFORMATIONS_2D[n]) : props.setMatrix3D(PRESET_TRANSFORMATIONS_3D[n])}
                    className="text-[9px] bg-slate-800/50 hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-300 px-2 py-1.5 rounded border border-slate-800 transition-all font-bold">
                    {n}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6">
            {props.mode === '2D' && (
              <section className="animate-in fade-in duration-300">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Matrix B (Multiplicand)</h3>
                <div className="relative mb-4">
                  <div className="absolute -left-2 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-700 rounded-l"></div>
                  <div className="absolute -right-2 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-700 rounded-r"></div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    {[0, 1].map(r => [0, 1].map(c => (
                      <input key={`b-${r}-${c}`} type="number" step="0.1" value={props.matrixB2D[r][c]}
                        onChange={(e) => handleMatrixChange(r, c, e.target.value, true)}
                        className="bg-slate-950 border border-slate-700 rounded py-2 text-center text-orange-400 font-mono text-xs outline-none"
                      />
                    )))}
                  </div>
                </div>
                <button onClick={props.onMultiply} className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/30 transition-all">
                  Execute: <MathFormula formula="A = A \times B" />
                </button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <button
              onClick={props.onShare}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              Share Current Scene
            </button>
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={props.showGrid}
                  onChange={(e) => props.setShowGrid(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 transition-all"
                />
                <span className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Show Grid</span>
              </label>
              <button onClick={props.onResetAll} className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest transition-colors">
                Full Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
