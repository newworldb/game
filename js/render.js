'use strict';
const Render = {
  cv: null, ctx: null, w: 0, h: 0,

  init(){
    Render.cv = document.getElementById('game');
    Render.ctx = Render.cv.getContext('2d');
    Render.resize();
    window.addEventListener('resize', Render.resize);
  },

  resize(){
    const dpr = window.devicePixelRatio || 1;
    Render.w = window.innerWidth;
    Render.h = window.innerHeight;
    Render.cv.width = Render.w * dpr;
    Render.cv.height = Render.h * dpr;
    Render.cv.style.width = Render.w + 'px';
    Render.cv.style.height = Render.h + 'px';
    Render.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  rr(ctx, x, y, w, h, r){
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  },

  // axis-aligned road/rail tile: center pad plus arms toward connected neighbors
  netTile(s, x, y, bit, color, wd, ctx, px, py, sc){
    const cx = px(x + 0.5), cy = py(y + 0.5), hw = sc * wd / 2;
    ctx.fillStyle = color;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const nx = x + dx, ny = y + dy;
      if (!Game.inb(nx, ny) || !(s.net[ny * G.W + nx] & bit)) continue;
      const ex = px(x + 0.5 + dx * 0.5), ey = py(y + 0.5 + dy * 0.5);
      ctx.fillRect(
        Math.min(cx, ex) - (dy ? hw : 0),
        Math.min(cy, ey) - (dx ? hw : 0),
        dx ? Math.abs(ex - cx) : hw * 2,
        dy ? Math.abs(ey - cy) : hw * 2
      );
    }
    ctx.fillRect(cx - hw, cy - hw, hw * 2, hw * 2);
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

  draw(){
    const s = G.state, ctx = Render.ctx;
    if (!s) return;
    const cam = G.cam, sc = G.T * cam.zoom, w = Render.w, h = Render.h;
    const px = x => (x - cam.x) * sc + w / 2;
    const py = y => (y - cam.y) * sc + h / 2;

    ctx.fillStyle = '#2b5f8f';
    ctx.fillRect(0, 0, w, h);

    const x0 = Math.max(0, Math.floor(cam.x - w / 2 / sc));
    const x1 = Math.min(G.W - 1, Math.ceil(cam.x + w / 2 / sc));
    const y0 = Math.max(0, Math.floor(cam.y - h / 2 / sc));
    const y1 = Math.min(G.H - 1, Math.ceil(cam.y + h / 2 / sc));
    const GR = ['#6da45a', '#68a055', '#72aa5f', '#63994f'];

    // terrain
    for (let y = y0; y <= y1; y++){
      for (let x = x0; x <= x1; x++){
        const i = y * G.W + x, t = s.terrain[i];
        if (t === 0) continue;
        ctx.fillStyle = t === 3
          ? (U.hash2(x, y, 7) > 0.5 ? '#96916f' : '#8d8868')
          : GR[(U.hash2(x, y, 3) * 4) | 0];
        ctx.fillRect(px(x), py(y), sc + 1, sc + 1);
        if (t === 2 && sc > 9){
          ctx.fillStyle = '#3f7a3a';
          const ox = U.hash2(x, y, 11) * 0.3, oy = U.hash2(x, y, 13) * 0.3;
          ctx.beginPath();
          ctx.arc(px(x + 0.32 + ox), py(y + 0.34 + oy), sc * 0.16, 0, 7);
          ctx.arc(px(x + 0.62 + ox), py(y + 0.66 - oy), sc * 0.13, 0, 7);
          ctx.fill();
        }
        if (t === 3 && sc > 9){
          ctx.strokeStyle = 'rgba(55,55,35,.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px(x + 0.22), py(y + 0.7));
          ctx.lineTo(px(x + 0.5), py(y + 0.3));
          ctx.lineTo(px(x + 0.78), py(y + 0.7));
          ctx.stroke();
        }
      }
    }

    // roads + rails (bridge decks over water first)
    for (let y = y0; y <= y1; y++){
      for (let x = x0; x <= x1; x++){
        const i = y * G.W + x, b = s.net[i];
        if (!b) continue;
        if (s.terrain[i] === 0){
          ctx.fillStyle = '#a98c5f';
          ctx.fillRect(px(x) + sc * 0.06, py(y) + sc * 0.06, sc * 0.88, sc * 0.88);
        }
        if (b & 1) Render.netTile(s, x, y, 1, '#7b828d', 0.56, ctx, px, py, sc);
        if (b & 2) Render.netTile(s, x, y, 2, '#414a57', 0.30, ctx, px, py, sc);
        if ((b & 2) && sc > 14) Render.netTile(s, x, y, 2, '#8a929c', 0.07, ctx, px, py, sc);
      }
    }

    // buildings
    for (let y = y0; y <= y1; y++){
      for (let x = x0; x <= x1; x++){
        const o = G.occ.get(y * G.W + x);
        if (!o) continue;
        if (o.k === 'house'){
          const hh = U.hash2(x, y, 21);
          ctx.fillStyle = hh > 0.66 ? '#c9a07a' : hh > 0.33 ? '#b98e6a' : '#a9805f';
          ctx.fillRect(px(x + 0.15), py(y + 0.3), sc * 0.7, sc * 0.55);
          ctx.fillStyle = hh > 0.5 ? '#8a4f3d' : '#7a4636';
          ctx.fillRect(px(x + 0.08), py(y + 0.14), sc * 0.84, sc * 0.22);
        } else if (o.k === 'ind'){
          const ind = Game.industry(o.id);
          if (ind && ind.x === x && ind.y === y){
            ctx.fillStyle = '#4b5563';
            Render.rr(ctx, px(x) + 1, py(y) + 1, sc * 2 - 2, sc * 2 - 2, sc * 0.15);
            ctx.fill();
            ctx.strokeStyle = '#313845';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (sc > 7){
              ctx.font = ((sc * 0.95) | 0) + 'px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(D.INDUSTRIES[ind.type].icon, px(x + 1), py(y + 1));
            }
          }
        } else if (o.k === 'depot'){
          const dep = Game.depot(o.id);
          if (!dep) continue;
          ctx.fillStyle = dep.kind === 'rail' ? '#7c5cd6' : '#d97706';
          Render.rr(ctx, px(x + 0.08), py(y + 0.08), sc * 0.84, sc * 0.84, sc * 0.12);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (sc > 10){
            ctx.font = '700 ' + ((sc * 0.5) | 0) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText('D', px(x + 0.5), py(y + 0.54));
          }
        } else if (o.k === 'station'){
          const st = Game.station(o.id);
          if (!st) continue;
          const col = st.type === 'bus' ? '#facc15' : st.type === 'truck' ? '#fb923c' : '#60a5fa';
          ctx.fillStyle = col;
          Render.rr(ctx, px(x + 0.1), py(y + 0.1), sc * 0.8, sc * 0.8, sc * 0.2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (sc > 10){
            ctx.font = '700 ' + ((sc * 0.45) | 0) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1e293b';
            ctx.fillText(st.type === 'bus' ? 'B' : st.type === 'truck' ? 'T' : 'S', px(x + 0.5), py(y + 0.54));
          }
        }
      }
    }

    // catchment rings while placing stations or with one selected
    const ring = st => {
      const def = D.STATION_TYPES[st.type];
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(px(st.x + 0.5), py(st.y + 0.5), (def.r + 0.5) * sc, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (G.tool === 'bus' || G.tool === 'truck' || G.tool === 'train'){
      for (const st of s.stations) if (st.x >= x0 - 5 && st.x <= x1 + 5 && st.y >= y0 - 5 && st.y <= y1 + 5) ring(st);
    } else if (G.selected && G.selected.k === 'station'){
      const st = Game.station(G.selected.id);
      if (st) ring(st);
    }

    // selected / editing line overlay
    let line = null;
    if (G.editLineId) line = Game.line(G.editLineId);
    else if (G.selected && G.selected.k === 'line') line = Game.line(G.selected.id);
    if (line && line.stops.length){
      const segs = Render.linePaths(line);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = Math.max(3, sc * 0.18);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6;
      for (const p of segs){
        if (!p || p.length < 2) continue;
        ctx.beginPath();
        for (let k = 0; k < p.length; k++){
          const X = px(p[k][0] + 0.5), Y = py(p[k][1] + 0.5);
          if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      line.stops.forEach((sid, i) => {
        const st = Game.station(sid);
        if (!st) return;
        const X = px(st.x + 0.5), Y = py(st.y + 0.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(X, Y, Math.max(8, sc * 0.3), 0, 7);
        ctx.fill();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 ' + Math.max(10, sc * 0.32) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('' + (i + 1), X, Y + 1);
      });
    }

    // build preview
    if (G.preview){
      for (const t of G.preview.tiles){
        if (G.preview.kind === 'doze') ctx.fillStyle = t.has ? 'rgba(239,68,68,.55)' : 'rgba(239,68,68,.18)';
        else ctx.fillStyle = t.bad ? 'rgba(239,68,68,.6)' : t.has ? 'rgba(148,163,184,.3)' : 'rgba(34,197,94,.45)';
        ctx.fillRect(px(t.x), py(t.y), sc + 1, sc + 1);
      }
    }

    // vehicles
    for (const v of s.vehicles){
      const vline = Game.line(v.lineId);
      const col = vline ? vline.color : '#e2e8f0';
      const m = Veh.model(v);
      const cars = m.net === 'rail' ? 3 : 1;
      for (let ci = 0; ci < cars; ci++){
        let X, Y, ang = 0;
        if (v._path && v._path.length > 1){
          const d = Math.max(0, Math.min(v._dist, v._path.length - 1) - ci * 0.9);
          const a = Veh.posAt(v._path, d);
          const b2 = Veh.posAt(v._path, Math.min(d + 0.1, v._path.length - 1));
          X = a[0]; Y = a[1];
          if (b2[0] !== a[0] || b2[1] !== a[1]) ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]);
        } else {
          if (ci > 0) break;
          X = v.x; Y = v.y;
        }
        const sx = px(X + 0.5), sy = py(Y + 0.5);
        if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) continue;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        ctx.fillStyle = ci === 0 ? col : '#64748b';
        Render.rr(ctx, -sc * 0.38, -sc * 0.18, sc * 0.76, sc * 0.36, sc * 0.09);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (ci === 0){
          ctx.fillStyle = 'rgba(255,255,255,.8)';
          ctx.fillRect(sc * 0.16, -sc * 0.11, sc * 0.14, sc * 0.22);
        }
        ctx.restore();
      }
    }

    // labels
    if (sc >= 15){
      ctx.font = '600 11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const st of s.stations){
        if (st.x < x0 || st.x > x1 || st.y < y0 || st.y > y1) continue;
        let n = 0;
        for (const t in st.cargo) n += st.cargo[t];
        const txt = st.name + (n > 0 ? ' (' + Math.floor(n) + ')' : '');
        const X = px(st.x + 0.5), Y = py(st.y) - 4;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(txt, X, Y);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(txt, X, Y);
      }
    }
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const tw of s.towns){
      const X = px(tw.x + 0.5), Y = py(tw.y) - 8;
      if (X < -100 || X > w + 100 || Y < -30 || Y > h + 30) continue;
      const txt = tw.name + ' · ' + tw.pop;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(txt, X, Y);
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, X, Y);
    }
  },
};
