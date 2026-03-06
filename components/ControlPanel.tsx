
import React, { useState, useMemo, useEffect } from 'react';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode, ControlTab, SvdStages } from '../types';
import { PRESET_TRANSFORMATIONS_2D, PRESET_TRANSFORMATIONS_3D, ANIMATION_PRESETS_2D, ANIMATION_PRESETS_3D } from '../constants';
import type { AnimationPreset2D, AnimationPreset3D } from '../constants';
import { rotation2D, rotation3D } from '../utils/rotation';
import MathFormula from './MathFormula';
import type { Svd2DResult } from '../utils/svd2d';
import { svdEffectiveMatrix } from '../utils/svd2d';

interface ControlPanelProps {
  mode: DimensionMode;
  isAnimating?: boolean;
  animationSpeed: number;
  setAnimationSpeed: (v: number) => void;
  animationMode: 'repeat' | 'bounce';
  setAnimationMode: (m: 'repeat' | 'bounce') => void;
  activeTab: Exclude<ControlTab, 'operations'>; setActiveTab: (t: Exclude<ControlTab, 'operations'>) => void;
  svdStages: SvdStages; setSvdStages: (s: SvdStages) => void;
  svdResult2D: Svd2DResult | null;
  showSvdEllipse: boolean; setShowSvdEllipse: (b: boolean) => void;
  svdEllipseScale: number; setSvdEllipseScale: (n: number) => void;
  svdEllipseColor: string; setSvdEllipseColor: (c: string) => void;
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
  showEigenvectors: boolean; setShowEigenvectors: (b: boolean) => void;
  gridColor: string; setGridColor: (c: string) => void;
  originalGridColor: string; setOriginalGridColor: (c: string) => void;
  gridThickness: number; setGridThickness: (t: number) => void;
  originalGridThickness: number; setOriginalGridThickness: (t: number) => void;
  onResetMatrix: () => void;
  onResetVector: (index: number) => void;
  onResetAll: () => void;
  onTranspose: () => void;
  onShare: () => void;
  onStartAnimation: (preset: AnimationPreset2D | AnimationPreset3D) => void;
  onStopAnimation: () => void;
  rotationAngleDeg: number;
  setRotationAngleDeg: (v: number) => void;
  rotationAxis3D: 'X' | 'Y' | 'Z';
  setRotationAxis3D: (a: 'X' | 'Y' | 'Z') => void;
}

const DEG2RAD = Math.PI / 180;

/** Format 2x2 matrix for LaTeX */
function matTex(m: [[number, number], [number, number]], prec = 2) {
  const f = (x: number) => x.toFixed(prec);
  return `\\begin{pmatrix} ${f(m[0][0])} & ${f(m[0][1])} \\\\ ${f(m[1][0])} & ${f(m[1][1])} \\end{pmatrix}`;
}

/** Current SVD step formula: shows U, Σ, Vᵀ with numbers and effective matrix */
function SvdFormulaBlock({ svdResult, stages }: { svdResult: Svd2DResult; stages: SvdStages }) {
  const { U, Sigma, V } = svdResult;
  const VT: [[number, number], [number, number]] = [[V[0][0], V[1][0]], [V[0][1], V[1][1]]];
  const effective = useMemo(() => svdEffectiveMatrix(svdResult, stages), [svdResult, stages]);

  const uTex = matTex(U);
  const sigmaTex = matTex(Sigma);
  const vtTex = matTex(VT);
  const aTex = matTex(effective);

  const formula = `U = ${uTex} \\quad \\Sigma = ${sigmaTex} \\quad V^T = ${vtTex} \\quad \\Rightarrow \\quad A = ${aTex}`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Current transform</div>
      <MathFormula formula={formula} className="text-[10px] text-indigo-200 font-mono block overflow-x-hidden" displayMode />
    </div>
  );
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { activeTab, setActiveTab, svdStages, setSvdStages, svdResult2D, showSvdEllipse, setShowSvdEllipse, svdEllipseScale, setSvdEllipseScale, svdEllipseColor, setSvdEllipseColor } = props;
  const [expanded, setExpanded] = useState({ matrix: true, scalar: true, vectors: true, presets: true, animations: true, rotation: true, svd: true });

  useEffect(() => {
    if (props.isAnimating) return;
    if (props.mode === '2D') {
      props.setMatrix2D(rotation2D(props.rotationAngleDeg));
    } else {
      props.setMatrix3D(rotation3D(props.rotationAxis3D, props.rotationAngleDeg));
    }
  }, [props.mode, props.isAnimating, props.rotationAngleDeg, props.rotationAxis3D]);

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

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 space-y-6 custom-scrollbar scrollbar-hide">
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

            {/* Rotation Section */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('rotation')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-emerald-500 transition-transform ${expanded.rotation ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Rotation</h3>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { props.setRotationAngleDeg(0); props.setRotationAxis3D('Z'); }} className="p-2 bg-slate-800 rounded text-[9px] font-bold hover:bg-slate-700 transition-colors" title="Reset Rotation">↺</button>
                </div>
              </div>

              {expanded.rotation && (
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 shadow-inner space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {props.mode === '2D' ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-bold uppercase">Angle (degrees)</span>
                          <span className="text-emerald-400 font-mono font-bold">{props.rotationAngleDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={props.rotationAngleDeg}
                          onChange={(e) => props.setRotationAngleDeg(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 h-1.5 opacity-70 hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Axis</span>
                        <div className="flex gap-2">
                          {(['X', 'Y', 'Z'] as const).map(ax => (
                            <button
                              key={ax}
                              onClick={() => props.setRotationAxis3D(ax)}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${props.rotationAxis3D === ax ? 'bg-emerald-600 text-white border border-emerald-400' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'}`}
                            >
                              {ax}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-bold uppercase">Angle (degrees)</span>
                          <span className="text-emerald-400 font-mono font-bold">{props.rotationAngleDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={props.rotationAngleDeg}
                          onChange={(e) => props.setRotationAngleDeg(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 h-1.5 opacity-70 hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </>
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
                           <div className={`w-2.5 h-2.5 rounded-full`} style={{backgroundColor: v.color}} />
                           <span className={`text-[10px] font-black uppercase ${props.selectedVectorIdx === i ? 'text-indigo-400' : 'text-slate-200'}`}>{v.label}</span>
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

                      <div className="mt-2 pt-3 border-t border-slate-800/50">
                         <MathFormula 
                           formula={getVectorFormula(v)} 
                           className="text-[11px] font-mono scale-90 origin-left" 
                           style={{ color: v.color }} 
                         />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SVD Section (2D only) - before Presets */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('svd')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-indigo-500 transition-transform ${expanded.svd ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">SVD (A = U Σ Vᵀ)</h3>
                </div>
              </div>

              {expanded.svd && (
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 shadow-inner space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {props.mode !== '2D' ? (
                    <p className="text-slate-400 text-sm">SVD is available in <strong className="text-indigo-400">2D</strong> mode.</p>
                  ) : svdResult2D ? (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={showSvdEllipse}
                          onChange={(e) => setShowSvdEllipse(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">Show on canvas</span>
                      </label>
                      <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stages</h4>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSvdStages({ vT: false, sigma: false, u: false })}
                                className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800/50 transition-colors"
                              >
                                Clear all
                              </button>
                              <button
                                type="button"
                                onClick={() => setSvdStages({ vT: true, sigma: true, u: true })}
                                className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                              >
                                All stages
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {[
                              { key: 'vT' as const, label: 'Vᵀ' },
                              { key: 'sigma' as const, label: 'Σ' },
                              { key: 'u' as const, label: 'U' },
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={svdStages[key]}
                                  onChange={(e) => setSvdStages((s) => ({ ...s, [key]: e.target.checked }))}
                                  className="w-4 h-4 accent-indigo-600"
                                />
                                <span className="text-[11px] font-bold text-slate-300">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      <SvdFormulaBlock svdResult={svdResult2D} stages={svdStages} />
                      <div className="pt-4 mt-4 border-t border-slate-800/50 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Color</span>
                          <input
                            type="color"
                            value={svdEllipseColor}
                            onChange={(e) => setSvdEllipseColor(e.target.value)}
                            className="w-8 h-5 bg-transparent border-none cursor-pointer rounded"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Scale</span>
                          <span className="text-[10px] font-mono text-orange-400 font-bold">{svdEllipseScale.toFixed(1)}×</span>
                          <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={svdEllipseScale}
                            onChange={(e) => setSvdEllipseScale(parseFloat(e.target.value))}
                            className="w-16 accent-orange-500 h-1.5 opacity-70 hover:opacity-100"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">No SVD data.</p>
                  )}
                </div>
              )}
            </section>

            {/* Animation Presets Section */}
            <section className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => toggleSection('animations')}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-amber-500 transition-transform ${expanded.animations ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Animation Presets</h3>
                </div>
              </div>

              {expanded.animations && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Mode</span>
                      <div className="flex rounded-lg overflow-hidden border border-slate-700">
                        {(['repeat', 'bounce'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => props.setAnimationMode(m)}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase transition-all ${props.animationMode === m ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Speed</span>
                      <span className="text-amber-400 font-mono font-bold">{props.animationSpeed.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min={0.25}
                      max={2}
                      step={0.05}
                      value={props.animationSpeed}
                      onChange={(e) => props.setAnimationSpeed(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 opacity-80 hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const presets = props.mode === '2D' ? ANIMATION_PRESETS_2D : ANIMATION_PRESETS_3D;
                        if (presets[0]) props.onStartAnimation(presets[0]);
                      }}
                      className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/40 transition-all"
                    >
                      ▶ Play
                    </button>
                    <button
                      onClick={props.onStopAnimation}
                      disabled={!props.isAnimating}
                      className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-600/20"
                    >
                      ⏹ Stop
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(props.mode === '2D' ? ANIMATION_PRESETS_2D : ANIMATION_PRESETS_3D).map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => props.onStartAnimation(preset)}
                        className="text-[8px] leading-tight bg-amber-500/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 px-2 py-2.5 rounded border border-slate-800 hover:border-amber-500/30 transition-all font-bold text-center"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
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
                <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  {Object.keys(props.mode === '2D' ? PRESET_TRANSFORMATIONS_2D : PRESET_TRANSFORMATIONS_3D).map(n => (
                    <button 
                      key={n} 
                      onClick={() => props.mode === '2D' ? props.setMatrix2D(PRESET_TRANSFORMATIONS_2D[n]) : props.setMatrix3D(PRESET_TRANSFORMATIONS_3D[n])}
                      className="text-[8px] leading-tight bg-indigo-500/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 px-1 py-2.5 rounded border border-slate-800 hover:border-indigo-500/30 transition-all font-bold text-center"
                    >
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
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={props.showGrid} onChange={(e) => props.setShowGrid(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 font-black uppercase">Show Transformed Space</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={props.showOriginalGrid} onChange={(e) => props.setShowOriginalGrid(e.target.checked)} className="w-4 h-4 accent-slate-500" />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 font-black uppercase">Show Identity Basis</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={props.showEigenvectors} onChange={(e) => props.setShowEigenvectors(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 font-black uppercase">Show Eigenvectors</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Space Styling</h4>
                <div className="space-y-5">
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Matrix Grid Color</span>
                       <input type="color" value={props.gridColor} onChange={(e) => props.setGridColor(e.target.value)} className="w-8 h-5 bg-transparent border-none cursor-pointer" />
                     </div>
                     <input type="range" min="0.1" max="4" step="0.1" value={props.gridThickness} onChange={(e) => props.setGridThickness(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1" />
                   </div>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Basis Grid Color</span>
                       <input type="color" value={props.originalGridColor} onChange={(e) => props.setOriginalGridColor(e.target.value)} className="w-8 h-5 bg-transparent border-none cursor-pointer" />
                     </div>
                     <input type="range" min="0.1" max="4" step="0.1" value={props.originalGridThickness} onChange={(e) => props.setOriginalGridThickness(parseFloat(e.target.value))} className="w-full accent-slate-500 h-1" />
                   </div>
                </div>
              </div>

              <button onClick={props.onResetAll} className="text-rose-500/80 hover:text-rose-400 text-[10px] font-black uppercase transition-colors text-right">Reset Lab</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar-h::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar-h::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none !important; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none !important; }
      `}</style>
    </div>
  );
};

export default ControlPanel;
