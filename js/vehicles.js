'use strict';
const Veh = {
  model(v){ return D.MODELS.find(m => m.id === v.model); },

  buy(modelId, depotId, lineId){
    const s = G.state;
    const m = D.MODELS.find(q => q.id === modelId);
    const dep = Game.depot(depotId);
    const line = Game.line(lineId);
    if (!m || !dep || !line) return null;
    if (Game.lineNet(line) !== m.net){ Game.notify('That line is not a ' + m.net + ' line'); return null; }
    if (m.cost > s.money){ Game.notify('Not enough money'); return null; }
    const v = {
      id: Game.nid(), model: m.id, lineId,
      x: dep.x, y: dep.y, stopIdx: 0, cargo: [], wait: 0, retry: 0,
      _path: null, _dist: 0, _netVer: -1,
    };
    s.vehicles.push(v);
    Game.spend(m.cost);
    Game.notify(m.name + ' purchased and assigned to ' + line.name);
    return v;
  },

  sell(v){
    const s = G.state;
    const m = Veh.model(v);
    s.vehicles = s.vehicles.filter(q => q !== v);
    s.money += m.cost * 0.5;
    Game.notify(m.name + ' sold for ' + U.money(m.cost * 0.5));
  },

  update(v, dt){
    const line = Game.line(v.lineId);
    if (!line || line.stops.length < 2) return;
    if (v.stopIdx >= line.stops.length) v.stopIdx = 0;
    if (v.wait > 0){ v.wait -= dt; return; }
    const m = Veh.model(v);

    if (!v._path){
      v.retry -= dt;
      if (v.retry > 0) return;
      v.retry = 2;
      const target = Game.station(line.stops[v.stopIdx]);
      if (!target){ v.stopIdx = (v.stopIdx + 1) % line.stops.length; return; }
      const p = Path.find(m.net, Math.round(v.x), Math.round(v.y), target.x, target.y);
      if (p){ v._path = p; v._dist = 0; v._netVer = G.netVersion; }
      return;
    }

    if (v._netVer !== G.netVersion){
      v._netVer = G.netVersion;
      const target = Game.station(line.stops[v.stopIdx]);
      const p = target && Path.find(m.net, Math.round(v.x), Math.round(v.y), target.x, target.y);
      if (p){ v._path = p; v._dist = 0; }
      else { v._path = null; v.retry = 2; return; }
    }

    v._dist += m.speed * dt;
    const total = v._path.length - 1;
    if (v._dist >= total){
      const st = Game.station(line.stops[v.stopIdx]);
      v.x = v._path[total][0];
      v.y = v._path[total][1];
      v._path = null;
      v._dist = 0;
      v.retry = 0;
      if (st) Veh.processStop(v, line, st);
      v.stopIdx = (v.stopIdx + 1) % line.stops.length;
      v.wait = 1.4;
    } else {
      const pos = Veh.posAt(v._path, v._dist);
      v.x = pos[0];
      v.y = pos[1];
    }
  },

  posAt(p, d){
    const i = Math.max(0, Math.min(p.length - 2, Math.floor(d)));
    const f = U.clamp(d - i, 0, 1);
    return [U.lerp(p[i][0], p[i + 1][0], f), U.lerp(p[i][1], p[i + 1][1], f)];
  },

  processStop(v, line, st){
    const m = Veh.model(v);
    // unload anything this station accepts
    const keep = [];
    for (const c of v.cargo){
      let delivered = false;
      if (st._accepts && st._accepts.has(c.t)){
        if (c.t === 'pax') delivered = c.os !== st.id && U.mdist(c.ox, c.oy, st.x, st.y) >= 5;
        else delivered = true;
      }
      if (delivered){
        const dist = U.mdist(c.ox, c.oy, st.x, st.y);
        Game.income(c.t, c.n * dist * D.CARGOS[c.t].rate);
        Game.deliver(st, c.t, c.n);
      } else {
        keep.push(c);
      }
    }
    v.cargo = keep;

    // load anything a later stop on the line accepts
    let used = v.cargo.reduce((a, c) => a + c.n, 0);
    const canCarry = t => (t === 'pax' ? m.cls === 'pax' : m.cls === 'cargo');
    for (const t in st.cargo){
      if (!(st.cargo[t] > 0) || !canCarry(t)) continue;
      if (!Veh.laterAccepts(line, st, t)) continue;
      const n = Math.min(Math.floor(st.cargo[t]), m.cap - used);
      if (n <= 0) continue;
      st.cargo[t] -= n;
      used += n;
      v.cargo.push({ t, n, ox: st.x, oy: st.y, os: st.id });
    }
  },

  laterAccepts(line, st, t){
    for (const sid of line.stops){
      if (sid === st.id) continue;
      const s2 = Game.station(sid);
      if (!s2 || !s2._accepts || !s2._accepts.has(t)) continue;
      if (t !== 'pax') return true;
      if (U.mdist(st.x, st.y, s2.x, s2.y) >= 5) return true;
    }
    return false;
  },
};
