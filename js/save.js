'use strict';
const Save = {
  KEY: 'tinytransport-v1',

  save(){
    try {
      const s = G.state;
      if (!s) return;
      const plain = Object.assign({}, s, {
        terrain: Array.from(s.terrain),
        net: Array.from(s.net),
      });
      // keys starting with _ are derived caches, rebuilt on load
      localStorage.setItem(Save.KEY, JSON.stringify(plain, (k, v) => (k && k[0] === '_' ? undefined : v)));
    } catch (e) {
      console.warn('save failed', e);
    }
  },

  load(){
    try {
      const raw = localStorage.getItem(Save.KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      s.terrain = Uint8Array.from(s.terrain);
      s.net = Uint8Array.from(s.net);
      for (const v of s.vehicles){
        v._path = null; v._dist = 0; v._netVer = -1;
        v.wait = 0; v.retry = 0;
      }
      G.state = s;
      Game.rebuildOcc();
      Game.refreshAcceptance();
      G.netVersion++;
      const t0 = s.towns[0];
      if (t0) G.cam = { x: t0.x, y: t0.y, zoom: 1.1 };
      return true;
    } catch (e) {
      console.warn('load failed', e);
      return false;
    }
  },

  initAuto(){
    setInterval(Save.save, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Save.save();
    });
  },
};
