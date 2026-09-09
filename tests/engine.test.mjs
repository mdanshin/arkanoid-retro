import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine, WIDTH, HEIGHT, PADDLE_Y, WALL} from '../engine.js';
import {HorizonEngine} from '../modern-engine.js';
import {createLevel, SECTORS} from '../modern-levels.js';
import {resolution} from '../neon-renderer.js';

const variants = [
  ['Classic', () => new Engine(() => {}, () => .5), {width: WIDTH, height: HEIGHT, paddleY: PADDLE_Y, wall: WALL}],
  ['Neon desktop', () => new HorizonEngine(() => {}, () => .5), {}],
  ['Neon portrait', () => new HorizonEngine(() => {}, () => .5, true), {}]
];
const fresh = (factory, geometry) => { const game = factory(); Object.assign(game, geometry); game.start(); game.launch(); return game; };
for (const [name, factory, geometry] of variants) {
  test(`${name}: all 33 rounds fit, including the final boss`, () => {
    const game = fresh(factory, geometry);
    for (let level = 0; level < 32; level++) {
      game.level = level; game.prepareLevel();
      assert(game.bricks.some(b => b.type !== 'x'));
      for (const brick of game.bricks) {
        assert(brick.x >= game.wall && brick.x + brick.w <= game.width - game.wall);
        assert(brick.y > 30 && brick.y + brick.h < game.paddleY - 20);
        assert(brick.hp > 0);
      }
    }
    game.level = 32; game.prepareLevel(); assert(game.boss); assert.equal(game.bricks.length, 0);
  });
  test(`${name}: fast collisions, paddle steering and pause`, () => {
    const game = fresh(factory, geometry), brick = game.bricks.find(b => b.type === 'r');
    game.bricks = [brick, {...brick, x: game.width - game.wall - brick.w - 5}];
    game.speed = 1600;
    Object.assign(game.balls[0], {x: brick.x + brick.w / 2, y: brick.y + 60, vx: 0, vy: -1600});
    game.update(.06); assert.equal(brick.alive, false);
    game.pause(); const snapshot = JSON.stringify(game.balls); game.update(.5); assert.equal(JSON.stringify(game.balls), snapshot);
    game.pause(); assert.equal(game.phase, 'playing');
    for (const offset of [-.8, 0, .8]) {
      const e = fresh(factory, geometry); e.bricks = []; e.enemyTimer = 1000;
      Object.assign(e.balls[0], {x: e.paddle.x + e.paddle.width / 2 * offset, y: e.paddleY - e.balls[0].r - 1, vx: 0, vy: e.speed});
      e.update(.025); assert(e.balls[0].vy < 0);
      if (offset) assert.equal(Math.sign(e.balls[0].vx), Math.sign(offset));
    }
  });
  test(`${name}: seven bonuses, catch, laser and gate`, () => {
    const game = fresh(factory, geometry), width = game.paddle.width;
    game.applyPower('E'); assert(game.paddle.width > width);
    game.applyPower('L'); game.fire(); assert.equal(game.lasers.length, 2);
    const brick = game.bricks.find(b => b.type === 'r');
    game.lasers = [{x: brick.x + brick.w / 2, y: brick.y + brick.h + 2, alive: true}];
    game.update(1 / 120); assert.equal(brick.alive, false);
    game.applyPower('C');
    Object.assign(game.balls[0], {x: game.paddle.x, y: game.paddleY - game.balls[0].r - 1, vx: 0, vy: game.speed});
    game.update(.025); assert(game.balls[0].attached); game.launch(); assert(!game.balls[0].attached);
    game.applyPower('D'); assert.equal(game.balls.length, 3);
    const speed = game.speed; game.applyPower('S'); assert(game.speed < speed);
    const lives = game.lives; game.applyPower('P'); assert.equal(game.lives, lives + 1);
    game.applyPower('B'); game.moveTo(game.width * 2);
    for (let i = 0; i < 120 && game.phase === 'playing'; i++) game.update(1 / 120);
    assert.equal(game.phase, 'clear');
  });
  test(`${name}: multiball, game over, restart and victory`, () => {
    const game = fresh(factory, geometry); game.applyPower('D');
    game.balls[0].y = game.height + 100; game.update(1 / 120);
    assert.equal(game.balls.length, 2); assert.equal(game.lives, 3);
    for (let miss = 0; miss < 3; miss++) {
      for (const ball of game.balls) ball.y = game.height + 100;
      game.update(1 / 120); game.update(2); if (miss < 2) game.launch();
    }
    assert.equal(game.phase, 'gameover'); game.start(); assert.equal(game.score, 0); assert.equal(game.lives, 3);
    game.level = 32; game.prepareLevel(); game.launch(); game.boss.timer = 0;
    game.update(1 / 120); assert.equal(game.bullets.length, 2);
    while (game.boss.hp > 0) { game.boss.flash = 0; game.hitBoss(); }
    assert.equal(game.phase, 'clear'); game.update(3); assert.equal(game.phase, 'won');
  });
  test(`${name}: three minutes of rallies stay finite`, () => {
    const game = fresh(factory, geometry);
    for (let i = 0; i < 120 * 180; i++) {
      if (game.phase === 'ready') game.launch(); if (game.phase === 'gameover') game.start();
      if (game.balls[0]) game.moveTo(game.balls[0].x + Math.sin(i * .003) * 13);
      game.update(1 / 120);
      for (const ball of game.balls) {
        assert(Number.isFinite(ball.x) && Number.isFinite(ball.y));
        assert(Math.hypot(ball.vx, ball.vy) < 1000);
      }
    }
    assert(game.score > 500);
  });
}

test('Neon combo increases points, expires and resets between rounds', () => {
  const game = fresh(() => new HorizonEngine(() => {}, () => .5), {});
  const bricks = game.bricks.filter(b => b.type === 'r').slice(0, 8);
  for (const brick of bricks) game.hitBrick(brick);
  assert.equal(game.combo, 8); assert(game.score > bricks.reduce((sum, b) => sum + b.points, 0));
  game.balls[0].attached = true;
  for (let i = 0; i < 500; i++) game.update(1 / 120);
  assert.equal(game.combo, 0);
  game.combo = 8; game.comboTime = 4; game.prepareLevel(); assert.equal(game.combo, 0);
});
test('Overdrive pierces normal and reinforced bricks but reflects from gold', () => {
  for (const type of ['r', 's', 'x']) {
    const game = fresh(() => new HorizonEngine(() => {}, () => .5), {});
    const brick = type === 'x' ? createLevel(4).find(b => b.type === 'x') : game.bricks.find(b => b.type === type);
    brick.x = 300; brick.y = 260;
    game.bricks = [brick, {...brick, id: 999, type: 'r', x: 600, y: 150, hp: 1}];
    game.energy = 99; assert.equal(game.activateBoost(), false);
    game.energy = 100; assert(game.activateBoost()); assert.equal(game.energy, 0);
    const ball = game.balls[0]; Object.assign(ball, {x: brick.x + brick.w / 2, y: brick.y + brick.h + 8, vx: 0, vy: -game.speed});
    for (let i = 0; i < 5; i++) game.update(1 / 120);
    assert.equal(brick.alive, type === 'x'); assert.equal(Math.sign(ball.vy), type === 'x' ? 1 : -1);
  }
});
test('Orientation preserves damage, bonuses and score; active play pauses', () => {
  const game = fresh(() => new HorizonEngine(() => {}, () => .5), {});
  game.hitBrick(game.bricks.find(b => b.type === 's')); game.hitBrick(game.bricks.find(b => b.type === 'r'));
  game.applyPower('E'); game.applyPower('D'); game.moveTo(950); game.update(.1);
  const damage = game.bricks.map(b => [b.hp, b.alive]), score = game.score, lives = game.lives;
  for (const portrait of [true, false, true]) {
    assert(game.resizeArena(portrait)); assert.equal(game.phase, 'paused');
    assert.deepEqual(game.bricks.map(b => [b.hp, b.alive]), damage);
    assert.equal(game.score, score); assert.equal(game.lives, lives); assert.equal(game.balls.length, 3);
    assert(game.paddle.x + game.paddle.width / 2 <= game.width - game.wall);
    for (const ball of game.balls) assert(ball.x >= game.wall && ball.x <= game.width - game.wall);
  }
});
test('Pausing during level/life transitions freezes the transition timer', () => {
  const game = fresh(() => new HorizonEngine(), {});
  for (const phase of ['lost', 'clear']) {
    game.phase = phase; game.transition = 2; game.pause(); game.update(5);
    assert.equal(game.transition, 2); game.pause(); assert.equal(game.phase, phase);
  }
});
test('Native 4K, retina desktop and mobile pixel density respect quality budgets', () => {
  assert.deepEqual(resolution(3840, 2160, 1), {width: 3840, height: 2160, ratio: 1});
  assert.deepEqual(resolution(1920, 1080, 2), {width: 3840, height: 2160, ratio: 2});
  assert.deepEqual(resolution(390, 585, 3), {width: 1170, height: 1755, ratio: 3});
  const large = resolution(3840, 2160, 2); assert(large.width * large.height <= 16505000);
  assert.equal(resolution(390, 585, 3, 'low').ratio, 1.5); assert.equal(SECTORS.length, 33);
});
