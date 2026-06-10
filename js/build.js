'use strict';
const Build = {
  netBase: { road: 20, rail: 45 },
  bit(net){ return net === 'rail' ? 2 : 1; },

  tileCost(i, net){
    const t = G.state.terrain[i];
    const b = Build.netBase[net];
    if (t === 0) return b * 6;   // bridge
    if (t === 3) return b * 3;   // hill cutting
    if (t === 2) return b + 15;  // clear forest
    return b;
  },

  // L-shaped path from (x0,y0) to (x1,y1): horizontal leg then vertical leg.
  lPath(x0, y0, x1, y1){
    const tiles = [];
    const seen = new Set();
    const push = (x, y) => {
      const i = Game.idx(x, y);
      if (seen.has(i)) return;
      seen.add(i);
      tiles.push({ x, y, i });
    };
    let x = x0, y = y0;
    push(x, y);
    while (x !== x1){ x += Math.sign(x1 - x); push(x, y); }
    while (y !== y1){ y += Math.sign(y1 - y); push(x, y); }
    return tiles;
  },

  planNet(net, x0, y0, x1, y1){
    const tiles = Build.lPath(x0, y0, x1, y1);
    const bit = Build.bit(net);
    let cost = 0, ok = true;
    for (const t of tiles){
      t.has = (G.state.net[t.i] & bit) !== 0;
      if (t.has) continue;
      if (G.occ.has(t.i)){ ok = false; t.bad = true; continue; }
      cost += Build.tileCost(t.i, net);
    }
    return { kind: 'net', net, tiles, cost, ok };
  },

  commitNet(plan){
    if (!plan.ok){ Game.notify('Route blocked by a building'); return false; }
    if (plan.cost > G.state.money){ Game.notify('Not enough money (' + U.money(plan.cost) + ')'); return false; }
    const bit = Build.bit(plan.net);
    let built = 0;
    for (const t of plan.tiles){
      if (t.has) continue;
      G.state.net[t.i] |= bit;
      if (G.state.terrain[t.i] === 2){ G.state.terrain[t.i] = 1; G.terrainVersion++; }
      built++;
    }
    if (built){ Game.spend(plan.cost); G.netVersion++; }
    return true;
  },

  planDoze(x0, y0, x1, y1){
    const tiles = Build.lPath(x0, y0, x1, y1);
    for (const t of tiles){
      const o = G.occ.get(t.i);
      t.has = G.state.net[t.i] !== 0 || (o && (o.k === 'station' || o.k === 'depot'));
    }
    const cost = tiles.filter(t => t.has).length * 10;
    return { kind: 'doze', tiles, cost, ok: true };
  },

  commitDoze(plan){
    let n = 0;
    for (const t of plan.tiles){
      const o = G.occ.get(t.i);
      if (o){
        if (o.k === 'station'){ Build.removeStation(o.id); n++; }
        else if (o.k === 'depot'){ Build.removeDepot(o.id); n++; }
        // houses and industries can't be demolished
        continue;
      }
      if (G.state.net[t.i]){ G.state.net[t.i] = 0; n++; }
    }
    if (n){ Game.spend(n * 10); G.netVersion++; }
  },

  checkBuildSite(x, y, cost){
    if (!Game.inb(x, y)) return false;
    const i = Game.idx(x, y);
    const t = G.state.terrain[i];
    if (t === 0 || t === 3){ Game.notify('Needs flat, dry land'); return false; }
    if (G.occ.has(i)){ Game.notify('Tile occupied'); return false; }
    if (cost > G.state.money){ Game.notify('Not enough money (' + U.money(cost) + ')'); return false; }
    return true;
  },

  placeStation(type, x, y){
    const def = D.STATION_TYPES[type];
    const s = G.state;
    if (!Build.checkBuildSite(x, y, def.cost)) return;
    const i = Game.idx(x, y);
    let town = null, bd = 13;
    for (const tw of s.towns){
      const d = Math.abs(tw.x - x) + Math.abs(tw.y - y);
      if (d < bd){ bd = d; town = tw; }
    }
    let name;
    if (town){
      const n = s.stations.filter(q => q.name.startsWith(town.name)).length;
      name = town.name + (n ? ' ' + (n + 1) : '');
    } else {
      name = 'Outpost ' + (s.stations.length + 1);
    }
    const st = { id: Game.nid(), type, x, y, name, cargo: {} };
    s.stations.push(st);
    if (s.terrain[i] !== 1){ s.terrain[i] = 1; G.terrainVersion++; }
    s.net[i] |= Build.bit(def.net);
    G.occ.set(i, { k: 'station', id: st.id });
    Game.spend(def.cost);
    Game.refreshAcceptance();
    G.netVersion++;
    Game.notify(def.name + ' "' + name + '" built');
  },

  removeStation(id){
    const s = G.state;
    const st = Game.station(id);
    if (!st) return;
    const i = Game.idx(st.x, st.y);
    s.stations = s.stations.filter(q => q.id !== id);
    G.occ.delete(i);
    s.net[i] = 0;
    for (const l of s.lines){
      l.stops = l.stops.filter(q => q !== id);
      l._pc = null;
    }
    Game.refreshAcceptance();
    G.netVersion++;
  },

  placeDepot(kind, x, y){
    const def = D.DEPOT_TYPES[kind];
    const s = G.state;
    if (!Build.checkBuildSite(x, y, def.cost)) return;
    const i = Game.idx(x, y);
    const dep = { id: Game.nid(), kind, x, y };
    s.depots.push(dep);
    if (s.terrain[i] !== 1){ s.terrain[i] = 1; G.terrainVersion++; }
    s.net[i] |= Build.bit(kind);
    G.occ.set(i, { k: 'depot', id: dep.id });
    Game.spend(def.cost);
    G.netVersion++;
    Game.notify(def.name + ' built — tap it to buy vehicles');
  },

  removeDepot(id){
    const s = G.state;
    const dep = Game.depot(id);
    if (!dep) return;
    const i = Game.idx(dep.x, dep.y);
    s.depots = s.depots.filter(q => q.id !== id);
    G.occ.delete(i);
    s.net[i] = 0;
    G.netVersion++;
  },
};
