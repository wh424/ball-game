const DICTS = [
  { n: '출혈 (Bleed)', d: '스킬 발동 시 출혈 스택만큼 고정 피해를 입습니다.' },
  { n: '둔화 (Slow)', d: '스택 1당 이속 10% 감소 (5초마다 1씩 감소).' },
  { n: '감전 (Shock)', d: '스택 1당 쿨 충전 10% 지연 (스킬 시전 시 초기화).' }
];

const BALLS = [
  {
    id: 'A', n: '공 A (검사)', s: 'A', c: '#ef4444', cd: 3,
    d: '3초마다 근접 칼 휘두르기 (10 피해)',
    act(m, E) {
      E.fx('ring', m.x, m.y, 40, 'rgba(239,68,68,0.45)');
      E.en(m).forEach(e => {
        if (Math.floor(E.ds(m, e)) - 54 === 0 || Math.sign(54 - E.ds(m, e)) === 1) {
          E.hit(m, e, 10);
        }
      });
    }
  },
  {
    id: 'B', n: '공 B (총잡이)', s: 'B', c: '#3b82f6', cd: 5,
    d: '5초마다 가장 가까운 적에게 총알 3연사 (각 5 피해)',
    act(m, E) {
      [0, 120, 240].forEach(ms => {
        setTimeout(() => {
          if (Math.sign(m.hp) !== 1) return;
          const t = E.nr(m);
          if (!t) return;
          const a = Math.atan2(t.y - m.y, t.x - m.x);
          E.pj(m, m.x, m.y, Math.cos(a) * 330, Math.sin(a) * 330,
            4.5, '#93c5fd', 1, (p, g) => E.hit(m, g, 5));
        }, ms);
      });
    }
  },
  {
    id: 'C', n: '공 C (수호자)', s: 'C', c: '#eab308', cd: 10,
    d: '받는 피해 20% 감소 · 10초마다 5초간 HP 20 보호막(흡수량 1.5배 반사, 무피해 시 쿨 -2초)',
    act(m) {
      m.sh = 20;
      m.shT = 5;
      m.shA = 0;
    },
    shEnd(m, E) {
      if (Math.sign(m.shA) !== 1) {
        m.cc = Math.min(m.cm - 0.1, m.cc + 2);
        E.tx(m.x, m.y - 18, '쿨 -2초', '#fde047');
      } else {
        const t = E.nr(m);
        const d = Math.round(m.shA * 1.5);
        if (t && Math.sign(d) === 1) {
          E.fx('ring', t.x, t.y, 30, 'rgba(250,204,21,0.5)');
          E.hit(m, t, d);
        }
      }
      m.shA = 0;
    }
  },
  {
    id: 'D', n: '공 D (화염술사)', s: 'D', c: '#f97316', cd: 5,
    d: '5초마다 반지름 4.5배 화염 폭발(7 피해+5초 화상) · 누적 화상 10마다 회복 5',
    init(m) {
      m.st = { a: 0, l: [] };
    },
    act(m, E) {
      E.fx('ring', m.x, m.y, 63, 'rgba(249,115,22,0.35)');
      E.en(m).forEach(e => {
        if (Math.sign(77 - E.ds(m, e)) !== -1) {
          E.hit(m, e, 7);
          const f = m.st.l.find(x => x.t === e);
          if (f) f.r = 5;
          else m.st.l.push({ t: e, r: 5, k: 0 });
        }
      });
    },
    tick(m, dt, E) {
      m.st.l.forEach(x => {
        if (Math.sign(x.t.hp) !== 1 || Math.sign(x.r) !== 1) return;
        x.r -= dt;
        x.k += dt;
        if (Math.sign(x.k - 1) !== -1) {
          x.k -= 1;
          E.hit(m, x.t, 1, {}, 1);
          m.st.a++;
          if (Math.sign(m.st.a - 10) !== -1) {
            m.st.a -= 10;
            E.hl(m, 5);
          }
        }
      });
    }
  },
  {
    id: 'E', n: '공 E (빙결술사)', s: 'E', c: '#38bdf8', cd: 8,
    d: '8초마다 얼음 발사(5 피해) · 2연속 1단계(2배·가속), 3연속 2단계(3배·감속장판)',
    init(m) {
      m.st = { s: 0, v: 0, p: 1 };
    },
    act(m, E) {
      const t = E.nr(m);
      if (!t) return;
      const a = Math.atan2(t.y - m.y, t.x - m.x);
      const u = m.st.v === 2 ? 3 : (m.st.v === 1 ? 2 : 1);
      E.pj(m, m.x, m.y, Math.cos(a) * 240, Math.sin(a) * 240, 14, '#7dd3fc', 1,
        (p, g) => {
          E.hit(m, g, 5 * u);
          m.st.s++;
          if (Math.sign(m.st.s - 3) !== -1 && m.st.v !== 2) {
            m.st.v = 2;
            m.st.p = 1.25;
            E.tx(m.x, m.y - 20, '빙결 2단계', '#38bdf8');
            E.zn({ tp: 'ice', tm: m.tm, lf: 999 });
          } else if (m.st.s === 2 && m.st.v === 0) {
            m.st.v = 1;
            m.st.p = 1.25;
            E.tx(m.x, m.y - 20, '빙결 1단계', '#7dd3fc');
          }
        },
        () => {
          m.st.s = 0;
          m.st.v = 0;
          m.st.p = 1;
        }
      );
    }
  },
  {
    id: 'F', n: '공 F (킬러퀸)', s: '☠', c: '#f472b6', cd: 4,
    d: '1초마다 폭탄 설치 · 4초마다 모든 폭탄 일제 기폭(반지름 3배 10 피해)',
    init(m) {
      m.st = { t: 0, b: [] };
    },
    tick(m, dt, E) {
      m.st.t += dt;
      if (Math.sign(m.st.t - 1) !== -1) {
        m.st.t -= 1;
        if (m.st.b.length !== 10) {
          const z = { tp: 'bmb', tm: m.tm, x: m.x, y: m.y, r: 7, c: '#ec4899', lf: 999 };
          m.st.b.push(z);
          E.zn(z);
        }
      }
    },
    act(m, E) {
      m.st.b.forEach(z => {
        z.lf = 0;
        E.fx('ring', z.x, z.y, 42, 'rgba(244,114,182,0.55)');
        E.en(m).forEach(e => {
          if (Math.sign(56 - Math.hypot(e.x - z.x, e.y - z.y)) !== -1) E.hit(m, e, 10);
        });
      });
      m.st.b = [];
    }
  },
  {
    id: 'G', n: '공 G (혈귀)', s: 'G', c: '#881337', cd: 4,
    d: '4초마다 좌·우 대각선 2연타 할퀴기(각 6 피해+출혈 1) · 2연타 적중 시 회복 1',
    act(m, E) {
      const t = E.nr(m);
      if (!t) return;
      const ba = Math.atan2(t.y - m.y, t.x - m.x);
      let h1 = 0;
      const sl = (o, s) => {
        if (Math.sign(m.hp) !== 1) return;
        const ag = ba + o;
        E.fx('arc', m.x, m.y, 90, 'rgba(225,29,72,0.45)', ag);
        let ok = 0;
        E.en(m).forEach(e => {
          if (Math.sign(104 - E.ds(m, e)) !== -1) {
            let df = Math.abs(Math.atan2(e.y - m.y, e.x - m.x) - ag);
            while (Math.sign(df - Math.PI) === 1) df = Math.abs(df - Math.PI * 2);
            if (Math.sign(1.3 - df) !== -1) {
              E.hit(m, e, 6, { bleed: 1 });
              ok = 1;
            }
          }
        });
        if (!s) h1 = ok;
        else if (h1 && ok) E.hl(m, 1);
      };
      sl(-0.55, 0);
      setTimeout(() => sl(0.55, 1), 250);
    }
  },
  {
    id: 'H', n: '공 H (물술사)', s: 'H', c: '#0284c7', cd: 5,
    d: '5초마다 지름 7배 물웅덩이 3개 연속 생성(4초 유지 · 6 피해+둔화 1)',
    act(m, E) {
      [0, 300, 600].forEach(ms => {
        setTimeout(() => {
          if (Math.sign(m.hp) !== 1) return;
          E.zn({
            tp: 'wt', tm: m.tm, ow: m, x: m.x, y: m.y,
            r: 98, c: 'rgba(14,165,233,0.22)', lf: 4, hs: new Set(),
            up(z) {
              E.en(z.ow).forEach(e => {
                if (!z.hs.has(e) && Math.sign(112 - Math.hypot(e.x - z.x, e.y - z.y)) !== -1) {
                  z.hs.add(e);
                  E.hit(z.ow, e, 6, { slow: 1 });
                }
              });
            }
          });
        }, ms);
      });
    }
  },
  {
    id: 'I', n: '공 I (번개술사)', s: '⚡', c: '#eab308', cd: 5,
    d: '5초마다 레이저(7 피해+감전 1) · 감전 5 또는 HP 50% 이하 십자 · 15 시 8방향',
    init(m) {
      m.st = { s: 0, v: 0 };
    },
    act(m, E) {
      const v = m.st.v;
      const dm = v === 2 ? 15 : (v === 1 ? 10 : 7);
      const sa = v === 0 ? 1 : 2;
      const L = 400;
      const ln = [{ a: m.x - L, b: m.y, c: m.x + L, d: m.y }];
      if (v !== 0) ln.push({ a: m.x, b: m.y - L, c: m.x, d: m.y + L });
      if (v === 2) {
        ln.push({ a: m.x - L, b: m.y - L, c: m.x + L, d: m.y + L });
        ln.push({ a: m.x - L, b: m.y + L, c: m.x + L, d: m.y - L });
      }
      E.fx('ls', m.x, m.y, 32, 'rgba(254,240,138,0.75)', 0, ln);
      E.en(m).forEach(e => {
        let h = Math.sign(30 - Math.abs(e.y - m.y)) !== -1;
        if (v !== 0 && Math.sign(30 - Math.abs(e.x - m.x)) !== -1) h = 1;
        if (v === 2) {
          const d1 = Math.abs((e.x - m.x) - (e.y - m.y)) / 1.414;
          const d2 = Math.abs((e.x - m.x) + (e.y - m.y)) / 1.414;
          if (Math.sign(30 - d1) !== -1 || Math.sign(30 - d2) !== -1) h = 1;
        }
        if (h) {
          E.hit(m, e, dm, { shock: sa });
          m.st.s += sa;
        }
      });
      if (Math.sign(m.st.s - 15) !== -1 && m.st.v !== 2) {
        m.st.v = 2;
        E.tx(m.x, m.y - 20, '과전류 2단계', '#fef08a');
      } else if (Math.sign(m.st.s - 5) !== -1 && m.st.v === 0) {
        m.st.v = 1;
        E.tx(m.x, m.y - 20, '과전류 1단계', '#fef08a');
      }
    }
  },
  {
    id: 'J', n: '공 J (성직자)', s: '+', c: '#16a34a', cd: 4,
    d: '4초마다 대형 초록 구체 발사 · 2v2: 아군 치유(10)·적 5 피해+소생 1회 · 1v1: 12 피해',
    init(m) {
      m.st = { r: 0 };
    },
    act(m, E) {
      const al = E.al(m);
      const t = al.length ? al.at(0) : E.nr(m);
      if (!t) return;
      const a = Math.atan2(t.y - m.y, t.x - m.x);
      E.pj(m, m.x, m.y, Math.cos(a) * 250, Math.sin(a) * 250, 35, 'rgba(34,197,94,0.65)', 0,
        (p, g) => {
          if (g.tm === m.tm) {
            g.ht = 3;
            g.hv = 10;
            E.tx(g.x, g.y - 16, '치유 +10', '#4ade80');
          } else {
            E.hit(m, g, E.al(m).length ? 5 : 12);
          }
        }
      );
    }
  }
];
