'use strict';
const Save = {
  KEY: 'tinypoker-v1',
  data: { bank: 2000, xray: false, stats: { hands: 0, wins: 0, biggest: 0 } },

  load(){
    try {
      const raw = localStorage.getItem(Save.KEY);
      if (raw){
        const d = JSON.parse(raw);
        if (typeof d.bank === 'number') Save.data.bank = d.bank;
        Save.data.xray = !!d.xray;
        if (d.stats) Save.data.stats = Object.assign(Save.data.stats, d.stats);
        return true;
      }
    } catch (e) { console.warn('load failed', e); }
    return false;
  },

  save(){
    try {
      localStorage.setItem(Save.KEY, JSON.stringify(Save.data));
    } catch (e) { console.warn('save failed', e); }
  },
};
