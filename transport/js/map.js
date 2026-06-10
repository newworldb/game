'use strict';
// Procedural map: value-noise terrain, towns grown from a center plaza,
// 2x2 industries, and starter country roads linking neighboring towns.
// Terrain codes: 0 water, 1 grass, 2 forest, 3 hill.
const MapGen = {
  generate(seed){
    const W = G.W, H = G.H;
    const rand = U.mulberry32(seed);
    const s = {
      seed, money: D.START_MONEY, day: 0, monthIdx: 0, nextId: 1,
      terrain: new Uint8Array(W * H), net: new Uint8Array(W * H),
      towns: [], inds: [], stations: [], depots: [], lines: [], vehicles: [],
      stats: { m: { inc: {}, run: 0, build: 0 }, last: null },
    };
    const o1 = rand() * 999, o2 = rand() * 999;
    const vn = (x, y, o) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = U.hash2(xi, yi, o), b = U.hash2(xi + 1, yi, o);
      const c = U.hash2(xi, yi + 1, o), d = U.hash2(xi + 1, yi + 1, o);
      const u = U.sstep(xf), v = U.sstep(yf);
      return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
    };
    const fbm = (x, y, o) => {
      let v = 0, a = 0.5, f = 1;
      for (let i = 0; i < 4; i++){ v += a * vn(x * f, y * f, o); a *= 0.5; f *= 2; }
      return v / 0.9375;
    };

    for (let y = 0; y < H; y++){
      for (let x = 0; x < W; x++){
        let e = fbm(x / 26, y / 26, o1);
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (edge < 6) e -= (6 - edge) * 0.035;
        const m = fbm(x / 18, y / 18, o2);
        let t = 1;
        if (e < 0.34) t = 0;
        else if (e > 0.68) t = 3;
        else if (m > 0.60) t = 2;
        s.terrain[y * W + x] = t;
      }
    }

    // --- towns ---
    const names = D.TOWN_NAMES.slice();
    for (let i = names.length - 1; i > 0; i--){
      const j = (rand() * (i + 1)) | 0;
      const t = names[i]; names[i] = names[j]; names[j] = t;
    }
    const centers = [];
    for (let tries = 0; tries < 900 && centers.length < 6; tries++){
      const x = 8 + ((rand() * (W - 16)) | 0), y = 8 + ((rand() * (H - 16)) | 0);
      if (s.terrain[y * W + x] !== 1) continue;
      let ok = true;
      for (const c of centers) if (Math.abs(c[0] - x) + Math.abs(c[1] - y) < 24){ ok = false; break; }
      if (!ok) continue;
      let land = 0;
      for (let yy = y - 3; yy <= y + 3; yy++)
        for (let xx = x - 3; xx <= x + 3; xx++)
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && (s.terrain[yy * W + xx] === 1 || s.terrain[yy * W + xx] === 2)) land++;
      if (land < 34) continue;
      centers.push([x, y]);
    }
    if (centers.length < 3) return null;

    const blocked = new Set(); // house + industry tiles, kept clear of roads
    for (const [cx, cy] of centers){
      const tw = {
        id: s.nextId++, name: names.pop(), x: cx, y: cy,
        pop: 90 + ((rand() * 180) | 0), tiles: [], delivered: {}, paxServed: 0,
      };
      const want = Math.ceil(tw.pop / 22);
      const frontier = [[cx, cy]];
      const seen = new Set([cy * W + cx]);
      while (tw.tiles.length < want && frontier.length){
        const fi = (rand() * frontier.length) | 0;
        const [fx, fy] = frontier.splice(fi, 1)[0];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
          const x = fx + dx, y = fy + dy, i = y * W + x;
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || seen.has(i)) continue;
          seen.add(i);
          const t = s.terrain[i];
          if (t !== 1 && t !== 2) continue;
          frontier.push([x, y]);
        }
        // center plaza and its 4 neighbors stay open so roads can reach town
        if (Math.abs(fx - cx) + Math.abs(fy - cy) <= 1) continue;
        const i = fy * W + fx;
        if (blocked.has(i)) continue;
        const t = s.terrain[i];
        if (t !== 1 && t !== 2) continue;
        s.terrain[i] = 1;
        tw.tiles.push(i);
        blocked.add(i);
      }
      if (tw.tiles.length >= 4) s.towns.push(tw);
    }
    if (s.towns.length < 3) return null;

    // --- industries (2x2 footprint) ---
    for (const type in D.INDUSTRIES){
      const def = D.INDUSTRIES[type];
      for (let n = 0; n < def.count; n++){
        for (let tries = 0; tries < 140; tries++){
          const x = 3 + ((rand() * (W - 8)) | 0), y = 3 + ((rand() * (H - 8)) | 0);
          let ok = true;
          for (let dy = 0; dy < 2 && ok; dy++){
            for (let dx = 0; dx < 2 && ok; dx++){
              const i = (y + dy) * W + (x + dx);
              const t = s.terrain[i];
              if ((t !== 1 && t !== 2) || blocked.has(i)) ok = false;
            }
          }
          if (ok) for (const tw of s.towns) if (Math.abs(tw.x - x) + Math.abs(tw.y - y) < 7){ ok = false; break; }
          if (!ok) continue;
          const ind = { id: s.nextId++, type, x, y, stock: {}, stockIn: {} };
          for (const t in def.out) ind.stock[t] = 20;
          for (let dy = 0; dy < 2; dy++){
            for (let dx = 0; dx < 2; dx++){
              const i = (y + dy) * W + (x + dx);
              s.terrain[i] = 1;
              blocked.add(i);
            }
          }
          s.inds.push(ind);
          break;
        }
      }
    }

    // --- starter roads: each town links to its nearest neighbor ---
    const done = new Set();
    for (const a of s.towns){
      let best = null, bd = 1e9;
      for (const b of s.towns){
        if (a === b) continue;
        const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (d < bd){ bd = d; best = b; }
      }
      if (!best) continue;
      const key = Math.min(a.id, best.id) + '-' + Math.max(a.id, best.id);
      if (done.has(key)) continue;
      done.add(key);
      const path = Path.astar(a.x, a.y, best.x, best.y,
        i => !blocked.has(i),
        i => {
          const t = s.terrain[i];
          if (s.net[i] & 1) return 0.4;
          return t === 0 ? 26 : t === 3 ? 6 : t === 2 ? 2 : 1;
        });
      if (path){
        for (const [x, y] of path){
          const i = y * W + x;
          s.net[i] |= 1;
          if (s.terrain[i] === 2) s.terrain[i] = 1;
        }
      }
    }
    return s;
  },
};
