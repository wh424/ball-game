// ==========================================
// 공 vs 공 시뮬레이터 공통 게임 엔진 (engine.js)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  const errBanner = document.getElementById('errorBanner');
  if (typeof BALL_ROSTER === 'undefined' || typeof DEBUFF_DICTIONARY === 'undefined') {
    errBanner.style.display = 'block';
    errBanner.textContent = '오류: balls.js 파일이 없거나 문법 오류가 있습니다.';
    return;
  }

  // 게임 전역 상태
  let mode = '1v1'; // '1v1' | '2v2'
  let sides = 4;    // 4, 8, 12
  let slots = { A: [null], B: [null] };
  let activeSlot = { team: 'A', idx: 0 };

  let speedMult = 1;
  const speedSteps = [1, 1.5, 2, 3];
  let speedIdx = 0;

  let animId = null;
  let lastTime = 0;
  let isPaused = false;
  let isRunning = false;

  // 전투 오브젝트 배열
  let balls = [];
  let projectiles = [];
  let activeZones = [];
  let visualEffects = [];
  let floatingTexts = [];

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const CX = canvas.width / 2;
  const CY = canvas.height / 2;
  const ARENA_R = 158;
  const BALL_R = 14;
  const BASE_SPEED = 145;

  // ------------------------------------------
  // 1. 공통 헬퍼 API (모든 공이 공유하는 엔진 함수)
  // ------------------------------------------
  const Engine = {
    BALL_R,
    BASE_SPEED,
    CX,
    CY,
    ARENA_R,

    getAliveEnemies(me) {
      return balls.filter(b => b.hp > 0 && b.team !== me.team);
    },

    getAliveAllies(me, includeSelf = false) {
      return balls.filter(b => b.hp > 0 && b.team === me.team && (includeSelf || b !== me));
    },

    getNearestEnemy(me) {
      const enemies = this.getAliveEnemies(me);
      if (!enemies.length) return null;
      let best = enemies[0], minDist = Math.hypot(best.x - me.x, best.y - me.y);
      for (let i = 1; i < enemies.length; i++) {
        const d = Math.hypot(enemies[i].x - me.x, enemies[i].y - me.y);
        if (d < minDist) { minDist = d; best = enemies[i]; }
      }
      return best;
    },

    spawnEffect(type, x, y, opts = {}) {
      visualEffects.push({
        type, x, y,
        duration: opts.duration || 0.35,
        maxDuration: opts.duration || 0.35,
        radius: opts.radius || BALL_R * 2,
        color: opts.color || '#ffffff',
        angle: opts.angle || 0,
        spread: opts.spread || Math.PI / 2,
        x2: opts.x2 || x,
        y2: opts.y2 || y,
        lines: opts.lines || []
      });
    },

    spawnText(x, y, text, color = '#ffffff') {
      floatingTexts.push({ x, y, text, color, life: 0.7 });
    },

    addZone(zone) {
      activeZones.push(zone);
    },

    addProjectile(proj) {
      projectiles.push(proj);
    },

    healBall(target, amount) {
      if (!target || target.hp <= 0 || amount <= 0) return;
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      const healed = Math.round((target.hp - before) * 10) / 10;
      if (healed > 0) this.spawnText(target.x, target.y - 16, `+${healed}`, '#4ade80');
    },

    applyDebuff(target, key, amount) {
      if (!target || target.hp <= 0) return;
      const maxMap = { bleed: 99, slow: 8, shock: 8 };
      const maxVal = maxMap[key] || 99;
      target.debuffs[key] = Math.min(maxVal, (target.debuffs[key] || 0) + amount);
    },

    applyHit(attacker, target, rawDamage, debuffs = {}, isTrueDamage = false) {
      if (!target || target.hp <= 0) return false;
      if (attacker && target.team === attacker.team) return false; // 아군 오사 원천 차단
      if (target.invulnTimer > 0) {
        this.spawnText(target.x, target.y - 14, '무적!', '#facc15');
        return false;
      }

      let dmg = rawDamage;
      // 공 C 패시브: 받는 피해 20% 감소 (고정 피해 제외)
      if (!isTrueDamage && target.def.id === 'C') {
        dmg = Math.round(dmg * 0.8 * 10) / 10;
      }

      // 보호막 우선 차감 (공 C)
      if (target.shieldHp > 0 && dmg > 0) {
        const absorbed = Math.min(target.shieldHp, dmg);
        target.shieldHp -= absorbed;
        target.shieldAbsorbed += absorbed;
        dmg -= absorbed;
        this.spawnText(target.x, target.y - 14, `흡수 ${absorbed}`, '#38bdf8');
        if (target.shieldHp <= 0) {
          target.shieldTimer = 0;
          if (target.def.onShieldEnd) target.def.onShieldEnd(target, this);
        }
      }

      if (dmg > 0) {
        target.hp -= dmg;
        target.flashTimer = 0.12;
        this.spawnText(target.x, target.y - 12, `-${Math.round(dmg * 10) / 10}`, '#f87171');
      }

      // 디버프 부여
      for (const [k, v] of Object.entries(debuffs)) {
        this.applyDebuff(target, k, v);
      }

      // 공 I 체력 50% 이하 위기 각성 체크
      if (target.def.id === 'I' && target.hp > 0 && target.hp <= target.maxHp * 0.5 && target.state.laserStage < 1) {
        target.state.laserStage = 1;
        this.spawnText(target.x, target.y - 20, '과전류 1단계!', '#facc15');
      }

      // 사망 체크 및 공 J 2v2 소생 패시브
      if (target.hp <= 0) {
        const allyHealer = balls.find(b => b.hp > 0 && b.team === target.team && b !== target && b.def.id === 'J' && !b.state.hasRevived);
        if (allyHealer) {
          allyHealer.state.hasRevived = true;
          target.hp = target.maxHp * 0.5;
          target.invulnTimer = 2.0;
          this.spawnEffect('ring', target.x, target.y, { radius: BALL_R * 3, color: '#4ade80', duration: 0.45 });
          this.spawnText(target.x, target.y - 18, '기적의 소생!', '#4ade80');
        } else {
          target.hp = 0;
        }
      }
      return true;
    },

    onSkillAction(ball) {
      // 출혈 발동 (행동 시 스택만큼 고정 피해)
      if (ball.debuffs.bleed > 0) {
        const bleedDmg = ball.debuffs.bleed;
        this.spawnEffect('ring', ball.x, ball.y, { radius: BALL_R * 1.6, color: '#dc2626', duration: 0.25 });
        this.applyHit(null, ball, bleedDmg, {}, true);
      }
      // 감전 방전 (스킬 시전 시 모든 감전 스택 소모)
      if (ball.debuffs.shock > 0) {
        ball.debuffs.shock = 0;
        this.spawnText(ball.x, ball.y - 20, '감전 방전', '#fef08a');
      }
    }
  };

  // ------------------------------------------
  // 2. 편성 화면 UI 렌더링 및 이벤트
  // ------------------------------------------
  const slotsArea = document.getElementById('slotsArea');
  const rosterList = document.getElementById('rosterList');
  const btnStart = document.getElementById('btnStartBattle');

  document.getElementById('ballCountBadge').textContent = `총 ${BALL_ROSTER.length}종 등록됨`;

  function renderSlots() {
    const count = mode === '1v1' ? 1 : 2;
    let htmlA = '<div class="team-col">';
    let htmlB = '<div class="team-col">';
    for (let i = 0; i < count; i++) {
      const bA = slots.A[i];
      const selA = activeSlot.team === 'A' && activeSlot.idx === i ? 'selected' : '';
      htmlA += `<div class="slot-box team-a ${bA ? 'filled' : ''} ${selA}" data-team="A" data-idx="${i}">
        <span class="slot-label">A팀 ${mode === '2v2' ? i + 1 : ''}</span>
        <span class="slot-name">${bA ? bA.name : '터치 후 선택'}</span>
      </div>`;

      const bB = slots.B[i];
      const selB = activeSlot.team === 'B' && activeSlot.idx === i ? 'selected' : '';
      htmlB += `<div class="slot-box team-b ${bB ? 'filled' : ''} ${selB}" data-team="B" data-idx="${i}">
        <span class="slot-label">B팀 ${mode === '2v2' ? i + 1 : ''}</span>
        <span class="slot-name">${bB ? bB.name : '터치 후 선택'}</span>
      </div>`;
    }
    htmlA += '</div>';
    htmlB += '</div>';
    slotsArea.innerHTML = htmlA + '<div class="vs-text">VS</div>' + htmlB;

    slotsArea.querySelectorAll('.slot-box').forEach(el => {
      el.onclick = () => {
        activeSlot = { team: el.dataset.team, idx: Number(el.dataset.idx) };
        renderSlots();
      };
    });

    const readyA = slots.A.slice(0, count).every(Boolean);
    const readyB = slots.B.slice(0, count).every(Boolean);
    btnStart.disabled = !(readyA && readyB);
  }

  function renderRoster() {
    rosterList.innerHTML = BALL_ROSTER.map((b, idx) => `
      <div class="ball-card" data-idx="${idx}">
        <div class="ball-icon" style="background:${b.color}; border:2px solid rgba(255,255,255,0.4);">${b.symbol || b.id}</div>
        <div class="ball-info">
          <div class="ball-title">${b.name} <span style="font-size:11px; color:#94a3b8; font-weight:600;">(HP ${b.hp})</span></div>
          <div class="ball-desc">${b.desc}</div>
        </div>
      </div>
    `).join('');

    rosterList.querySelectorAll('.ball-card').forEach(el => {
      el.onclick = () => {
        const chosen = BALL_ROSTER[Number(el.dataset.idx)];
        slots[activeSlot.team][activeSlot.idx] = chosen;
        // 자동으로 다음 빈 슬롯 포커스 이동
        const count = mode === '1v1' ? 1 : 2;
        if (activeSlot.team === 'A') {
          if (activeSlot.idx + 1 < count && !slots.A[activeSlot.idx + 1]) activeSlot.idx++;
          else activeSlot = { team: 'B', idx: 0 };
        } else {
          if (activeSlot.idx + 1 < count && !slots.B[activeSlot.idx + 1]) activeSlot.idx++;
        }
        renderSlots();
      };
    });
  }

  document.getElementById('btnMode1v1').onclick = (e) => {
    mode = '1v1';
    slots = { A: [slots.A[0] || null], B: [slots.B[0] || null] };
    activeSlot = { team: 'A', idx: 0 };
    e.target.classList.add('active');
    document.getElementById('btnMode2v2').classList.remove('active');
    renderSlots();
  };

  document.getElementById('btnMode2v2').onclick = (e) => {
    mode = '2v2';
    slots = { A: [slots.A[0] || null, null], B: [slots.B[0] || null, null] };
    activeSlot = { team: 'A', idx: 0 };
    e.target.classList.add('active');
    document.getElementById('btnMode1v1').classList.remove('active');
    renderSlots();
  };

  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sides = Number(btn.dataset.shape);
    };
  });

  // 도감 모달
