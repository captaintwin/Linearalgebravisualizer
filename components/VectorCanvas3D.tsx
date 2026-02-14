
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Vector3D, Matrix3x3 } from '../types';

interface VectorCanvas3DProps {
  matrix: Matrix3x3;
  vectors: Vector3D[];
  setVectors: React.Dispatch<React.SetStateAction<Vector3D[]>>;
  scalar: number;
  showGrid: boolean;
  showOriginalGrid: boolean;
  gridColor: string;
  originalGridColor: string;
  gridThickness: number;
  originalGridThickness: number;
}

const VectorCanvas3D: React.FC<VectorCanvas3DProps> = ({ 
  matrix, vectors, setVectors, scalar, showGrid, showOriginalGrid, 
  gridColor, originalGridColor, gridThickness, originalGridThickness 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs for stable data access inside event handlers
  const stateRef = useRef({
    vectors,
    matrix,
    scalar,
    activeHandleIndex: -1 as number,
    isDragging: false
  });

  // Synchronize refs with props
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

  // Store inverse matrix in ref for handlers
  const invMatrixRef = useRef<Matrix3x3 | null>(null);
  useEffect(() => { invMatrixRef.current = inverseMatrix; }, [inverseMatrix]);

  // 1. Scene Initialization
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
          if ((hit.object as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 1;
          }
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
          if (s.handles[idx].material instanceof THREE.MeshStandardMaterial) {
             (s.handles[idx].material as THREE.MeshStandardMaterial).opacity = 0.4;
          }
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

    let aniId: number;
    const animate = () => {
      aniId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(aniId);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []); 

  // 2. Rendering Grids (Basis and Transformed)
  useEffect(() => {
    const s = sceneObjects.current;
    if (!s) return;

    if (s.grid) s.scene.remove(s.grid);
    if (s.originalGrid) s.scene.remove(s.originalGrid);

    const extent = 6;
    const step = 2; // Reduced density for clarity

    // Function to create grid lines
    const createLineGrid = (mat: Matrix3x3 | null, color: string, thickness: number, opacity: number) => {
      const group = new THREE.Group();
      // Note: LineBasicMaterial linewidth is ignored in most browsers, but we keep the parameter.
      const material = new THREE.LineBasicMaterial({ 
        color: new THREE.Color(color), 
        linewidth: thickness, 
        transparent: true, 
        opacity 
      });

      const applyXform = (x: number, y: number, z: number) => {
        if (!mat) return new THREE.Vector3(x, y, z);
        const scl = scalar;
        return new THREE.Vector3(
          (x * mat[0][0] + y * mat[0][1] + z * mat[0][2]) * scl,
          (x * mat[1][0] + y * mat[1][1] + z * mat[1][2]) * scl,
          (x * mat[2][0] + y * mat[2][1] + z * mat[2][2]) * scl
        );
      };

      // Draw grid on XY, XZ, YZ planes
      for (let i = -extent; i <= extent; i += step) {
        // Lines along X
        const pointsX = [applyXform(-extent, i, 0), applyXform(extent, i, 0)];
        const pointsX2 = [applyXform(-extent, 0, i), applyXform(extent, 0, i)];
        
        // Lines along Y
        const pointsY = [applyXform(i, -extent, 0), applyXform(i, extent, 0)];
        const pointsY2 = [applyXform(0, -extent, i), applyXform(0, extent, i)];

        // Lines along Z
        const pointsZ = [applyXform(i, 0, -extent), applyXform(i, 0, extent)];
        const pointsZ2 = [applyXform(0, i, -extent), applyXform(0, i, extent)];

        [pointsX, pointsX2, pointsY, pointsY2, pointsZ, pointsZ2].forEach(pts => {
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          group.add(new THREE.Line(geom, material));
        });
      }
      return group;
    };

    if (showOriginalGrid) {
      // Basis grid defaults to white and respects thickness (at least as a parameter)
      s.originalGrid = createLineGrid(null, originalGridColor, originalGridThickness, 0.3);
      s.scene.add(s.originalGrid);
    }

    if (showGrid) {
      s.grid = createLineGrid(matrix, gridColor, gridThickness, 0.7);
      s.scene.add(s.grid);
    }

    // Recreate vectors
    s.handles.forEach(h => s.scene.remove(h));
    s.arrows.forEach(a => s.scene.remove(a));

    const newHandles: THREE.Mesh[] = [];
    const newArrows: THREE.ArrowHelper[] = [];

    vectors.forEach(v => {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1, v.color, 0.4, 0.2);
      s.scene.add(arrow);
      newArrows.push(arrow);

      const geom = new THREE.SphereGeometry(0.35, 8, 8); 
      const mat = new THREE.MeshStandardMaterial({ 
        color: v.color, 
        transparent: true, 
        opacity: 0.4, 
        emissive: v.color, 
        emissiveIntensity: 0.5 
      });
      const handle = new THREE.Mesh(geom, mat);
      s.scene.add(handle);
      newHandles.push(handle);
    });

    s.handles = newHandles;
    s.arrows = newArrows;
  }, [vectors.length, showGrid, showOriginalGrid, gridColor, originalGridColor, gridThickness, originalGridThickness, matrix, scalar]);

  // 3. Update Vector Positions
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
      <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
        <div className="px-2 py-1 bg-indigo-600/20 rounded text-[10px] text-indigo-400 border border-indigo-500/30 font-black uppercase tracking-widest">
          3D Space Lab
        </div>
      </div>
    </div>
  );
};

export default VectorCanvas3D;
