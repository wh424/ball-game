let md = '1v1';
let sd = 4;
let sl = { A: [null], B: [null] };
let as = { t: 'A', i: 0 };
let si = 0;
let ss = Array.of(1, 1.5, 2, 3);
let sm = 1;
let an = null;
let lt = 0;
let pa = 0;
let rn = 0;

let bs = [];
let pjs = [];
let zns = [];
let fxs = [];
let txs = [];

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const CX = 180;
const CY = 180;
const AR = 158;
const BR = 14;
const BS = 145;

const E = {
  ds(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
  en(m) {
    return bs.filter(b => b.hp > 0 && b.tm !== m.tm);
  },
  al(m) {
    return bs.filter(b => b.hp > 0 && b.tm === m.tm && b !== m);
  },
  nr(m) {
    const e = this.en(m);
    if (!e.length) return null;
    return e.reduce((a, b) => this.ds(m, b) <= this.ds(m, a) ? b : a);
  },
  fx(tp, x, y, r, c, ag = 0, ln = []) {
    fxs.push({ tp, x, y, r, c, ag, ln, d: 0.35, md: 0.35 });
  },
  tx(x, y, t, c = '#fff') {
    txs.push({ x, y, t, c, l: 0.7 });
  },
  zn(z) {
    zns.push(z);
  },
  pj(ow, x, y, vx, vy, r, c, ig, oh, owall) {
    pjs.push({ ow, x, y, vx, vy, r, c, ig, oh, owall, g: 0.15 });
  },
  hl(t, v) {
    if (!t || t.hp <= 0) return;
    const b = t.hp;
    t.hp = Math.min(100, t.hp + v);
    if (t.hp > b) this.tx(t.x, t.y - 16, '+' + Math.round(t.hp - b), '#4ade80');
  },
  hit(at, t, rw, db = {}, tr = 0) {
    if (!t || t.hp <= 0) return;
    if (at && t.tm === at.tm) return;
    if (t.inv > 0) {
      this.tx(t.x, t.y - 14, '무적', '#facc15');
      return;
    }
    let d = rw;
    if (!tr && t.df.id === 'C') d = Math.round(d * 0.8 * 10) / 10;
    if (t.sh > 0 && d > 0) {
      const ab = Math.min(t.sh, d);
      t.sh -= ab;
      t.shA += ab;
      d -= ab;
      if (t.sh <= 0) {
        t.shT = 0;
        if (t.df.shEnd) t.df.shEnd(t, this);
      }
    }
    if (d > 0) {
      t.hp -= d;
      t.fl = 0.12;
      this.tx(t.x, t.y - 12, '-' + Math.round(d * 10) / 10, '#f87171');
    }
    Object.entries(db).forEach(([k, v]) => {
      t.db[k] = Math.min(99, (t.db[k] || 0) + v);
    });
    if (t.df.id === 'I' && t.hp > 0 && t.hp <= 50 && t.st.v === 0) {
      t.st.v = 1;
      this.tx(t.x, t.y - 20, '과전류 1단계', '#facc15');
    }
    if (t.hp <= 0) {
      const hl = bs.find(b => b.hp > 0 && b.tm === t.tm && b !== t && b.df.id === 'J' && !b.st.r);
      if (hl) {
        hl.st.r = 1;
        t.hp = 50;
        t.inv = 2;
        this.tx(t.x, t.y - 18, '기적의 소생!', '#4ade80');
      } else {
        t.hp = 0;
      }
    }
  }
};

function mk(g, c, t) {
  const d = document.createElement(g);
  if (c) d.className = c;
  if (t !== undefined) d.textContent = t;
  return d;
}

document.getElementById('cnt').textContent = '총 ' + BALLS.length + '종 등록됨';

function rSl() {
  const a = document.getElementById('sl');
  a.innerHTML = '';
  const c = md === '1v1' ? 1 : 2;
  Array.of('A', 'B').forEach((tm, ti) => {
    if (ti === 1) a.appendChild(mk('div', '', 'VS'));
    const col = mk('div', 'tc');
    for (let i = 0; i < c; i++) {
      const b = sl[tm].at(i);
      const cls = 'bx' + (b ? ' f' + tm.toLowerCase() : '') + (as.t === tm && as.i === i ? ' sel' : '');
      const bx = mk('div', cls);
      bx.appendChild(mk('div', '', tm + '팀 ' + (c === 2 ? i + 1 : '')));
      bx.appendChild(mk('div', '', b ? b.n : '터치 선택'));
      bx.onclick = () => { as = { t: tm, i }; rSl(); };
      col.appendChild(bx);
    }
    a.appendChild(col);
  });
  const okA = sl.A.slice(0, c).every(Boolean);
  const okB = sl.B.slice(0, c).every(Boolean);
  document.getElementById('go').disabled = !(okA && okB);
}

function rRl() {
  const l = document.getElementById('rl');
  l.innerHTML = '';
  const c = md === '1v1' ? 1 : 2;
  BALLS.forEach(b => {
    const cd = mk('div', 'cd');
    const ic = mk('div', 'ic', b.s);
    ic.style.background = b.c;
    const inf = mk('div');
    inf.appendChild(mk('div', '', b.n));
    inf.appendChild(mk('div', '', b.d));
    cd.appendChild(ic);
    cd.appendChild(inf);
    cd.onclick = () => {
      sl[as.t][as.i] = b;
      if (as.t === 'A') {
        if (as.i + 1 < c && !sl.A.at(as.i + 1)) as.i++;
        else as = { t: 'B', i: 0 };
      } else if (as.i + 1 < c && !sl.B.at(as.i + 1)) {
        as.i++;
      }
      rSl();
    };
    l.appendChild(cd);
  });
}

document.getElementById('m1').onclick = e => {
  md = '1v1';
  sl = { A: [sl.A.at(0) || null], B: [sl.B.at(0) || null] };
  as = { t: 'A', i: 0 };
  e.target.classList.add('on');
  document.getElementById('m2').classList.remove('on');
  rSl();
};

document.getElementById('m2').onclick = e => {
  md = '2v2';
  sl = { A: [sl.A.at(0) || null, null], B: [sl.B.at(0) || null, null] };
  as = { t: 'A', i: 0 };
  e.target.classList.add('on');
  document.getElementById('m1').classList.remove('on');
  rSl();
};

document.querySelectorAll('.sb').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.sb').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    sd = Number(b.dataset.s);
  };
});

function opD(p) {
  if (p) pa = 1;
  const dl = document.getElementById('dl');
  dl.innerHTML = '';
  DICTS.forEach(d => {
    const it = mk('div', '');
    it.style.marginBottom = '8px';
    it.appendChild(mk('div', '', d.n));
    it.appendChild(mk('div', '', d.d));
    dl.appendChild(it);
  });
  document.getElementById('dm').classList.add('on');
}

document.getElementById('od1').onclick = () => opD(0);
document.getElementById('od2').onclick = () => opD(1);
document.getElementById('cdm').onclick = () => {
  document.getElementById('dm').classList.remove('on');
  pa = 0;
  lt = performance.now();
};

function gV(n) {
  const v = [];
  const o = n === 4 ? Math.PI / 4 : -Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const a = o + (i * 2 * Math.PI) / n;
    v.push({ x: CX + AR * Math.cos(a), y: CY + AR * Math.sin(a) });
  }
  return v;
}

function stB() {
  if (an) cancelAnimationFrame(an);
  bs = [];
  pjs = [];
  zns = [];
  fxs = [];
  txs = [];
  pa = 0;
  rn = 1;
  const c = md === '1v1' ? 1 : 2;
  for (let i = 0; i < c; i++) {
    const yo = c === 1 ? 0 : (i === 0 ? -42 : 42);
    Array.of(Array.of('A', sl.A.at(i), CX - 65), Array.of('B', sl.B.at(i), CX + 65)).forEach(([tm, df, x]) => {
      const a = Math.random() * Math.PI * 2;
      const b = {
        df, tm, x, y: CY + yo,
        vx: Math.cos(a) * BS, vy: Math.sin(a) * BS,
        hp: 100, cc: 0, cm: df.cd,
        sh: 0, shT: 0, shA: 0, inv: 0, fl: 0,
        sdT: 0, ht: 0, hv: 0,
        db: { bleed: 0, slow: 0, shock: 0 }, st: {}
      };
      if (df.init) df.init(b);
      bs.push(b);
    });
  }
  document.getElementById('s1').classList.remove('on');
  document.getElementById('rm').classList.remove('on');
  document.getElementById('s2').classList.add('on');
  lt = performance.now();
  an = requestAnimationFrame(lp);
}

document.getElementById('go').onclick = stB;
document.getElementById('re').onclick = stB;
document.getElementById('bk').onclick = () => {
  rn = 0;
  cancelAnimationFrame(an);
  document.getElementById('rm').classList.remove('on');
  document.getElementById('s2').classList.remove('on');
  document.getElementById('s1').classList.add('on');
};
document.getElementById('ed').onclick = () => {
  rn = 0;
  cancelAnimationFrame(an);
  document.getElementById('s2').classList.remove('on');
  document.getElementById('s1').classList.add('on');
};
document.getElementById('sp').onclick = e => {
  si = (si + 1) % 4;
  sm = ss.at(si);
  e.target.textContent = sm + 'x 배속';
};

function upd(dt) {
  const vs = gV(sd);
  zns = zns.filter(z => {
    z.lf -= dt;
    if (z.up) z.up(z);
    return z.lf > 0;
  });
  bs.forEach(b => {
    if (b.hp <= 0) return;
    if (b.fl > 0) b.fl -= dt;
    if (b.inv > 0) b.inv -= dt;
    if (b.sh > 0) {
      b.shT -= dt;
      if (b.shT <= 0) {
        b.sh = 0;
        if (b.df.shEnd) b.df.shEnd(b, E);
      }
    }
    if (b.ht > 0) {
      const t = Math.min(dt, b.ht);
      b.ht -= t;
      b.hp = Math.min(100, b.hp + (b.hv / 3) * t);
    }
    if (b.db.slow > 0) {
      b.sdT += dt;
      if (b.sdT >= 5) {
        b.sdT -= 5;
        b.db.slow = Math.max(0, b.db.slow - 1);
      }
    }
    let m = (b.st.p || 1) * (b.db.slow > 0 ? Math.max(0.2, 1 - b.db.slow * 0.1) : 1);
    if (zns.find(z => z.tp === 'ice' && z.tm !== b.tm)) m *= 0.5;
    const cs = Math.hypot(b.vx, b.vy) || BS;
    b.vx = (b.vx / cs) * BS * m;
    b.vy = (b.vy / cs) * BS * m;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    vs.forEach((v1, k) => {
      const v2 = vs.at((k + 1) % vs.length);
      let nx = -(v2.y - v1.y);
      let ny = v2.x - v1.x;
      const nl = Math.hypot(nx, ny);
      nx /= nl;
      ny /= nl;
      if (nx * (CX - v1.x) + ny * (CY - v1.y) < 0) {
        nx = -nx;
        ny = -ny;
      }
      const d = (b.x - v1.x) * nx + (b.y - v1.y) * ny;
      if (d < BR) {
        b.x += nx * (BR - d);
        b.y += ny * (BR - d);
        const o = b.vx * nx + b.vy * ny;
        if (o < 0) {
          b.vx -= 2 * o * nx;
          b.vy -= 2 * o * ny;
        }
      }
    });
    b.cc += dt * Math.max(0.2, 1 - (b.db.shock || 0) * 0.1);
    if (b.cc >= b.cm) {
      b.cc = 0;
      if (b.db.bleed > 0) E.hit(null, b, b.db.bleed, {}, 1);
      if (b.db.shock > 0) b.db.shock = 0;
      if (b.hp > 0 && b.df.act) b.df.act(b, E);
    }
    if (b.df.tick) b.df.tick(b, dt, E);
  });

  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs.at(i);
      const b = bs.at(j);
      if (a.hp <= 0 || b.hp <= 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < BR * 2) {
        const nx = dx / d;
        const ny = dy / d;
        const ov = BR * 2 - d;
        a.x -= nx * ov * 0.5;
        a.y -= ny * ov * 0.5;
        b.x += nx * ov * 0.5;
        b.y += ny * ov * 0.5;
        const o = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (o < 0) {
          a.vx += o * nx;
          a.vy += o * ny;
          b.vx -= o * nx;
} else if (f.tp === 'arc') {
ctx.beginPath();
ctx.moveTo(f.x, f.y);
ctx.arc(f.x, f.y, f.r, f.ag - 1.1, f.ag + 1.1);
ctx.closePath();
ctx.fillStyle = f.c;
ctx.fill();
} else if (f.tp === 'ls') {
ctx.strokeStyle = f.c;
ctx.lineWidth = f.r;
f.ln.forEach(l => {
ctx.beginPath();
ctx.moveTo(l.a, l.b);
ctx.lineTo(l.c, l.d);
ctx.stroke();
});
}
ctx.restore();
});
txs.forEach(t => {
ctx.fillStyle = t.c;
ctx.font = 'bold 12px sans-serif';
ctx.textAlign = 'center';
ctx.fillText(t.t, t.x, t.y);
});
}
function uHud() {
const h = document.getElementById('hud');
h.innerHTML = '';
Array.of('A', 'B').forEach(tm => {
const c = mk('div', 'tc');
bs.filter(b => b.tm === tm).forEach(b => {
const cd = mk('div', 'hc' + (tm === 'B' ? ' b' : ''));
const tp = mk('div', '');
tp.style.display = 'flex';
tp.style.justifyContent = 'space-between';
tp.style.fontSize = '12px';
tp.appendChild(mk('span', '', b.df.n));
tp.appendChild(mk('span', '', Math.ceil(b.hp) + '/100'));
cd.appendChild(tp);
const hb = mk('div', 'bar');
const hf = mk('div', '');
hf.style.height = '100%';
hf.style.background = '#ef4444';
hf.style.width = Math.max(0, b.hp) + '%';
hb.appendChild(hf);
cd.appendChild(hb);
const cb = mk('div', 'bar');
const cf = mk('div', '');
cf.style.height = '100%';
cf.style.background = '#38bdf8';
cf.style.width = Math.min(100, (b.cc / b.cm) * 100) + '%';
cb.appendChild(cf);
cd.appendChild(cb);
const dl = mk('div', 'db');
if (b.db.bleed > 0) dl.appendChild(mk('span', '', '출혈 ' + b.db.bleed));
if (b.db.slow > 0) dl.appendChild(mk('span', '', '둔화 ' + b.db.slow));
if (b.db.shock > 0) dl.appendChild(mk('span', '', '감전 ' + b.db.shock));
cd.appendChild(dl);
c.appendChild(cd);
});
h.appendChild(c);
});
}
function lp(nw) {
if (!rn) return;
const dt = Math.min(0.05, (nw - lt) / 1000);
lt = nw;
if (!pa) {
upd(dt * sm);
uHud();
}
drw();
an = requestAnimationFrame(lp);
}
rSl();
rRl();