
// App.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import VectorCanvas from './components/VectorCanvas';
import VectorCanvas3D from './components/VectorCanvas3D';
import ControlPanel from './components/ControlPanel';
import MathFormula from './components/MathFormula';
import { 
  INITIAL_MATRIX_2D, INITIAL_VECTORS_2D, 
  INITIAL_MATRIX_3D, INITIAL_VECTORS_3D,
  ANIMATION_PRESETS_2D, ANIMATION_PRESETS_3D
} from './constants';
import type { AnimationPreset2D, AnimationPreset3D } from './constants';
import { lerpMatrix2D, lerpMatrix3D } from './utils/animateMatrix';
import { rotation2D, rotation3D, angleFromRotation2D, angleFromRotation3D } from './utils/rotation';
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D, DimensionMode, ControlTab, SvdStages } from './types';
import { svd2d, svdEffectiveMatrix } from './utils/svd2d';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const STORAGE_KEY = 'linear_lab_stable_v1';
const GIF_FRAME_DELAY_MS_2D = 250;
const GIF_MAX_WIDTH = 480;
const WEBM_FPS = 10;
const WEBM_BITRATE = 2_500_000;

const App: React.FC = () => {
  const [mode, setMode] = useState<DimensionMode>('2D');
  const [matrix2D, setMatrix2D] = useState<Matrix2x2>(INITIAL_MATRIX_2D);
  const [vectors2D, setVectors2D] = useState<Vector2D[]>(INITIAL_VECTORS_2D);
  const [matrix3D, setMatrix3D] = useState<Matrix3x3>(INITIAL_MATRIX_3D);
  const [vectors3D, setVectors3D] = useState<Vector3D[]>(INITIAL_VECTORS_3D);
  const [selectedVectorIdx, setSelectedVectorIdx] = useState<number>(0);
  const [scalar, setScalar] = useState<number>(1.0);

  // Tabs (transform | svd | settings) and SVD stage toggles
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | null>(null); // which button is "playing" (stop on same button)
  const [animationSpeed, setAnimationSpeed] = useState(1.0); // 0.1x .. 1x
  const animationSpeedRef = useRef(animationSpeed);
  animationSpeedRef.current = animationSpeed;
  const [animationMode, setAnimationMode] = useState<'repeat' | 'bounce'>('repeat');
  const animationModeRef = useRef(animationMode);
  animationModeRef.current = animationMode;
  const [activeTab, setActiveTab] = useState<Exclude<ControlTab, 'operations'>>('transform');
  const [svdStages, setSvdStages] = useState<SvdStages>({ vT: true, sigma: true, u: true });
  const [showSvdEllipse, setShowSvdEllipse] = useState<boolean>(false);
  const [svdEllipseScale, setSvdEllipseScale] = useState<number>(2.5);
  const [svdEllipseColor, setSvdEllipseColor] = useState<string>('#f97316');
  const [rotationAngleDeg, setRotationAngleDeg] = useState(0);
  const [rotationAxis3D, setRotationAxis3D] = useState<'X' | 'Y' | 'Z'>('Z');
  const [isRecording, setIsRecording] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const lastPresetRef = useRef<AnimationPreset2D | AnimationPreset3D | null>(null);
  const gifEncoderRef = useRef<ReturnType<typeof GIFEncoder> | null>(null);
  const recordingActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<{
    startTime: number;
    startMatrix2D: Matrix2x2;
    startMatrix3D: Matrix3x3;
    preset2D?: AnimationPreset2D;
    preset3D?: AnimationPreset3D;
    mode: DimensionMode;
    animationMode: 'repeat' | 'bounce';
    direction: 'forward' | 'backward';
  } | null>(null);

  const resetToDefaults = useCallback(() => {
    animationRef.current = null;
    setIsAnimating(false);
    setAnimationDirection(null);
    setMatrix2D(INITIAL_MATRIX_2D.map(r => [...r]) as Matrix2x2);
    setMatrix3D(INITIAL_MATRIX_3D.map(r => [...r]) as Matrix3x3);
    setVectors2D(INITIAL_VECTORS_2D.map(v => ({ ...v })));
    setVectors3D(INITIAL_VECTORS_3D.map(v => ({ ...v })));
    setScalar(1.0);
    setRotationAngleDeg(0);
    setRotationAxis3D('Z');
  }, []);

  const setAnimationModeWithRef = useCallback((m: 'repeat' | 'bounce') => {
    animationModeRef.current = m;
    setAnimationMode(m);
    if (m !== animationMode) resetToDefaults(); // on mode switch: stop animation, reset to defaults
  }, [animationMode, resetToDefaults]);

  const startAnimation = useCallback((preset: AnimationPreset2D | AnimationPreset3D, direction: 'forward' | 'backward' = 'forward') => {
    resetToDefaults(); // reset matrix, vectors, scalar, rotation; then start from defaults
    lastPresetRef.current = preset;
    setIsAnimating(true);
    setAnimationDirection(direction);
    const animMode = animationModeRef.current;
    if (mode === '2D' && preset.targetMatrix.length === 2) {
      const p = preset as AnimationPreset2D;
      animationRef.current = {
        startTime: performance.now(),
        startMatrix2D: matrix2D.map(r => [...r]) as Matrix2x2,
        startMatrix3D: matrix3D.map(r => [...r]) as Matrix3x3,
        preset2D: p,
        mode: '2D',
        animationMode: animMode,
        direction
      };
    } else if (mode === '3D' && preset.targetMatrix.length === 3) {
      const p = preset as AnimationPreset3D;
      animationRef.current = {
        startTime: performance.now(),
        startMatrix2D: matrix2D.map(r => [...r]) as Matrix2x2,
        startMatrix3D: matrix3D.map(r => [...r]) as Matrix3x3,
        preset3D: p,
        mode: '3D',
        animationMode: animMode,
        direction
      };
    }
  }, [mode, matrix2D, matrix3D, resetToDefaults]);

  const stopAnimation = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  const startRecording = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const canvas = viewer.querySelector('canvas');
    const svg = viewer.querySelector('svg');
    const is3D = !!canvas;

    if (is3D && canvas instanceof HTMLCanvasElement) {
      // 3D: MediaRecorder + captureStream — reliable WebM
      try {
        const stream = canvas.captureStream(WEBM_FPS);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: WEBM_BITRATE,
        });
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const chunks = recordedChunksRef.current;
          mediaRecorderRef.current = null;
          recordedChunksRef.current = [];
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `linear-lab-animation-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
          setIsRecording(false);
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (e) {
        console.warn('MediaRecorder failed', e);
      }
      return;
    }

    if (!is3D && svg) {
      // 2D: sequential SVG → canvas → GIF (no html2canvas)
      recordingActiveRef.current = true;
      const gif = GIFEncoder();
      gifEncoderRef.current = gif;
      const frameDelayMs = GIF_FRAME_DELAY_MS_2D;

      const captureOneFrame = (): Promise<void> => {
        return new Promise((resolve) => {
          const svgEl = viewer.querySelector('svg');
          if (!svgEl || !recordingActiveRef.current) {
            resolve();
            return;
          }
          const w = svgEl.clientWidth || 400;
          const h = svgEl.clientHeight || 300;
          const serialized = new XMLSerializer().serializeToString(svgEl);
          const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(url);
            let cw = w;
            let ch = h;
            if (cw > GIF_MAX_WIDTH) {
              ch = Math.round((ch * GIF_MAX_WIDTH) / cw);
              cw = GIF_MAX_WIDTH;
            }
            const off = document.createElement('canvas');
            off.width = cw;
            off.height = ch;
            const ctx = off.getContext('2d');
            if (!ctx) {
              resolve();
              return;
            }
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            const imageData = ctx.getImageData(0, 0, cw, ch);
            const data = imageData.data;
            const palette = quantize(data, 256);
            const index = applyPalette(data, palette);
            gif.writeFrame(index, cw, ch, { palette, delay: frameDelayMs });
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          img.src = url;
        });
      };

      const scheduleNext = () => {
        if (!recordingActiveRef.current) return;
        captureOneFrame().then(() => {
          if (recordingActiveRef.current) setTimeout(scheduleNext, frameDelayMs);
        });
      };
      requestAnimationFrame(() => setTimeout(scheduleNext, 50));
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    recordingActiveRef.current = false;

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      return;
    }

    const gif = gifEncoderRef.current;
    gifEncoderRef.current = null;
    if (gif) {
      gif.finish();
      const bytes = gif.bytes();
      if (bytes.length > 0) {
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linear-lab-animation-${Date.now()}.gif`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      const anim = animationRef.current;
      if (anim) {
        const preset = anim.mode === '2D' ? anim.preset2D : anim.preset3D;
        if (preset) {
          const isBounce = anim.animationMode === 'bounce' && preset.loop;
          const totalDuration = isBounce ? preset.duration * 2 : preset.duration; // bounce: there+back; repeat: single pass
          const elapsed = performance.now() - anim.startTime;
          const effectiveElapsed = elapsed * animationSpeedRef.current;
          const cycleElapsed = effectiveElapsed % totalDuration;
          const isBackPhase = isBounce && cycleElapsed >= preset.duration;
          const t = isBounce
            ? (isBackPhase
                ? (cycleElapsed - preset.duration) / preset.duration  // 0→1 back: B → A
                : cycleElapsed / preset.duration)                        // 0→1 there: A → B
            : (preset.loop ? cycleElapsed / preset.duration : Math.min(1, cycleElapsed / preset.duration)); // repeat: 0→1 A→B, then restart
          // backward = reverse of forward: same timeline t 0→1, but show (1-t) so transformation goes target → start
          const tEff = anim.direction === 'backward' ? 1 - t : t;

          // Rotation presets: interpolate angle (like Rotation block) — no matrix lerp, no scale/shear
          const p2 = anim.preset2D;
          const p3 = anim.preset3D;
          if (p2 && (p2 as AnimationPreset2D).rotationTargetDeg != null) {
            const startAngle = angleFromRotation2D(anim.startMatrix2D);
            const targetAngle = (p2 as AnimationPreset2D).rotationTargetDeg!;
            const angle = startAngle + (targetAngle - startAngle) * (isBackPhase ? 1 - tEff : tEff);
            setMatrix2D(rotation2D(angle));
          } else if (p3 && (p3 as AnimationPreset3D).rotationTargetDeg != null && (p3 as AnimationPreset3D).rotationAxis) {
            const axis = (p3 as AnimationPreset3D).rotationAxis!;
            const info = angleFromRotation3D(anim.startMatrix3D);
            const startAngle = info ? info.angle : 0;
            const targetAngle = (p3 as AnimationPreset3D).rotationTargetDeg!;
            const angle = startAngle + (targetAngle - startAngle) * (isBackPhase ? 1 - tEff : tEff);
            setMatrix3D(rotation3D(axis, angle));
          } else if (anim.mode === '2D' && p2) {
            const start = isBackPhase ? p2.targetMatrix : anim.startMatrix2D;
            const target = isBackPhase ? anim.startMatrix2D : p2.targetMatrix;
            setMatrix2D(lerpMatrix2D(start, target, tEff));
          } else if (anim.mode === '3D' && p3) {
            const start = isBackPhase ? p3.targetMatrix : anim.startMatrix3D;
            const target = isBackPhase ? anim.startMatrix3D : p3.targetMatrix;
            setMatrix3D(lerpMatrix3D(start, target, tEff));
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
      scalar, showEigenvectors, gridColor, showOriginalGrid
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    setLastSaved(new Date().toLocaleTimeString());
  }, [mode, matrix2D, vectors2D, matrix3D, vectors3D, scalar, showEigenvectors, gridColor, showOriginalGrid]);

  const handleShare = () => {
    const state = { 
      mode, matrix2D, vectors2D, matrix3D, vectors3D, 
      selectedVectorIdx, scalar, showOriginalGrid, gridColor, originalGridColor,
      gridThickness, originalGridThickness, showEigenvectors
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

  const svdResult2D = useMemo(() => (mode === '2D' ? svd2d(matrix2D) : null), [mode, matrix2D]);
  const displayMatrix2D = useMemo(() => {
    if (mode !== '2D' || !showSvdEllipse || !svdResult2D) return matrix2D;
    return svdEffectiveMatrix(svdResult2D, svdStages);
  }, [mode, showSvdEllipse, matrix2D, svdResult2D, svdStages]);

  const transformationMainFormula = useMemo(() => {
    if (mode === '2D') {
      const [[a, b], [c, d]] = displayMatrix2D;
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
  }, [displayMatrix2D, matrix3D, vectors2D, vectors3D, mode, selectedVectorIdx, scalar]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-500/20 shadow-xl">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight uppercase">Linear Lab</h1>
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
        <aside className="flex-1 lg:w-80 bg-slate-900/40 border-t lg:border-t-0 lg:border-r border-slate-800 overflow-hidden order-2 lg:order-1 flex flex-col">
          <ControlPanel 
            mode={mode}
            isAnimating={isAnimating}
            activeTab={activeTab} setActiveTab={setActiveTab}
            svdStages={svdStages} setSvdStages={setSvdStages}
            svdResult2D={svdResult2D}
            showSvdEllipse={showSvdEllipse} setShowSvdEllipse={setShowSvdEllipse}
            svdEllipseScale={svdEllipseScale} setSvdEllipseScale={setSvdEllipseScale}
            svdEllipseColor={svdEllipseColor} setSvdEllipseColor={setSvdEllipseColor}
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
            rotationAngleDeg={rotationAngleDeg}
            setRotationAngleDeg={setRotationAngleDeg}
            rotationAxis3D={rotationAxis3D}
            setRotationAxis3D={setRotationAxis3D}
            transformationFormula={transformationMainFormula}
          />
        </aside>

        <div className="flex-[1.5] lg:flex-1 p-3 lg:p-5 flex flex-col gap-5 overflow-hidden order-1 lg:order-2 bg-slate-950 relative z-10 custom-scrollbar">
          <div ref={viewerRef} className="h-56 sm:h-[360px] lg:flex-1 relative group shrink-0 rounded-xl overflow-hidden border border-slate-800/50 shadow-2xl">
            {/* Linear properties bar - one row at top over canvas */}
            <div className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center gap-3 px-3 py-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Det(A)</span>
                  <span className={`text-sm font-mono font-black ${Math.abs(matrixStats.det) < 0.01 ? 'text-rose-400' : 'text-indigo-400'}`}>{matrixStats.det.toFixed(3)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Trace(A)</span>
                  <span className="text-sm font-mono font-black text-indigo-300">{matrixStats.trace.toFixed(3)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0 shrink">
                <span className="text-[9px] text-slate-500 font-bold uppercase shrink-0">Char</span>
                <MathFormula formula={matrixStats.charEq} className="text-[10px] text-white overflow-hidden max-w-[200px] sm:max-w-none" />
              </div>
              {matrixStats.eigenvalues && matrixStats.eigenvalues.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] text-slate-500 font-bold uppercase shrink-0">λ</span>
                  {matrixStats.eigenvalues.map((ev, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1" style={{ color: ev.color }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                      {ev.val.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {mode === '2D' ? (
              <VectorCanvas 
                matrix={displayMatrix2D} 
                vectors={vectors2D} 
                setVectors={setVectors2D} 
                scalar={scalar}
                showGrid={showGrid} 
                showOriginalGrid={showOriginalGrid} 
                showEigenvectors={showEigenvectors}
                showSvdEllipse={showSvdEllipse}
                svdResult2D={svdResult2D}
                svdStages={svdStages}
                svdEllipseScale={svdEllipseScale}
                svdEllipseColor={svdEllipseColor}
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

            {/* Animation presets bar - one row at bottom over canvas */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/50">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Mode</span>
                <div className="flex rounded overflow-hidden border border-slate-700">
                  {(['repeat', 'bounce'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setAnimationModeWithRef(m)}
                      className={`px-2 py-1 text-[8px] font-black uppercase ${animationMode === m ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Speed</span>
                <span className="text-[9px] font-mono font-bold text-amber-400 w-8">{animationSpeed.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="w-16 accent-amber-500 h-1 opacity-80"
                />
              </div>
              {/* Player: Left = play/stop backward, Right = play/stop forward */}
              <div className="flex items-center gap-1 shrink-0 rounded-lg overflow-hidden border border-slate-600 bg-slate-700/80 shadow-inner">
                <button
                  onClick={() => {
                    const presets = mode === '2D' ? ANIMATION_PRESETS_2D : ANIMATION_PRESETS_3D;
                    const preset = lastPresetRef.current || presets[0];
                    if (animationDirection === 'backward') {
                      stopAnimation();
                    } else {
                      if (isAnimating) stopAnimation();
                      if (preset) startAnimation(preset, 'backward');
                    }
                  }}
                  className="p-2 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-600/60 transition-colors border-r border-slate-600"
                  title={animationDirection === 'backward' ? 'Stop' : 'Play backward'}
                >
                  {animationDirection === 'backward' ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12" rx="0.5"/><rect x="14" y="6" width="4" height="12" rx="0.5"/></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 12l12-6v12L6 12z"/></svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    const presets = mode === '2D' ? ANIMATION_PRESETS_2D : ANIMATION_PRESETS_3D;
                    const preset = lastPresetRef.current || presets[0];
                    if (animationDirection === 'forward') {
                      stopAnimation();
                    } else {
                      if (isAnimating) stopAnimation();
                      if (preset) startAnimation(preset, 'forward');
                    }
                  }}
                  className="p-2 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-600/60 transition-colors"
                  title={animationDirection === 'forward' ? 'Stop' : 'Play forward'}
                >
                  {animationDirection === 'forward' ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12" rx="0.5"/><rect x="14" y="6" width="4" height="12" rx="0.5"/></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {(mode === '2D' ? ANIMATION_PRESETS_2D : ANIMATION_PRESETS_3D).map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => startAnimation(preset)}
                    className="text-[7px] leading-tight px-2 py-1 rounded border border-slate-700 bg-amber-500/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 font-bold shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-colors ${isRecording ? 'bg-rose-600/30 text-rose-300 border-rose-500/50 hover:bg-rose-600/50' : 'bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-600/80 hover:text-white'}`}
                title={isRecording ? 'Stop and save' : 'Save animation (2D → GIF, 3D → WebM)'}
              >
                {isRecording ? '● Stop & save' : 'Save animation'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
