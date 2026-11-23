import { ArrowLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundSynth } from '../game/soundSynth';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type DifficultyMode = 'Standard' | 'Overdrive';
type EnemyKind = 'seeker' | 'charger' | 'splitter' | 'warden';

interface HudSnapshot {
  hp: number;
  maxHp: number;
  dashReady: boolean;
  dashCooldownRatio: number;
  score: number;
  highScore: number;
  wave: number;
  combo: number;
  enemiesDefeated: number;
}

interface Bullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fromEnemy: boolean;
  color: string;
  radius: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Pickup {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'core' | 'repair';
}

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  flashTimer: number;
  stateTimer: number;
  charging: boolean;
  windupTimer: number;
  aimAngle: number;
  angle: number;
}

const HIGH_SCORE_KEY = 'nexora_pulse_vector_high_v1';

function loadHighScore(): number {
  try {
    const val = Number(localStorage.getItem(HIGH_SCORE_KEY) || '0');
    return Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore storage failure
  }
}

interface PulseVectorGameProps {
  onExit: () => void;
}

export const PulseVectorGame: React.FC<PulseVectorGameProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('Standard');
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    hp: 100,
    maxHp: 100,
    dashReady: true,
    dashCooldownRatio: 1,
    score: 0,
    highScore: loadHighScore(),
    wave: 1,
    combo: 1,
    enemiesDefeated: 0,
  }));

  const gameStateRef = useRef<GameState>('TITLE_MENU');
  const difficultyRef = useRef<DifficultyMode>('Standard');

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundSynth.setMuted(next);
      return next;
    });
  }, []);

  // Mutable simulation state isolated outside React re-render cycle
  const simRef = useRef({
    width: 1280,
    height: 720,
    player: {
      x: 640,
      y: 360,
      vx: 0,
      vy: 0,
      radius: 14,
      angle: 0,
      hp: 100,
      maxHp: 100,
      fireCooldown: 0,
      dashCooldown: 0,
      dashDuration: 0,
      dashVx: 0,
      dashVy: 0,
      invulnTimer: 0,
      squash: 1,
    },
    score: 0,
    highScore: loadHighScore(),
    wave: 1,
    waveRemainingToSpawn: 6,
    spawnTimer: 0.4,
    waveClearPause: 0,
    combo: 1,
    comboTimer: 0,
    enemiesDefeated: 0,
    nextEnemyId: 1,
    hitstopTimer: 0,
    shakeMag: 0,
    heldKeys: new Set<string>(),
    justPressed: new Set<string>(),
    mouse: { x: 640, y: 360, down: false },
    enemies: [] as Enemy[],
    bullets: Array.from({ length: 180 }, (): Bullet => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      fromEnemy: false,
      color: '#38BDF8',
      radius: 4,
    })),
    particles: Array.from({ length: 240 }, (): Particle => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#8B5CF6',
    })),
    pickups: Array.from({ length: 40 }, (): Pickup => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      kind: 'core',
    })),
    stars: Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.8 + Math.random() * 1.6,
      alpha: 0.15 + Math.random() * 0.45,
      speed: 0.008 + Math.random() * 0.02,
    })),
    hudSyncAccum: 0,
  });

  const resetSimulation = useCallback(() => {
    const s = simRef.current;
    s.player = {
      x: s.width / 2,
      y: s.height / 2,
      vx: 0,
      vy: 0,
      radius: 14,
      angle: -Math.PI / 2,
      hp: 100,
      maxHp: 100,
      fireCooldown: 0,
      dashCooldown: 0,
      dashDuration: 0,
      dashVx: 0,
      dashVy: 0,
      invulnTimer: 0.5,
      squash: 1,
    };
    s.score = 0;
    s.wave = 1;
    s.waveRemainingToSpawn = difficultyRef.current === 'Overdrive' ? 9 : 6;
    s.spawnTimer = 0.5;
    s.waveClearPause = 0;
    s.combo = 1;
    s.comboTimer = 0;
    s.enemiesDefeated = 0;
    s.hitstopTimer = 0;
    s.shakeMag = 0;
    s.enemies = [];
    for (const b of s.bullets) b.active = false;
    for (const p of s.particles) p.active = false;
    for (const pk of s.pickups) pk.active = false;
    setHud({
      hp: 100,
      maxHp: 100,
      dashReady: true,
      dashCooldownRatio: 1,
      score: 0,
      highScore: s.highScore,
      wave: 1,
      combo: 1,
      enemiesDefeated: 0,
    });
  }, []);

  const startGame = useCallback(() => {
    resetSimulation();
    setGameState('PLAYING');
    soundSynth.playWaveClear();
  }, [resetSimulation]);

  // Keyboard & mouse bindings with window blur cleanup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const state = gameStateRef.current;

      if (code === 'Escape') {
        if (state === 'PLAYING') {
          setGameState('PAUSED');
        } else if (state === 'PAUSED') {
          setGameState('PLAYING');
        }
        return;
      }

      if (
        (code === 'Enter' || code === 'Space') &&
        (state === 'TITLE_MENU' || state === 'GAME_OVER')
      ) {
        e.preventDefault();
        startGame();
        return;
      }

      if (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        e.preventDefault();
      }

      const s = simRef.current;
      if (!s.heldKeys.has(code)) {
        s.justPressed.add(code);
      }
      s.heldKeys.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      simRef.current.heldKeys.delete(e.code);
    };

    const handleBlur = () => {
      simRef.current.heldKeys.clear();
      simRef.current.mouse.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      soundSynth.dispose();
    };
  }, [startGame]);

  // Isolated 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      simRef.current.width = w;
      simRef.current.height = h;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speedScale = 1,
    ) => {
      const pool = simRef.current.particles;
      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < count; i++) {
        const p = pool[i];
        if (!p.active) {
          const ang = Math.random() * Math.PI * 2;
          const spd = (55 + Math.random() * 190) * speedScale;
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(ang) * spd;
          p.vy = Math.sin(ang) * spd;
          p.maxLife = 0.25 + Math.random() * 0.35;
          p.life = p.maxLife;
          p.size = 1.8 + Math.random() * 2.6;
          p.color = color;
          spawned++;
        }
      }
    };

    const spawnBullet = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      fromEnemy: boolean,
      color: string,
      radius = 4,
    ) => {
      const pool = simRef.current.bullets;
      for (let i = 0; i < pool.length; i++) {
        const b = pool[i];
        if (!b.active) {
          b.active = true;
          b.x = x;
          b.y = y;
          b.vx = vx;
          b.vy = vy;
          b.life = fromEnemy ? 3.5 : 1.5;
          b.fromEnemy = fromEnemy;
          b.color = color;
          b.radius = radius;
          return;
        }
      }
    };

    const spawnPickup = (x: number, y: number, kind: 'core' | 'repair') => {
      const pool = simRef.current.pickups;
      for (let i = 0; i < pool.length; i++) {
        const pk = pool[i];
        if (!pk.active) {
          pk.active = true;
          pk.x = x;
          pk.y = y;
          pk.vx = (Math.random() - 0.5) * 45;
          pk.vy = (Math.random() - 0.5) * 45;
          pk.life = 10;
          pk.kind = kind;
          return;
        }
      }
    };

    const spawnWaveEnemy = () => {
      const s = simRef.current;
      const isOverdrive = difficultyRef.current === 'Overdrive';
      const pad = 36;
      const edge = Math.floor(Math.random() * 4);
      let ex = 0;
      let ey = 0;
      if (edge === 0) {
        ex = Math.random() * s.width;
        ey = -pad;
      } else if (edge === 1) {
        ex = s.width + pad;
        ey = Math.random() * s.height;
      } else if (edge === 2) {
        ex = Math.random() * s.width;
        ey = s.height + pad;
      } else {
        ex = -pad;
        ey = Math.random() * s.height;
      }

      const roll = Math.random();
      let kind: EnemyKind = 'seeker';
      if (s.wave % 4 === 0 && s.waveRemainingToSpawn === 1) {
        kind = 'warden';
      } else if (s.wave >= 3 && roll > 0.72) {
        kind = 'splitter';
      } else if (s.wave >= 2 && roll > 0.42) {
        kind = 'charger';
      }

      const speedMult = (1 + (s.wave - 1) * 0.065) * (isOverdrive ? 1.2 : 1);
      const hpScale = isOverdrive ? 1.25 : 1;

      const enemy: Enemy = {
        id: s.nextEnemyId++,
        kind,
        x: ex,
        y: ey,
        vx: 0,
        vy: 0,
        radius: kind === 'warden' ? 26 : kind === 'splitter' ? 17 : 13,
        hp:
          kind === 'warden'
            ? Math.round((14 + s.wave * 2) * hpScale)
            : kind === 'splitter'
              ? Math.round(3 * hpScale)
              : kind === 'charger'
                ? Math.round(2 * hpScale)
                : Math.round(1 * hpScale),
        maxHp: 1,
        speed:
          (kind === 'warden'
            ? 72
            : kind === 'splitter'
              ? 95
              : kind === 'charger'
                ? 115
                : 138) * speedMult,
        flashTimer: 0,
        stateTimer: 1.1 + Math.random() * 0.9,
        charging: false,
        windupTimer: 0,
        aimAngle: 0,
        angle: 0,
      };
      enemy.maxHp = enemy.hp;
      s.enemies.push(enemy);
    };

    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const s = simRef.current;
      const state = gameStateRef.current;

      // Atmospheric background drift on all states
      for (const star of s.stars) {
        star.y += star.speed * dt;
        if (star.y > 1) star.y -= 1;
      }

      if (state === 'PLAYING') {
        if (s.hitstopTimer > 0) {
          s.hitstopTimer -= dt;
        } else {
          // 1. Player movement & dash
          const p = s.player;
          p.fireCooldown = Math.max(0, p.fireCooldown - dt);
          p.dashCooldown = Math.max(0, p.dashCooldown - dt);
          p.invulnTimer = Math.max(0, p.invulnTimer - dt);
          p.squash += (1 - p.squash) * Math.min(1, dt * 14);

          let moveX = 0;
          let moveY = 0;
          if (s.heldKeys.has('KeyW') || s.heldKeys.has('ArrowUp')) moveY -= 1;
          if (s.heldKeys.has('KeyS') || s.heldKeys.has('ArrowDown')) moveY += 1;
          if (s.heldKeys.has('KeyA') || s.heldKeys.has('ArrowLeft')) moveX -= 1;
          if (s.heldKeys.has('KeyD') || s.heldKeys.has('ArrowRight')) moveX += 1;

          const moveLen = Math.hypot(moveX, moveY);
          if (moveLen > 0) {
            moveX /= moveLen;
            moveY /= moveLen;
          }

          if (
            (s.justPressed.has('ShiftLeft') || s.justPressed.has('ShiftRight')) &&
            p.dashCooldown <= 0
          ) {
            const dx = moveLen > 0 ? moveX : Math.cos(p.angle);
            const dy = moveLen > 0 ? moveY : Math.sin(p.angle);
            p.dashVx = dx * 690;
            p.dashVy = dy * 690;
            p.dashDuration = 0.16;
            p.dashCooldown = 1.35;
            p.invulnTimer = Math.max(p.invulnTimer, 0.22);
            p.squash = 1.35;
            soundSynth.playDash();
            spawnParticles(p.x, p.y, '#8B5CF6', 10, 0.8);
          }

          if (p.dashDuration > 0) {
            p.dashDuration -= dt;
            p.x += p.dashVx * dt;
            p.y += p.dashVy * dt;
            if (Math.random() < 0.7) {
              spawnParticles(p.x, p.y, '#8B5CF6', 1, 0.25);
            }
          } else {
            const speed = 290;
            const targetVx = moveX * speed;
            const targetVy = moveY * speed;
            const accel = 1 - Math.exp(-16 * dt);
            p.vx += (targetVx - p.vx) * accel;
            p.vy += (targetVy - p.vy) * accel;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
          }

          p.x = Math.max(p.radius + 8, Math.min(s.width - p.radius - 8, p.x));
          p.y = Math.max(p.radius + 8, Math.min(s.height - p.radius - 8, p.y));
          p.angle = Math.atan2(s.mouse.y - p.y, s.mouse.x - p.x);

          // 2. Player weapon fire
          if ((s.mouse.down || s.heldKeys.has('Space')) && p.fireCooldown <= 0) {
            p.fireCooldown = 0.13;
            p.squash = 0.86;
            const muzzleX = p.x + Math.cos(p.angle) * 18;
            const muzzleY = p.y + Math.sin(p.angle) * 18;
            const bulletSpeed = 720;
            spawnBullet(
              muzzleX,
              muzzleY,
              Math.cos(p.angle) * bulletSpeed,
              Math.sin(p.angle) * bulletSpeed,
              false,
              '#38BDF8',
              4.2,
            );
            soundSynth.playShoot();
          }

          // 3. Combo decay
          if (s.combo > 1) {
            s.comboTimer -= dt;
            if (s.comboTimer <= 0) {
              s.combo = 1;
            }
          }

          // 4. Wave Spawner
          if (s.waveRemainingToSpawn > 0) {
            s.spawnTimer -= dt;
            if (s.spawnTimer <= 0) {
              spawnWaveEnemy();
              s.waveRemainingToSpawn--;
              const baseInterval = Math.max(0.28, 1.05 - s.wave * 0.06);
              s.spawnTimer =
                difficultyRef.current === 'Overdrive' ? baseInterval * 0.78 : baseInterval;
            }
          } else if (s.enemies.length === 0) {
            if (s.waveClearPause <= 0) {
              s.waveClearPause = 1.1;
              soundSynth.playWaveClear();
            } else {
              s.waveClearPause -= dt;
              if (s.waveClearPause <= 0) {
                s.wave += 1;
                s.waveRemainingToSpawn =
                  (difficultyRef.current === 'Overdrive' ? 8 : 5) + s.wave * 2;
                s.spawnTimer = 0.4;
              }
            }
          }

          // 5. Enemies update
          for (let i = s.enemies.length - 1; i >= 0; i--) {
            const e = s.enemies[i];
            e.flashTimer = Math.max(0, e.flashTimer - dt);
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.hypot(dx, dy) || 1;
            const toPlayerAngle = Math.atan2(dy, dx);

            if (e.kind === 'seeker') {
              e.angle = toPlayerAngle;
              e.x += (dx / dist) * e.speed * dt;
              e.y += (dy / dist) * e.speed * dt;
            } else if (e.kind === 'splitter') {
              e.angle += dt * 2.2;
              e.x += (dx / dist) * e.speed * dt;
              e.y += (dy / dist) * e.speed * dt;
            } else if (e.kind === 'charger') {
              if (e.windupTimer > 0) {
                e.windupTimer -= dt;
                if (e.windupTimer <= 0) {
                  e.charging = true;
                  e.stateTimer = 0.45;
                  e.vx = Math.cos(e.aimAngle) * e.speed * 3.8;
                  e.vy = Math.sin(e.aimAngle) * e.speed * 3.8;
                }
              } else if (e.charging) {
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                e.stateTimer -= dt;
                if (e.stateTimer <= 0) {
                  e.charging = false;
                  e.stateTimer = 1.4;
                }
              } else {
                e.angle = toPlayerAngle;
                e.x += (dx / dist) * e.speed * 0.75 * dt;
                e.y += (dy / dist) * e.speed * 0.75 * dt;
                e.stateTimer -= dt;
                if (e.stateTimer <= 0 && dist < 440) {
                  e.windupTimer = 0.65;
                  e.aimAngle = toPlayerAngle;
                }
              }
            } else if (e.kind === 'warden') {
              e.angle += dt * 0.9;
              if (dist > 220) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
              }
              e.stateTimer -= dt;
              if (e.stateTimer <= 0) {
                e.stateTimer = 1.9;
                const bolts = 8;
                for (let b = 0; b < bolts; b++) {
                  const ang = (Math.PI * 2 * b) / bolts + e.angle;
                  spawnBullet(
                    e.x,
                    e.y,
                    Math.cos(ang) * 230,
                    Math.sin(ang) * 230,
                    true,
                    '#F59E0B',
                    5,
                  );
                }
              }
            }

            // Player collision with enemy
            if (dist < e.radius + p.radius - 2 && p.invulnTimer <= 0) {
              p.hp = Math.max(0, p.hp - (e.kind === 'warden' ? 28 : 18));
              p.invulnTimer = 0.75;
              s.combo = 1;
              s.hitstopTimer = 0.055;
              s.shakeMag = 11;
              soundSynth.playPlayerDamage();
              spawnParticles(p.x, p.y, '#EF4444', 16, 1.2);
              if (p.hp <= 0) {
                if (s.score > s.highScore) {
                  s.highScore = s.score;
                  saveHighScore(s.score);
                }
                setGameState('GAME_OVER');
              }
            }
          }

          // 6. Bullets update & collisions
          for (let i = 0; i < s.bullets.length; i++) {
            const b = s.bullets[i];
            if (!b.active) continue;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (
              b.life <= 0 ||
              b.x < -30 ||
              b.x > s.width + 30 ||
              b.y < -30 ||
              b.y > s.height + 30
            ) {
              b.active = false;
              continue;
            }

            if (b.fromEnemy) {
              const distP = Math.hypot(b.x - p.x, b.y - p.y);
              if (distP < b.radius + p.radius - 2 && p.invulnTimer <= 0) {
                b.active = false;
                p.hp = Math.max(0, p.hp - 15);
                p.invulnTimer = 0.7;
                s.combo = 1;
                s.hitstopTimer = 0.05;
                s.shakeMag = 9;
                soundSynth.playPlayerDamage();
                spawnParticles(p.x, p.y, '#EF4444', 12, 1.0);
                if (p.hp <= 0) {
                  if (s.score > s.highScore) {
                    s.highScore = s.score;
                    saveHighScore(s.score);
                  }
                  setGameState('GAME_OVER');
                }
              }
            } else {
              for (let j = s.enemies.length - 1; j >= 0; j--) {
                const e = s.enemies[j];
                const d = Math.hypot(b.x - e.x, b.y - e.y);
                if (d < b.radius + e.radius) {
                  b.active = false;
                  e.hp -= 1;
                  e.flashTimer = 0.09;
                  spawnParticles(b.x, b.y, '#38BDF8', 4, 0.5);

                  if (e.hp <= 0) {
                    const isBoss = e.kind === 'warden';
                    soundSynth.playDestroy(isBoss);
                    spawnParticles(
                      e.x,
                      e.y,
                      isBoss ? '#F59E0B' : e.kind === 'splitter' ? '#8B5CF6' : '#EF4444',
                      isBoss ? 28 : 14,
                      isBoss ? 1.5 : 1.0,
                    );
                    if (isBoss) {
                      s.hitstopTimer = 0.06;
                      s.shakeMag = 12;
                      spawnPickup(e.x, e.y, 'repair');
                    } else {
                      s.shakeMag = Math.max(s.shakeMag, 3.5);
                      if (Math.random() < 0.45) {
                        spawnPickup(e.x, e.y, Math.random() < 0.14 ? 'repair' : 'core');
                      }
                    }

                    // Splitter spawns 2 fast seekers on death
                    if (e.kind === 'splitter') {
                      for (let k = -1; k <= 1; k += 2) {
                        s.enemies.push({
                          id: s.nextEnemyId++,
                          kind: 'seeker',
                          x: e.x + k * 14,
                          y: e.y - k * 10,
                          vx: 0,
                          vy: 0,
                          radius: 10,
                          hp: 1,
                          maxHp: 1,
                          speed: e.speed * 1.45,
                          flashTimer: 0.1,
                          stateTimer: 1,
                          charging: false,
                          windupTimer: 0,
                          aimAngle: 0,
                          angle: 0,
                        });
                      }
                    }

                    const basePts =
                      e.kind === 'warden'
                        ? 500
                        : e.kind === 'splitter'
                          ? 140
                          : e.kind === 'charger'
                            ? 110
                            : 75;
                    s.score += basePts * s.combo;
                    s.combo = Math.min(8, s.combo + 1);
                    s.comboTimer = 3.2;
                    s.enemiesDefeated += 1;
                    s.enemies.splice(j, 1);
                  } else {
                    soundSynth.playHit();
                  }
                  break;
                }
              }
            }
          }

          // 7. Pickups update
          for (let i = 0; i < s.pickups.length; i++) {
            const pk = s.pickups[i];
            if (!pk.active) continue;
            pk.life -= dt;
            if (pk.life <= 0) {
              pk.active = false;
              continue;
            }
            const dx = p.x - pk.x;
            const dy = p.y - pk.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 150) {
              pk.x += (dx / d) * 280 * dt;
              pk.y += (dy / d) * 280 * dt;
            } else {
              pk.x += pk.vx * dt;
              pk.y += pk.vy * dt;
              pk.vx *= 0.96;
              pk.vy *= 0.96;
            }

            if (d < p.radius + 10) {
              pk.active = false;
              soundSynth.playPickup();
              if (pk.kind === 'repair') {
                p.hp = Math.min(p.maxHp, p.hp + 20);
                spawnParticles(pk.x, pk.y, '#10B981', 10, 0.8);
              } else {
                s.score += 50 * s.combo;
                s.comboTimer = 3.5;
                spawnParticles(pk.x, pk.y, '#38BDF8', 8, 0.7);
              }
            }
          }
        }

        // Particles always update smoothly even during hitstop
        for (let i = 0; i < s.particles.length; i++) {
          const pt = s.particles[i];
          if (!pt.active) continue;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vx *= 0.94;
          pt.vy *= 0.94;
          pt.life -= dt;
          if (pt.life <= 0) pt.active = false;
        }

        s.shakeMag *= Math.exp(-12 * dt);
        if (s.shakeMag < 0.2) s.shakeMag = 0;

        // Throttled HUD React sync (~15Hz) so React never bottlenecks 60fps loop
        s.hudSyncAccum += dt;
        if (s.hudSyncAccum >= 0.065) {
          s.hudSyncAccum = 0;
          setHud({
            hp: s.player.hp,
            maxHp: s.player.maxHp,
            dashReady: s.player.dashCooldown <= 0,
            dashCooldownRatio: Math.max(0, Math.min(1, 1 - s.player.dashCooldown / 1.35)),
            score: s.score,
            highScore: Math.max(s.highScore, s.score),
            wave: s.wave,
            combo: s.combo,
            enemiesDefeated: s.enemiesDefeated,
          });
        }
      }

      s.justPressed.clear();

      // RENDER PASS
      ctx.save();
      ctx.fillStyle = '#080A12';
      ctx.fillRect(0, 0, s.width, s.height);

      if (s.shakeMag > 0 && state === 'PLAYING') {
        const sx = (Math.random() - 0.5) * 2 * s.shakeMag;
        const sy = (Math.random() - 0.5) * 2 * s.shakeMag;
        ctx.translate(sx, sy);
      }

      // Subtle tactical grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
      ctx.lineWidth = 1;
      const gridStep = 64;
      ctx.beginPath();
      for (let gx = 0; gx < s.width; gx += gridStep) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, s.height);
      }
      for (let gy = 0; gy < s.height; gy += gridStep) {
        ctx.moveTo(0, gy);
        ctx.lineTo(s.width, gy);
      }
      ctx.stroke();

      // Stars
      for (const star of s.stars) {
        ctx.fillStyle = `rgba(226, 232, 240, ${star.alpha})`;
        ctx.fillRect(star.x * s.width, star.y * s.height, star.size, star.size);
      }

      if (state !== 'TITLE_MENU') {
        // Pickups
        for (const pk of s.pickups) {
          if (!pk.active) continue;
          ctx.save();
          ctx.translate(pk.x, pk.y);
          ctx.fillStyle = pk.kind === 'repair' ? '#10B981' : '#38BDF8';
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }

        // Bullets
        for (const b of s.bullets) {
          if (!b.active) continue;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Enemies + Windup telegraphs
        for (const e of s.enemies) {
          if (e.kind === 'charger' && e.windupTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(
              e.x + Math.cos(e.aimAngle) * 320,
              e.y + Math.sin(e.aimAngle) * 320,
            );
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.angle);

          const baseColor =
            e.flashTimer > 0
              ? '#FFFFFF'
              : e.kind === 'warden'
                ? '#F59E0B'
                : e.kind === 'splitter'
                  ? '#8B5CF6'
                  : e.kind === 'charger'
                    ? '#FB923C'
                    : '#EF4444';

          ctx.fillStyle = baseColor;
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();

          if (e.kind === 'seeker') {
            ctx.moveTo(e.radius, 0);
            ctx.lineTo(0, e.radius * 0.75);
            ctx.lineTo(-e.radius, 0);
            ctx.lineTo(0, -e.radius * 0.75);
          } else if (e.kind === 'charger') {
            ctx.moveTo(e.radius + 3, 0);
            ctx.lineTo(-e.radius, e.radius * 0.85);
            ctx.lineTo(-e.radius * 0.6, 0);
            ctx.lineTo(-e.radius, -e.radius * 0.85);
          } else {
            const sides = e.kind === 'warden' ? 8 : 6;
            for (let side = 0; side < sides; side++) {
              const a = (Math.PI * 2 * side) / sides;
              const px = Math.cos(a) * e.radius;
              const py = Math.sin(a) * e.radius;
              if (side === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Particles
        for (const pt of s.particles) {
          if (!pt.active) continue;
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }
        ctx.globalAlpha = 1;

        // Player ship
        const p = s.player;
        const blinkSkip =
          p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0;
        if (!blinkSkip) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(p.squash, 2 - p.squash);

          ctx.fillStyle = '#F8FAFC';
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(17, 0);
          ctx.lineTo(-12, 11);
          ctx.lineTo(-7, 0);
          ctx.lineTo(-12, -11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    simRef.current.mouse.x = e.clientX - rect.left;
    simRef.current.mouse.y = e.clientY - rect.top;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080A12] text-[#F8FAFC] select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={() => {
          simRef.current.mouse.down = true;
        }}
        onMouseUp={() => {
          simRef.current.mouse.down = false;
        }}
        onMouseLeave={() => {
          simRef.current.mouse.down = false;
        }}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Active Playing Perimeter HUD (pointer-events-none, no backdrop-filter) */}
      {gameState !== 'TITLE_MENU' && (
        <div className="pointer-events-none fixed inset-x-0 top-0 p-4 sm:p-5 flex items-start justify-between gap-4">
          {/* Left status cluster: Hull & Dash */}
          <div className="flex flex-col gap-2 bg-[#101321]/90 border border-white/[0.1] rounded-lg px-3.5 py-2.5 min-w-[180px]">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-300">Hull</span>
              <span className="font-mono tabular-nums font-semibold text-white">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.hp > 50
                    ? 'bg-emerald-500'
                    : hud.hp > 25
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] pt-0.5">
              <span className="text-slate-400">Dash (Shift)</span>
              <span
                className={`font-mono font-medium ${
                  hud.dashReady ? 'text-violet-300' : 'text-slate-500'
                }`}
              >
                {hud.dashReady ? 'READY' : 'RECHARGING'}
              </span>
            </div>
          </div>

          {/* Right status cluster: Score, Wave, Controls */}
          <div className="flex items-start gap-2.5">
            <div className="bg-[#101321]/90 border border-white/[0.1] rounded-lg px-3.5 py-2.5 flex items-center gap-5 text-xs">
              <div>
                <div className="text-[11px] text-slate-400">Wave</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-white">
                  {hud.wave}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Combo</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-sky-400">
                  x{hud.combo}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Score</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="w-10 h-10 rounded-lg border border-white/[0.1] bg-[#101321]/90 hover:bg-[#15192A] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() =>
                  setGameState((prev) => (prev === 'PAUSED' ? 'PLAYING' : 'PAUSED'))
                }
                className="w-10 h-10 rounded-lg border border-white/[0.1] bg-[#101321]/90 hover:bg-[#15192A] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label="Pause game"
                title="Pause (Esc)"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Screen */}
      {gameState === 'TITLE_MENU' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center px-6">
          <button
            type="button"
            onClick={onExit}
            className="fixed top-5 left-5 inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-white/[0.1] bg-[#101321]/90 hover:bg-[#15192A] text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="fixed top-5 right-5 w-10 h-10 rounded-lg border border-white/[0.1] bg-[#101321]/90 hover:bg-[#15192A] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="max-w-lg w-full text-center space-y-7">
            {/* Bespoke SVG Title Lockup */}
            <div className="flex flex-col items-center space-y-3">
              <svg
                width="320"
                height="68"
                viewBox="0 0 320 68"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="PULSE VECTOR"
                className="max-w-full"
              >
                <polygon
                  points="24,10 42,34 24,58 14,34"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  fill="rgba(139,92,246,0.2)"
                />
                <text
                  x="62"
                  y="44"
                  fill="#F8FAFC"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontSize="30"
                  fontWeight="700"
                  letterSpacing="2.5"
                >
                  PULSE VECTOR
                </text>
              </svg>
              <p className="text-sm text-slate-400">
                Tactical orbital arcade survival · High Score{' '}
                <span className="font-mono tabular-nums text-slate-200">
                  {hud.highScore.toLocaleString()}
                </span>
              </p>
            </div>

            {/* Difficulty selector */}
            <div className="inline-flex items-center p-1 rounded-lg border border-white/[0.1] bg-[#101321]">
              {(['Standard', 'Overdrive'] as DifficultyMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDifficulty(mode)}
                  className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                    difficulty === mode
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={startGame}
                className="inline-flex items-center gap-2.5 h-12 px-8 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Game</span>
              </button>
            </div>

            <p className="text-xs font-mono text-slate-400">
              WASD / Arrows Move · Mouse Aim &amp; Fire · Shift Dash · Esc Pause
            </p>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <div className="fixed inset-0 bg-[#080A12]/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.1] bg-[#101321] p-6 text-center space-y-5">
            <h2 className="text-lg font-semibold text-white">Simulation Paused</h2>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="h-10 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={startGame}
                className="h-10 rounded-lg border border-white/[0.1] hover:bg-white/[0.06] text-slate-200 text-sm font-medium transition-colors"
              >
                Restart Run
              </button>
              <button
                type="button"
                onClick={onExit}
                className="h-10 rounded-lg border border-white/[0.1] hover:bg-white/[0.06] text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Exit to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-[#080A12]/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.1] bg-[#101321] p-6 text-center space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white">Hull Breached</h2>
              <p className="text-xs text-slate-400">
                Wave {hud.wave} · {hud.enemiesDefeated} targets neutralized
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-[#080A12] py-3">
              <div>
                <div className="text-[11px] text-slate-400">Final Score</div>
                <div className="mt-0.5 font-mono tabular-nums text-lg font-semibold text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Best Score</div>
                <div className="mt-0.5 font-mono tabular-nums text-lg font-semibold text-sky-400">
                  {hud.highScore.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={startGame}
                className="inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="h-10 rounded-lg border border-white/[0.1] hover:bg-white/[0.06] text-slate-300 text-sm font-medium transition-colors"
              >
                Exit to Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
