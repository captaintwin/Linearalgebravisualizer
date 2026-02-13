
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'https://esm.sh/three@0.170.0/examples/jsm/controls/DragControls.js';
import { Vector3D, Matrix3x3 } from '../types';

interface VectorCanvas3DProps {
  matrix: Matrix3x3;
  vectors: Vector3D[];
  // Fix: changed setVectors type to support functional updates (React.Dispatch)
  setVectors: React.Dispatch<React.SetStateAction<Vector3D[]>>;
  showGrid: boolean;
}

const VectorCanvas3D: React.FC<VectorCanvas3DProps> = ({ matrix, vectors, setVectors, showGrid }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vectorsRef = useRef(vectors);
  const matrixRef = useRef(matrix);

  // Синхронизируем рефы с пропсами для использования внутри колбэков Three.js без триггера эффектов
  useEffect(() => { vectorsRef.current = vectors; }, [vectors]);
  useEffect(() => { matrixRef.current = matrix; }, [matrix]);

  const sceneObjects = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    orbit: OrbitControls;
    dragControls?: DragControls;
    handles: THREE.Mesh[];
    arrows: THREE.ArrowHelper[];
    grid?: THREE.GridHelper;
  } | null>(null);

  const inverseMatrix = useMemo(() => {
    const m = matrix.flat();
    const [a, b, c, d, e, f, g, h, i] = m;
    const det = a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g);
    if (Math.abs(det) < 1e-6) return null;
    const inv = [
      (e*i - f*h)/det, (c*h - b*i)/det, (b*f - c*e)/det,
      (f*g - d*i)/det, (a*i - c*g)/det, (c*d - a*f)/det,
      (d*h - e*g)/det, (g*b - a*h)/det, (a*e - b*d)/det
    ];
    return [[inv[0], inv[1], inv[2]], [inv[3], inv[4], inv[5]], [inv[6], inv[7], inv[8]]] as Matrix3x3;
  }, [matrix]);

  // Инициализация базовой сцены (один раз)
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(8, 6, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    sceneObjects.current = { scene, camera, renderer, orbit, handles: [], arrows: [] };

    let aniId: number;
    const animate = () => {
      aniId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(aniId);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Обновление векторов и управления перетаскиванием
  useEffect(() => {
    const s = sceneObjects.current;
    if (!s) return;

    // Очистка старых объектов
    s.handles.forEach(h => s.scene.remove(h));
    s.arrows.forEach(a => s.scene.remove(a));
    s.dragControls?.dispose();
    if (s.grid) s.scene.remove(s.grid);

    if (showGrid) {
      s.grid = new THREE.GridHelper(12, 12, 0x1e293b, 0x0f172a);
      s.scene.add(s.grid);
    }

    const handles: THREE.Mesh[] = [];
    const arrows: THREE.ArrowHelper[] = [];
    const handleToIndex = new Map<THREE.Object3D, number>();

    vectors.forEach((v, idx) => {
      // Трансформированная позиция кончика
      const tx = v.x * matrix[0][0] + v.y * matrix[0][1] + v.z * matrix[0][2];
      const ty = v.x * matrix[1][0] + v.y * matrix[1][1] + v.z * matrix[1][2];
      const tz = v.x * matrix[2][0] + v.y * matrix[2][1] + v.z * matrix[2][2];

      const dir = new THREE.Vector3(tx, ty, tz);
      const len = Math.max(dir.length(), 0.001);
      dir.normalize();

      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), len, new THREE.Color(v.color), 0.4, 0.2);
      s.scene.add(arrow);
      arrows.push(arrow);

      // Увеличенный хендлер для захвата (0.4 вместо 0.2)
      const hGeom = new THREE.SphereGeometry(0.4, 16, 16);
      const hMat = new THREE.MeshBasicMaterial({ color: v.color, transparent: true, opacity: 0 });
      const handle = new THREE.Mesh(hGeom, hMat);
      handle.position.set(tx, ty, tz);
      s.scene.add(handle);
      handles.push(handle);
      handleToIndex.set(handle, idx);
    });

    s.handles = handles;
    s.arrows = arrows;

    const drag = new DragControls(handles, s.camera, s.renderer.domElement);
    s.dragControls = drag;

    drag.addEventListener('dragstart', (e: any) => {
      s.orbit.enabled = false;
      const mesh = e.object as THREE.Mesh;
      // Fix: Cast to MeshBasicMaterial to access opacity property as base Material type doesn't guarantee it
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = 0.3; // Подсвечиваем при захвате
      }
    });

    drag.addEventListener('drag', (e: any) => {
      const handle = e.object as THREE.Mesh;
      const idx = handleToIndex.get(handle);
      if (idx === undefined || !inverseMatrix) return;

      const pos = handle.position;
      
      // Обратное преобразование координат для обновления базового вектора
      const bx = pos.x * inverseMatrix[0][0] + pos.y * inverseMatrix[0][1] + pos.z * inverseMatrix[0][2];
      const by = pos.x * inverseMatrix[1][0] + pos.y * inverseMatrix[1][1] + pos.z * inverseMatrix[1][2];
      const bz = pos.x * inverseMatrix[2][0] + pos.y * inverseMatrix[2][1] + pos.z * inverseMatrix[2][2];

      // Обновляем визуализацию стрелки немедленно для плавности
      const arrow = s.arrows[idx];
      const newDir = new THREE.Vector3(pos.x, pos.y, pos.z);
      const newLen = Math.max(newDir.length(), 0.001);
      newDir.normalize();
      arrow.setDirection(newDir);
      arrow.setLength(newLen, 0.4, 0.2);

      // Обновляем состояние React (используем функциональное обновление для стабильности)
      setVectors(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], x: Number(bx.toFixed(2)), y: Number(by.toFixed(2)), z: Number(bz.toFixed(2)) };
        return next;
      });
    });

    drag.addEventListener('dragend', (e: any) => {
      s.orbit.enabled = true;
      const mesh = e.object as THREE.Mesh;
      // Fix: Cast to MeshBasicMaterial to access opacity property as base Material type doesn't guarantee it
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = 0;
      }
    });

  }, [vectors.length, matrix, showGrid, inverseMatrix, setVectors]); 
  // Важно: vectors.length в зависимостях вместо всего массива, чтобы избежать циклического пересоздания DragControls при drag-собитии

  return (
    <div className="w-full h-full rounded-xl border border-slate-800 overflow-hidden shadow-2xl relative group bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
        <div className="px-2 py-1 bg-indigo-600/20 rounded text-[10px] text-indigo-400 border border-indigo-500/30 font-black uppercase tracking-widest">
          3D Engine Active
        </div>
        <div className="text-[9px] text-slate-500 font-mono px-1">
          Orbit: Left Mouse | Zoom: Scroll | Move Tip: Drag
        </div>
      </div>
    </div>
  );
};

export default VectorCanvas3D;
