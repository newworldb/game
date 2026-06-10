'use strict';
// One finger: pan (select tool) or drag-build (road/rail/demolish).
// Two fingers: pinch zoom + pan, always. Tap: context action for the tool.
// All screen->world conversion goes through Render.s2w (ground-plane raycast),
// so it works regardless of camera rotation.
const Input = {
  pts: new Map(),
  mode: null,
  start: null,
  last: null,
  pinch: null,
  dragStart: null,

  init(){
    const cv = Render.cv;
    cv.addEventListener('pointerdown', Input.down);
    cv.addEventListener('pointermove', Input.move);
    cv.addEventListener('pointerup', Input.up);
    cv.addEventListener('pointercancel', Input.up);
    cv.addEventListener('wheel', Input.wheel, { passive: false });
  },

  clampCam(){
    G.cam.x = U.clamp(G.cam.x, -4, G.W + 4);
    G.cam.y = U.clamp(G.cam.y, -4, G.H + 4);
  },

  down(e){
    e.preventDefault();
    try { Render.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    Input.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Input.pts.size === 1){
      Input.mode = 'pending';
      Input.start = { x: e.clientX, y: e.clientY, t: performance.now() };
      Input.last = { x: e.clientX, y: e.clientY };
    } else if (Input.pts.size === 2){
      Input.mode = 'pinch';
      G.preview = null;
      UI.hidePreviewBanner();
      const [a, b] = [...Input.pts.values()];
      Input.pinch = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  },

  move(e){
    const p = Input.pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;

    if (Input.mode === 'pinch' && Input.pts.size >= 2){
      const [a, b] = [...Input.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const w0 = Render.s2w(Input.pinch.mid.x, Input.pinch.mid.y);
      G.cam.zoom = U.clamp(G.cam.zoom * d / Math.max(20, Input.pinch.d), 0.25, 4);
      const w1 = Render.s2w(mid.x, mid.y);
      if (w0 && w1){
        G.cam.x += w0[0] - w1[0];
        G.cam.y += w0[1] - w1[1];
        Input.clampCam();
      }
      Input.pinch.d = Math.max(20, d);
      Input.pinch.mid = mid;
      return;
    }

    if (Input.mode === 'pending'){
      if (Math.hypot(e.clientX - Input.start.x, e.clientY - Input.start.y) > 8){
        if (G.tool === 'road' || G.tool === 'rail' || G.tool === 'bulldoze'){
          Input.mode = 'build';
          const w = Render.s2w(Input.start.x, Input.start.y);
          if (w) Input.dragStart = [U.clamp(Math.floor(w[0]), 0, G.W - 1), U.clamp(Math.floor(w[1]), 0, G.H - 1)];
          else Input.mode = 'pan';
        } else {
          Input.mode = 'pan';
        }
      }
    }

    if (Input.mode === 'pan'){
      const a = Render.s2w(Input.last.x, Input.last.y);
      const b = Render.s2w(e.clientX, e.clientY);
      if (a && b){
        G.cam.x += a[0] - b[0];
        G.cam.y += a[1] - b[1];
        Input.clampCam();
      }
      Input.last = { x: e.clientX, y: e.clientY };
    } else if (Input.mode === 'build'){
      const w = Render.s2w(e.clientX, e.clientY);
      if (!w) return;
      const tx = U.clamp(Math.floor(w[0]), 0, G.W - 1);
      const ty = U.clamp(Math.floor(w[1]), 0, G.H - 1);
      const [sx, sy] = Input.dragStart;
      G.preview = G.tool === 'bulldoze'
        ? Build.planDoze(sx, sy, tx, ty)
        : Build.planNet(G.tool, sx, sy, tx, ty);
      UI.previewBanner(G.preview);
    }
  },

  up(e){
    const wasMode = Input.mode;
    Input.pts.delete(e.pointerId);

    if (wasMode === 'pinch'){
      if (Input.pts.size === 1){
        const r = [...Input.pts.values()][0];
        Input.mode = 'pan';
        Input.start = { x: r.x, y: r.y, t: 0 };
        Input.last = { x: r.x, y: r.y };
      } else if (Input.pts.size === 0){
        Input.mode = null;
      }
      return;
    }
    if (Input.pts.size > 0) return;

    if (wasMode === 'build' && G.preview){
      if (G.tool === 'bulldoze') Build.commitDoze(G.preview);
      else Build.commitNet(G.preview);
      G.preview = null;
      UI.hidePreviewBanner();
    } else if (wasMode === 'pending' && performance.now() - Input.start.t < 600){
      Input.tap(e.clientX, e.clientY);
    }
    Input.mode = null;
  },

  wheel(e){
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const w0 = Render.s2w(e.clientX, e.clientY);
    G.cam.zoom = U.clamp(G.cam.zoom * f, 0.25, 4);
    const w1 = Render.s2w(e.clientX, e.clientY);
    if (w0 && w1){
      G.cam.x += w0[0] - w1[0];
      G.cam.y += w0[1] - w1[1];
      Input.clampCam();
    }
  },

  tap(pxx, pyy){
    const w = Render.s2w(pxx, pyy);
    if (!w) return;
    const [wx, wy] = w;
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (!Game.inb(tx, ty)) return;
    const i = Game.idx(tx, ty);

    if (G.editLineId){
      const o = G.occ.get(i);
      if (o && o.k === 'station'){ UI.addStop(o.id); return; }
    }

    switch (G.tool){
      case 'road':
      case 'rail':
        Build.commitNet(Build.planNet(G.tool, tx, ty, tx, ty));
        break;
      case 'bulldoze':
        Build.commitDoze(Build.planDoze(tx, ty, tx, ty));
        break;
      case 'bus':
      case 'truck':
      case 'train':
        Build.placeStation(G.tool, tx, ty);
        break;
      case 'rdepot':
        Build.placeDepot('road', tx, ty);
        break;
      case 'tdepot':
        Build.placeDepot('rail', tx, ty);
        break;
      default: {
        let pick = null, bd = 0.7;
        for (const v of G.state.vehicles){
          const d = Math.hypot(v.x + 0.5 - wx, v.y + 0.5 - wy);
          if (d < bd){ bd = d; pick = v; }
        }
        if (pick){ UI.showVehicle(pick.id); return; }
        const o = G.occ.get(i);
        if (o){
          if (o.k === 'station') UI.showStation(o.id);
          else if (o.k === 'depot') UI.showDepot(o.id);
          else if (o.k === 'ind') UI.showIndustry(o.id);
          else if (o.k === 'house') UI.showTown(o.id);
        } else {
          G.selected = null;
          UI.closePanel();
        }
      }
    }
  },
};
