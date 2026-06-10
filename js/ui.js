'use strict';
const UI = {
  els: {},
  toastTimer: null,

  init(){
    UI.els.money = document.getElementById('money');
    UI.els.date = document.getElementById('date');
    UI.els.panel = document.getElementById('panel');
    UI.els.title = document.getElementById('panelTitle');
    UI.els.body = document.getElementById('panelBody');
    UI.els.banner = document.getElementById('banner');
    UI.els.toast = document.getElementById('toast');

    document.getElementById('panelClose').onclick = () => UI.closePanel();
    document.getElementById('btnMenu').onclick = () => UI.showMenu();
    const rot = document.getElementById('btnRot');
    if (rot) rot.onclick = () => { G.cam.rot = ((G.cam.rot || 0) + Math.PI / 4) % (Math.PI * 2); };
    document.querySelectorAll('#speed button').forEach(b => {
      b.onclick = () => {
        G.speed = +b.dataset.speed;
        document.querySelectorAll('#speed button').forEach(q => q.classList.toggle('on', q === b));
      };
    });
    document.querySelectorAll('#toolbar .tool').forEach(b => {
      b.onclick = () => {
        if (b.dataset.panel){
          if (b.dataset.panel === 'lines') UI.showLines();
          else UI.showFinance();
          return;
        }
        UI.setTool(b.dataset.tool);
        UI.toolHint(b.dataset.tool);
      };
    });
  },

  setTool(t){
    G.tool = t;
    G.preview = null;
    document.querySelectorAll('#toolbar .tool[data-tool]').forEach(b =>
      b.classList.toggle('on', b.dataset.tool === t));
  },

  toolHint(t){
    const hints = {
      road: 'Drag on the map to build road · ' + U.money(Build.netBase.road) + '/tile · two fingers to pan',
      rail: 'Drag to lay rail · ' + U.money(Build.netBase.rail) + '/tile · two fingers to pan',
      bulldoze: 'Tap or drag to demolish roads, rails, stations and depots',
      bus: 'Tap near houses, on or beside a road (' + U.money(D.STATION_TYPES.bus.cost) + ')',
      truck: 'Tap near an industry or town (' + U.money(D.STATION_TYPES.truck.cost) + ')',
      train: 'Tap to place a rail station (' + U.money(D.STATION_TYPES.train.cost) + ')',
      rdepot: 'Tap beside a road — buy buses & trucks here (' + U.money(D.DEPOT_TYPES.road.cost) + ')',
      tdepot: 'Tap beside rails — buy trains here (' + U.money(D.DEPOT_TYPES.rail.cost) + ')',
    };
    if (hints[t]) UI.toast(hints[t]);
  },

  toast(m){
    const t = UI.els.toast;
    if (!t) return;
    t.textContent = m;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(() => {
      t.style.opacity = 0;
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2800);
  },

  hud(){
    const s = G.state;
    if (!s) return;
    UI.els.money.textContent = U.money(s.money);
    UI.els.money.classList.toggle('neg', s.money < 0);
    UI.els.date.textContent = Game.dateStr();
  },

  openPanel(title){
    UI.els.title.textContent = title;
    UI.els.panel.classList.remove('hidden');
    UI.els.body.innerHTML = '';
    return UI.els.body;
  },
  closePanel(){
    UI.els.panel.classList.add('hidden');
    G.selected = null;
  },
  row(html){
    const d = document.createElement('div');
    d.className = 'row';
    d.innerHTML = html;
    return d;
  },

  previewBanner(plan){
    if (G.editLineId) return;
    UI.els.banner.classList.remove('hidden');
    UI.els.banner.textContent = plan.kind === 'doze'
      ? 'Demolish — ' + U.money(plan.cost)
      : 'Cost: ' + U.money(plan.cost) + (plan.ok ? '' : ' — blocked!');
  },
  hidePreviewBanner(){
    if (G.editLineId) return;
    UI.els.banner.classList.add('hidden');
  },

  // ---------- info panels ----------

  showStation(id){
    const st = Game.station(id);
    if (!st) return;
    G.selected = { k: 'station', id };
    const def = D.STATION_TYPES[st.type];
    const b = UI.openPanel(def.icon + ' ' + st.name);
    b.appendChild(UI.row('<div class="grow">' + def.name + '<div class="sub">Coverage radius ' + def.r + ' tiles</div></div>'));
    const cargo = Object.entries(st.cargo).filter(([, n]) => n > 0);
    b.appendChild(UI.row('<div class="grow">Waiting</div><div>' +
      (cargo.length ? cargo.map(([t, n]) => D.CARGOS[t].icon + ' ' + Math.floor(n)).join('&nbsp; ') : '—') + '</div>'));
    const acc = st._accepts ? [...st._accepts] : [];
    b.appendChild(UI.row('<div class="grow">Accepts</div><div>' +
      (acc.length ? acc.map(t => D.CARGOS[t].icon).join(' ') : 'nothing in range') + '</div>'));
    const lines = G.state.lines.filter(l => l.stops.includes(id));
    for (const l of lines){
      const r = UI.row('<span class="chip" style="background:' + l.color + '"></span><div class="grow">' + l.name + '</div><button class="btn gray">View</button>');
      r.querySelector('button').onclick = () => UI.showLine(l.id);
      b.appendChild(r);
    }
    if (!lines.length) b.appendChild(UI.row('<div class="sub grow">No lines stop here yet — add it to a line in the Lines panel.</div>'));
  },

  showTown(id){
    const tw = Game.town(id);
    if (!tw) return;
    G.selected = { k: 'town', id };
    const b = UI.openPanel('🏘️ ' + tw.name);
    b.appendChild(UI.row('<div class="grow">Population</div><b>' + tw.pop + '</b>'));
    b.appendChild(UI.row('<div class="grow">Demands</div><div>🧍 ' + D.TOWN_ACCEPTS.map(t => D.CARGOS[t].icon).join(' ') + '</div>'));
    const del = Object.entries(tw.delivered);
    b.appendChild(UI.row('<div class="grow">Received this month</div><div>' +
      (del.length ? del.map(([t, n]) => D.CARGOS[t].icon + ' ' + Math.floor(n)).join('&nbsp; ') : '—') + '</div>'));
    b.appendChild(UI.row('<div class="grow">Passengers served this month</div><b>' + tw.paxServed + '</b>'));
    b.appendChild(UI.row('<div class="sub grow">Towns grow faster when supplied with passengers, food, goods and tools.</div>'));
  },

  showIndustry(id){
    const ind = Game.industry(id);
    if (!ind) return;
    G.selected = { k: 'ind', id };
    const def = D.INDUSTRIES[ind.type];
    const b = UI.openPanel(def.icon + ' ' + def.name);
    if (def.inp){
      b.appendChild(UI.row('<div class="grow">Needs</div><div>' +
        def.inp.map(t => D.CARGOS[t].icon + ' ' + Math.floor(ind.stockIn[t] || 0)).join('&nbsp; ') + '</div>'));
    }
    b.appendChild(UI.row('<div class="grow">Produces</div><div>' +
      Object.keys(def.out).map(t => D.CARGOS[t].icon + ' ' + D.CARGOS[t].name + ' (' + Math.floor(ind.stock[t] || 0) + ' stored)').join('&nbsp; ') + '</div>'));
    const n = ind._st ? ind._st.length : 0;
    b.appendChild(UI.row('<div class="grow">Shipping via</div><div>' + (n ? n + ' station' + (n > 1 ? 's' : '') : 'no station in range!') + '</div>'));
    b.appendChild(UI.row('<div class="sub grow">Place a 📦 truck stop or 🚉 rail station within range to ship its output.</div>'));
  },

  showDepot(id){
    const dep = Game.depot(id);
    if (!dep) return;
    G.selected = { k: 'depot', id };
    const def = D.DEPOT_TYPES[dep.kind];
    const b = UI.openPanel(def.icon + ' ' + def.name);
    const year = Game.year();
    const models = D.MODELS.filter(m => m.net === dep.kind && m.year <= year);
    const future = D.MODELS.filter(m => m.net === dep.kind && m.year > year);
    for (const m of models){
      const r = UI.row(m.icon + '<div class="grow"><b>' + m.name + '</b><div class="sub">' +
        (m.cls === 'pax' ? 'Passengers' : 'Freight') + ' · cap ' + m.cap + ' · ' +
        U.money(m.cost) + ' · ' + U.money(m.run) + '/mo</div></div><button class="btn">Buy</button>');
      r.querySelector('button').onclick = () => UI.buyFlow(dep, m);
      b.appendChild(r);
    }
    if (future.length){
      const next = future.reduce((a, m) => (m.year < a.year ? m : a));
      b.appendChild(UI.row('<div class="sub grow">New models arrive over time — next: ' + next.name + ' in ' + next.year + '.</div>'));
    }
  },

  buyFlow(dep, m){
    const lines = G.state.lines.filter(l => l.stops.length >= 2 && Game.lineNet(l) === dep.kind);
    if (!lines.length){
      UI.toast('Create a ' + dep.kind + ' line with 2+ stops first (🧭 Lines panel)');
      return;
    }
    if (lines.length === 1){
      if (Veh.buy(m.id, dep.id, lines[0].id)) UI.showDepot(dep.id);
      return;
    }
    const b = UI.openPanel('Assign ' + m.name + ' to…');
    for (const l of lines){
      const r = UI.row('<span class="chip" style="background:' + l.color + '"></span><div class="grow">' + l.name +
        '<div class="sub">' + l.stops.length + ' stops</div></div><button class="btn">Choose</button>');
      r.querySelector('button').onclick = () => {
        if (Veh.buy(m.id, dep.id, l.id)) UI.showDepot(dep.id);
      };
      b.appendChild(r);
    }
  },

  showVehicle(id){
    const v = G.state.vehicles.find(q => q.id === id);
    if (!v) return;
    G.selected = { k: 'vehicle', id };
    const m = Veh.model(v);
    const l = Game.line(v.lineId);
    const b = UI.openPanel(m.icon + ' ' + m.name);
    let status = 'No line assigned';
    if (l && l.stops.length){
      const st = Game.station(l.stops[v.stopIdx % l.stops.length]);
      status = st ? 'Heading to ' + st.name : 'Waiting';
      if (!v._path && v.wait <= 0) status += ' (finding route…)';
    }
    b.appendChild(UI.row('<div class="grow">Status</div><div class="sub">' + status + '</div>'));
    const sums = {};
    for (const c of v.cargo) sums[c.t] = (sums[c.t] || 0) + c.n;
    const cs = Object.entries(sums);
    b.appendChild(UI.row('<div class="grow">On board (' + Object.values(sums).reduce((a, n) => a + n, 0) + '/' + m.cap + ')</div><div>' +
      (cs.length ? cs.map(([t, n]) => D.CARGOS[t].icon + ' ' + n).join('&nbsp; ') : 'empty') + '</div>'));
    if (l){
      const r = UI.row('<span class="chip" style="background:' + l.color + '"></span><div class="grow">' + l.name + '</div><button class="btn gray">View line</button>');
      r.querySelector('button').onclick = () => UI.showLine(l.id);
      b.appendChild(r);
    }
    const r2 = UI.row('<div class="grow sub">Running cost ' + U.money(m.run) + '/mo</div><button class="btn red">Sell (' + U.money(m.cost * 0.5) + ')</button>');
    r2.querySelector('button').onclick = () => { Veh.sell(v); UI.closePanel(); };
    b.appendChild(r2);
  },

  // ---------- lines ----------

  showLines(){
    const b = UI.openPanel('🧭 Lines');
    for (const l of G.state.lines){
      const nv = G.state.vehicles.filter(v => v.lineId === l.id).length;
      const r = UI.row('<span class="chip" style="background:' + l.color + '"></span><div class="grow">' + l.name +
        '<div class="sub">' + l.stops.length + ' stops · ' + nv + ' vehicle' + (nv === 1 ? '' : 's') + '</div></div><button class="btn gray">View</button>');
      r.querySelector('button').onclick = () => UI.showLine(l.id);
      b.appendChild(r);
    }
    if (!G.state.lines.length){
      b.appendChild(UI.row('<div class="sub grow">No lines yet. A line is a loop of stations that vehicles serve.</div>'));
    }
    const r = UI.row('<button class="btn green" style="width:100%">＋ New Line</button>');
    r.querySelector('button').onclick = () => UI.newLine();
    b.appendChild(r);
  },

  newLine(){
    const s = G.state;
    const l = {
      id: Game.nid(),
      name: 'Line ' + (s.lines.length + 1),
      color: D.LINE_COLORS[s.lines.length % D.LINE_COLORS.length],
      stops: [],
    };
    s.lines.push(l);
    UI.editStops(l.id);
  },

  editStops(id){
    const l = Game.line(id);
    if (!l) return;
    G.editLineId = id;
    UI.setTool('select');
    UI.els.panel.classList.add('hidden');
    UI.els.banner.classList.remove('hidden');
    UI.els.banner.innerHTML = '<span>' + l.name + ': tap stations to add stops (<b id="bnN">' + l.stops.length + '</b>)</span>' +
      '<button class="btn gray" id="bnU">Undo</button><button class="btn green" id="bnD">Done</button>';
    document.getElementById('bnU').onclick = () => {
      l.stops.pop();
      l._pc = null;
      document.getElementById('bnN').textContent = l.stops.length;
    };
    document.getElementById('bnD').onclick = () => {
      G.editLineId = null;
      UI.els.banner.classList.add('hidden');
      if (l.stops.length < 2) UI.toast('A line needs at least 2 stops to run vehicles');
      UI.showLine(id);
    };
  },

  addStop(sid){
    const l = Game.line(G.editLineId);
    if (!l) return;
    const st = Game.station(sid);
    if (!st) return;
    if (l.stops.length){
      const net = Game.lineNet(l);
      const n2 = D.STATION_TYPES[st.type].net;
      if (net && net !== n2){
        UI.toast('This line uses ' + (net === 'road' ? 'road stops' : 'rail stations') + ' only');
        return;
      }
      if (l.stops[l.stops.length - 1] === sid){
        UI.toast('That is already the previous stop');
        return;
      }
    }
    l.stops.push(sid);
    l._pc = null;
    const n = document.getElementById('bnN');
    if (n) n.textContent = l.stops.length;
    UI.toast('Stop ' + l.stops.length + ': ' + st.name);
  },

  showLine(id){
    const l = Game.line(id);
    if (!l) return;
    G.selected = { k: 'line', id };
    const b = UI.openPanel('🧭 ' + l.name);
    const net = Game.lineNet(l);
    b.appendChild(UI.row('<span class="chip" style="background:' + l.color + '"></span><div class="grow sub">' +
      (net ? (net === 'road' ? 'Road line' : 'Rail line') : 'Empty line') + ' · vehicles loop through the stops in order</div>'));
    l.stops.forEach((sid, i) => {
      const st = Game.station(sid);
      const r = UI.row('<div class="grow">' + (i + 1) + '. ' + (st ? st.name : '(removed)') + '</div><button class="btn gray">✕</button>');
      r.querySelector('button').onclick = () => {
        l.stops.splice(i, 1);
        l._pc = null;
        UI.showLine(id);
      };
      b.appendChild(r);
    });
    const r2 = UI.row('<button class="btn green">＋ Add stops</button><div class="grow"></div><button class="btn red">Delete line</button>');
    const [add, del] = r2.querySelectorAll('button');
    add.onclick = () => UI.editStops(id);
    del.onclick = () => {
      if (del.dataset.armed){
        for (const v of [...G.state.vehicles]) if (v.lineId === id) Veh.sell(v);
        G.state.lines = G.state.lines.filter(q => q.id !== id);
        G.selected = null;
        UI.showLines();
      } else {
        del.dataset.armed = '1';
        del.textContent = 'Tap to confirm';
      }
    };
    b.appendChild(r2);
    const vs = G.state.vehicles.filter(v => v.lineId === id);
    for (const v of vs){
      const m = Veh.model(v);
      const load = v.cargo.reduce((a, c) => a + c.n, 0);
      const r = UI.row(m.icon + '<div class="grow">' + m.name + '<div class="sub">' + load + '/' + m.cap + ' loaded</div></div><button class="btn gray">View</button>');
      r.querySelector('button').onclick = () => UI.showVehicle(v.id);
      b.appendChild(r);
    }
    if (!vs.length && l.stops.length >= 2){
      b.appendChild(UI.row('<div class="sub grow">No vehicles yet — build a ' +
        (net === 'rail' ? '🚧 rail' : '🛻 road') + ' depot connected to this network and buy one there.</div>'));
    }
  },

  // ---------- finance / menu / help ----------

  showFinance(){
    const s = G.state;
    const b = UI.openPanel('💰 Finances');
    b.appendChild(UI.row('<div class="grow"><b>Balance</b></div><b style="color:' + (s.money < 0 ? '#f87171' : '#4ade80') + '">' + U.money(s.money) + '</b>'));
    const section = (label, st) => {
      b.appendChild(UI.row('<div class="grow"><b>' + label + '</b></div>'));
      let inc = 0;
      for (const t in st.inc){
        inc += st.inc[t];
        b.appendChild(UI.row('<div class="grow sub">' + D.CARGOS[t].icon + ' ' + D.CARGOS[t].name + '</div><div style="color:#4ade80">+' + U.money(st.inc[t]) + '</div>'));
      }
      if (!inc) b.appendChild(UI.row('<div class="grow sub">No income yet</div>'));
      b.appendChild(UI.row('<div class="grow sub">Vehicle running costs</div><div style="color:#f87171">-' + U.money(st.run) + '</div>'));
      b.appendChild(UI.row('<div class="grow sub">Construction & vehicles</div><div style="color:#f87171">-' + U.money(st.build) + '</div>'));
      const net = inc - st.run - st.build;
      b.appendChild(UI.row('<div class="grow sub"><b>Net</b></div><b style="color:' + (net < 0 ? '#f87171' : '#4ade80') + '">' + U.money(net) + '</b>'));
    };
    section('This month', s.stats.m);
    if (s.stats.last) section('Last month', s.stats.last);
    b.appendChild(UI.row('<div class="grow sub">Fleet size</div><div>' + s.vehicles.length + ' vehicles</div>'));
  },

  showMenu(){
    const b = UI.openPanel('☰ Menu');
    const mk = (label, cls, fn) => {
      const r = UI.row('<button class="btn ' + cls + '" style="width:100%">' + label + '</button>');
      r.querySelector('button').onclick = fn;
      b.appendChild(r);
      return r.querySelector('button');
    };
    mk('💾 Save game', 'gray', () => { Save.save(); UI.toast('Game saved'); });
    mk('❓ How to play', 'gray', () => UI.showHelp());
    const nb = mk('🌍 New game (random map)', 'red', () => {
      if (nb.dataset.armed){
        Game.newGame((Math.random() * 1e9) | 0);
        Save.save();
        UI.closePanel();
        UI.toast('New world generated — good luck!');
      } else {
        nb.dataset.armed = '1';
        nb.textContent = 'Tap to confirm — current game is lost';
      }
    });
    b.appendChild(UI.row('<div class="sub grow">Tiny Transport — autosaves every 30s in your browser.</div>'));
  },

  showHelp(){
    const b = UI.openPanel('❓ How to play');
    const d = document.createElement('div');
    d.className = 'help';
    d.innerHTML =
      '<p><b>Goal:</b> build a profitable transport empire — move passengers and cargo, grow towns, unlock better vehicles over the years.</p>' +
      '<p><b>1.</b> Place stations: 🚏 bus stops near houses, 📦 truck stops near industries and towns, 🚉 rail stations for both. Each covers a radius (dashed circle).</p>' +
      '<p><b>2.</b> Connect stations with 🛣️ roads or 🛤️ rails — drag on the map to build. Building over water makes bridges (6×), hills cost 3×.</p>' +
      '<p><b>3.</b> Open 🧭 <b>Lines</b> → New Line, then tap your stations in order and press Done.</p>' +
      '<p><b>4.</b> Place a 🛻 road depot or 🚧 rail depot touching your network, tap it, and buy a vehicle for the line.</p>' +
      '<p><b>5.</b> Vehicles loop along the line, load what a later stop accepts, and earn by distance × cargo value.</p>' +
      '<p><b>Supply chains:</b><br>🌾 Farm → 🥫 Food Plant → towns<br>🌲 Lumber Camp → 🪚 Sawmill → 📦 Goods → towns<br>⛏️ Coal + 🪨 Iron → 🏭 Steel Mill → 🔧 Tool Works → towns<br>🧍 Passengers travel between towns.</p>' +
      '<p><b>Towns grow</b> when supplied with passengers, food, goods and tools — more houses, more passengers.</p>' +
      '<p><b>Controls:</b> one finger pans (select tool) · pinch to zoom · with road/rail/demolish tools, one-finger drag builds and two fingers pan · tap anything to inspect it.</p>' +
      '<p>New vehicle generations unlock in 1975/1980, 2000/2005. Watch your monthly running costs in 💰.</p>';
    b.appendChild(d);
  },
};
