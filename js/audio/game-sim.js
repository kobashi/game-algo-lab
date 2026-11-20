/**
 * 音を直接鳴らさない小さな横移動。起きたことは emit するだけ。
 * @see docs/topics/sfx-events/SPEC.md
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(name: string, payload?: object) => void} emit
 * @param {{ health: () => number, timeScale: () => number, focused: () => boolean }} read
 */
export function createGameSim(canvas, emit, read) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const ground = 146;
  /** @type {Record<string, boolean>} */
  const held = { left: false, right: false, jump: false };
  let player = freshPlayer();
  let enemies = freshEnemies();
  let coin = { x: 280, y: 108, taken: false };
  let gem = { x: 560, y: 108, taken: false };
  let invuln = 0;
  let wasAir = false;
  let jumpEdge = false;
  let over = "";
  let acc = 0;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let timers = [];

  function freshPlayer() {
    return { x: 48, y: ground - 36, vx: 0, vy: 0, w: 26, h: 36, onGround: true };
  }
  function freshEnemies() {
    return [
      { x: 340, y: ground - 28, w: 26, h: 28, dir: -1, alive: true },
      { x: 460, y: ground - 28, w: 26, h: 28, dir: 1, alive: true },
    ];
  }

  function resetLocal() {
    player = freshPlayer();
    enemies = freshEnemies();
    coin = { x: 280, y: 108, taken: false };
    gem = { x: 560, y: 108, taken: false };
    invuln = 0;
    wasAir = false;
    jumpEdge = false;
    over = "";
    acc = 0;
  }

  function clearTimers() {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }

  /**
   * @param {number} dt
   */
  function step(dt) {
    if (!ctx || over) return;
    const scale = Math.max(0.2, Math.min(2, read.timeScale() || 1));
    acc += dt * scale;
    while (acc >= 1 / 60) {
      acc -= 1 / 60;
      fixed(1 / 60);
    }
  }

  /**
   * @param {number} dt
   */
  function fixed(dt) {
    const speed = 150;
    player.vx = 0;
    if (held.left) player.vx -= speed;
    if (held.right) player.vx += speed;
    if (jumpEdge && player.onGround) {
      jumpEdge = false;
      player.vy = -280;
      player.onGround = false;
      emit("Jump");
    }
    player.vy += 900 * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.x < 8) player.x = 8;
    if (player.x + player.w > W - 8) player.x = W - 8 - player.w;
    const feet = player.y + player.h;
    if (feet >= ground) {
      if (wasAir) emit("Land");
      player.y = ground - player.h;
      player.vy = 0;
      player.onGround = true;
      wasAir = false;
    } else {
      player.onGround = false;
      wasAir = true;
    }
    invuln = Math.max(0, invuln - dt);

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.dir * 46 * dt;
      if (enemy.x < 220) enemy.dir = 1;
      if (enemy.x > W - 80) enemy.dir = -1;
      if (invuln <= 0 && overlap(player, enemy)) {
        invuln = 0.7;
        emit("Hit", { damage: 20 });
        if (read.health() <= 0) {
          over = "fail";
          emit("Defeat");
        }
      }
    }
    if (!coin.taken && overlap(player, { ...coin, w: 16, h: 16 })) {
      coin.taken = true;
      emit("Pickup", { kind: "coin" });
    }
    if (!gem.taken && overlap(player, { ...gem, w: 16, h: 16 })) {
      gem.taken = true;
      emit("Pickup", { kind: "rare" });
      over = "clear";
      emit("Clear");
    }
  }

  /**
   * @param {{ x: number, y: number, w: number, h: number }} a
   * @param {{ x: number, y: number, w: number, h: number }} b
   */
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#101820";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#243044";
    ctx.fillRect(0, ground, W, H - ground);
    ctx.fillStyle = "#5b9fd4";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    if (!coin.taken) {
      ctx.fillStyle = "#f2cc8f";
      ctx.fillRect(coin.x, coin.y, 16, 16);
    }
    if (!gem.taken) {
      ctx.fillStyle = "#d48bff";
      ctx.fillRect(gem.x, gem.y, 16, 16);
    }
    ctx.fillStyle = "#e07a5f";
    for (const enemy of enemies) {
      if (enemy.alive) ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    }
    ctx.fillStyle = "#9aabbf";
    ctx.font = "14px sans-serif";
    const hp = Math.round(read.health());
    const note =
      over === "clear"
        ? "クリア"
        : over === "fail"
          ? "失敗"
          : over === "script"
            ? "自動の流れ"
            : "移動してイベントを出す";
    ctx.fillText(`体力 ${hp}  時間 ${read.timeScale().toFixed(1)}×  ${note}`, 12, 22);
  }

  /**
   * @param {number} delay
   * @param {() => void} fn
   */
  function after(delay, fn) {
    const t = setTimeout(fn, delay);
    timers.push(t);
  }

  function scenario() {
    clearTimers();
    resetLocal();
    over = "script";
    emit("Enter", { state: "normal" });
    after(900, () => emit("EnemySpawn", { count: 3 }));
    after(1900, () => emit("Hit", { damage: 30 }));
    after(2700, () => emit("Hit", { damage: 40 }));
    after(3500, () => emit("Hit", { damage: 25 }));
    after(4600, () => emit("Pickup", { kind: "rare" }));
    after(5600, () => emit("Clear"));
  }

  return {
    /**
     * @param {number} dt
     */
    tick(dt) {
      if (over === "script") {
        draw();
        return;
      }
      step(dt);
      draw();
    },
    draw,
    reset() {
      clearTimers();
      resetLocal();
      draw();
    },
    scenario,
    stopScenario() {
      clearTimers();
      if (over === "script") over = "";
    },
    /**
     * @param {"left"|"right"|"jump"} key
     * @param {boolean} down
     */
    hold(key, down) {
      if (key === "jump") {
        if (down && !held.jump) jumpEdge = true;
        held.jump = down;
        return;
      }
      held[key] = down;
    },
    pressJump() {
      jumpEdge = true;
    },
  };
}
