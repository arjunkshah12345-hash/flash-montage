// flash-montage procedural specimens.
// Every specimen is deterministic: same (name, seed, t) -> same pixels. No Math.random, no clock.
//
//   import { SPECIMENS, mountSpecimen } from "./specimens.js";
//   const s = await mountSpecimen(canvas, "ribbed-torus", { seed: 3, width: 1920, height: 1080 });
//   s.render(0.4);   // seconds
//
// kind "3d" uses the vendored Three.js (./vendor), kind "2d" draws on a 2D canvas.
// ground = the seamless backdrop colour, used by the montage builder to alternate light/dark.

import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/addons/RoomEnvironment.js";

// ---------------------------------------------------------------- utilities

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const r = mulberry32(seed * 9973 + 17);
  const p = new Uint8Array(512);
  const base = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    const u = (h & 15) < 8 ? x : y;
    const v = (h & 15) < 4 ? y : (h & 15) === 12 || (h & 15) === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  return function noise(x, y = 0, z = 0) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u), lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u), lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w,
    );
  };
}

const fbm = (n, x, y, z, o = 4) => {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < o; i++) { s += a * n(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
  return s;
};

function studio(canvas, w, h, { bg = "#e9eaec", fov = 30, cam = [0, 0, 6], env = true, exposure = 1 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (env) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
  }
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.05, 400);
  camera.position.set(...cam);
  camera.lookAt(0, 0, 0);
  return { renderer, scene, camera, draw: () => renderer.render(scene, camera) };
}

function contactShadow(scene, y = -1.25, size = 4, strength = 0.32) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, `rgba(0,0,0,${strength})`);
  grd.addColorStop(0.55, `rgba(0,0,0,${strength * 0.35})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * 0.42),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  scene.add(m);
  return m;
}

function canvas2d(canvas, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  return { ctx, s: h / 1080 };
}

const CODE_BANK = [
  "const geometry = new THREE.BufferGeometry();",
  "geometry.setAttribute('position', positions);",
  "for (let i = 0; i < SETTINGS.particleCount; i++) {",
  "  const x = positions.getX(i);",
  "  positions.setY(i, height * SETTINGS.terrainHeight);",
  "  color.setHSL(0.48 + height * 0.14, 0.6, 0.5);",
  "mesh.instanceMatrix.needsUpdate = true;",
  "const material = new THREE.MeshPhysicalMaterial({",
  "  roughness: 0.38, metalness: 0.85,",
  "  iridescence: 1.0, clearcoat: 1.0,",
  "});",
  "scene.add(sculpture);",
  "const curve = new THREE.CatmullRomCurve3(points);",
  "ribbon.rotation.y = time * (0.018 + index * 0.003);",
  "const edges = new THREE.EdgesGeometry(geometry, 4);",
  "renderer.toneMapping = THREE.ACESFilmicToneMapping;",
  "const seed = 73109;",
  "function createTerrain(rng) {",
  "  return noise(x * 0.8, z * 0.8) * ridge;",
  "const panel = new THREE.Mesh(geometry, darkMetal);",
  "transform.scale.set(width, height, width);",
  "architecture.add(mesh);",
  "camera.position.lerp(target, 0.04);",
  "export default { seed, scene, camera };",
];

// ---------------------------------------------------------------- 3D specimens

const S3 = {};

S3["ribbed-torus"] = {
  ground: "#e9eaec", tags: ["chrome", "studio", "torus"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#e9eaec", cam: [0, 1.4, 6.2] });
    const geo = new THREE.TorusGeometry(1.05, 0.42, 160, 420);
    const pos = geo.attributes.position, nrm = new THREE.Vector3(), v = new THREE.Vector3();
    geo.computeVertexNormals();
    const ribs = 30 + Math.floor(r() * 26), depth = 0.05 + r() * 0.05;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      nrm.fromBufferAttribute(geo.attributes.normal, i);
      const u = Math.atan2(v.y, v.x);
      const d = depth * Math.pow(Math.abs(Math.sin(u * ribs)), 0.6);
      v.addScaledVector(nrm, d);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd8dadd, metalness: 1, roughness: 0.2 + r() * 0.1 }));
    st.scene.add(mesh);
    contactShadow(st.scene, -1.35, 4.5);
    const tilt = 0.45 + r() * 0.35;
    return { render(t) { mesh.rotation.set(tilt, t * 0.35, 0.4 + t * 0.12); st.draw(); } };
  },
};

S3["bead-ring"] = {
  ground: "#e7e8ec", tags: ["glass", "studio", "torus", "instanced"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed), n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#e7e8ec", cam: [0, 1.2, 6.4] });
    const count = 1400;
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xb9c6e6, metalness: 0.15, roughness: 0.04, transmission: 0.55, thickness: 0.6, ior: 1.5, clearcoat: 1, iridescence: 0.5 });
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const u = r() * Math.PI * 2, vv = r() * Math.PI * 2;
      const tube = 0.36 + 0.12 * n(Math.cos(u) * 2, Math.sin(u) * 2, 0.5);
      p.set((1.15 + tube * Math.cos(vv)) * Math.cos(u), (1.15 + tube * Math.cos(vv)) * Math.sin(u), tube * Math.sin(vv));
      const s = 0.05 + 0.09 * Math.pow(r(), 2);
      m.compose(p, q, sc.set(s, s, s));
      im.setMatrixAt(i, m);
    }
    const g = new THREE.Group();
    g.add(im);
    st.scene.add(g);
    contactShadow(st.scene, -1.45, 4.5, 0.22);
    return { render(t) { g.rotation.set(0.55, t * 0.3, 0.3); st.draw(); } };
  },
};

S3["iridescent-blob"] = {
  ground: "#efefef", tags: ["iridescent", "blob", "studio"],
  make({ canvas, w, h, seed }) {
    const n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#efefef", cam: [0, 0.3, 6] });
    const geo = new THREE.IcosahedronGeometry(1.2, 80);
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const d = 1 + 0.75 * fbm(n, v.x * 0.45 + seed, v.y * 0.45, v.z * 0.45, 2);
      v.multiplyScalar(d);
      pos.setXYZ(i, v.x * 1.25, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: [0xffffff, 0xffe2b0, 0xd9e6ff][seed % 3], metalness: 1, roughness: 0.14, iridescence: 1, iridescenceIOR: 2.1,
      iridescenceThicknessRange: [250, 1300], clearcoat: 1, clearcoatRoughness: 0.05,
    }));
    st.scene.add(mesh);
    contactShadow(st.scene, -1.6, 5, 0.18);
    return { render(t) { mesh.rotation.set(0.3, t * 0.4, 0.1 * Math.sin(t)); st.draw(); } };
  },
};

S3["particle-sphere"] = {
  ground: "#eef0f2", tags: ["hero", "particles", "disintegrate", "red"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed), n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#eef0f2", cam: [0, 0, 7.2], fov: 32 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.25, 128, 96),
      new THREE.MeshPhysicalMaterial({ color: 0xa50f16, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05 }));
    sphere.position.x = -1.1;
    st.scene.add(sphere);
    const N = 70000, base = new Float32Array(N * 3), delay = new Float32Array(N), live = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.acos(1 - 2 * r()), ph = r() * Math.PI * 2;
      let x = Math.sin(th) * Math.cos(ph), y = Math.sin(th) * Math.sin(ph), z = Math.cos(th);
      if (x < -0.2) x = -x * 0.6;  // bias to the trailing side
      base.set([x * 1.26 - 1.1, y * 1.26, z * 1.26], i * 3);
      delay[i] = (1 - x) * 0.55 + r() * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(live, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9c1219, size: 0.016, transparent: true, opacity: 0.85, depthWrite: false }));
    st.scene.add(pts);
    return {
      render(t) {
        const T = 0.6 + t * 0.9;
        for (let i = 0; i < N; i++) {
          const d = Math.max(0, T - delay[i]);
          const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
          const k = d * d;
          live[i * 3] = bx + d * 1.9 + k * 1.6;
          live[i * 3 + 1] = by * (1 - Math.min(0.5, d * 0.35)) + n(bx * 1.5, by * 1.5, d) * k * 1.1;
          live[i * 3 + 2] = bz + n(by * 1.5, bz * 1.5, d + 9) * k * 1.1;
        }
        geo.attributes.position.needsUpdate = true;
        sphere.rotation.y = t * 0.2;
        st.draw();
      },
    };
  },
};

S3["glass-dna"] = {
  ground: "#eceef1", tags: ["glass", "helix", "science"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#eceef1", cam: [0, 0, 7], fov: 34 });
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfd8ea, roughness: 0.08, transmission: 1, thickness: 0.6, ior: 1.4 });
    const wire = new THREE.MeshStandardMaterial({ color: 0x4b5874, metalness: 0.6, roughness: 0.35 });
    const turns = 3.2, len = 9;
    for (const off of [0, Math.PI]) {
      const pts = [];
      for (let i = 0; i <= 200; i++) {
        const a = (i / 200) * turns * Math.PI * 2 + off;
        pts.push(new THREE.Vector3((i / 200 - 0.5) * len, Math.cos(a) * 0.9, Math.sin(a) * 0.9));
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.2, 24), glass));
      const pts2 = pts.map((p, i) => p.clone().add(new THREE.Vector3(0, Math.sin(i * 0.31) * 0.25, Math.cos(i * 0.27) * 0.25)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 400, 0.02, 8), wire));
    }
    for (let i = 0; i < 46; i++) {
      const x = (i / 46 - 0.5) * len, a = (i / 46) * turns * Math.PI * 2;
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 12), glass);
      rung.position.x = x;
      rung.rotation.x = a;
      g.add(rung);
    }
    g.rotation.z = -0.5 + r() * 0.2;
    st.scene.add(g);
    return { render(t) { g.rotation.x = t * 0.5; st.draw(); } };
  },
};

S3["candy-knot"] = {
  ground: "#f0a58f", tags: ["inflatable", "knot", "colour"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#f0a58f", cam: [0, 0.5, 8] });
    const [p, q] = [[2, 3], [2, 5], [3, 4], [3, 5], [2, 7]][Math.floor(r() * 5)];
    const geo = new THREE.TorusKnotGeometry(1, 0.36, 600, 64, p, q);
    const cols = [0xe0322b, 0xf2b322, 0x7a6ae6, 0x2b5fe0].map((c) => new THREE.Color(c));
    const ca = new Float32Array(geo.attributes.position.count * 3);
    const seg = 64 + 1;
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const along = Math.floor(i / seg) / 600;
      cols[Math.floor(along * 6) % 4].toArray(ca, i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(ca, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.7, sheen: 0.4 }));
    st.scene.add(mesh);
    contactShadow(st.scene, -1.6, 5, 0.25);
    return { render(t) { mesh.rotation.set(0.5, t * 0.35 + 0.6, 0.2); st.draw(); } };
  },
};

S3["clay-swarm"] = {
  ground: "#f3f2ef", tags: ["clay", "colour", "swarm", "studio"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#f3f2ef", cam: [0, 0, 8] });
    const pal = [0xd8261c, 0x1d43c8, 0xf0c419, 0x121212, 0xefe6d6, 0xf08a1c];
    const g = new THREE.Group();
    for (let i = 0; i < 70; i++) {
      const a = i * 0.38 + r() * 0.3, rad = 0.3 + i * 0.045;
      const kind = Math.floor(r() * 3);
      const geo = kind === 0 ? new THREE.CapsuleGeometry(0.12 + r() * 0.1, 0.4 + r() * 0.6, 8, 24)
        : kind === 1 ? new THREE.TorusGeometry(0.22 + r() * 0.15, 0.09, 24, 48, Math.PI * (0.8 + r()))
        : new THREE.SphereGeometry(0.12 + r() * 0.14, 32, 24);
      const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: pal[i % pal.length], roughness: 0.45, clearcoat: 0.3 }));
      m.position.set(Math.cos(a) * rad * 1.5, Math.sin(a) * rad, (r() - 0.5) * 1.5);
      m.rotation.set(r() * 6, r() * 6, a + Math.PI / 2);
      g.add(m);
    }
    st.scene.add(g);
    return { render(t) { g.rotation.z = -t * 0.25; g.rotation.y = Math.sin(t * 0.5) * 0.2; st.draw(); } };
  },
};

S3["fuzzy-pill"] = {
  ground: "#eeeeec", tags: ["chrome", "hair", "studio"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed), n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#eeeeec", cam: [0, 0.4, 6.5] });
    const g = new THREE.Group();
    const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.5, 24, 64),
      new THREE.MeshStandardMaterial({ color: 0xcfe36a, metalness: 1, roughness: 0.12 }));
    pill.rotation.z = Math.PI / 2;
    g.add(pill);
    const S = 9000, pos = new Float32Array(S * 6), col = new Float32Array(S * 6);
    const c1 = new THREE.Color(0x8c5bd6), c2 = new THREE.Color(0xf0a7d8), c = new THREE.Color();
    for (let i = 0; i < S; i++) {
      const th = Math.acos(1 - 2 * r()), ph = r() * Math.PI * 2;
      const nx = Math.abs(Math.sin(th) * Math.cos(ph)), ny = Math.sin(th) * Math.sin(ph), nz = Math.cos(th);
      const ox = 0.75 + nx * 0.62, oy = ny * 0.62, oz = nz * 0.62;
      const L = 0.5 + r() * 1.3;
      const bend = n(oy * 3, oz * 3, 1) * 0.6;
      pos.set([ox, oy, oz, ox + nx * L + L * 0.6, oy + ny * L * 0.7 + bend, oz + nz * L * 0.7], i * 6);
      c.copy(c1).lerp(c2, r());
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    lg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 })));
    g.position.x = -0.6;
    st.scene.add(g);
    contactShadow(st.scene, -1.0, 5, 0.25);
    return { render(t) { g.rotation.set(0.15, -0.5 + t * 0.25, 0.05); st.draw(); } };
  },
};

S3["wire-torus"] = {
  ground: "#f1f1f1", tags: ["wireframe", "mesh", "line"],
  make({ canvas, w, h, seed }) {
    const n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#f1f1f1", env: false, cam: [0, 4.2, 5.2] });
    const geo = new THREE.TorusGeometry(1.4, 0.55, 28, 72);
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.multiplyScalar(1 + 0.18 * n(v.x * 0.6, v.y * 0.6, v.z * 0.6));
      pos.setXYZ(i, v.x * 1.15, v.y * 0.8, v.z);
    }
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x55585e, wireframe: true, transparent: true, opacity: 0.8 }));
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf6f6f6, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    const g = new THREE.Group();
    g.add(fill, mesh);
    const grid = new THREE.GridHelper(14, 28, 0xd4d4d4, 0xe2e2e2);
    grid.position.y = -1.3;
    st.scene.add(grid, g);
    return { render(t) { g.rotation.set(Math.PI / 2, 0, t * 0.3); st.draw(); } };
  },
};

S3["exploded-turbine"] = {
  ground: "#f4f5f6", tags: ["cad", "exploded", "engineering", "chrome"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#f4f5f6", cam: [2.5, 2.2, 8.5], fov: 30 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.28 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.8, roughness: 0.4 });
    const g = new THREE.Group(), parts = [];
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 32), metal);
    shaft.rotation.z = Math.PI / 2;
    g.add(shaft);
    const k = 9 + Math.floor(r() * 4);
    for (let i = 0; i < k; i++) {
      const part = new THREE.Group();
      const R = 0.5 + r() * 0.9, type = Math.floor(r() * 3);
      if (type === 0) {
        const blades = 18 + Math.floor(r() * 30);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.35, R * 0.35, 0.25, 48), dark);
        hub.rotation.z = Math.PI / 2;
        part.add(hub);
        const bg = new THREE.BoxGeometry(0.04, R * 0.65, 0.18);
        for (let b = 0; b < blades; b++) {
          const bl = new THREE.Mesh(bg, metal);
          const a = (b / blades) * Math.PI * 2;
          bl.position.set(0, Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66);
          bl.rotation.set(a, 0.5, 0);
          part.add(bl);
        }
      } else if (type === 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06 + r() * 0.08, 16, 96), metal);
        ring.rotation.y = Math.PI / 2;
        part.add(ring);
      } else {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R * (0.7 + r() * 0.4), 0.18 + r() * 0.4, 64, 1, false), r() < 0.5 ? metal : dark);
        disc.rotation.z = Math.PI / 2;
        part.add(disc);
      }
      part.userData.x = (i - (k - 1) / 2) * 0.62;
      parts.push(part);
      g.add(part);
    }
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2457d6 });
    const axis = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.5, 0, 0), new THREE.Vector3(5.5, 0, 0)]);
    g.add(new THREE.Line(axis, lineMat));
    for (let i = 0; i < 14; i++) {
      const x = (r() - 0.5) * 8, y = (r() - 0.2) * 3;
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, y, 0), new THREE.Vector3(x + 0.5, y, 0)]), lineMat));
    }
    st.scene.add(g);
    return {
      render(t) {
        const e = 1 + Math.min(1, t * 0.6) * 0.25;
        parts.forEach((p) => (p.position.x = p.userData.x * e));
        g.rotation.set(0, -0.35 + t * 0.12, 0);
        st.draw();
      },
    };
  },
};

S3["moon"] = {
  ground: "#000000", tags: ["hero", "cosmos", "moon", "closing"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed), n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#000000", env: false, cam: [0, 0, 6.2], fov: 30 });
    const TW = 2048, TH = 1024;
    const alb = document.createElement("canvas"), hgt = document.createElement("canvas");
    alb.width = hgt.width = TW; alb.height = hgt.height = TH;
    const a = alb.getContext("2d"), hh = hgt.getContext("2d");
    const img = a.createImageData(TW, TH);
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const u = (x / TW) * Math.PI * 2, v = (y / TH) * Math.PI;
      const px = Math.sin(v) * Math.cos(u), py = Math.cos(v), pz = Math.sin(v) * Math.sin(u);
      const maria = fbm(n, px * 1.3 + 3, py * 1.3, pz * 1.3, 5) + 0.015;
      const fine = fbm(n, px * 14, py * 14, pz * 14, 3);
      let g = 150 + fine * 40 - (maria > 0.05 ? (maria - 0.05) * 420 : 0);
      g = Math.max(55, Math.min(215, g));
      const i = (y * TW + x) * 4;
      img.data[i] = g; img.data[i + 1] = g * 0.985; img.data[i + 2] = g * 0.96; img.data[i + 3] = 255;
    }
    a.putImageData(img, 0, 0);
    hh.fillStyle = "#808080";
    hh.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 5000; i++) {
      const x = r() * TW, y = TH * 0.08 + r() * TH * 0.84, rad = 1.2 + Math.pow(r(), 9) * 60;
      const gr = hh.createRadialGradient(x, y, 0, x, y, rad * 1.25);
      gr.addColorStop(0, "rgba(70,70,70,0.55)"); gr.addColorStop(0.75, "rgba(100,100,100,0.4)");
      gr.addColorStop(0.86, "rgba(190,190,190,0.45)"); gr.addColorStop(1, "rgba(128,128,128,0)");
      hh.fillStyle = gr; hh.beginPath(); hh.ellipse(x, y, rad * 1.25, rad * 1.25, 0, 0, 7); hh.fill();
      if (rad > 25) {  // bright ray ejecta on big craters
        a.strokeStyle = "rgba(235,235,230,0.10)"; a.lineWidth = 1.2;
        for (let k = 0; k < 40; k++) { const an = r() * 7, L = rad * (2 + r() * 5); a.beginPath(); a.moveTo(x, y); a.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L * 0.6); a.stroke(); }
      }
    }
    const map = new THREE.CanvasTexture(alb); map.colorSpace = THREE.SRGBColorSpace;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.5, 192, 128),
      new THREE.MeshStandardMaterial({ map, bumpMap: new THREE.CanvasTexture(hgt), bumpScale: 1.4, roughness: 1, metalness: 0 }));
    st.scene.add(moon);
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(-5, 1.2, 3.5);
    const copper = new THREE.DirectionalLight(0xb3542a, 0.9); copper.position.set(5, -1, 1.5);
    st.scene.add(key, copper, new THREE.AmbientLight(0x202020, 0.4));
    const sp = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) sp.set([(r() - 0.5) * 60, (r() - 0.5) * 34, -20 - r() * 10], i * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    st.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9aa3b5, size: 0.05 })));
    return { render(t) { moon.rotation.y = 0.6 + t * 0.06; moon.rotation.z = 0.2; st.draw(); } };
  },
};

S3["galaxy"] = {
  ground: "#000000", tags: ["cosmos", "particles", "spiral"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#000000", env: false, cam: [0, 4.2, 6.4], fov: 38 });
    const N = 160000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const core = new THREE.Color(0xffe2b8), arm = new THREE.Color(0x7ea2ff), c = new THREE.Color();
    const arms = 2 + Math.floor(r() * 2);
    for (let i = 0; i < N; i++) {
      const rad = Math.pow(r(), 1.6) * 4.2, br = Math.floor(r() * arms) / arms * Math.PI * 2;
      const sp = rad * 1.25, rnd = () => Math.pow(r(), 3) * (r() < 0.5 ? 1 : -1) * 0.55 * (0.3 + rad * 0.3);
      pos.set([Math.cos(br + sp) * rad + rnd(), rnd() * 0.35, Math.sin(br + sp) * rad + rnd()], i * 3);
      c.copy(core).lerp(arm, Math.min(1, rad / 3.2));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
    pts.rotation.z = 0.35;
    st.scene.add(pts);
    return { render(t) { pts.rotation.y = t * 0.12; st.draw(); } };
  },
};

S3["black-hole"] = {
  ground: "#000000", tags: ["cosmos", "particles", "hero"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#03030a", env: false, cam: [0, 1.1, 7.2], fov: 34 });
    const N = 140000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const rad = 1.15 + Math.pow(r(), 2.2) * 4.5, a = r() * Math.PI * 2;
      pos.set([Math.cos(a) * rad, (r() - 0.5) * 0.06 * rad, Math.sin(a) * rad], i * 3);
      c.setHSL(0.68 - 0.1 * (1 - rad / 5.6), 0.55, 0.45 + 0.4 * Math.max(0, 1.6 - rad / 2));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const disk = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 16, 200), new THREE.MeshBasicMaterial({ color: 0xe8e4ff }));
    const hole = new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    st.scene.add(disk, halo, hole);
    return { render(t) { disk.rotation.y = t * 0.25; halo.lookAt(st.camera.position); st.draw(); } };
  },
};

S3["jellyfish"] = {
  ground: "#000000", tags: ["creature", "glow", "lines"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed), n = makeNoise(seed);
    const st = studio(canvas, w, h, { bg: "#020306", env: false, cam: [0, -0.2, 8.5] });
    const g = new THREE.Group();
    const bellPts = [], bellCol = [];
    const ca = new THREE.Color(0xffb36b), cb = new THREE.Color(0x7fe3ff), c = new THREE.Color();
    for (let i = 0; i < 30000; i++) {
      const th = r() * Math.PI * 0.5, ph = r() * Math.PI * 2, R = 1.3 * (1 + 0.04 * Math.sin(ph * 16));
      bellPts.push(Math.sin(th) * Math.cos(ph) * R, Math.cos(th) * R * 0.7, Math.sin(th) * Math.sin(ph) * R);
      c.copy(ca).lerp(cb, th / (Math.PI * 0.5)); bellCol.push(c.r, c.g, c.b);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(bellPts, 3));
    bg.setAttribute("color", new THREE.Float32BufferAttribute(bellCol, 3));
    g.add(new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
    const tent = [];
    for (let k = 0; k < 90; k++) {
      const a = (k / 90) * Math.PI * 2, R = 0.9 + r() * 0.35;
      const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 60 }, () => new THREE.Vector3()));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: k % 3 ? 0x7fe3ff : 0xffc28a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
      line.userData = { a, R, L: 2 + r() * 2.5 };
      tent.push(line); g.add(line);
    }
    st.scene.add(g);
    return {
      render(t) {
        for (const l of tent) {
          const { a, R, L } = l.userData, p = l.geometry.attributes.position;
          for (let i = 0; i < 60; i++) {
            const s = i / 59, y = -s * L;
            const sway = n(a * 3, s * 2 - t * 0.6, 0) * s * 0.9;
            p.setXYZ(i, Math.cos(a) * R * (1 - s * 0.3) + sway, y, Math.sin(a) * R * (1 - s * 0.3) + sway * 0.6);
          }
          p.needsUpdate = true;
        }
        g.rotation.set(0.25, t * 0.15, 0);
        g.position.y = 0.9;
        st.draw();
      },
    };
  },
};

S3["wire-flower"] = {
  ground: "#d9dde2", tags: ["hero", "xray", "flower", "wireframe", "science"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const st = studio(canvas, w, h, { bg: "#d9dde2", cam: [0, 1.6, 6.6], fov: 34 });
    const g = new THREE.Group();
    const petals = 7 + Math.floor(r() * 4);
    for (let i = 0; i < petals; i++) {
      const geo = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 0.55, 0, Math.PI * 0.5);
      geo.scale(1.7, 0.5, 0.9);
      const a = (i / petals) * Math.PI * 2;
      const solid = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: i % 2 ? 0x9f7ae0 : 0x7fb0c8, transparent: true, opacity: 0.45, roughness: 0.3, side: THREE.DoubleSide, iridescence: 0.6 }));
      const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3e2f6b, wireframe: true, transparent: true, opacity: 0.45 }));
      const p = new THREE.Group(); p.add(solid, wire);
      p.rotation.set(0.35, a, -0.25);
      g.add(p);
    }
    const F = 2600, fp = new Float32Array(F * 6), fc = new Float32Array(F * 6);
    const y1 = new THREE.Color(0xe6c02a), v1 = new THREE.Color(0x8e86f0), c = new THREE.Color();
    for (let i = 0; i < F; i++) {
      const a = r() * Math.PI * 2, rr = r() * 0.5, L = 0.45 + r() * 0.8, spread = 0.5 + r() * 1.2;
      fp.set([Math.cos(a) * rr, 0.2, Math.sin(a) * rr, Math.cos(a) * (rr + spread * L * 0.7), 0.2 + L, Math.sin(a) * (rr + spread * L * 0.7)], i * 6);
      c.copy(y1).lerp(v1, r()); fc.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(fp, 3)); fg.setAttribute("color", new THREE.BufferAttribute(fc, 3));
    g.add(new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 })));
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 32), new THREE.MeshStandardMaterial({ color: 0x48d6c8, wireframe: true }));
    core.scale.set(1, 0.7, 1); g.add(core);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3, 16), new THREE.MeshStandardMaterial({ color: 0x5fd0c0, roughness: 0.5 }));
    stem.position.y = -1.6; g.add(stem);
    g.position.y = -0.1;
    st.scene.add(g);
    return { render(t) { g.rotation.y = t * 0.3; st.draw(); } };
  },
};

S3["retro-terminal"] = {
  ground: "#d6d5d1", tags: ["origin", "computer", "terminal", "hero"],
  // opts: { product, prompt, info: [[k, v]...], code: [lines], push: true }
  make({ canvas, w, h, seed, opts = {} }) {
    const product = opts.product || "Atlas Code", prompt = opts.prompt || "Build a complex procedural 3D scene in Three.js.";
    const info = opts.info || [["Directory:", "/Users/you"], ["Model:", "Atlas 1.0"], ["Version:", "1.0.0"]];
    const code = opts.code || CODE_BANK;
    const st = studio(canvas, w, h, { bg: "#d6d5d1", cam: [0, 1.2, 12.5], fov: 28, exposure: 0.9 });
    const beige = new THREE.MeshStandardMaterial({ color: 0xbdb196, roughness: 0.62 });
    const beige2 = new THREE.MeshStandardMaterial({ color: 0xb3a78c, roughness: 0.7 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 });
    const rr = (wd, ht, rad) => { const sh = new THREE.Shape(), x = -wd / 2, y = -ht / 2;
      sh.moveTo(x + rad, y); sh.lineTo(x + wd - rad, y); sh.quadraticCurveTo(x + wd, y, x + wd, y + rad); sh.lineTo(x + wd, y + ht - rad);
      sh.quadraticCurveTo(x + wd, y + ht, x + wd - rad, y + ht); sh.lineTo(x + rad, y + ht); sh.quadraticCurveTo(x, y + ht, x, y + ht - rad);
      sh.lineTo(x, y + rad); sh.quadraticCurveTo(x, y, x + rad, y); return sh; };
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(4.6, 3.8, 0.25), { depth: 3.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4 }), beige);
    body.position.set(0, 1.9, -3.2); g.add(body);
    const bezelShape = rr(4.1, 3.3, 0.3); bezelShape.holes.push(rr(3.45, 2.6, 0.35));
    const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bezelShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 }), beige2);
    bezel.position.set(0, 1.95, 0.1); g.add(bezel);
    const TW = 1024, TH = 768, tc = document.createElement("canvas"); tc.width = TW; tc.height = TH;
    const tx = tc.getContext("2d"), tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.PlaneGeometry(3.45, 2.6, 40, 30), sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) / 1.75, y = sp.getY(i) / 1.3; sp.setZ(i, 0.12 * (1 - x * x * 0.6 - y * y * 0.6)); }
    sg.computeVertexNormals();
    const screen = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(0, 1.95, 0.1); g.add(screen);
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(4.8, 1.2, 0.12), { depth: 3.6, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }), beige);
    base.position.set(0, -0.75, -3.4); g.add(base);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.05), darkM); slot.position.set(1.15, -0.72, 0.25); g.add(slot);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: 0x3a3a3a })); led.position.set(-1.9, -0.8, 0.25); g.add(led);
    const kb = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(5.4, 0.3, 0.08), { depth: 2.0, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), beige);
    kb.position.set(0, -1.55, 1.2); kb.rotation.x = 0.05; g.add(kb);
    const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.14, 0.26), new THREE.MeshStandardMaterial({ color: 0xc8bea6, roughness: 0.55 }), 15 * 5);
    const m4 = new THREE.Matrix4(); let ki = 0;
    for (let row = 0; row < 5; row++) for (let col = 0; col < 15; col++) { m4.makeTranslation(-2.35 + col * 0.33 + (row % 2) * 0.08, -1.32, 1.5 + row * 0.33); keys.setMatrixAt(ki++, m4); }
    g.add(keys);
    st.scene.add(g);
    contactShadow(st.scene, -1.75, 11, 0.3);
    const drawTerm = (t) => {
      tx.fillStyle = "#2c3532"; tx.fillRect(0, 0, TW, TH);
      tx.font = "17px 'JetBrains Mono', Menlo, monospace"; tx.textBaseline = "top";
      tx.strokeStyle = "#8fa39b"; tx.lineWidth = 1.2; tx.strokeRect(36, 40, TW - 72, 128);
      tx.fillStyle = "#7fe0c8"; tx.fillRect(56, 58, 34, 26); tx.fillStyle = "#2c3532"; tx.fillRect(64, 66, 5, 8); tx.fillRect(77, 66, 5, 8);
      tx.fillStyle = "#e6efe9"; tx.fillText(`Welcome to ${product}!`, 108, 56);
      tx.fillStyle = "#8fa39b"; tx.fillText("Send /help for help information.", 108, 78);
      info.forEach(([k, v], i) => { tx.fillStyle = "#8fa39b"; tx.fillText(k, 56, 104 + i * 20); tx.fillStyle = "#e6efe9"; tx.fillText(v, 170, 104 + i * 20); });
      const typed = Math.max(0, Math.floor((t - 0.25) * 34));
      tx.fillStyle = "#f2d36b"; tx.fillText("●", 40, 196);
      tx.fillStyle = "#e6efe9"; tx.fillText(prompt.slice(0, typed) + (typed < prompt.length && Math.floor(t * 4) % 2 ? "▍" : ""), 64, 196);
      if (typed >= prompt.length) {
        const shown = Math.floor(Math.max(0, t - 0.25 - prompt.length / 34) * 22);
        tx.fillStyle = "#7fe0c8"; tx.fillText("● Using Write (./scene.js)", 56, 230);
        for (let i = 0; i < Math.min(shown, 22); i++) {
          const L = code[(i + seed) % code.length];
          tx.fillStyle = "#5e6f69"; tx.fillText(String(i + 4).padStart(3, " "), 56, 258 + i * 21);
          tx.fillStyle = /const|new|for|function|return/.test(L) ? "#9fe6c2" : "#d5e2db";
          tx.fillText(L, 100, 258 + i * 21);
        }
      }
      tx.fillStyle = "#8fa39b"; tx.fillText(`${product} · thinking: high`, 40, TH - 40);
      tx.fillStyle = "rgba(0,0,0,0.13)";
      for (let y = 0; y < TH; y += 3) tx.fillRect(0, y, TW, 1);
      const vg = tx.createRadialGradient(TW / 2, TH / 2, TH * 0.35, TW / 2, TH / 2, TW * 0.62);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
      tx.fillStyle = vg; tx.fillRect(0, 0, TW, TH);
      tex.needsUpdate = true;
    };
    return {
      render(t) {
        drawTerm(t);
        const p = opts.push === false ? 0 : Math.min(1, t / 2.2);
        const e = 1 - Math.pow(1 - p, 2);
        st.camera.position.set(0, 1.2 + e * 0.75, 12.5 - e * 4.6);
        st.camera.lookAt(0, 1.0 + e * 0.85, 0);
        st.draw();
      },
    };
  },
};

// ---------------------------------------------------------------- 2D specimens

const S2 = {};

S2["radial-lines"] = {
  ground: "#ffffff", tags: ["line", "drawing", "minimal"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const lines = Array.from({ length: 1400 }, () => ({ a: r(), l: r(), o: r(), wd: r() }));
    const gap = 0.02 + r() * 0.05;
    return {
      render(t) {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.5, R = 470 * s;
        for (const L of lines) {
          const a = (gap + L.a * (1 - gap)) * Math.PI * 2 + t * 0.15 - Math.PI / 2;
          const r0 = R * (0.04 + 0.25 * L.o * L.o), r1 = R * (0.55 + 0.45 * L.l);
          ctx.strokeStyle = `rgba(20,24,32,${0.25 + 0.6 * L.wd})`; ctx.lineWidth = (0.4 + L.wd) * s;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
        }
      },
    };
  },
};

S2["attractor-ribbons"] = {
  ground: "#ffffff", tags: ["line", "science", "colour", "orbit"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const cols = ["#d42a2a", "#1f3fcf", "#f2b51c", "#1c9ad6", "#e7552b"];
    const rings = Array.from({ length: 34 }, (_, i) => ({ rx: 260 + r() * 300, ry: 90 + r() * 150, rot: r() * Math.PI, c: cols[i % cols.length], w: 0.6 + r() * 2.2, ph: r() * 6, a: 0.25 + r() * 0.6 }));
    return {
      render(t) {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(s, s);
        for (const R of rings) {
          ctx.strokeStyle = R.c; ctx.globalAlpha = R.a; ctx.lineWidth = R.w; ctx.beginPath();
          for (let k = 0; k <= 240; k++) {
            const u = (k / 240) * Math.PI * 2, wob = 1 + 0.08 * Math.sin(u * 3 + R.ph + t);
            const x = Math.cos(u) * R.rx * wob, y = Math.sin(u) * R.ry * wob;
            const rot = R.rot + t * 0.1;
            const X = x * Math.cos(rot) - y * Math.sin(rot), Y = x * Math.sin(rot) + y * Math.cos(rot);
            k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          ctx.stroke();
        }
        ctx.restore(); ctx.globalAlpha = 1;
      },
    };
  },
};

S2["vascular-tree"] = {
  ground: "#ffffff", tags: ["branching", "botanical", "blue", "drawing"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const segs = [];
    (function grow(x, y, a, len, wd, d) {
      if (d > 11 || len < 4) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push([x, y, x2, y2, wd, d]);
      const n = d < 2 ? 2 : r() < 0.75 ? 2 : 3;
      for (let i = 0; i < n; i++) grow(x2, y2, a + (r() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.35, len * (0.7 + r() * 0.15), wd * 0.68, d + 1);
    })(0, 0, -Math.PI / 2, 230, 30, 0);
    const color = ["#1d3fbf", "#173a9c", "#2b6f3e"][Math.floor(r() * 3)];
    return {
      render(t) {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(w / 2, h * 0.98); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineCap = "round";
        const grow = Math.min(1, 0.75 + t * 0.4);
        for (const [x, y, x2, y2, wd, d] of segs) {
          if (d / 11 > grow) continue;
          ctx.lineWidth = Math.max(0.5, wd); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.restore();
      },
    };
  },
};

S2["flow-lines"] = {
  ground: "#f7f7f7", tags: ["science", "cfd", "streamlines", "colour"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const a = 150 + r() * 60, U = 1;
    const vel = (x, y) => {  // potential flow past a cylinder of radius a
      const r2 = x * x + y * y, a2 = a * a;
      return [U * (1 - (a2 * (x * x - y * y)) / (r2 * r2)), (-U * 2 * a2 * x * y) / (r2 * r2)];
    };
    const seeds = Array.from({ length: 90 }, (_, i) => -h / s / 2 + (i + 0.5) * (h / s / 90) + (r() - 0.5) * 4);
    return {
      render(t) {
        ctx.fillStyle = "#f7f7f7"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(s, s);
        for (const y0 of seeds) {
          let x = -w / s / 2 - 20 + ((t * 60) % 40), y = y0;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 900; k++) {
            const [vx, vy] = vel(x, y), sp = Math.hypot(vx, vy);
            x += (vx / sp) * 3; y += (vy / sp) * 3;
            if (x * x + y * y < a * a * 1.02) break;
            ctx.lineTo(x, y);
            if (x > w / s / 2 + 20) break;
          }
          const sp = Math.min(1, Math.abs(y0) / a);
          ctx.strokeStyle = `hsl(${220 - 200 * (1 - sp)}, 80%, ${45 + 10 * sp}%)`; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.85; ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const grd = ctx.createLinearGradient(-a, -a, a, a);
        grd.addColorStop(0, "#f2f3f5"); grd.addColorStop(0.5, "#8c929c"); grd.addColorStop(1, "#2e3238");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, a, 0, 7); ctx.fill();
        ctx.restore();
      },
    };
  },
};

S2["blueprint"] = {
  ground: "#f3f1ea", tags: ["drawing", "technical", "paper", "archive"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const circles = Array.from({ length: 9 }, () => 40 + r() * 330);
    const teeth = 24 + Math.floor(r() * 30);
    const notes = Array.from({ length: 22 }, () => ({ x: (r() - 0.5) * 1700, y: (r() - 0.5) * 900, n: Math.floor(r() * 9999) }));
    return {
      render(t) {
        ctx.fillStyle = "#f3f1ea"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(w * 0.5, h * 0.5); ctx.scale(s, s);
        const ink = "rgba(30,32,38,0.85)";
        ctx.strokeStyle = ink; ctx.lineWidth = 1;
        ctx.setLineDash([24, 6, 3, 6]);
        ctx.beginPath(); ctx.moveTo(-900, 0); ctx.lineTo(900, 0); ctx.moveTo(0, -500); ctx.lineTo(0, 500); ctx.stroke();
        ctx.setLineDash([]);
        for (const c of circles) { ctx.beginPath(); ctx.arc(0, 0, c, 0, 7); ctx.stroke(); }
        ctx.beginPath();
        for (let i = 0; i <= teeth * 4; i++) {
          const a = (i / (teeth * 4)) * Math.PI * 2 + t * 0.05, R = 300 + ((Math.floor(i / 2) % 2) ? 22 : 0);
          i ? ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R) : ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
        }
        ctx.lineWidth = 1.6; ctx.stroke();
        ctx.lineWidth = 0.6;
        for (let k = -40; k < 40; k++) { ctx.beginPath(); ctx.moveTo(-620 + k * 9, 200); ctx.lineTo(-560 + k * 9, 140); ctx.stroke(); }
        ctx.font = "13px 'IBM Plex Mono', 'Courier New', monospace"; ctx.fillStyle = ink;
        for (const N of notes) {
          ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(N.x + 60, N.y); ctx.stroke();
          ctx.fillText(`Ø${(N.n / 100).toFixed(2)}  R${N.n % 97}`, N.x + 4, N.y - 5);
        }
        ctx.strokeStyle = "rgba(200,40,40,0.75)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(140, -120, 60, 0.3, 5.2); ctx.stroke();
        ctx.restore();
      },
    };
  },
};

S2["contour-terrain"] = {
  ground: "#000000", tags: ["data", "terrain", "line", "dark"],
  make({ canvas, w, h, seed }) {
    const n = makeNoise(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    return {
      render(t) {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
        const rows = 70;
        for (let j = 0; j < rows; j++) {
          const z = j / rows, y0 = h * (0.25 + z * 0.7), sc = 0.4 + z * 0.9;
          ctx.beginPath();
          for (let i = 0; i <= 240; i++) {
            const x = i / 240;
            const ht = Math.max(0, fbm(n, x * 4, z * 4 + t * 0.2, 0.5, 4) + 0.15) * 520 * s * Math.exp(-Math.pow((x - 0.5) * 2.4, 2));
            const X = w * 0.5 + (x - 0.5) * w * sc, Y = y0 - ht * sc;
            i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          ctx.strokeStyle = `hsl(${150 - z * 120}, 85%, ${45 + z * 15}%)`; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.2 * s; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

S2["nautilus-section"] = {
  ground: "#000000", tags: ["shell", "spiral", "hero", "pearl"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const b = 0.17 + r() * 0.02, a0 = 15;
    const R = (th) => a0 * Math.exp(b * th);
    return {
      render(t) {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(w * 0.43, h * 0.53); ctx.scale(s, s); ctx.rotate(2.5 + t * 0.05);
        const TH = Math.PI * 2 * 3.05;
        const grd = ctx.createRadialGradient(-80, -60, 20, 0, 0, 520);
        grd.addColorStop(0, "#fbfbfb"); grd.addColorStop(0.4, "#c9ccd3"); grd.addColorStop(0.75, "#8d93a0"); grd.addColorStop(1, "#e9e3da");
        ctx.beginPath();
        for (let th = 0; th <= TH; th += 0.02) { const rr = R(th); ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr); }
        ctx.fillStyle = grd; ctx.fill();
        ctx.strokeStyle = "rgba(40,40,48,0.55)"; ctx.lineWidth = 2;
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          for (let th = 0; th <= TH; th += 0.02) { const rr = R(th - k * Math.PI * 2); ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr); }
          ctx.stroke();
        }
        for (let th = 2; th <= TH; th += 0.32) {  // septa: curved chamber walls
          const ro = R(th), ri = R(th - Math.PI * 2);
          const x1 = Math.cos(th) * ro, y1 = Math.sin(th) * ro, x2 = Math.cos(th) * ri, y2 = Math.sin(th) * ri;
          ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo((x1 + x2) / 2 + Math.cos(th + 1.2) * (ro - ri) * 0.35, (y1 + y2) / 2 + Math.sin(th + 1.2) * (ro - ri) * 0.35, x2, y2);
          ctx.stroke();
          ctx.strokeStyle = "rgba(60,60,70,0.35)"; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
      },
    };
  },
};

S2["swiss-poster"] = {
  ground: "#ffffff", tags: ["graphic", "type", "poster", "orange"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const glyphs = ["73", "07", "K3", "24", "91", "A1", "1.0", "∞"][Math.floor(r() * 8)];
    const accent = ["#f0571f", "#1c43e0", "#e61e2b"][Math.floor(r() * 3)];
    return {
      render(t) {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.scale(s, s);
        ctx.fillStyle = "#0b0b0b"; ctx.font = "900 820px 'Archivo Black', 'Helvetica Neue', Arial, sans-serif"; ctx.textBaseline = "alphabetic";
        ctx.fillText(glyphs, 40, 960);
        ctx.fillStyle = accent; ctx.fillRect(780 + t * 40, 300, 760, 120);
        ctx.fillStyle = "#1c2fd6";
        for (let i = 0; i < 26; i++) ctx.fillRect(1200, 520 + i * 9, 560, 3);
        ctx.fillStyle = "#111"; ctx.font = "15px 'IBM Plex Mono', monospace";
        for (let i = 0; i < 9; i++) ctx.fillText(["SPECIMEN", "N°" + (i * 37 + 11), "SCALE 1:1", "SERIES A", "ISO 216"][i % 5], 1540, 140 + i * 22);
        ctx.restore();
      },
    };
  },
};

S2["code-sheet"] = {
  ground: "#0d1015", tags: ["code", "terminal", "dark", "glitch-insert"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const lines = Array.from({ length: 60 }, () => CODE_BANK[Math.floor(r() * CODE_BANK.length)]);
    return {
      render(t) {
        ctx.fillStyle = "#0d1015"; ctx.fillRect(0, 0, w, h);
        ctx.font = `${20 * s}px 'JetBrains Mono', Menlo, monospace`;
        const off = Math.floor(t * 12);
        for (let i = 0; i < 44; i++) {
          const L = lines[(i + off) % lines.length], y = (60 + i * 24) * s;
          ctx.fillStyle = "#5b6577"; ctx.fillText(String(100 + i + off).padStart(4, "0"), 40 * s, y);
          ctx.fillStyle = /const|new|for|function|return|export/.test(L) ? "#c3e88d" : "#89ddff";
          ctx.fillText(L, 130 * s, y);
        }
      },
    };
  },
};

S2["fastener-grid"] = {
  ground: "#ffffff", tags: ["engineering", "grid", "chrome", "specimen-sheet"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const items = Array.from({ length: 18 }, () => ({ k: Math.floor(r() * 4), rot: r() * 6, tone: 0.6 + r() * 0.4 }));
    return {
      render(t) {
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
        items.forEach((it, i) => {
          const cx = (230 + (i % 6) * 292) * s, cy = (220 + Math.floor(i / 6) * 320) * s, R = 105 * s;
          const g = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.5, R * 0.1, cx, cy, R);
          const v = Math.floor(220 * it.tone);
          g.addColorStop(0, `rgb(${v + 30},${v + 30},${v + 32})`); g.addColorStop(0.7, `rgb(${v * 0.6},${v * 0.6},${v * 0.62})`); g.addColorStop(1, `rgb(${v * 0.3},${v * 0.3},${v * 0.32})`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(it.rot + t * 0.2); ctx.fillStyle = "rgba(20,20,24,0.85)";
          if (it.k === 0) { ctx.fillRect(-R * 0.6, -R * 0.09, R * 1.2, R * 0.18); ctx.fillRect(-R * 0.09, -R * 0.6, R * 0.18, R * 1.2); }
          else if (it.k === 1) { ctx.beginPath(); for (let j = 0; j < 6; j++) ctx.lineTo(Math.cos(j * 1.047) * R * 0.4, Math.sin(j * 1.047) * R * 0.4); ctx.fill(); }
          else if (it.k === 2) { ctx.beginPath(); for (let j = 0; j < 12; j++) { const rr = j % 2 ? R * 0.22 : R * 0.45; ctx.lineTo(Math.cos(j * 0.5236) * rr, Math.sin(j * 0.5236) * rr); } ctx.fill(); }
          else { for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.arc(Math.cos(j * 0.785) * R * 0.6, Math.sin(j * 0.785) * R * 0.6, R * 0.09, 0, 7); ctx.fill(); } }
          ctx.restore();
        });
      },
    };
  },
};

S2["frost-dendrite"] = {
  ground: "#000000", tags: ["crystal", "ice", "branching", "dark"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const segs = [];
    (function arm(x, y, a, len, d) {
      if (d > 6 || len < 3) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push([x, y, x2, y2, d]);
      const n = 3 + Math.floor(r() * 5);
      for (let i = 1; i <= n; i++) {
        const f = i / (n + 1), bx = x + (x2 - x) * f, by = y + (y2 - y) * f, bl = len * (0.35 - f * 0.2) * (0.8 + r() * 0.4);
        arm(bx, by, a + Math.PI / 3, bl, d + 1); arm(bx, by, a - Math.PI / 3, bl, d + 1);
      }
    })(-760, 260, -0.32, 1500, 0);
    return {
      render(t) {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.lineCap = "round";
        const grow = Math.min(1, 0.7 + t * 0.5);
        for (const [x, y, x2, y2, d] of segs) {
          if (d / 6 > grow) continue;
          ctx.strokeStyle = `rgba(235,240,248,${0.9 - d * 0.1})`; ctx.lineWidth = Math.max(0.6, 4 - d * 0.7);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.restore();
      },
    };
  },
};

S2["murmuration"] = {
  ground: "#dfe3e6", tags: ["creature", "swarm", "sky", "particles"],
  make({ canvas, w, h, seed }) {
    const r = mulberry32(seed), n = makeNoise(seed);
    const { ctx, s } = canvas2d(canvas, w, h);
    const birds = Array.from({ length: 26000 }, () => { const a = r() * Math.PI * 2, rr = Math.sqrt(r()); return [Math.cos(a) * rr, Math.sin(a) * rr, r()]; });
    return {
      render(t) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#cdd3d8"); g.addColorStop(0.85, "#eef0f1"); g.addColorStop(0.86, "#8a7a68"); g.addColorStop(1, "#6b5d4e");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(15,15,18,0.85)";
        for (const [x, y, z] of birds) {
          const warp = n(x * 1.4 + t * 0.4, y * 1.4, z) * 0.55;
          const X = w * 0.5 + (x * 520 + warp * 260 + y * 160) * s, Y = h * 0.55 + (y * 150 + warp * 120 - x * 110) * s;
          const sz = (0.9 + z * 1.6) * s; ctx.fillRect(X, Y, sz, sz * 0.7);
        }
      },
    };
  },
};

// ---------------------------------------------------------------- registry + mount

export const SPECIMENS = {};
for (const [k, v] of Object.entries(S3)) SPECIMENS[k] = { ...v, kind: "3d" };
for (const [k, v] of Object.entries(S2)) SPECIMENS[k] = { ...v, kind: "2d" };

export async function mountSpecimen(canvas, name, { seed = 1, width = 1920, height = 1080, opts = {} } = {}) {
  const spec = SPECIMENS[name];
  if (!spec) throw new Error(`unknown specimen ${name}; have: ${Object.keys(SPECIMENS).join(", ")}`);
  canvas.width = width;
  canvas.height = height;
  const inst = spec.make({ canvas, w: width, h: height, seed, opts });
  return { ...inst, ground: spec.ground, kind: spec.kind, tags: spec.tags };
}

export { CODE_BANK };
