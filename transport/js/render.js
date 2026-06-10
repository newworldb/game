'use strict';
/* global THREE */
// 3D renderer (Three.js). Same public surface as the old 2D renderer:
// Render.init(), Render.draw(), Render.cv, Render.w/h, plus Render.s2w()
// which Input uses for picking/panning (ray onto the ground plane).
// World mapping: tile (x,y) -> 3D (x..x+1, height, y..y+1), tile units.
const Render = {
  cv: null, w: 0, h: 0,
  renderer: null, scene: null, camera: null, sun: null,
  raycaster: null, groundPlane: null,
  terrainMesh: null, netMesh: null,
  treeTrunks: null, treeCones: null, treeBalls: null,
  houseMesh: null, houseRoofMesh: null,
  bldGroup: null, vehGroup: null, ovlGroup: null, labelGroup: null, cloudGroup: null,
  waveTex: null,
  _terrainVer: -1, _netVer: -1, _bldSig: '', _stateRef: null,
  _vehMeshes: new Map(), _labels: new Map(), _ovlKey: '', _previewRef: null,
  _previewMesh: null, _rings: [], _smoke: [], _peeps: null,
  _last: 0, _time: 0,

  HILL_H: 0.45,
  PEEP_COLORS: [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1, 0x2c3e50, 0xd35400, 0x16a085],

  init(){
    if (typeof THREE === 'undefined') throw new Error('three.js failed to load');
    Render.cv = document.getElementById('game');
    Render.renderer = new THREE.WebGLRenderer({ canvas: Render.cv, antialias: true });
    Render.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    Render.renderer.shadowMap.enabled = true;
    Render.renderer.shadowMap.type = THREE.PCFShadowMap;
    const sc = Render.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x9cc4e0);
    sc.fog = new THREE.Fog(0x9cc4e0, 120, 280);
    Render.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 400);
    sc.add(new THREE.HemisphereLight(0xd6e6ff, 0x47663f, 0.75));
    const sun = Render.sun = new THREE.DirectionalLight(0xfff2d0, 0.9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.0006;
    sc.add(sun);
    sc.add(sun.target);
    Render.raycaster = new THREE.Raycaster();
    Render.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // sea: dark bed + animated wave surface, oversized for the horizon
    const bed = new THREE.Mesh(
      new THREE.PlaneGeometry(G.W + 160, G.H + 160),
      new THREE.MeshLambertMaterial({ color: 0x1d4569 }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(G.W / 2, -0.42, G.H / 2);
    sc.add(bed);
    Render.waveTex = Render.makeWaveTexture();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(G.W + 160, G.H + 160),
      new THREE.MeshLambertMaterial({ map: Render.waveTex, transparent: true, opacity: 0.86 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(G.W / 2, -0.1, G.H / 2);
    sea.receiveShadow = true;
    sc.add(sea);

    Render.bldGroup = new THREE.Group(); sc.add(Render.bldGroup);
    Render.vehGroup = new THREE.Group(); sc.add(Render.vehGroup);
    Render.ovlGroup = new THREE.Group(); sc.add(Render.ovlGroup);
    Render.labelGroup = new THREE.Group(); sc.add(Render.labelGroup);
    Render.makeClouds();

    Render.resize();
    window.addEventListener('resize', Render.resize);
  },

  resize(){
    Render.w = window.innerWidth;
    Render.h = window.innerHeight;
    Render.renderer.setSize(Render.w, Render.h, false);
  },

  tileH(x, y){
    if (!Game.inb(x, y)) return -0.5;
    const t = G.state.terrain[y * G.W + x];
    if (t === 0) return -0.5;
    return t === 3 ? Render.HILL_H : 0;
  },

  syncCamera(){
    const cam = G.cam, c = Render.camera;
    const rot = cam.rot || 0;
    const halfH = 14 / cam.zoom;
    const aspect = Render.w / Math.max(1, Render.h);
    c.left = -halfH * aspect; c.right = halfH * aspect;
    c.top = halfH; c.bottom = -halfH;
    const pitch = 0.72, dist = 110;
    c.position.set(
      cam.x + Math.cos(pitch) * Math.sin(rot) * dist,
      Math.sin(pitch) * dist,
      cam.y + Math.cos(pitch) * Math.cos(rot) * dist);
    c.lookAt(cam.x, 0, cam.y);
    c.updateProjectionMatrix();
    // shadow frustum follows the view
    const sun = Render.sun;
    sun.position.set(cam.x + 45, 80, cam.y + 25);
    sun.target.position.set(cam.x, 0, cam.y);
    sun.target.updateMatrixWorld();
    const sh = sun.shadow.camera;
    const r = Math.max(26, halfH * aspect + 10);
    if (Math.abs(sh.right - r) > 1){
      sh.left = -r; sh.right = r; sh.top = r; sh.bottom = -r;
      sh.updateProjectionMatrix();
    }
  },

  // screen px -> [tileX, tileY] on the ground plane (or null)
  s2w(px, py){
    Render.syncCamera();
    Render.raycaster.setFromCamera(
      new THREE.Vector2((px / Render.w) * 2 - 1, -(py / Render.h) * 2 + 1),
      Render.camera);
    const p = new THREE.Vector3();
    if (!Render.raycaster.ray.intersectPlane(Render.groundPlane, p)) return null;
    return [p.x, p.z];
  },

  // ---- procedural textures ----
  makeWaveTexture(){
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = 128;
    const c = cnv.getContext('2d');
    c.fillStyle = '#3a86c4';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(255,255,255,0.10)';
    c.lineWidth = 2;
    for (let i = 0; i < 26; i++){
      const x = Math.random() * 128, y = Math.random() * 128, r = 6 + Math.random() * 14;
      c.beginPath();
      c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(44, 44);
    return tex;
  },

  makeWallTexture(){
    if (Render._wallTex) return Render._wallTex;
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = 64;
    const c = cnv.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(30,40,60,0.85)';
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 3; col++)
        c.fillRect(8 + col * 18, 14 + row * 24, 10, 13);
    const tex = new THREE.CanvasTexture(cnv);
    Render._wallTex = tex;
    return tex;
  },

  makePuffTexture(){
    if (Render._puffTex) return Render._puffTex;
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = 64;
    const c = cnv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    Render._puffTex = new THREE.CanvasTexture(cnv);
    return Render._puffTex;
  },

  makeClouds(){
    Render.cloudGroup = new THREE.Group();
    const tex = Render.makePuffTexture();
    for (let i = 0; i < 9; i++){
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false }));
      const sc = 7 + U.hash2(i, 1, 91) * 9;
      spr.scale.set(sc * 1.6, sc * 0.7, 1);
      spr.position.set(U.hash2(i, 2, 92) * (G.W + 60) - 30, 22 + U.hash2(i, 3, 93) * 8, U.hash2(i, 4, 94) * G.H);
      spr.userData.speed = 0.25 + U.hash2(i, 5, 95) * 0.4;
      Render.cloudGroup.add(spr);
    }
    Render.scene.add(Render.cloudGroup);
  },

  // ---- manual geometry builder (quads with vertex colors) ----
  geoB(){
    return {
      pos: [], col: [], idx: [], n: 0,
      // a,b,c,d counter-clockwise as seen from the face direction
      quad(a, b, c, d, col){
        this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        for (let i = 0; i < 4; i++) this.col.push(col.r, col.g, col.b);
        this.idx.push(this.n, this.n + 1, this.n + 2, this.n, this.n + 2, this.n + 3);
        this.n += 4;
      },
      // horizontal quad (normal +y), tile-rect x0..x1, z0..z1 at height y
      flat(x0, z0, x1, z1, y, col){
        this.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], col);
      },
      build(){
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
        g.setIndex(this.idx);
        g.computeVertexNormals();
        return g;
      },
    };
  },

  vcMat(){
    return new THREE.MeshLambertMaterial({ vertexColors: true });
  },

  swap(name, mesh){
    const old = Render[name];
    if (old){
      Render.scene.remove(old);
      old.geometry.dispose();
      if (old.material.dispose) old.material.dispose();
    }
    Render[name] = mesh;
    if (mesh) Render.scene.add(mesh);
  },

  // ---- terrain + trees ----
  buildTerrain(){
    const s = G.state, b = Render.geoB(), c = new THREE.Color();
    const GR = [0x6da45a, 0x68a055, 0x72aa5f, 0x63994f];
    const isWater = (x, y) => !Game.inb(x, y) || s.terrain[y * G.W + x] === 0;
    for (let y = 0; y < G.H; y++){
      for (let x = 0; x < G.W; x++){
        const t = s.terrain[y * G.W + x];
        if (t === 0) continue;
        const h = t === 3 ? Render.HILL_H : 0;
        const beach = t === 1 && !s.net[y * G.W + x] &&
          (isWater(x + 1, y) || isWater(x - 1, y) || isWater(x, y + 1) || isWater(x, y - 1));
        if (t === 3) c.set(U.hash2(x, y, 7) > 0.5 ? 0x96916f : 0x8d8868);
        else if (beach) c.set(U.hash2(x, y, 7) > 0.5 ? 0xd9c48a : 0xd2bc7f);
        else c.set(GR[(U.hash2(x, y, 3) * 4) | 0]);
        b.flat(x, y, x + 1, y + 1, h, c);
        // skirts down to lower neighbors / sea floor
        const side = new THREE.Color(c).multiplyScalar(0.72);
        const nh = (nx, ny) => Render.tileH(nx, ny);
        if (nh(x, y + 1) < h) b.quad([x + 1, h, y + 1], [x, h, y + 1], [x, nh(x, y + 1), y + 1], [x + 1, nh(x, y + 1), y + 1], side);
        if (nh(x, y - 1) < h) b.quad([x, h, y], [x + 1, h, y], [x + 1, nh(x, y - 1), y], [x, nh(x, y - 1), y], side);
        if (nh(x + 1, y) < h) b.quad([x + 1, h, y], [x + 1, h, y + 1], [x + 1, nh(x + 1, y), y + 1], [x + 1, nh(x + 1, y), y], side);
        if (nh(x - 1, y) < h) b.quad([x, h, y + 1], [x, h, y], [x, nh(x - 1, y), y], [x, nh(x - 1, y), y + 1], side);
      }
    }
    const mesh = new THREE.Mesh(b.build(), Render.vcMat());
    mesh.receiveShadow = true;
    Render.swap('terrainMesh', mesh);
    Render.buildTrees();
  },

  buildTrees(){
    const s = G.state;
    const spots = [];
    for (let y = 0; y < G.H; y++)
      for (let x = 0; x < G.W; x++)
        if (s.terrain[y * G.W + x] === 2){
          spots.push([x + 0.32 + U.hash2(x, y, 11) * 0.3, y + 0.34 + U.hash2(x, y, 13) * 0.3, 0.55 + U.hash2(x, y, 17) * 0.4, U.hash2(x, y, 37)]);
          spots.push([x + 0.62 + U.hash2(x, y, 19) * 0.3, y + 0.66 - U.hash2(x, y, 23) * 0.3, 0.45 + U.hash2(x, y, 29) * 0.35, U.hash2(x, y, 43)]);
        }
    for (const name of ['treeTrunks', 'treeCones', 'treeBalls']){
      const old = Render[name];
      if (old){ Render.scene.remove(old); old.geometry.dispose(); old.material.dispose(); Render[name] = null; }
    }
    const cones = spots.filter(p => p[3] < 0.6), balls = spots.filter(p => p[3] >= 0.6);
    const m = new THREE.Matrix4();

    const trunkGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.3, 5);
    trunkGeo.translate(0, 0.15, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2f }), spots.length);
    spots.forEach(([x, z, sc], i) => {
      m.makeScale(1, sc, 1);
      m.setPosition(x, 0, z);
      trunks.setMatrixAt(i, m);
    });
    trunks.castShadow = true;
    Render.treeTrunks = trunks; Render.scene.add(trunks);

    const coneGeo = new THREE.ConeGeometry(0.22, 0.85, 6);
    coneGeo.translate(0, 0.62, 0);
    const cm = new THREE.InstancedMesh(coneGeo, new THREE.MeshLambertMaterial({ color: 0x39702f }), cones.length);
    cones.forEach(([x, z, sc], i) => {
      m.makeScale(sc + 0.3, sc, sc + 0.3);
      m.setPosition(x, 0, z);
      cm.setMatrixAt(i, m);
    });
    cm.castShadow = true;
    Render.treeCones = cm; Render.scene.add(cm);

    const ballGeo = new THREE.IcosahedronGeometry(0.26, 0);
    ballGeo.translate(0, 0.52, 0);
    const bm = new THREE.InstancedMesh(ballGeo, new THREE.MeshLambertMaterial({ color: 0x4e8c3a, flatShading: true }), balls.length);
    balls.forEach(([x, z, sc], i) => {
      m.makeScale(sc + 0.3, sc + 0.2, sc + 0.3);
      m.setPosition(x, 0, z);
      bm.setMatrixAt(i, m);
    });
    bm.castShadow = true;
    Render.treeBalls = bm; Render.scene.add(bm);
  },

  // ---- roads / rails ----
  buildNet(){
    const s = G.state, b = Render.geoB();
    const cRoad = new THREE.Color(0x666d78), cEdge = new THREE.Color(0x575d68);
    const cMark = new THREE.Color(0xd8d8cf), cRail = new THREE.Color(0x4d5663);
    const cTie = new THREE.Color(0x5e4632), cDeck = new THREE.Color(0xa98c5f);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const conn = (x, y, dx, dy, bit) =>
      Game.inb(x + dx, y + dy) && (s.net[(y + dy) * G.W + x + dx] & bit) !== 0;

    for (let y = 0; y < G.H; y++){
      for (let x = 0; x < G.W; x++){
        const i = y * G.W + x, bits = s.net[i];
        if (!bits) continue;
        const base = Math.max(0, Render.tileH(x, y));
        const cx = x + 0.5, cz = y + 0.5;
        if (s.terrain[i] === 0){ // bridge deck + pier
          b.flat(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0.02, cDeck);
          b.quad([cx - 0.08, 0.02, cz + 0.08], [cx + 0.08, 0.02, cz + 0.08], [cx + 0.08, -0.42, cz + 0.08], [cx - 0.08, -0.42, cz + 0.08], cDeck);
          b.quad([cx + 0.08, 0.02, cz - 0.08], [cx - 0.08, 0.02, cz - 0.08], [cx - 0.08, -0.42, cz - 0.08], [cx + 0.08, -0.42, cz - 0.08], cDeck);
        }
        if (bits & 1){ // road: asphalt arms + dashed centerline
          const h = base + 0.03, hw = 0.3;
          b.flat(cx - hw, cz - hw, cx + hw, cz + hw, h, cRoad);
          for (const [dx, dy] of dirs){
            if (!conn(x, y, dx, dy, 1)) continue;
            if (dx > 0) b.flat(cx + hw, cz - hw, x + 1, cz + hw, h, cRoad);
            if (dx < 0) b.flat(x, cz - hw, cx - hw, cz + hw, h, cRoad);
            if (dy > 0) b.flat(cx - hw, cz + hw, cx + hw, y + 1, h, cRoad);
            if (dy < 0) b.flat(cx - hw, y, cx + hw, cz - hw, h, cRoad);
            // center dashes
            for (const p of [0.18, 0.42]){
              const mx = cx + dx * p, mz = cz + dy * p;
              if (dx) b.flat(mx - 0.06, mz - 0.022, mx + 0.06, mz + 0.022, h + 0.004, cMark);
              else b.flat(mx - 0.022, mz - 0.06, mx + 0.022, mz + 0.06, h + 0.004, cMark);
            }
          }
        }
        if (bits & 2){ // rail: ballast, ties, twin rails
          const h = base + 0.035;
          b.flat(cx - 0.2, cz - 0.2, cx + 0.2, cz + 0.2, h, cEdge);
          for (const [dx, dy] of dirs){
            if (!conn(x, y, dx, dy, 2)) continue;
            const ex = dx > 0 ? x + 1 : dx < 0 ? x : cx;
            const ez = dy > 0 ? y + 1 : dy < 0 ? y : cz;
            if (dx){
              b.flat(Math.min(cx, ex), cz - 0.2, Math.max(cx, ex), cz + 0.2, h, cEdge);
              for (const p of [0.13, 0.32]){
                const mx = cx + dx * p;
                b.flat(mx - 0.035, cz - 0.17, mx + 0.035, cz + 0.17, h + 0.004, cTie);
              }
              b.flat(Math.min(cx, ex), cz - 0.105, Math.max(cx, ex), cz - 0.055, h + 0.009, cRail);
              b.flat(Math.min(cx, ex), cz + 0.055, Math.max(cx, ex), cz + 0.105, h + 0.009, cRail);
            } else {
              b.flat(cx - 0.2, Math.min(cz, ez), cx + 0.2, Math.max(cz, ez), h, cEdge);
              for (const p of [0.13, 0.32]){
                const mz = cz + dy * p;
                b.flat(cx - 0.17, mz - 0.035, cx + 0.17, mz + 0.035, h + 0.004, cTie);
              }
              b.flat(cx - 0.105, Math.min(cz, ez), cx - 0.055, Math.max(cz, ez), h + 0.009, cRail);
              b.flat(cx + 0.055, Math.min(cz, ez), cx + 0.105, Math.max(cz, ez), h + 0.009, cRail);
            }
          }
        }
      }
    }
    const mesh = new THREE.Mesh(b.build(), Render.vcMat());
    mesh.receiveShadow = true;
    Render.swap('netMesh', mesh);
  },

  // ---- houses / industries / stations / depots / people pools ----
  buildBuildings(){
    const s = G.state;
    for (const ch of [...Render.bldGroup.children]){
      Render.bldGroup.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
    }
    Render._smoke = [];
    if (Render.houseMesh){ Render.scene.remove(Render.houseMesh); Render.houseMesh.geometry.dispose(); Render.houseMesh = null; }
    if (Render.houseRoofMesh){ Render.scene.remove(Render.houseRoofMesh); Render.houseRoofMesh.geometry.dispose(); Render.houseRoofMesh = null; }

    // houses (instanced, windowed walls)
    const houses = [];
    for (const tw of s.towns) for (const i of tw.tiles) houses.push(i);
    const bodyGeo = new THREE.BoxGeometry(0.62, 0.36, 0.5);
    bodyGeo.translate(0, 0.18, 0);
    const roofGeo = new THREE.ConeGeometry(0.46, 0.3, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.51, 0);
    const hm = new THREE.InstancedMesh(bodyGeo,
      new THREE.MeshLambertMaterial({ color: 0xffffff, map: Render.makeWallTexture() }), houses.length);
    const rm = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), houses.length);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    houses.forEach((i, k) => {
      const x = (i % G.W) + 0.5, z = ((i / G.W) | 0) + 0.5;
      m.makeRotationY((U.hash2(x, z, 31) * 4 | 0) * Math.PI / 2);
      m.setPosition(x, 0, z);
      hm.setMatrixAt(k, m);
      rm.setMatrixAt(k, m);
      const hh = U.hash2(x, z, 21);
      hm.setColorAt(k, col.set(hh > 0.66 ? 0xd8b294 : hh > 0.33 ? 0xc9a07a : 0xbd9670));
      rm.setColorAt(k, col.set(hh > 0.5 ? 0x9c4f3a : 0x7a4636));
    });
    if (hm.instanceColor) hm.instanceColor.needsUpdate = true;
    if (rm.instanceColor) rm.instanceColor.needsUpdate = true;
    hm.castShadow = true; hm.receiveShadow = true; rm.castShadow = true;
    Render.houseMesh = hm; Render.houseRoofMesh = rm;
    Render.scene.add(hm); Render.scene.add(rm);

    // industries: hall + roof, chimney + smoke for processors
    const slabGeo = new THREE.BoxGeometry(1.84, 0.62, 1.84);
    slabGeo.translate(0, 0.31, 0);
    const roofIGeo = new THREE.BoxGeometry(1.9, 0.1, 1.9);
    roofIGeo.translate(0, 0.67, 0);
    const chimGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.95, 8);
    chimGeo.translate(0, 0.95, 0);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0x5d6675 });
    const roofIMat = new THREE.MeshLambertMaterial({ color: 0x434b59 });
    const chimMat = new THREE.MeshLambertMaterial({ color: 0x8d5a44 });
    const puff = Render.makePuffTexture();
    for (const ind of s.inds){
      const hall = new THREE.Mesh(slabGeo, slabMat);
      hall.position.set(ind.x + 1, 0, ind.y + 1);
      hall.castShadow = true; hall.receiveShadow = true;
      Render.bldGroup.add(hall);
      const roof = new THREE.Mesh(roofIGeo, roofIMat);
      roof.position.copy(hall.position);
      Render.bldGroup.add(roof);
      if (D.INDUSTRIES[ind.type].inp){
        const chim = new THREE.Mesh(chimGeo, chimMat);
        chim.position.set(ind.x + 1.55, 0, ind.y + 0.5);
        chim.castShadow = true;
        Render.bldGroup.add(chim);
        for (let k = 0; k < 3; k++){
          const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: 0.4, depthWrite: false, color: 0xdfe3e8 }));
          Render.bldGroup.add(spr);
          Render._smoke.push({ spr, phase: k / 3, ax: ind.x + 1.55, ay: 1.5, az: ind.y + 0.5 });
        }
      }
      const spr = Render.textSprite(D.INDUSTRIES[ind.type].icon, 44);
      spr.position.set(ind.x + 1, 1.35, ind.y + 1);
      spr.userData.px = 28;
      Render.bldGroup.add(spr);
    }

    // stations: platform + colored shelter
    const platGeo = new THREE.BoxGeometry(0.96, 0.08, 0.96);
    platGeo.translate(0, 0.04, 0);
    const platMat = new THREE.MeshLambertMaterial({ color: 0x9aa1ab });
    const shelGeo = new THREE.BoxGeometry(0.6, 0.3, 0.34);
    shelGeo.translate(0, 0.27, 0);
    for (const st of s.stations){
      const colr = st.type === 'bus' ? 0xfacc15 : st.type === 'truck' ? 0xfb923c : 0x60a5fa;
      const h = Math.max(0, Render.tileH(st.x, st.y));
      const plat = new THREE.Mesh(platGeo, platMat);
      plat.position.set(st.x + 0.5, h, st.y + 0.5);
      plat.receiveShadow = true;
      Render.bldGroup.add(plat);
      const shel = new THREE.Mesh(shelGeo, new THREE.MeshLambertMaterial({ color: colr }));
      shel.position.set(st.x + 0.5, h, st.y + 0.78);
      shel.castShadow = true;
      Render.bldGroup.add(shel);
    }

    // depots
    const dpGeo = new THREE.BoxGeometry(0.86, 0.52, 0.86);
    dpGeo.translate(0, 0.26, 0);
    for (const dep of s.depots){
      const mesh = new THREE.Mesh(dpGeo, new THREE.MeshLambertMaterial({ color: dep.kind === 'rail' ? 0x7c5cd6 : 0xd97706 }));
      const h = Math.max(0, Render.tileH(dep.x, dep.y));
      mesh.position.set(dep.x + 0.5, h, dep.y + 0.5);
      mesh.castShadow = true;
      Render.bldGroup.add(mesh);
    }

    Render.buildPeeps();
  },

  bldSig(){
    const s = G.state;
    let hc = 0;
    for (const tw of s.towns) hc += tw.tiles.length;
    return hc + ':' + s.stations.length + ':' + s.depots.length + ':' + s.inds.length;
  },

  // ---- people ----
  buildPeeps(){
    const s = G.state;
    if (Render._peeps){
      for (const name of ['body', 'head']){
        const mh = Render._peeps[name];
        Render.scene.remove(mh);
        mh.geometry.dispose();
        mh.material.dispose();
      }
    }
    const walkers = [];
    for (const tw of s.towns){
      const n = Math.min(22, 4 + ((tw.pop / 35) | 0));
      for (let k = 0; k < n; k++){
        const ti = tw.tiles[(U.hash2(tw.id, k, 41) * tw.tiles.length) | 0];
        if (ti === undefined) continue;
        walkers.push({
          town: tw,
          x: (ti % G.W) + 0.2 + U.hash2(tw.id, k, 47) * 0.6,
          z: ((ti / G.W) | 0) + 0.2 + U.hash2(tw.id, k, 53) * 0.6,
          tx: 0, tz: 0, has: false,
          speed: 0.22 + U.hash2(tw.id, k, 59) * 0.2,
          phase: U.hash2(tw.id, k, 61) * 6.28,
          col: Render.PEEP_COLORS[(U.hash2(tw.id, k, 67) * Render.PEEP_COLORS.length) | 0],
        });
      }
    }
    const cap = walkers.length + s.stations.length * 8;
    const bodyGeo = new THREE.CapsuleGeometry(0.06, 0.16, 3, 8);
    bodyGeo.translate(0, 0.17, 0);
    const body = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, cap));
    const headGeo = new THREE.SphereGeometry(0.05, 8, 6);
    headGeo.translate(0, 0.33, 0);
    const head = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xe8b89a }), Math.max(1, cap));
    const col = new THREE.Color();
    for (let i = 0; i < cap; i++){
      const c = i < walkers.length ? walkers[i].col : Render.PEEP_COLORS[i % Render.PEEP_COLORS.length];
      body.setColorAt(i, col.set(c));
    }
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    body.count = 0; head.count = 0;
    Render.scene.add(body); Render.scene.add(head);
    Render._peeps = { body, head, walkers, cap };
  },

  updatePeople(dt){
    const P = Render._peeps;
    if (!P) return;
    const s = G.state;
    const m = new THREE.Matrix4();
    const t = Render._time;
    let idx = 0;
    const place = (x, y, z, ang) => {
      if (idx >= P.cap) return;
      m.makeRotationY(ang);
      m.setPosition(x, y, z);
      P.body.setMatrixAt(idx, m);
      P.head.setMatrixAt(idx, m);
      idx++;
    };
    for (const w of P.walkers){
      if (!w.has){
        const ti = w.town.tiles[(Math.random() * w.town.tiles.length) | 0];
        if (ti !== undefined){
          w.tx = (ti % G.W) + 0.15 + Math.random() * 0.7;
          w.tz = ((ti / G.W) | 0) + 0.15 + Math.random() * 0.7;
          w.has = true;
        }
      }
      const dx = w.tx - w.x, dz = w.tz - w.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) w.has = false;
      else {
        const step = Math.min(d, w.speed * dt);
        w.x += dx / d * step;
        w.z += dz / d * step;
      }
      const bob = Math.abs(Math.sin(t * 6 + w.phase)) * 0.022;
      place(w.x, bob, w.z, Math.atan2(dx, dz));
    }
    for (const st of s.stations){
      const n = Math.min(8, Math.ceil((st.cargo.pax || 0) / 6));
      const h = Math.max(0, Render.tileH(st.x, st.y)) + 0.08;
      for (let k = 0; k < n; k++){
        const a = k * 0.82 + st.id * 1.3;
        const bob = Math.abs(Math.sin(t * 3 + k * 2 + st.id)) * 0.01;
        place(st.x + 0.5 + Math.cos(a) * 0.34, h + bob, st.y + 0.32 + (k % 3) * 0.1, a);
      }
    }
    P.body.count = idx;
    P.head.count = idx;
    P.body.instanceMatrix.needsUpdate = true;
    P.head.instanceMatrix.needsUpdate = true;
  },

  updateSmoke(){
    for (const sm of Render._smoke){
      const t = (Render._time * 0.18 + sm.phase) % 1;
      sm.spr.position.set(sm.ax + Math.sin(Render._time + sm.phase * 7) * 0.1 * t, sm.ay + t * 1.5, sm.az);
      const sc = 0.25 + t * 0.85;
      sm.spr.scale.set(sc, sc, 1);
      sm.spr.material.opacity = (1 - t) * 0.42;
    }
  },

  updateClouds(dt){
    for (const spr of Render.cloudGroup.children){
      spr.position.x += spr.userData.speed * dt;
      if (spr.position.x > G.W + 40) spr.position.x = -40;
    }
  },

  // ---- text sprites ----
  textSprite(text, fontPx){
    const cnv = document.createElement('canvas');
    const ctx = cnv.getContext('2d');
    const fp = fontPx || 26;
    ctx.font = '700 ' + fp + 'px system-ui, sans-serif';
    cnv.width = Math.max(2, Math.ceil(ctx.measureText(text).width) + 14);
    cnv.height = fp + 14;
    const c2 = cnv.getContext('2d');
    c2.font = '700 ' + fp + 'px system-ui, sans-serif';
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.lineWidth = 5; c2.strokeStyle = 'rgba(0,0,0,.75)';
    c2.strokeText(text, cnv.width / 2, cnv.height / 2);
    c2.fillStyle = '#fff';
    c2.fillText(text, cnv.width / 2, cnv.height / 2);
    const tex = new THREE.CanvasTexture(cnv);
    tex.minFilter = THREE.LinearFilter;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    spr.userData.aspect = cnv.width / cnv.height;
    spr.userData.px = 16;
    spr.userData.text = text;
    return spr;
  },

  setLabel(key, text, x, y, z, px, color){
    let spr = Render._labels.get(key);
    if (!spr){
      spr = Render.textSprite(text);
      Render._labels.set(key, spr);
      Render.labelGroup.add(spr);
    } else if (spr.userData.text !== text){
      const ns = Render.textSprite(text);
      spr.material.map.dispose();
      spr.material.dispose();
      spr.material = ns.material;
      spr.userData = ns.userData;
    }
    spr.userData.px = px || 16;
    spr.userData.live = true;
    spr.position.set(x, y, z);
    if (color) spr.material.color.set(color);
  },

  updateLabels(){
    const s = G.state;
    for (const spr of Render._labels.values()) spr.userData.live = false;
    for (const tw of s.towns)
      Render.setLabel('t' + tw.id, tw.name + ' · ' + tw.pop, tw.x + 0.5, 1.7, tw.y + 0.5, 17);
    if (G.cam.zoom >= 0.8){
      for (const st of s.stations){
        let n = 0;
        for (const t in st.cargo) n += st.cargo[t];
        Render.setLabel('s' + st.id, st.name + (n > 0 ? ' (' + Math.floor(n) + ')' : ''), st.x + 0.5, 1.0, st.y + 0.5, 13, '#fde68a');
      }
    }
    for (const [key, spr] of [...Render._labels]){
      if (!spr.userData.live){
        Render.labelGroup.remove(spr);
        spr.material.map.dispose();
        spr.material.dispose();
        Render._labels.delete(key);
      } else {
        // constant on-screen pixel size
        const worldPerPx = (28 / G.cam.zoom) / Render.h;
        const hWorld = spr.userData.px * worldPerPx;
        spr.scale.set(hWorld * spr.userData.aspect, hWorld, 1);
      }
    }
  },

  // ---- vehicles (composed mini-models) ----
  makeVehicleMesh(mdl, ci, color){
    const g = new THREE.Group();
    const lam = c => new THREE.MeshLambertMaterial({ color: c });
    const box = (w, h, d, mat, x, y, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      g.add(mesh);
      return mesh;
    };
    const dark = lam(0x232c3a);
    if (mdl.net === 'rail'){
      if (ci === 0){
        const bodyMat = lam(color);
        box(0.78, 0.26, 0.36, bodyMat, 0, 0.2, 0);
        box(0.24, 0.2, 0.38, dark, -0.24, 0.4, 0); // cab
        const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.18, 6), dark);
        chim.position.set(0.26, 0.4, 0);
        g.add(chim);
        g.userData.bodyMat = bodyMat;
      } else {
        const bodyMat = lam(0x707a88);
        box(0.72, 0.24, 0.34, bodyMat, 0, 0.2, 0);
        box(0.72, 0.05, 0.36, dark, 0, 0.34, 0);
        g.userData.bodyMat = null;
      }
    } else if (mdl.cls === 'pax'){
      const bodyMat = lam(color);
      box(0.76, 0.3, 0.4, bodyMat, 0, 0.24, 0);
      box(0.6, 0.11, 0.41, dark, 0.02, 0.32, 0); // window band
      g.userData.bodyMat = bodyMat;
    } else {
      const bodyMat = lam(color);
      box(0.22, 0.26, 0.38, bodyMat, 0.26, 0.2, 0);  // cab
      box(0.46, 0.32, 0.4, lam(0x8d97a5), -0.1, 0.24, 0); // cargo box
      g.userData.bodyMat = bodyMat;
    }
    return g;
  },

  updateVehicles(){
    const s = G.state;
    const live = new Set();
    for (const v of s.vehicles){
      const mdl = Veh.model(v);
      const line = Game.line(v.lineId);
      const colr = line ? line.color : '#e2e8f0';
      const cars = mdl.net === 'rail' ? 3 : 1;
      for (let ci = 0; ci < cars; ci++){
        const key = v.id + '.' + ci;
        live.add(key);
        let grp = Render._vehMeshes.get(key);
        if (!grp){
          grp = Render.makeVehicleMesh(mdl, ci, colr);
          Render._vehMeshes.set(key, grp);
          Render.vehGroup.add(grp);
        }
        if (grp.userData.bodyMat) grp.userData.bodyMat.color.set(colr);
        let X, Z, ang = grp.userData.ang || 0;
        if (v._path && v._path.length > 1){
          const d = Math.max(0, Math.min(v._dist, v._path.length - 1) - ci * 0.9);
          const a = Veh.posAt(v._path, d);
          const b2 = Veh.posAt(v._path, Math.min(d + 0.12, v._path.length - 1));
          X = a[0]; Z = a[1];
          if (b2[0] !== a[0] || b2[1] !== a[1]) ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]);
        } else {
          if (ci > 0){ grp.visible = false; continue; }
          X = v.x; Z = v.y;
        }
        grp.visible = true;
        const hgt = Math.max(0, Render.tileH(Math.round(X), Math.round(Z))) + 0.04;
        grp.position.set(X + 0.5, hgt, Z + 0.5);
        grp.rotation.y = -ang;
        grp.userData.ang = ang;
      }
    }
    for (const [key, grp] of [...Render._vehMeshes]){
      if (!live.has(key)){
        Render.vehGroup.remove(grp);
        grp.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material && o.material.dispose) o.material.dispose();
        });
        Render._vehMeshes.delete(key);
      }
    }
  },

  linePaths(line){
    const n = line.stops.length;
    if (line._pc && line._pc.ver === G.netVersion && line._pc.len === n) return line._pc.segs;
    const net = Game.lineNet(line);
    const segs = [];
    if (net && n >= 2){
      const last = n > 2 ? n : n - 1;
      for (let i = 0; i < last; i++){
        const a = Game.station(line.stops[i]);
        const b = Game.station(line.stops[(i + 1) % n]);
        segs.push(a && b ? Path.find(net, a.x, a.y, b.x, b.y) : null);
      }
    }
    line._pc = { ver: G.netVersion, len: n, segs };
    return segs;
  },

  updateOverlay(){
    let line = null;
    if (G.editLineId) line = Game.line(G.editLineId);
    else if (G.selected && G.selected.k === 'line') line = Game.line(G.selected.id);
    const key = line ? line.id + ':' + line.stops.length + ':' + G.netVersion : '';
    if (key !== Render._ovlKey){
      Render._ovlKey = key;
      for (const ch of [...Render.ovlGroup.children]){
        Render.ovlGroup.remove(ch);
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material && ch.material.dispose && !ch.isSprite) ch.material.dispose();
      }
      if (line && line.stops.length){
        const b = Render.geoB();
        const col = new THREE.Color(line.color);
        for (const p of Render.linePaths(line)){
          if (!p || p.length < 2) continue;
          for (let k = 0; k < p.length - 1; k++){
            const [x1, z1] = p[k], [x2, z2] = p[k + 1];
            const y = Math.max(Math.max(0, Render.tileH(x1, z1)), Math.max(0, Render.tileH(x2, z2))) + 0.09;
            b.flat(Math.min(x1, x2) + 0.39, Math.min(z1, z2) + 0.39, Math.max(x1, x2) + 0.61, Math.max(z1, z2) + 0.61, y, col);
          }
        }
        const mesh = new THREE.Mesh(b.build(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }));
        Render.ovlGroup.add(mesh);
        line.stops.forEach((sid, i) => {
          const st = Game.station(sid);
          if (!st) return;
          const spr = Render.textSprite('' + (i + 1), 30);
          spr.material.color.set(line.color);
          spr.userData.px = 20;
          spr.position.set(st.x + 0.5, 0.9, st.y + 0.5);
          Render.ovlGroup.add(spr);
        });
      }
    }
    // keep badge sprites screen-sized
    for (const ch of Render.ovlGroup.children){
      if (ch.isSprite){
        const worldPerPx = (28 / G.cam.zoom) / Render.h;
        const hW = ch.userData.px * worldPerPx;
        ch.scale.set(hW * ch.userData.aspect, hW, 1);
      }
    }
  },

  updatePreview(){
    if (G.preview === Render._previewRef) return;
    Render._previewRef = G.preview;
    if (Render._previewMesh){
      Render.scene.remove(Render._previewMesh);
      Render._previewMesh.geometry.dispose();
      Render._previewMesh.material.dispose();
      Render._previewMesh = null;
    }
    if (!G.preview) return;
    const b = Render.geoB();
    const cGood = new THREE.Color(0x22c55e), cBad = new THREE.Color(0xef4444), cHas = new THREE.Color(0x94a3b8);
    for (const t of G.preview.tiles){
      const col = G.preview.kind === 'doze' ? (t.has ? cBad : cHas) : (t.bad ? cBad : t.has ? cHas : cGood);
      b.flat(t.x + 0.03, t.y + 0.03, t.x + 0.97, t.y + 0.97, Math.max(0, Render.tileH(t.x, t.y)) + 0.1, col);
    }
    Render._previewMesh = new THREE.Mesh(b.build(),
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthTest: false }));
    Render.scene.add(Render._previewMesh);
  },

  updateRings(){
    const s = G.state;
    const want = [];
    if (G.tool === 'bus' || G.tool === 'truck' || G.tool === 'train'){
      for (const st of s.stations) want.push(st);
    } else if (G.selected && G.selected.k === 'station'){
      const st = Game.station(G.selected.id);
      if (st) want.push(st);
    }
    while (Render._rings.length < want.length){
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.94, 1, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthTest: false }));
      mesh.rotation.x = -Math.PI / 2;
      Render._rings.push(mesh);
      Render.scene.add(mesh);
    }
    Render._rings.forEach((mesh, i) => {
      if (i < want.length){
        const st = want[i];
        const r = D.STATION_TYPES[st.type].r + 0.5;
        mesh.visible = true;
        mesh.position.set(st.x + 0.5, Math.max(0, Render.tileH(st.x, st.y)) + 0.12, st.y + 0.5);
        mesh.scale.set(r, r, 1);
      } else {
        mesh.visible = false;
      }
    });
  },

  draw(){
    const s = G.state;
    if (!s) return;
    const now = performance.now();
    const dt = Render._last ? Math.min(0.1, (now - Render._last) / 1000) : 0.016;
    Render._last = now;
    Render._time += dt;

    if (s !== Render._stateRef){ // new/loaded game
      Render._stateRef = s;
      Render._terrainVer = -1; Render._netVer = -1; Render._bldSig = '';
      Render._ovlKey = '?'; Render._previewRef = '?';
    }
    if ((G.terrainVersion || 0) !== Render._terrainVer){
      Render._terrainVer = G.terrainVersion || 0;
      Render.buildTerrain();
    }
    if (G.netVersion !== Render._netVer){
      Render._netVer = G.netVersion;
      Render.buildNet();
    }
    const sig = Render.bldSig();
    if (sig !== Render._bldSig){
      Render._bldSig = sig;
      Render.buildBuildings();
    }
    Render.updateVehicles();
    Render.updatePeople(dt);
    Render.updateSmoke();
    Render.updateClouds(dt);
    Render.waveTex.offset.x += dt * 0.006;
    Render.waveTex.offset.y += dt * 0.003;
    Render.updateOverlay();
    Render.updatePreview();
    Render.updateRings();
    Render.updateLabels();
    Render.syncCamera();
    Render.renderer.render(Render.scene, Render.camera);
  },
};
