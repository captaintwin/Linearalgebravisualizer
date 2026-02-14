
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Vector3D, Matrix3x3 } from '../types';

interface VectorCanvas3DProps {
  matrix: Matrix3x3;
  vectors: Vector3D[];
  setVectors: React.Dispatch<React.SetStateAction<Vector3D[]>>;
  scalar: number;
  showGrid: boolean;
  showOriginalGrid: boolean;
  showEigenvectors: boolean;
  gridColor: string;
  originalGridColor: string;
  gridThickness: number;
  originalGridThickness: number;
}

const VectorCanvas3D: React.FC<VectorCanvas3DProps> = ({ 
  matrix, vectors, setVectors, scalar, showGrid, showOriginalGrid, showEigenvectors,
  gridColor, originalGridColor, gridThickness, originalGridThickness 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const stateRef = useRef({
    vectors,
    matrix,
    scalar,
    activeHandleIndex: -1 as number,
    isDragging: false
  });

  useEffect(() => {
    stateRef.current.vectors = vectors;
    stateRef.current.matrix = matrix;
    stateRef.current.scalar = scalar;
  }, [vectors, matrix, scalar]);

  const sceneObjects = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    orbit: OrbitControls;
    handles: THREE.Mesh[];
    arrows: THREE.ArrowHelper[];
    grid?: THREE.Group;
    originalGrid?: THREE.Group;
    eigenGroup?: THREE.Group;
    raycaster: THREE.Raycaster;
    dragPlane: THREE.Plane;
  } | null>(null);

  const inverseMatrix = useMemo(() => {
    const m = matrix.flat();
    const [a, b, c, d, e, f, g, h, i] = m;
    const det = a*(e*i - f*h) - b*(d*i - f*h) + c*(d*h - e*g);
    if (Math.abs(det) < 1e-6) return null;
    const inv = [
      (e*i - f*h)/det, (c*h - b*i)/det, (b*f - c*e)/det,
      (f*g - d*i)/det, (a*i - c*g)/det, (c*d - a*f)/det,
      (d*h - e*g)/det, (g*b - a*h)/det, (a*e - b*d)/det
    ];
    return [[inv[0], inv[1], inv[2]], [inv[3], inv[4], inv[5]], [inv[6], inv[7], inv[8]]] as Matrix3x3;
  }, [matrix]);

  const invMatrixRef = useRef<Matrix3x3 | null>(null);
  useEffect(() => { invMatrixRef.current = inverseMatrix; }, [inverseMatrix]);

  const get3DEigenvalues = (m: number[]): number[] => {
    const [a11, a12, a13, a21, a22, a23, a31, a32, a33] = m;
    const trace = a11 + a22 + a33;
    const sumMinors = (a11*a22 - a12*a21) + (a11*a33 - a13*a31) + (a22*a33 - a23*a32);
    const det = a11*(a22*a33 - a23*a32) - a12*(a21*a33 - a23*a31) + a13*(a21*a32 - a22*a31);

    const realRoots: number[] = [];
    const poly = (l: number) => -Math.pow(l, 3) + trace*Math.pow(l, 2) - sumMinors*l + det;
    
    for (let l = -20; l <= 20; l += 0.5) {
      if (poly(l) * poly(l + 0.5) <= 0) {
        let low = l, high = l + 0.5;
        for (let i = 0; i < 10; i++) {
          let mid = (low + high) / 2;
          if (poly(low) * poly(mid) <= 0) high = mid;
          else low = mid;
        }
        const root = (low + high) / 2;
        if (realRoots.length === 0 || Math.abs(realRoots[realRoots.length-1] - root) > 0.1) {
          realRoots.push(root);
        }
      }
    }
    return realRoots;
  };

  const get3DEigenvector = (m: number[], lambda: number): THREE.Vector3 => {
    const [a11, a12, a13, a21, a22, a23, a31, a32, a33] = m;
    const r1 = new THREE.Vector3(a11 - lambda, a12, a13);
    const r2 = new THREE.Vector3(a21, a22 - lambda, a23);
    const r3 = new THREE.Vector3(a31, a32, a33 - lambda);

    let v = new THREE.Vector3().crossVectors(r1, r2);
    if (v.length() < 1e-3) v = new THREE.Vector3().crossVectors(r1, r3);
    if (v.length() < 1e-3) v = new THREE.Vector3().crossVectors(r2, r3);
    if (v.length() < 1e-3) return new THREE.Vector3(1, 0, 0); 

    return v.normalize();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth || 1, 1);
    const height = Math.max(container.clientHeight || 1, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(8, 6, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.touchAction = 'none';
    containerRef.current.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);

    const raycaster = new THREE.Raycaster();
    const dragPlane = new THREE.Plane();

    sceneObjects.current = { 
      scene, camera, renderer, orbit, handles: [], arrows: [], 
      raycaster, dragPlane 
    };

    const getMouse = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      const s = sceneObjects.current;
      if (!s) return;
      const mouse = getMouse(e);
      s.raycaster.setFromCamera(mouse, s.camera);
      const intersects = s.raycaster.intersectObjects(s.handles);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const idx = s.handles.indexOf(hit.object as THREE.Mesh);
        if (idx !== -1) {
          stateRef.current.activeHandleIndex = idx;
          stateRef.current.isDragging = true;
          s.orbit.enabled = false;
          const normal = s.camera.getWorldDirection(new THREE.Vector3()).negate();
          s.dragPlane.setFromNormalAndCoplanarPoint(normal, hit.object.position);
          renderer.domElement.setPointerCapture(e.pointerId);
          hit.object.scale.set(1.5, 1.5, 1.5);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const s = sceneObjects.current;
      const inv = invMatrixRef.current;
      const currentScalar = stateRef.current.scalar;
      if (!s || !stateRef.current.isDragging || !inv) return;
      const mouse = getMouse(e);
      s.raycaster.setFromCamera(mouse, s.camera);
      const intersectPoint = new THREE.Vector3();
      if (s.raycaster.ray.intersectPlane(s.dragPlane, intersectPoint)) {
        const idx = stateRef.current.activeHandleIndex;
        const pos = intersectPoint;
        const effectiveScalar = Math.abs(currentScalar) < 1e-6 ? 1e-6 : currentScalar;
        const bx = (pos.x * inv[0][0] + pos.y * inv[0][1] + pos.z * inv[0][2]) / effectiveScalar;
        const by = (pos.x * inv[1][0] + pos.y * inv[1][1] + pos.z * inv[1][2]) / effectiveScalar;
        const bz = (pos.x * inv[2][0] + pos.y * inv[2][1] + pos.z * inv[2][2]) / effectiveScalar;
        setVectors(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], x: Number(bx.toFixed(2)), y: Number(by.toFixed(2)), z: Number(bz.toFixed(2)) };
          return next;
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const s = sceneObjects.current;
      if (!s) return;
      if (stateRef.current.isDragging) {
        const idx = stateRef.current.activeHandleIndex;
        if (s.handles[idx]) {
          s.handles[idx].scale.set(1, 1, 1);
        }
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
      stateRef.current.isDragging = false;
      stateRef.current.activeHandleIndex = -1;
      s.orbit.enabled = true;
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const resize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth || 1, 1);
      const h = Math.max(container.clientHeight || 1, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let aniId: number;
    const animate = () => {
      aniId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(aniId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); 

  useEffect(() => {
    const s = sceneObjects.current;
    if (!s) return;

    if (s.grid) s.scene.remove(s.grid);
    if (s.originalGrid) s.scene.remove(s.originalGrid);
    if (s.eigenGroup) s.scene.remove(s.eigenGroup);

    const extent = 10;
    const step = 2;

    const createLineGrid = (mat: Matrix3x3 | null, color: string, thickness: number, opacity: number) => {
      const group = new THREE.Group();
      const material = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity });
      const applyXform = (x: number, y: number, z: number) => {
        if (!mat) return new THREE.Vector3(x, y, z);
        const scl = scalar;
        return new THREE.Vector3(
          (x * mat[0][0] + y * mat[0][1] + z * mat[0][2]) * scl,
          (x * mat[1][0] + y * mat[1][1] + z * mat[1][2]) * scl,
          (x * mat[2][0] + y * mat[2][1] + z * mat[2][2]) * scl
        );
      };

      for (let i = -extent; i <= extent; i += step) {
        const pts = [
          [applyXform(-extent, i, 0), applyXform(extent, i, 0)],
          [applyXform(-extent, 0, i), applyXform(extent, 0, i)],
          [applyXform(i, -extent, 0), applyXform(i, extent, 0)],
          [applyXform(0, -extent, i), applyXform(0, extent, i)],
          [applyXform(i, 0, -extent), applyXform(i, 0, extent)],
          [applyXform(0, i, -extent), applyXform(0, i, extent)],
        ];
        pts.forEach(p => {
          const geom = new THREE.BufferGeometry().setFromPoints(p);
          group.add(new THREE.Line(geom, material));
        });
      }
      return group;
    };

    if (showOriginalGrid) {
      s.originalGrid = createLineGrid(null, originalGridColor, originalGridThickness, 0.2);
      s.scene.add(s.originalGrid);
    }
    if (showGrid) {
      s.grid = createLineGrid(matrix, gridColor, gridThickness, 0.5);
      s.scene.add(s.grid);
    }

    if (showEigenvectors) {
      const eigenGroup = new THREE.Group();
      const flatM = matrix.flat().map(v => v * scalar);
      const eigenvalues = get3DEigenvalues(flatM);
      const colors = [0xfbbf24, 0xfb7185, 0x2dd4bf];

      eigenvalues.forEach((lambda, i) => {
        const v = get3DEigenvector(flatM, lambda);
        const points = [v.clone().multiplyScalar(-extent), v.clone().multiplyScalar(extent)];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({ color: colors[i % 3], dashSize: 0.5, gapSize: 0.2, transparent: true, opacity: 0.8 });
        const line = new THREE.Line(geom, material);
        line.computeLineDistances();
        eigenGroup.add(line);
      });
      s.eigenGroup = eigenGroup;
      s.scene.add(eigenGroup);
    }

    s.handles.forEach(h => s.scene.remove(h));
    s.arrows.forEach(a => s.scene.remove(a));
    const newHandles: THREE.Mesh[] = [];
    const newArrows: THREE.ArrowHelper[] = [];
    vectors.forEach(v => {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1, v.color, 0.4, 0.2);
      s.scene.add(arrow);
      newArrows.push(arrow);
      const geom = new THREE.SphereGeometry(0.35, 8, 8); 
      const mat = new THREE.MeshStandardMaterial({ color: v.color, transparent: true, opacity: 0.4, emissive: v.color, emissiveIntensity: 0.5 });
      const handle = new THREE.Mesh(geom, mat);
      s.scene.add(handle);
      newHandles.push(handle);
    });
    s.handles = newHandles;
    s.arrows = newArrows;
  }, [vectors.length, showGrid, showOriginalGrid, showEigenvectors, gridColor, originalGridColor, gridThickness, originalGridThickness, matrix, scalar]);

  useEffect(() => {
    const s = sceneObjects.current;
    if (!s) return;
    vectors.forEach((v, idx) => {
      const h = s.handles[idx];
      const a = s.arrows[idx];
      if (!h || !a) return;
      const tx = (v.x * matrix[0][0] + v.y * matrix[0][1] + v.z * matrix[0][2]) * scalar;
      const ty = (v.x * matrix[1][0] + v.y * matrix[1][1] + v.z * matrix[1][2]) * scalar;
      const tz = (v.x * matrix[2][0] + v.y * matrix[2][1] + v.z * matrix[2][2]) * scalar;
      h.position.set(tx, ty, tz);
      const target = new THREE.Vector3(tx, ty, tz);
      const len = Math.max(target.length(), 0.01);
      const dir = target.clone().normalize();
      a.setDirection(dir);
      a.setLength(len, 0.4, 0.2);
    });
  }, [vectors, matrix, scalar]);

  return (
    <div className="w-full h-full rounded-xl border border-slate-800 overflow-hidden shadow-2xl relative group bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default VectorCanvas3D;
