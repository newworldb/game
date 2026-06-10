'use strict';
/* global Peer */
// Peer-to-peer online play (PeerJS / WebRTC, free public broker).
// The host's browser runs the Engine authoritatively; guests receive
// sanitized per-seat views and send their actions back.
const Net = {
  PREFIX: 'tinypoker-room-',
  peer: null,
  room: '',
  isHost: false,
  active: false,      // host: game running with remote players
  guestMode: false,   // this client is a guest at someone else's table
  setupMode: false,   // online setup screens are showing
  started: false,
  conns: [],          // host: [{conn, name, seat}]
  pending: new Map(), // host: seat -> action resolver
  guestConn: null,
  guestActing: false,
  _gotView: false,

  EMOJIS: ['😎', '🤠', '👽', '🤖', '🐵'],

  players(){ return Net.conns.filter(c => c.conn.open); },
  isAlive(conn){ return conn && conn.open; },

  inviteUrl(){
    return location.href.split('#')[0] + '#join=' + Net.room;
  },

  share(){
    const url = Net.inviteUrl();
    const done = () => UI.toast('Invite link copied — send it to your friends!');
    if (navigator.share){
      navigator.share({ title: 'Tiny Poker', text: 'Join my poker table — room ' + Net.room, url }).catch(() => {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(done).catch(() => UI.showLinkPanel(url));
      return;
    }
    UI.showLinkPanel(url);
  },

  code(){
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[(Math.random() * chars.length) | 0];
    return s;
  },

  // ---------- host ----------
  host(name){
    if (typeof Peer === 'undefined'){ UI.toast('Connection library failed to load — reload the page'); return; }
    Net.room = Net.code();
    Net.isHost = true;
    UI.toast('Creating room…');
    Net.peer = new Peer(Net.PREFIX + Net.room);
    Net.peer.on('open', () => UI.showRoomPanel());
    Net.peer.on('error', e => {
      if (e.type === 'unavailable-id'){ Net.host(name); return; } // code collision: reroll
      console.warn(e);
      UI.toast('Connection problem: ' + e.type + ' — try again');
    });
    Net.peer.on('connection', conn => {
      conn.on('data', d => Net.hostData(conn, d));
      conn.on('close', () => Net.dropGuest(conn));
      conn.on('error', () => Net.dropGuest(conn));
    });
  },

  hostData(conn, d){
    if (!d || typeof d !== 'object') return;
    if (d.t === 'hello'){
      if (Net.started){ conn.send({ t: 'full' }); conn.close(); return; }
      if (Net.conns.length >= 4){ conn.send({ t: 'full' }); conn.close(); return; }
      Net.conns.push({ conn, name: ('' + (d.name || 'Guest')).slice(0, 10), seat: -1 });
      conn.send({ t: 'welcome', room: Net.room });
      if (!Net.started) UI.showRoomPanel();
      return;
    }
    if (d.t === 'action'){
      const entry = Net.conns.find(c => c.conn === conn);
      if (!entry || entry.seat < 0) return;
      const res = Net.pending.get(entry.seat);
      if (res){
        Net.pending.delete(entry.seat);
        res(d.a);
      }
    }
  },

  dropGuest(conn){
    const entry = Net.conns.find(c => c.conn === conn);
    if (!entry) return;
    Net.conns = Net.conns.filter(c => c !== entry);
    if (Net.started && entry.seat >= 0){
      const p = Engine.seats[entry.seat];
      if (p){
        p.remote = null;
        p.name = entry.name + '🤖';
        Engine.hooks.log(entry.name + ' disconnected — a bot takes over');
      }
      const res = Net.pending.get(entry.seat);
      if (res){
        Net.pending.delete(entry.seat);
        res(null); // engine falls back to AI/fold
      }
    } else if (!Net.started){
      UI.showRoomPanel();
    }
  },

  startGame(){
    Net.started = true;
    Net.active = true;
    Net.setupMode = false;
    Engine.init(Engine.cfg.STACK, 'cash');
    Engine.online = true;
    const hero = Engine.human();
    hero.name = (Save.data.name || 'Host').slice(0, 10);
    Net.players().forEach((entry, k) => {
      const seat = Engine.seats[k + 1];
      entry.seat = seat.i;
      seat.name = entry.name;
      seat.emoji = Net.EMOJIS[k % Net.EMOJIS.length];
      seat.remote = entry;
      seat.isHuman = false;
    });
    // wrap hooks to broadcast
    const baseUpdate = Engine.hooks.update;
    Engine.hooks.update = () => { baseUpdate(); Net.broadcast(); };
    const baseLog = Engine.hooks.log;
    Engine.hooks.log = m => {
      baseLog(m);
      for (const e of Net.players()) e.conn.send({ t: 'log', m });
    };
    Engine.start();
  },

  broadcast(){
    for (const e of Net.players()){
      if (e.seat >= 0) e.conn.send({ t: 'view', v: UI.buildView(e.seat, true) });
    }
  },

  // host: ask a remote player for their action
  requestAction(p, ctx){
    const entry = p.remote;
    if (!entry || !Net.isAlive(entry.conn)) return Promise.resolve(null);
    const sendCtx = {
      toCall: ctx.toCall, pot: ctx.pot, minTo: ctx.minTo, maxTo: ctx.maxTo,
      bb: ctx.bb, canRaise: ctx.canRaise, stack: ctx.stack, bet: ctx.bet,
      online: true,
    };
    entry.conn.send({ t: 'act', ctx: sendCtx });
    return new Promise(res => {
      Net.pending.set(p.i, res);
      setTimeout(() => {
        if (Net.pending.get(p.i) === res){
          Net.pending.delete(p.i);
          Engine.hooks.log(p.name + ' timed out');
          res({ type: ctx.toCall > 0 ? 'fold' : 'check' });
        }
      }, 30000);
    });
  },

  // ---------- guest ----------
  join(room, name){
    if (typeof Peer === 'undefined'){ UI.toast('Connection library failed to load — reload the page'); return; }
    Net.room = room;
    Net.guestMode = true;
    Net.setupMode = false;
    UI.toast('Connecting to room ' + room + '…');
    Net.peer = new Peer();
    Net.peer.on('error', e => {
      console.warn(e);
      if (e.type === 'peer-unavailable') UI.toast('Room ' + room + ' not found — check the code');
      else UI.toast('Connection problem: ' + e.type);
      Net.guestMode = false;
      Net.setupMode = true;
      UI.showOnlineSetup();
    });
    Net.peer.on('open', () => {
      const conn = Net.peer.connect(Net.PREFIX + room, { reliable: true });
      Net.guestConn = conn;
      conn.on('open', () => conn.send({ t: 'hello', name }));
      conn.on('data', d => Net.guestData(d));
      conn.on('close', () => {
        UI.toast('Host left the table');
        setTimeout(() => { location.href = '../'; }, 1800);
      });
    });
  },

  guestData(d){
    if (!d || typeof d !== 'object') return;
    if (d.t === 'welcome'){
      const b = UI.openPanel('🌐 Room ' + Net.room);
      b.appendChild(UI.row('<div class="grow" style="text-align:center">Connected! Waiting for the host to start…</div>'));
      return;
    }
    if (d.t === 'full'){
      UI.toast('That table is full or already playing');
      Net.guestMode = false;
      Net.setupMode = true;
      UI.showOnlineSetup();
      return;
    }
    if (d.t === 'view'){
      if (!Net._gotView){ Net._gotView = true; UI.closePanel(); }
      UI.render(d.v);
      return;
    }
    if (d.t === 'log'){
      UI.log(d.m);
      return;
    }
    if (d.t === 'act'){
      if (Net.guestActing) return;
      Net.guestActing = true;
      d.ctx.online = true;
      UI.human(d.ctx).then(a => {
        Net.guestActing = false;
        if (Net.guestConn && Net.guestConn.open) Net.guestConn.send({ t: 'action', a });
      });
    }
  },
};

