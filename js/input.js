'use strict';
// One finger: pan (select tool) or drag-build (road/rail/demolish).
// Two fingers: pinch zoom + pan, always. Tap: context action for the tool.
const Input = {
  pts: new Map(),
  mode: null,
  start: null,
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

  s2w(px, py){
    const sc = G.T * G.cam.zoom;
    return [(px - Render.w / 2) / sc + G.cam.x, (py - Render.h / 2) / sc + G.cam.y];
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
      Input.start = { x: e.clientX, y: e.clientY, t: performance.now(), cx: G.cam.x, cy: G.cam.y };
    } else if (Input.pts.size === 2){
      Input.mode = 'pinch';
      G.preview = null;
      UI.hidePreviewBanner();
      const [a, b] = [...Input.pts.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      Input.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: G.cam.zoom, w0: Input.s2w(mx, my) };
    }
  },

  move(e){
    const p = Input.pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;

    if (Input.mode === 'pinch' && Input.pts.size >= 2){
      const [a, b] = [...Input.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      G.cam.zoom = U.clamp(Input.pinch.z0 * d / Math.max(20, Input.pinch.d0), 0.3, 3.5);
      const sc = G.T * G.cam.zoom;
      G.cam.x = Input.pinch.w0[0] - (mx - Render.w / 2) / sc;
      G.cam.y = Input.pinch.w0[1] - (my - Render.h / 2) / sc;
      Input.clampCam();
      return;
    }

    if (Input.mode === 'pending'){
      if (Math.hypot(e.clientX - Input.start.x, e.clientY - Input.start.y) > 8){
        if (G.tool === 'road' || G.tool === 'rail' || G.tool === 'bulldoze'){
          Input.mode = 'build';
          const [wx, wy] = Input.s2w(Input.start.x, Input.start.y);
          Input.dragStart = [U.clamp(Math.floor(wx), 0, G.W - 1), U.clamp(Math.floor(wy), 0, G.H - 1)];
        } else {
          Input.mode = 'pan';
        }
      }
    }

    if (Input.mode === 'pan'){
      const sc = G.T * G.cam.zoom;
      G.cam.x = Input.start.cx - (e.clientX - Input.start.x) / sc;
      G.cam.y = Input.start.cy - (e.clientY - Input.start.y) / sc;
      Input.clampCam();
    } else if (Input.mode === 'build'){
      const [wx, wy] = Input.s2w(e.clientX, e.clientY);
      const tx = U.clamp(Math.floor(wx), 0, G.W - 1);
      const ty = U.clamp(Math.floor(wy), 0, G.H - 1);
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
        Input.start = { x: r.x, y: r.y, t: 0, cx: G.cam.x, cy: G.cam.y };
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
    const w0 = Input.s2w(e.clientX, e.clientY);
    G.cam.zoom = U.clamp(G.cam.zoom * f, 0.3, 3.5);
    const sc = G.T * G.cam.zoom;
    G.cam.x = w0[0] - (e.clientX - Render.w / 2) / sc;
    G.cam.y = w0[1] - (e.clientY - Render.h / 2) / sc;
    Input.clampCam();
  },

  tap(pxx, pyy){
    const [wx, wy] = Input.s2w(pxx, pyy);
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
        let pick = null, bd = 0.6;
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
