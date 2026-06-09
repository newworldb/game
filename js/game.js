'use strict';
const G = {
  W: 96, H: 96, T: 32,
  state: null,
  occ: new Map(),        // tileIndex -> {k:'house'|'ind'|'station'|'depot', id}
  netVersion: 0,         // bumped on any network change; vehicles revalidate paths
  tool: 'select',
  preview: null,
  selected: null,
  editLineId: null,
  cam: { x: 48, y: 48, zoom: 1 },
  speed: 1,
};

const Game = {
  idx(x, y){ return y * G.W + x; },
  inb(x, y){ return x >= 0 && y >= 0 && x < G.W && y < G.H; },
  nid(){ return G.state.nextId++; },
  notify(m){ if (typeof UI !== 'undefined' && UI.toast) UI.toast(m); },

  station(id){ return G.state.stations.find(s => s.id === id); },
  line(id){ return G.state.lines.find(l => l.id === id); },
  depot(id){ return G.state.depots.find(d => d.id === id); },
  town(id){ return G.state.towns.find(t => t.id === id); },
  industry(id){ return G.state.inds.find(i => i.id === id); },
  lineNet(line){
    if (!line.stops.length) return null;
    const st = Game.station(line.stops[0]);
    return st ? D.STATION_TYPES[st.type].net : null;
  },

  newGame(seed){
    let s = null;
    for (let k = 0; k < 12 && !s; k++) s = MapGen.generate(seed + k * 7919);
    if (!s) throw new Error('map generation failed');
    G.state = s;
    G.editLineId = null; G.selected = null; G.preview = null;
    Game.rebuildOcc();
    Game.refreshAcceptance();
    G.netVersion++;
    const t0 = s.towns[0];
    G.cam = { x: t0.x, y: t0.y, zoom: 1.1 };
    G.speed = 1;
  },

  rebuildOcc(){
    G.occ.clear();
    const s = G.state;
    for (const t of s.towns) for (const i of t.tiles) G.occ.set(i, { k: 'house', id: t.id });
    for (const ind of s.inds)
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
        G.occ.set(Game.idx(ind.x + dx, ind.y + dy), { k: 'ind', id: ind.id });
    for (const st of s.stations) G.occ.set(Game.idx(st.x, st.y), { k: 'station', id: st.id });
    for (const d of s.depots) G.occ.set(Game.idx(d.x, d.y), { k: 'depot', id: d.id });
  },

  // Recompute what each station accepts/serves from its catchment area.
  refreshAcceptance(){
    const s = G.state;
    for (const t of s.towns) t._stPax = [];
    for (const ind of s.inds) ind._st = [];
    for (const st of s.stations){
      const def = D.STATION_TYPES[st.type];
      const paxOK = def.cls !== 'cargo', frOK = def.cls !== 'pax';
      st._accepts = new Set();
      st._towns = new Set();
      st._consInd = [];
      const seenT = new Set(), seenI = new Set();
      for (let y = st.y - def.r; y <= st.y + def.r; y++){
        for (let x = st.x - def.r; x <= st.x + def.r; x++){
          if (!Game.inb(x, y)) continue;
          const o = G.occ.get(Game.idx(x, y));
          if (!o) continue;
          if (o.k === 'house' && !seenT.has(o.id)){
            seenT.add(o.id);
            const tw = Game.town(o.id);
            if (!tw) continue;
            st._towns.add(o.id);
            if (paxOK){ st._accepts.add('pax'); tw._stPax.push(st); }
            if (frOK) for (const c of D.TOWN_ACCEPTS) st._accepts.add(c);
          } else if (o.k === 'ind' && !seenI.has(o.id)){
            seenI.add(o.id);
            const ind = Game.industry(o.id);
            if (!ind) continue;
            const idef = D.INDUSTRIES[ind.type];
            if (frOK){
              if (idef.inp){
                for (const c of idef.inp) st._accepts.add(c);
                st._consInd.push(ind);
              }
              if (idef.out) ind._st.push(st);
            }
          }
        }
      }
    }
  },

  income(t, amt){
    const s = G.state;
    s.money += amt;
    s.stats.m.inc[t] = (s.stats.m.inc[t] || 0) + amt;
  },
  spend(amt){
    const s = G.state;
    s.money -= amt;
    s.stats.m.build += amt;
  },

  // Route a delivered cargo unit to a consumer in the station's catchment.
  deliver(st, t, n){
    if (t === 'pax'){
      const id = st._towns.values().next().value;
      const tw = Game.town(id);
      if (tw) tw.paxServed += n;
      return;
    }
    for (const ind of st._consInd){
      const def = D.INDUSTRIES[ind.type];
      if (def.inp && def.inp.includes(t)){
        ind.stockIn[t] = Math.min(D.IND_IN_CAP, (ind.stockIn[t] || 0) + n);
        return;
      }
    }
    for (const id of st._towns){
      const tw = Game.town(id);
      if (tw){ tw.delivered[t] = (tw.delivered[t] || 0) + n; return; }
    }
  },

  tick(dtReal, mult){
    const s = G.state;
    if (!s) return;
    const dt = dtReal * mult;
    if (dt <= 0) return;
    for (const v of s.vehicles) Veh.update(v, dt);
    const prevDay = Math.floor(s.day);
    s.day += dt / D.DAY_SEC;
    let d = prevDay;
    while (d < Math.floor(s.day)){ d++; Game.dayTick(); }
    const mi = Math.floor(s.day / 30);
    if (mi !== s.monthIdx){ s.monthIdx = mi; Game.monthTick(); }
  },

  dayTick(){
    const s = G.state;
    for (const ind of s.inds){
      const def = D.INDUSTRIES[ind.type];
      for (const t in def.out){
        let n = def.out[t];
        if (def.inp) for (const i of def.inp) n = Math.min(n, ind.stockIn[i] || 0);
        n = Math.min(n, D.STOCK_CAP - (ind.stock[t] || 0));
        if (n > 0){
          if (def.inp) for (const i of def.inp) ind.stockIn[i] -= n;
          ind.stock[t] = (ind.stock[t] || 0) + n;
        }
      }
      if (ind._st && ind._st.length){
        for (const t in ind.stock){
          let guard = 8;
          while (ind.stock[t] > 0 && guard-- > 0){
            let best = null;
            for (const st of ind._st){
              const cur = st.cargo[t] || 0;
              if (cur < D.ST_CARGO_CAP && (!best || cur < (best.cargo[t] || 0))) best = st;
            }
            if (!best) break;
            const n = Math.min(ind.stock[t], D.ST_CARGO_CAP - (best.cargo[t] || 0));
            best.cargo[t] = (best.cargo[t] || 0) + n;
            ind.stock[t] -= n;
          }
        }
      }
    }
    for (const tw of s.towns){
      if (!tw._stPax || !tw._stPax.length) continue;
      const gen = Math.max(1, Math.round(tw.pop * 0.012));
      const per = Math.ceil(gen / tw._stPax.length);
      for (const st of tw._stPax){
        const n = Math.min(120 - (st.cargo.pax || 0), per);
        if (n > 0) st.cargo.pax = (st.cargo.pax || 0) + n;
      }
    }
  },

  monthTick(){
    const s = G.state;
    let run = 0;
    for (const v of s.vehicles) run += Veh.model(v).run;
    s.money -= run;
    s.stats.m.run += run;
    for (const tw of s.towns){
      const cnt = Object.keys(tw.delivered).length + (tw.paxServed > 0 ? 1 : 0);
      const grow = Math.round(tw.pop * (0.001 + 0.004 * cnt)) + cnt;
      tw.pop = Math.min(20000, tw.pop + grow);
      const target = Math.ceil(tw.pop / 22);
      let guard = 0;
      while (tw.tiles.length < target && guard++ < 6) if (!Game.addHouse(tw)) break;
      tw.delivered = {};
      tw.paxServed = 0;
    }
    s.stats.last = s.stats.m;
    s.stats.m = { inc: {}, run: 0, build: 0 };
    Game.refreshAcceptance();
  },

  addHouse(tw){
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const s = G.state;
    for (let k = 0; k < 30; k++){
      const base = tw.tiles[(Math.random() * tw.tiles.length) | 0];
      const bx = base % G.W, by = (base / G.W) | 0;
      const d = dirs[(Math.random() * 4) | 0];
      const x = bx + d[0], y = by + d[1];
      if (!Game.inb(x, y)) continue;
      const i = Game.idx(x, y);
      const ter = s.terrain[i];
      if (ter !== 1 && ter !== 2) continue;
      if (s.net[i] || G.occ.has(i)) continue;
      s.terrain[i] = 1;
      tw.tiles.push(i);
      G.occ.set(i, { k: 'house', id: tw.id });
      return true;
    }
    return false;
  },

  dateStr(){
    const s = G.state;
    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const y = D.START_YEAR + Math.floor(s.day / 360);
    const m = Math.floor(s.day / 30) % 12;
    const dd = 1 + Math.floor(s.day % 30);
    return mn[m] + ' ' + dd + ', ' + y;
  },
  year(){ return D.START_YEAR + Math.floor(G.state.day / 360); },
};
