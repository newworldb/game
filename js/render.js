'use strict';
/* global THREE */
// 3D renderer (Three.js). Same public surface as the old 2D renderer:
// Render.init(), Render.draw(), Render.cv, Render.w/h, plus Render.s2w()
// which Input uses for picking/panning (ray onto the ground plane).
// World mapping: tile (x,y) -> 3D (x..x+1, height, y..y+1), tile units.
const Render = {
  cv: null, w: 0, h: 0,
  renderer: null, scene: null, camera: null,
  raycaster: null, groundPlane: null,
  // dynamic groups / caches
  terrainMesh: null, treeMesh: null, netMesh: null,
  houseMesh: null, houseRoofMesh: null,
  bldGroup: null, vehGroup: null, ovlGroup: null, labelGroup: null,
  _terrainVer: -1, _netVer: -1, _bldSig: '', _stateRef: null,
  _vehMeshes: new Map(), _labels: new Map(), _ovlKey: '', _previewRef: null,
  _previewMesh: null, _rings: [],

  HILL_H: 0.45,

  init(){
    if (typeof THREE === 'undefined') throw new Error('three.js failed to load');
    Render.cv = document.getElementById('game');
    Render.renderer = new THREE.WebGLRenderer({ canvas: Render.cv, antialias: true });
    Render.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const sc = Render.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x8db8d8);
    sc.fog = new THREE.Fog(0x8db8d8, 120, 260);
    Render.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 400);
    sc.add(new THREE.HemisphereLight(0xcfe3ff, 0x3f5f3a, 0.95));
    const sun = new THREE.DirectionalLight(0xfff3d8, 0.75);
    sun.position.set(50, 90, 30);
    sc.add(sun);
    Render.raycaster = new THREE.Raycaster();
    Render.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // sea: dark bed + translucent surface, oversized for the horizon
    const bed = new THREE.Mesh(
      new THREE.PlaneGeometry(G.W + 160, G.H + 160),
      new THREE.MeshLambertMaterial({ color: 0x1d4569 }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(G.W / 2, -0.42, G.H / 2);
    sc.add(bed);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(G.W + 160, G.H + 160),
      new THREE.MeshLambertMaterial({ color: 0x3178b5, transparent: true, opacity: 0.78 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(G.W / 2, -0.1, G.H / 2);
    sc.add(sea);

    Render.bldGroup = new THREE.Group(); sc.add(Render.bldGroup);
    Render.vehGroup = new THREE.Group(); sc.add(Render.vehGroup);
    Render.ovlGroup = new THREE.Group(); sc.add(Render.ovlGroup);
    Render.labelGroup = new THREE.Group(); sc.add(Render.labelGroup);

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
    for (let y = 0; y < G.H; y++){
      for (let x = 0; x < G.W; x++){
        const t = s.terrain[y * G.W + x];
        if (t === 0) continue;
        const h = t === 3 ? Render.HILL_H : 0;
        if (t === 3) c.set(U.hash2(x, y, 7) > 0.5 ? 0x96916f : 0x8d8868);
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
    Render.swap('terrainMesh', new THREE.Mesh(b.build(), Render.vcMat()));
    Render.buildTrees();
  },

  buildTrees(){
    const s = G.state;
    const spots = [];
    for (let y = 0; y < G.H; y++)
      for (let x = 0; x < G.W; x++)
        if (s.terrain[y * G.W + x] === 2){
          spots.push([x + 0.32 + U.hash2(x, y, 11) * 0.3, y + 0.34 + U.hash2(x, y, 13) * 0.3, 0.5 + U.hash2(x, y, 17) * 0.35]);
          spots.push([x + 0.62 + U.hash2(x, y, 19) * 0.3, y + 0.66 - U.hash2(x, y, 23) * 0.3, 0.4 + U.hash2(x, y, 29) * 0.3]);
        }
    const old = Render.treeMesh;
    if (old){ Render.scene.remove(old); old.geometry.dispose(); old.material.dispose(); }
    const geo = new THREE.ConeGeometry(0.2, 1, 6);
    geo.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0x3f7a3a }), spots.length);
    const m = new THREE.Matrix4();
    spots.forEach(([x, z, sc], i) => {
      m.makeScale(sc + 0.4, sc, sc + 0.4);
      m.setPosition(x, 0, z);
      mesh.setMatrixAt(i, m);
    });
    Render.treeMesh = mesh;
    Render.scene.add(mesh);
  },

  // ---- roads / rails ----
  buildNet(){
    const s = G.state, b = Render.geoB();
    const cRoad = new THREE.Color(0x7b828d), cRail = new THREE.Color(0x414a57);
    const cTie = new THREE.Color(0x8a929c), cDeck = new THREE.Color(0xa98c5f);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const lay = (x, y, bit, col, wd, lift) => {
      const h = Math.max(0, Render.tileH(x, y)) + lift;
      const cx = x + 0.5, cz = y + 0.5, hw = wd / 2;
      b.flat(cx - hw, cz - hw, cx + hw, cz + hw, h, col);
      for (const [dx, dy] of dirs){
        if (!Game.inb(x + dx, y + dy) || !(s.net[(y + dy) * G.W + x + dx] & bit)) continue;
        if (dx > 0) b.flat(cx + hw, cz - hw, x + 1, cz + hw, h, col);
        if (dx < 0) b.flat(x, cz - hw, cx - hw, cz + hw, h, col);
        if (dy > 0) b.flat(cx - hw, cz + hw, cx + hw, y + 1, h, col);
        if (dy < 0) b.flat(cx - hw, y, cx + hw, cz - hw, h, col);
      }
    };
    for (let y = 0; y < G.H; y++){
      for (let x = 0; x < G.W; x++){
        const i = y * G.W + x, bits = s.net[i];
        if (!bits) continue;
        if (s.terrain[i] === 0){ // bridge deck
          const h = 0.02;
          b.flat(x + 0.04, y + 0.04, x + 0.96, y + 0.96, h, cDeck);
          // piers
          b.quad([x + 0.5 - 0.08, h, y + 0.5 + 0.08], [x + 0.5 + 0.08, h, y + 0.5 + 0.08], [x + 0.5 + 0.08, -0.42, y + 0.5 + 0.08], [x + 0.5 - 0.08, -0.42, y + 0.5 + 0.08], cDeck);
        }
        if (bits & 1) lay(x, y, 1, cRoad, 0.56, 0.03);
        if (bits & 2) lay(x, y, 2, cRail, 0.3, 0.045);
        if (bits & 2) lay(x, y, 2, cTie, 0.08, 0.055);
      }
    }
    Render.swap('netMesh', new THREE.Mesh(b.build(), Render.vcMat()));
  },

  // ---- houses / industries / stations / depots ----
  buildBuildings(){
    const s = G.state;
    // clear group
    for (const ch of [...Render.bldGroup.children]){
      Render.bldGroup.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
    }
    if (Render.houseMesh){ Render.scene.remove(Render.houseMesh); Render.houseMesh.geometry.dispose(); Render.houseMesh = null; }
    if (Render.houseRoofMesh){ Render.scene.remove(Render.houseRoofMesh); Render.houseRoofMesh.geometry.dispose(); Render.houseRoofMesh = null; }

    // houses (instanced)
    const houses = [];
    for (const tw of s.towns) for (const i of tw.tiles) houses.push(i);
    const bodyGeo = new THREE.BoxGeometry(0.62, 0.34, 0.5);
    bodyGeo.translate(0, 0.17, 0);
    const roofGeo = new THREE.ConeGeometry(0.45, 0.3, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.49, 0);
    const hm = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), houses.length);
    const rm = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), houses.length);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    houses.forEach((i, k) => {
      const x = (i % G.W) + 0.5, z = ((i / G.W) | 0) + 0.5;
      m.makeRotationY(U.hash2(x, z, 31) * Math.PI);
      m.setPosition(x, 0, z);
      hm.setMatrixAt(k, m);
      rm.setMatrixAt(k, m);
      const hh = U.hash2(x, z, 21);
      hm.setColorAt(k, col.set(hh > 0.66 ? 0xc9a07a : hh > 0.33 ? 0xb98e6a : 0xa9805f));
      rm.setColorAt(k, col.set(hh > 0.5 ? 0x8a4f3d : 0x7a4636));
    });
    if (hm.instanceColor) hm.instanceColor.needsUpdate = true;
    if (rm.instanceColor) rm.instanceColor.needsUpdate = true;
    Render.houseMesh = hm; Render.houseRoofMesh = rm;
    Render.scene.add(hm); Render.scene.add(rm);

    // industries: slab + emoji sprite
    const slabGeo = new THREE.BoxGeometry(1.84, 0.7, 1.84);
    slabGeo.translate(0, 0.35, 0);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
    for (const ind of s.inds){
      const mesh = new THREE.Mesh(slabGeo, slabMat);
      mesh.position.set(ind.x + 1, 0, ind.y + 1);
      Render.bldGroup.add(mesh);
      const spr = Render.textSprite(D.INDUSTRIES[ind.type].icon, 44);
      spr.position.set(ind.x + 1, 1.15, ind.y + 1);
      spr.userData.px = 30;
      Render.bldGroup.add(spr);
    }

    // stations
    const stGeo = new THREE.BoxGeometry(0.8, 0.26, 0.8);
    stGeo.translate(0, 0.13, 0);
    for (const st of s.stations){
      const colr = st.type === 'bus' ? 0xfacc15 : st.type === 'truck' ? 0xfb923c : 0x60a5fa;
      const mesh = new THREE.Mesh(stGeo, new THREE.MeshLambertMaterial({ color: colr }));
      const h = Math.max(0, Render.tileH(st.x, st.y));
      mesh.position.set(st.x + 0.5, h, st.y + 0.5);
      Render.bldGroup.add(mesh);
    }

    // depots
    const dpGeo = new THREE.BoxGeometry(0.84, 0.5, 0.84);
    dpGeo.translate(0, 0.25, 0);
    for (const dep of s.depots){
      const mesh = new THREE.Mesh(dpGeo, new THREE.MeshLambertMaterial({ color: dep.kind === 'rail' ? 0x7c5cd6 : 0xd97706 }));
      const h = Math.max(0, Render.tileH(dep.x, dep.y));
      mesh.position.set(dep.x + 0.5, h, dep.y + 0.5);
      Render.bldGroup.add(mesh);
    }
  },

  bldSig(){
    const s = G.state;
    let hc = 0;
    for (const tw of s.towns) hc += tw.tiles.length;
    return hc + ':' + s.stations.length + ':' + s.depots.length + ':' + s.inds.length;
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

  // ---- per-frame dynamic bits ----
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

  updateVehicles(){
    const s = G.state;
    const live = new Set();
    for (const v of s.vehicles){
      const m = Veh.model(v);
      const line = Game.line(v.lineId);
      const colr = line ? line.color : '#e2e8f0';
      const cars = m.net === 'rail' ? 3 : 1;
      for (let ci = 0; ci < cars; ci++){
        const key = v.id + '.' + ci;
        live.add(key);
        let mesh = Render._vehMeshes.get(key);
        if (!mesh){
          const geo = new THREE.BoxGeometry(0.74, 0.3, 0.4);
          geo.translate(0, 0.22, 0);
          mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: ci === 0 ? colr : '#64748b' }));
          Render._vehMeshes.set(key, mesh);
          Render.vehGroup.add(mesh);
        }
        if (ci === 0) mesh.material.color.set(colr);
        let X, Z, ang = mesh.userData.ang || 0;
        if (v._path && v._path.length > 1){
          const d = Math.max(0, Math.min(v._dist, v._path.length - 1) - ci * 0.9);
          const a = Veh.posAt(v._path, d);
          const b2 = Veh.posAt(v._path, Math.min(d + 0.12, v._path.length - 1));
          X = a[0]; Z = a[1];
          if (b2[0] !== a[0] || b2[1] !== a[1]) ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]);
        } else {
          if (ci > 0){ mesh.visible = false; continue; }
          X = v.x; Z = v.y;
        }
        mesh.visible = true;
        const hgt = Math.max(0, Render.tileH(Math.round(X), Math.round(Z))) + 0.05;
        mesh.position.set(X + 0.5, hgt, Z + 0.5);
        mesh.rotation.y = -ang;
        mesh.userData.ang = ang;
      }
    }
    for (const [key, mesh] of [...Render._vehMeshes]){
      if (!live.has(key)){
        Render.vehGroup.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
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
    if (key === Render._ovlKey && !line) return;
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
            const y = Math.max(Math.max(0, Render.tileH(x1, z1)), Math.max(0, Render.tileH(x2, z2))) + 0.08;
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
    Render.updateOverlay();
    Render.updatePreview();
    Render.updateRings();
    Render.updateLabels();
    Render.syncCamera();
    Render.renderer.render(Render.scene, Render.camera);
  },
};
