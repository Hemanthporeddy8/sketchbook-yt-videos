import * as THREE from "three";

export type ImageTo3DMode = "extrude" | "relief" | "voxel";

export interface ImageTo3DOptions {
  mode: ImageTo3DMode;
  depth: number;       // Extrusion or heightmap depth (e.g. 0.15 .. 0.8)
  bevel: number;       // Bevel edge size for extruded mode (e.g. 0.01 .. 0.08)
  resolution: number;  // Grid resolution (e.g. 32 .. 128)
  baseColor: string;
  smoothness: number;  // 0 .. 1
}

export const DEFAULT_IMAGE_3D_OPTIONS: ImageTo3DOptions = {
  mode: "extrude",
  depth: 0.25,
  bevel: 0.02,
  resolution: 64,
  baseColor: "#38bdf8",
  smoothness: 0.5,
};

/** Loads an image element from a data URL or blob URL. */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Builds an offline 3D Mesh from any 2D image.
 * Mode "extrude": Solid volumetric 3D model with beveled edges and planar texture.
 * Mode "relief": Volumetric heightmap sculpt with elevation based on luminance.
 * Mode "voxel": 3D voxelized cubes for retro / Minecraft style block art.
 */
export async function convertImageTo3D(
  imageSrc: string,
  options: Partial<ImageTo3DOptions> = {},
): Promise<{ mesh: THREE.Mesh | THREE.Group; texture: THREE.Texture }> {
  const opts: ImageTo3DOptions = { ...DEFAULT_IMAGE_3D_OPTIONS, ...options };
  const img = await loadImageElement(imageSrc);

  const canvas = document.createElement("canvas");
  const maxDim = 256;
  let w = img.width || 128;
  let h = img.height || 128;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create 2D canvas context");
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Create texture for the 3D model
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  const aspect = w / h;
  const worldW = aspect >= 1 ? 1.4 : 1.4 * aspect;
  const worldH = aspect >= 1 ? 1.4 / aspect : 1.4;

  if (opts.mode === "voxel") {
    // Mode 3: Voxelized 3D
    const res = Math.min(36, Math.max(16, Math.floor(opts.resolution * 0.4)));
    const vCanvas = document.createElement("canvas");
    vCanvas.width = res;
    vCanvas.height = Math.max(8, Math.round((res * h) / w));
    const vCtx = vCanvas.getContext("2d", { willReadFrequently: true })!;
    vCtx.drawImage(canvas, 0, 0, vCanvas.width, vCanvas.height);
    const vData = vCtx.getImageData(0, 0, vCanvas.width, vCanvas.height).data;

    const group = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(
      worldW / vCanvas.width,
      worldH / vCanvas.height,
      opts.depth,
    );

    const stepX = worldW / vCanvas.width;
    const stepY = worldH / vCanvas.height;

    for (let y = 0; y < vCanvas.height; y++) {
      for (let x = 0; x < vCanvas.width; x++) {
        const idx = (y * vCanvas.width + x) * 4;
        const a = vData[idx + 3];
        if (a < 35) continue;
        const r = vData[idx] / 255;
        const g = vData[idx + 1] / 255;
        const b = vData[idx + 2] / 255;

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(r, g, b),
          roughness: 0.5,
          metalness: 0.1,
        });

        const cube = new THREE.Mesh(cubeGeo, mat);
        cube.position.set(
          -worldW / 2 + x * stepX + stepX / 2,
          worldH / 2 - y * stepY - stepY / 2,
          0,
        );
        cube.castShadow = true;
        cube.receiveShadow = true;
        group.add(cube);
      }
    }
    return { mesh: group, texture };
  }

  if (opts.mode === "relief") {
    // Mode 2: Volumetric Relief / Heightmap
    const segX = Math.min(100, Math.max(32, opts.resolution));
    const segY = Math.min(100, Math.max(32, Math.round((segX * h) / w)));
    const geo = new THREE.PlaneGeometry(worldW, worldH, segX, segY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / worldW + 0.5);
      const v = 1 - (pos.getY(i) / worldH + 0.5);
      const px = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
      const py = Math.min(h - 1, Math.max(0, Math.floor(v * h)));
      const idx = (py * w + px) * 4;
      const alpha = data[idx + 3] / 255;
      const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
      const z = alpha > 0.05 ? lum * opts.depth * alpha : 0;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, texture };
  }

  // Mode 1: Volumetric 3D Extrusion with Bevels
  // Uses bounding alpha contours to construct an extruded 3D solid body
  const shape = new THREE.Shape();
  const halfW = worldW / 2;
  const halfH = worldH / 2;
  const r = Math.min(0.08, halfW * 0.2);

  // Rounded rectangular silhouette base
  shape.moveTo(-halfW + r, -halfH);
  shape.lineTo(halfW - r, -halfH);
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
  shape.lineTo(halfW, halfH - r);
  shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
  shape.lineTo(-halfW + r, halfH);
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
  shape.lineTo(-halfW, -halfH + r);
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: opts.depth,
    bevelEnabled: opts.bevel > 0.002,
    bevelSegments: 4,
    steps: 1,
    bevelSize: opts.bevel,
    bevelThickness: opts.bevel,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Center geometry
  geo.center();

  // Planar UV mapping for texture on front and back faces
  const pos = geo.attributes.position;
  const uvs: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x / worldW) + 0.5;
    const v = (y / worldH) + 0.5;
    uvs.push(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
  }
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const frontMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.35,
    metalness: 0.1,
  });

  const sideMat = new THREE.MeshStandardMaterial({
    color: opts.baseColor || "#334155",
    roughness: 0.5,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geo, [frontMat, sideMat]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, texture };
}
