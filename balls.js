const DEBUFF_DICTIONARY = [
  { id: 'bleed', name: '출혈 (Bleed)', desc: '부여된 공이 쿨타임 스킬을 발동할 때마다 현재 출혈 스택만큼 고정 피해를 입습니다. (최대 99스택)' },
  { id: 'slow', name: '둔화 (Slow)', desc: '스택 1당 이동속도가 기본 속도의 10%씩 감소합니다. 5초마다 1씩 감소합니다. (최대 8스택)' },
  { id: 'shock', name: '감전 (Shock)', desc: '스택 1당 쿨타임 충전 속도가 10% 느려집니다. 스킬 시전 시 모든 감전 스택이 소모됩니다.' }
];

const BALL_ROSTER = [
  {
    id: 'A', name: '공 A (검사)', symbol: 'A', color: '#ef4444', hp: 100, cooldown: 3.0,
    desc: '쿨타임 3초 · 주변 근접 범위에 칼을 휘둘러 10의 피해를 줍니다.',
    onAction(me, E) {
      const range = E.BALL_R * 2.8;
      E.spawnEffect('ring', me.x, me.y, { radius: range, color: 'rgba(239, 68, 68, 0.45)', duration: 0.3 });
      for (const enemy of E.getAliveEnemies(me)) {
        if (Math.hypot(enemy.x - me.x, enemy.y - me.y) <= range + E.BALL_R) E.applyHit(me, enemy, 10);
      }
    }
  },
  {
    id: 'B', name: '공 B (총잡이)', symbol: 'B', color: '#3b82f6', hp: 100, cooldown: 5.0,
    desc: '쿨타임 5초 · 가장 가까운 적을 조준해 피해 5짜리 총알 3발을 연속 발사합니다.',
    onAction(me, E) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (me.hp <= 0) return;
          const target = E.getNearestEnemy(me);
          if (!target) return;
          const dx = target.x - me.x, dy = target.y - me.y, dist = Math.hypot(dx, dy) || 1;
          E.addProjectile({
            owner: me, x: me.x, y: me.y, vx: (dx / dist) * 330, vy: (dy / dist) * 330,
            radius: 4.5, color: '#93c5fd', ignoreAlly: true, grace: 0.08,
            onHit(p, t, eng) { eng.applyHit(p.owner, t, 5); }
          });
        }, i * 120);
      }
    }
  },
  {
    id: 'C', name: '공 C (수호자)', symbol: 'C', color: '#eab308', hp: 100, cooldown: 10.0,
    desc: '패시브: 받는 피해 20% 감소 · 쿨타임 10초 · 5초간 HP 20 보호막(소멸 시 흡수량 1.5배 반사, 무피해 시 다음 쿨타임 2초 단축).',
    onAction(me) { me.shieldHp = 20; me.shieldTimer = 5.0; me.shieldAbsorbed = 0; },
    onShieldEnd(me, E) {
      if (me.shieldAbsorbed <= 0) {
        me.cooldown = Math.min(me.maxCooldown - 0.1, me.cooldown + 2.0);
        E.spawnText(me.x, me.y - 18, '쿨타임 -2초!', '#fde047');
      } else {
        const dmg = Math.round(me.shieldAbsorbed * 1.5);
        const target = E.getNearestEnemy(me);
        if (target && dmg > 0) {
          E.spawnEffect('ring', target.x, target.y, { radius: E.BALL_R * 2.2, color: 'rgba(250, 204, 21, 0.55)', duration: 0.35 });
          E.applyHit(me, target, dmg);
        }
      }
      me.shieldAbsorbed = 0;
    }
  },
  {
    id: 'D', name: '공 D (화염술사)', symbol: 'D', color: '#f97316', hp: 100, cooldown: 5.0,
    desc: '쿨타임 5초 · 제자리 반지름 4.5배 화염 폭발(피해 7 + 5초간 초당 1 화상) · 누적 화상 10마다 체력 5 회복.',
    init(me) { me.state.burnAccum = 0; me.state.burnTargets = []; },
    drawAura(me, ctx, E) {
      ctx.beginPath(); ctx.arc(me.x, me.y, E.BALL_R + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.25)'; ctx.fill();
    },
    onAction(me, E) {
      const range = E.BALL_R * 4.5;
      E.spawnEffect('ring', me.x, me.y, { radius: range, color: 'rgba(249, 115, 22, 0.35)', duration: 0.4 });
      for (const enemy of E.getAliveEnemies(me)) {
        if (Math.hypot(enemy.x - me.x, enemy.y - me.y) <= range + E.BALL_R) {
          E.applyHit(me, enemy, 7);
          const ex = me.state.burnTargets.find(bt => bt.target === enemy);
          if (ex) ex.remain = 5.0; else me.state.burnTargets.push({ target: enemy, remain: 5.0, tickAcc: 0 });
        }
      }
    },
    onTick(me, dt, E) {
      for (let i = me.state.burnTargets.length - 1; i >= 0; i--) {
        const bt = me.state.burnTargets[i];
        if (bt.target.hp <= 0 || bt.remain <= 0) { me.state.burnTargets.splice(i, 1); continue; }
        bt.remain -= dt; bt.tickAcc += dt;
        if (bt.tickAcc >= 1.0) {
          bt.tickAcc -= 1.0;
          E.applyHit(me, bt.target, 1, {}, true);
          me.state.burnAccum += 1;
          if (me.state.burnAccum >= 10) { me.state.burnAccum -= 10; E.healBall(me, 5); }
        }
      }
    }
  },
  {
    id: 'E', name: '공 E (빙결술사)', symbol: 'E', color: '#38bdf8', hp: 100, cooldown: 8.0,
    desc: '쿨타임 8초 · 얼음 발사(피해 5) · 2연속 적중 시 1단계(공격 2배·이속 1.25배), 3연속 시 2단계(공격 3배·적 감속 장판) · 빗나가면 초기화.',
    init(me) { me.state.hitStreak = 0; me.state.freezeStack = 0; me.state.speedMult = 1.0; },
    drawAura(me, ctx, E) {
      if (me.state.freezeStack > 0) {
        ctx.beginPath(); ctx.arc(me.x, me.y, E.BALL_R + 4 + me.state.freezeStack * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; ctx.fill();
      }
    },
    onAction(me, E) {
      const target = E.getNearestEnemy(me);
      if (!target) return;
      const dx = target.x - me.x, dy = target.y - me.y, dist = Math.hypot(dx, dy) || 1;
      const mult = me.state.freezeStack === 2 ? 3 : (me.state.freezeStack === 1 ? 2 : 1);
      E.addProjectile({
        owner: me, x: me.x, y: me.y, vx: (dx / dist) * 240, vy: (dy / dist) * 240,
        radius: E.BALL_R, color: '#7dd3fc', ignoreAlly: true, grace: 0.12,
        onHit(p, t, eng) {
          eng.applyHit(p.owner, t, 5 * mult);
          me.state.hitStreak += 1;
          if (me.state.hitStreak >= 3 && me.state.freezeStack < 2) {
            me.state.freezeStack = 2; me.state.speedMult = 1.25;
            eng.spawnText(me.x, me.y - 20, '빙결 2단계!', '#38bdf8');
            eng.addZone({ type: 'freezeField', team: me.team, owner: me, life: 999 });
          } else if (me.state.hitStreak === 2 && me.state.freezeStack < 1) {
            me.state.freezeStack = 1; me.state.speedMult = 1.25;
            eng.spawnText(me.x, me.y - 20, '빙결 1단계!', '#7dd3fc');
          }
        },
        onWall(p, eng) {
          if (me.state.hitStreak > 0 || me.state.freezeStack > 0) {
            me.state.hitStreak = 0; me.state.freezeStack = 0; me.state.speedMult = 1.0;
            eng.spawnText(me.x, me.y - 18, '빙결 초기화', '#94a3b8');
          }
        }
      });
    }
  },
  {
    id: 'F', name: '공 F (킬러퀸)', symbol: '☠', color: '#f472b6', hp: 100, cooldown: 4.0,
    desc: '패시브: 1초마다 폭탄 설치 · 쿨타임 4초 · 설치된 모든 폭탄 일제 기폭(각 반지름 3배 범위 10 피해).',
    init(me) { me.state.bombTimer = 0; me.state.bombs = []; },
    onTick(me, dt, E) {
      me.state.bombTimer += dt;
      if (me.state.bombTimer >= 1.0) {
        me.state.bombTimer -= 1.0;
        if (me.state.bombs.length < 10) {
          const z = { type: 'killerBomb', team: me.team, x: me.x, y: me.y, radius: 7, color: '#ec4899', stroke: '#fbcfe8', life: 999 };
          me.state.bombs.push(z); E.addZone(z);
        }
      }
    },
    onAction(me, E) {
      const blastR = E.BALL_R * 3.0;
      for (const bmb of me.state.bombs) {
        bmb.life = 0;
        E.spawnEffect('ring', bmb.x, bmb.y, { radius: blastR, color: 'rgba(244, 114, 182, 0.55)', duration: 0.35 });
        for (const enemy of E.getAliveEnemies(me)) {
          if (Math.hypot(enemy.x - bmb.x, enemy.y - bmb.y) <= blastR + E.BALL_R) E.applyHit(me, enemy, 10);
        }
      }
      me.state.bombs = [];
    }
  },
  {
    id: 'G', name: '공 G (혈귀)', symbol: 'G', color: '#881337', hp: 100, cooldown: 4.0,
    desc: '쿨타임 4초 · 적 방향 좌·우 대각선 연속 할퀴기(각 6 피해 + 출혈 1 부여) · 2연타 모두 적중 시 체력 1 회복.',
    drawAura(me, ctx, E) {
      ctx.beginPath(); ctx.arc(me.x, me.y, E.BALL_R + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(225, 29, 72, 0.25)'; ctx.fill();
    },
    onAction(me, E) {
      const target = E.getNearestEnemy(me);
      if (!target) return;
      const baseAng = Math.atan2(target.y - me.y, target.x - me.x);
      const range = E.BALL_R * 6.5, spread = (125 * Math.PI) / 180;
      let hitFirst = false;
      const doSlash = (offsetAng, isSecond) => {
        if (me.hp <= 0) return;
        const ang = baseAng + offsetAng;
        E.spawnEffect('arc', me.x, me.y, { radius: range, angle: ang, spread, color: 'rgba(225, 29, 72, 0.45)', duration: 0.3 });
        let hitAny = false;
        for (const enemy of E.getAliveEnemies(me)) {
          if (Math.hypot(enemy.x - me.x, enemy.y - me.y) <= range + E.BALL_R) {
            let diff = Math.abs(Math.atan2(enemy.y - me.y, enemy.x - me.x) - ang);
            while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
            if (diff <= spread / 2 + 0.3) { E.applyHit(me, enemy, 6, { bleed: 1 }); hitAny = true; }
          }
        }
        if (!isSecond) hitFirst = hitAny; else if (hitFirst && hitAny) E.healBall(me, 1);
      };
      doSlash(-0.55, false);
      setTimeout(() => doSlash(0.55, true), 250);
    }
  },
  {
    id: 'H', name: '공 H (물술사)', symbol: 'H', color: '#0284c7', hp: 100, cooldown: 5.0,
    desc: '쿨타임 5초 · 이동 경로에 지름 7배 대형 물웅덩이 3개 연속 생성(4초 유지) · 닿은 적에게 6 피해 + 둔화 1 부여.',
    drawAura(me, ctx, E) {
      ctx.beginPath(); ctx.arc(me.x, me.y, E.BALL_R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
    },
    onAction(me, E) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (me.hp <= 0) return;
          E.addZone({
            type: 'waterPuddle', team: me.team, owner: me, x: me.x, y: me.y,
            radius: E.BALL_R * 7.0, color: 'rgba(14, 165, 233, 0.22)', stroke: 'rgba(56, 189, 248, 0.45)',
            life: 4.0, hitSet: new Set(),
            update(z, dt, eng) {
              for (const enemy of eng.getAliveEnemies(z.owner)) {
                if (!z.hitSet.has(enemy) && Math.hypot(enemy.x - z.x, enemy.y - z.y) <= z.radius + eng.BALL_R) {
                  z.hitSet.add(enemy); eng.applyHit(z.owner, enemy, 6, { slow: 1 });
                }
              }
            }
          });
        }, i * 300);
      }
    }
  },
  {
    id: 'I', name: '공 I (번개술사)', symbol: '⚡', color: '#eab308', hp: 100, cooldown: 5.0,
    desc: '쿨타임 5초 · 가로 레이저(7 피해+감전 1) · 누적 감전 5 또는 HP 50% 이하 시 십자(10 피해+감전 2) · 누적 15 시 8방향(15 피해+감전 2).',
    init(me) { me.state.totalShock = 0; me.state.laserStage = 0; },
    drawAura(me, ctx, E) {
      ctx.beginPath(); ctx.arc(me.x, me.y, E.BALL_R + 3 + me.state.laserStage * 3, 0, Math.PI * 2);
ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2; ctx.stroke();
},
onAction(me, E) {
const stage = me.state.laserStage, thick = E.BALL_R * 2.4;
const dmg = stage === 2 ? 15 : (stage === 1 ? 10 : 7), shockAdd = stage >= 1 ? 2 : 1, L = 400;
const lines = [{ x1: me.x - L, y1: me.y, x2: me.x + L, y2: me.y }];
if (stage >= 1) lines.push({ x1: me.x, y1: me.y - L, x2: me.x, y2: me.y + L });
if (stage >= 2) {
lines.push({ x1: me.x - L, y1: me.y - L, x2: me.x + L, y2: me.y + L });
lines.push({ x1: me.x - L, y1: me.y + L, x2: me.x + L, y2: me.y - L });
}
E.spawnEffect('lasers', me.x, me.y, { radius: thick, color: 'rgba(254, 240, 138, 0.75)', duration: 0.35, lines });
for (const enemy of E.getAliveEnemies(me)) {
const hitR = thick / 2 + E.BALL_R;
let isHit = Math.abs(enemy.y - me.y) <= hitR;
if (stage >= 1 && Math.abs(enemy.x - me.x) <= hitR) isHit = true;
if (stage >= 2) {
const d1 = Math.abs((enemy.x - me.x) - (enemy.y - me.y)) / Math.SQRT2;
const d2 = Math.abs((enemy.x - me.x) + (enemy.y - me.y)) / Math.SQRT2;
if (d1 <= hitR || d2 <= hitR) isHit = true;
}
if (isHit) { E.applyHit(me, enemy, dmg, { shock: shockAdd }); me.state.totalShock += shockAdd; }
}
if (me.state.totalShock >= 15 && me.state.laserStage < 2) {
me.state.laserStage = 2; E.spawnText(me.x, me.y - 20, '과전류 2단계!', '#fef08a');
} else if (me.state.totalShock >= 5 && me.state.laserStage < 1) {
me.state.laserStage = 1; E.spawnText(me.x, me.y - 20, '과전류 1단계!', '#fef08a');
}
}
},
{
id: 'J', name: '공 J (성직자)', symbol: '+', color: '#16a34a', hp: 100, cooldown: 4.0,
desc: '쿨타임 4초 · 대형 초록 구체 발사 · 2v2: 아군 우선 치유(3초간 10)·적 5 피해 + 아군 사망 시 1회 소생 · 1v1: 적에게 12 피해.',
init(me) { me.state.hasRevived = false; },
drawAura(me, ctx, E) {
ctx.beginPath(); ctx.arc(me.x, me.y, E.BALL_R * 1.6, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(34, 197, 94, 0.22)'; ctx.fill();
},
onAction(me, E) {
const allies = E.getAliveAllies(me, false);
const target = allies.length > 0 ? allies : E.getNearestEnemy(me);
if (!target) return;
const dx = target.x - me.x, dy = target.y - me.y, dist = Math.hypot(dx, dy) || 1;
E.addProjectile({
owner: me, x: me.x, y: me.y, vx: (dx / dist) * 250, vy: (dy / dist) * 250,
radius: E.BALL_R * 2.5, color: 'rgba(34, 197, 94, 0.65)', ignoreAlly: false, grace: 0.15,
onHit(p, t, eng) {
if (t.team === p.owner.team) {
t.healHotTimer = 3.0; t.healHotRemain = 10;
eng.spawnText(t.x, t.y - 16, '치유 +10', '#4ade80');
} else {
const hasAlly = eng.getAliveAllies(p.owner, false).length > 0;
eng.applyHit(p.owner, t, hasAlly ? 5 : 12);
}
}
});
}
}
];