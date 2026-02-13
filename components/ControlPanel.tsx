
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

  const calculationDetails = useMemo(() => {
    try {
      if (props.mode === '2D') {
        const [[a, b], [c, d]] = props.matrix2D;
        const targetV = props.vectors2D[2] || props.vectors2D[0] || { x: 0, y: 0, label: 'v' };
        const rx = a * targetV.x + b * targetV.y;
        const ry = c * targetV.x + d * targetV.y;
        
        return {
          main: `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix} \\begin{pmatrix} ${targetV.x} \\\\ ${targetV.y} \\end{pmatrix} = \\begin{pmatrix} ${rx.toFixed(1)} \\\\ ${ry.toFixed(1)} \\end{pmatrix}`,
          steps: [
            `x' = ${a}(${targetV.x}) + ${b}(${targetV.y}) = ${rx.toFixed(2)}`,
            `y' = ${c}(${targetV.x}) + ${d}(${targetV.y}) = ${ry.toFixed(2)}`
          ],
          vectorLabel: targetV.label
        };
      } else {
        const m = props.matrix3D;
        const targetV = props.vectors3D[0] || { x: 0, y: 0, z: 0, label: 'v' };
        const rx = m[0][0]*targetV.x + m[0][1]*targetV.y + m[0][2]*targetV.z;
        const ry = m[1][0]*targetV.x + m[1][1]*targetV.y + m[1][2]*targetV.z;
        const rz = m[2][0]*targetV.x + m[2][1]*targetV.y + m[2][2]*targetV.z;
        return {
          main: `A \\vec{v} = \\vec{w}`,
          steps: [
            `x' = ${rx.toFixed(2)}`,
            `y' = ${ry.toFixed(2)}`,
            `z' = ${rz.toFixed(2)}`
          ],
          vectorLabel: targetV.label
        };
      }
    } catch (e) {
      return { main: '', steps: [], vectorLabel: '?' };
    }
  }, [props.matrix2D, props.matrix3D, props.vectors2D, props.vectors3D, props.mode]);

  return (
    <div className="flex flex-col h-full bg-slate-900/20">
      <div className="flex border-b border-slate-800 bg-slate-900/60 shrink-0">
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

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 scrollbar-hide">
        {activeTab === 'transform' && (
          <>
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Matrix (A)</h3>
                <div className="flex gap-2">
                  <button onClick={props.onTranspose} className="text-[9px] bg-slate-800 p-1.5 rounded hover:bg-slate-700 text-slate-400 font-bold transition-colors">T</button>
                  <button onClick={props.onResetMatrix} className="text-[9px] bg-slate-800 p-1.5 rounded hover:bg-slate-700 text-slate-400 font-bold transition-colors">↺</button>
                </div>
              </div>
              
              <div className="relative p-1">
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

              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-indigo-500/10 pb-3">
                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Interactive Result</span>
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase font-bold">Vector {calculationDetails.vectorLabel}</span>
                </div>
                <div className="flex justify-center py-4 overflow-x-auto scrollbar-hide bg-slate-950/30 rounded-lg">
                  <MathFormula formula={calculationDetails.main} className="text-white text-base scale-110 origin-center" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Vectors Control</h3>
              <div className="space-y-3">
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
            </section>
          </>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6">
            {props.mode === '2D' ? (
              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Composition (A * B)</h3>
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
