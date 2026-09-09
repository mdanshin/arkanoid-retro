import {HorizonEngine, clamp} from './modern-engine.js';
import {NeonRenderer} from './neon-renderer.js';
import {HorizonAudio} from './modern-audio.js';
import {SECTORS, POWERUPS} from './modern-levels.js';

const $ = id => document.getElementById(id);
const storage = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private mode remains playable. */ } }
};
const saved = storage.read('arkanoid-neon-settings', {});
const volume = (name, fallback) => Number.isFinite(saved?.[name]) ? clamp(saved[name], 0, 1) : fallback;
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const settings = {
  master: volume('master', .65), music: volume('music', .6), effects: volume('effects', .8),
  quality: ['auto', 'ultra', 'balanced', 'low'].includes(saved?.quality) ? saved.quality : 'auto',
  motion: saved?.motion !== false, haptics: saved?.haptics === true, reduced: motionQuery.matches
};
let record = Number(storage.read('arkanoid-neon-high-score', 0));
if (!Number.isFinite(record) || record < 0) record = 0;
const canvas = $('neon-canvas'), viewport = $('arena-viewport'), container = $('arena-container');
const dialog = $('settings-dialog'), startButton = $('neon-start');
const audio = new HorizonAudio(settings);
// The legend and falling capsules use the same source of truth for symbols.
for (const module of document.querySelectorAll('[data-power]')) {
  const power = POWERUPS[module.dataset.power];
  if (power) module.querySelector('.module-icon').textContent = power.icon;
}
let game, renderer, dirty = true, toastTimer, recordTimer, lastHaptic = 0, lastPhase = '', settingsResume = false;
const isPortrait = () => innerWidth < 700 && innerHeight > innerWidth;
function toast(message) {
  $('arena-toast').textContent = message; $('arena-toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('arena-toast').classList.remove('visible'), 2400);
}
game = new HorizonEngine((type, data) => {
  if (type === 'sound') audio.sfx(data.name, data.variant, data.pan);
  if (type === 'toast') toast(data.text);
  if (type === 'impact' && settings.haptics && navigator.vibrate && performance.now() - lastHaptic > 80) {
    navigator.vibrate(data.power > .5 ? 9 : 5); lastHaptic = performance.now();
  }
  dirty = true;
}, Math.random, isPortrait());
renderer = new NeonRenderer(canvas, game, settings);
const number = value => Math.floor(value).toLocaleString('ru-RU');
const qualityNames = {ultra: 'ULTRA', balanced: 'БАЛАНС', low: 'ЭКО'};
let autoQuality = matchMedia('(pointer: coarse)').matches && (navigator.hardwareConcurrency || 8) <= 4 ? 'balanced' : 'ultra';
let quality = settings.quality === 'auto' ? autoQuality : settings.quality;
let fitRequest = 0, lastDpr = devicePixelRatio || 1;

function resetInput() {
  game.keys.left = false; game.keys.right = false; game.keys.fire = false;
  keyboardFire = false; firePointers.clear(); drag = null;
}
function fitArena() {
  fitRequest = 0;
  const changed = game.resizeArena(isPortrait());
  if (changed) { resetInput(); dirty = true; }
  const top = container.getBoundingClientRect().top;
  const chrome = document.querySelector('.arena-toolbar').getBoundingClientRect().height
    + document.querySelector('.mobile-console').getBoundingClientRect().height
    + document.querySelector('.game-footer').getBoundingClientRect().height + 18;
  const available = Math.max(game.portrait ? 280 : 130, (globalThis.visualViewport?.height || innerHeight) - top - chrome);
  const width = Math.min(container.clientWidth, available * game.width / game.height);
  viewport.style.width = `${Math.round(width)}px`;
  viewport.style.aspectRatio = `${game.width} / ${game.height}`;
  quality = settings.quality === 'auto' ? autoQuality : settings.quality;
  renderer.resize(quality);
  const res = canvas.width >= 3200 || canvas.height >= 2100 ? ' · 4K' : '';
  $('renderer-badge').textContent = qualityNames[quality] + res;
  lastDpr = devicePixelRatio || 1;
}
function requestFit() { if (!fitRequest) fitRequest = requestAnimationFrame(fitArena); }
new ResizeObserver(requestFit).observe(container);
addEventListener('resize', requestFit);
globalThis.visualViewport?.addEventListener('resize', requestFit);
document.addEventListener('fullscreenchange', requestFit);
motionQuery.addEventListener('change', event => { settings.reduced = event.matches; });

function sync() {
  const sector = SECTORS[game.level];
  $('neon-score').textContent = number(game.score);
  if (game.score > record) {
    record = game.score; clearTimeout(recordTimer);
    recordTimer = setTimeout(() => storage.write('arkanoid-neon-high-score', record), 700);
  }
  $('neon-record').textContent = number(record);
  const multiplier = Math.min(8, 1 + Math.floor(game.combo / 4));
  $('neon-combo').textContent = `×${multiplier}`;
  $('combo-meter').style.width = `${game.comboTime / 4 * 100}%`;
  const remaining = game.bricks.filter(brick => brick.alive && brick.type !== 'x').length;
  const progress = game.boss ? 1 - game.boss.hp / game.boss.maxHp : game.total ? 1 - remaining / game.total : 0;
  $('sector-number').textContent = String(game.level + 1).padStart(2, '0');
  $('sector-title').textContent = sector[0]; $('sector-description').textContent = sector[2];
  $('arena-name').textContent = `${String(game.level + 1).padStart(2, '0')} · ${sector[1].toUpperCase()}`;
  $('remaining-blocks').textContent = game.boss ? `ЯДРО · ${game.boss.hp} / ${game.boss.maxHp}` : `БЛОКИ · ${remaining}`;
  $('sector-progress').style.width = `${progress * 100}%`; $('progress-value').textContent = `${Math.round(progress * 100)}%`;
  const lives = $('neon-lives');
  if (lives.dataset.count !== String(game.lives)) {
    lives.dataset.count = game.lives; lives.replaceChildren();
    for (let i = 0; i < Math.max(3, Math.min(5, game.lives)); i++) {
      const cell = document.createElement('i'); cell.className = `life-cell${i < game.lives ? '' : ' empty'}`;
      lives.append(cell);
    }
    if (game.lives > 5) { const extra = document.createElement('small'); extra.textContent = `+${game.lives - 5}`; lives.append(extra); }
    lives.setAttribute('aria-label', `Жизни: ${game.lives}`);
  }
  const boostReady = game.energy >= 100 && game.phase === 'playing' && game.boostTime <= 0;
  $('boost-button').disabled = $('touch-boost').disabled = !boostReady;
  const energy = game.boostTime > 0 ? game.boostTime / 7 * 100 : game.energy;
  $('energy-fill').style.width = `${energy}%`;
  $('energy-value').textContent = game.boostTime > 0 ? `${game.boostTime.toFixed(1)}с` : `${Math.floor(game.energy)}%`;
  $('boost-label').textContent = game.boostTime > 0 ? 'OVERDRIVE АКТИВЕН' : boostReady ? 'АКТИВИРОВАТЬ' : 'НАКОПЛЕНИЕ ЭНЕРГИИ';
  $('touch-boost').style.setProperty('--charge', `${energy}%`);
  $('touch-boost').setAttribute('aria-label', boostReady ? 'Включить Overdrive' : `Энергия: ${Math.floor(energy)}%`);
  const active = new Set([game.paddle.mode]);
  if (game.balls.length > 1) active.add('D'); if (game.slow) active.add('S'); if (game.gate) active.add('B');
  for (const module of document.querySelectorAll('[data-power]')) module.classList.toggle('active', active.has(module.dataset.power));
  $('module-state').textContent = [...active].some(Boolean) ? 'АКТИВНЫ' : 'ОЖИДАНИЕ';
  $('pause-game').disabled = !['ready', 'playing', 'paused', 'clear', 'lost'].includes(game.phase);
  $('pause-game').querySelector('span').textContent = game.phase === 'paused' ? 'Продолжить' : 'Пауза';
  $('ready-prompt').hidden = game.phase !== 'ready';
  $('ready-chapter').textContent = `СЕКТОР ${String(game.level + 1).padStart(2, '0')}`;
  $('ready-name').textContent = sector[0];
  $('round-banner').hidden = !['clear', 'lost'].includes(game.phase);
  if (game.phase === 'clear') {
    $('banner-kicker').textContent = game.level === 32 ? 'МИССИЯ ВЫПОЛНЕНА' : 'СЕКТОР ЗАЧИЩЕН';
    $('banner-title').textContent = game.level === 32 ? 'Горизонт открыт.' : 'Прекрасная работа.';
    $('banner-score').textContent = `БОНУС +${number(1000 * (game.level + 1))}`;
  } else if (game.phase === 'lost') {
    $('banner-kicker').textContent = 'КОРПУС ПОВРЕЖДЁН'; $('banner-title').textContent = game.lives ? 'Возвращаемся в строй.' : 'Сигнал потерян.';
    $('banner-score').textContent = game.lives ? `ОСТАЛОСЬ ЖИЗНЕЙ: ${game.lives}` : 'ПОЛЁТ ЗАВЕРШЁН';
  }
  const overlay = ['menu', 'paused', 'gameover', 'won'].includes(game.phase);
  $('neon-overlay').hidden = !overlay;
  if (game.phase !== lastPhase) {
    if (overlay && game.phase !== 'menu') {
      const paused = game.phase === 'paused', won = game.phase === 'won';
      $('overlay-eyeline').textContent = paused ? 'ВСЕЛЕННАЯ ПОДОЖДЁТ' : won ? 'ВСЕ 33 СЕКТОРА ПРОЙДЕНЫ' : 'КАЖДЫЙ ПОЛЁТ — НОВЫЙ РЕКОРД';
      $('overlay-heading').textContent = paused ? 'ПАУЗА' : won ? 'ЗА ГОРИЗОНТОМ' : 'ПОЛЁТ ЗАВЕРШЁН';
      $('overlay-description').textContent = paused ? 'Сделайте вдох. Продолжим, когда будете готовы.' : `Ваш счёт: ${number(game.score)} · Рекорд: ${number(record)}`;
      $('neon-start-label').textContent = paused ? 'ПРОДОЛЖИТЬ' : 'НОВЫЙ ПОЛЁТ';
    }
    if (overlay && game.phase !== 'menu' && !dialog.open && !document.hidden) startButton.focus({preventScroll: true});
    lastPhase = game.phase;
  }
  const musical = ['ready', 'playing', 'clear'].includes(game.phase) && !document.hidden && !dialog.open;
  audio.setPlaying(musical); audio.setIntensity(game.boostTime > 0, game.combo, game.level);
  $('music-bars').classList.toggle('playing', musical && settings.music > 0 && settings.master > 0 && audio.ctx?.state === 'running');
  $('music-shortcut').setAttribute('aria-pressed', String(settings.music > 0));
  $('music-title').textContent = settings.music === 0 ? 'Музыка выключена' : game.level === 32 ? 'Beyond the Horizon · Finale' : 'Beyond the Horizon';
  dirty = false;
}

let audioNotice = false, starting = false;
async function unlockAudio() {
  const ok = await audio.unlock();
  if (!ok && !audioNotice) { audioNotice = true; toast('Звук недоступен в этом браузере'); }
  return ok;
}
async function primary() {
  if (dialog.open || starting) return;
  starting = true;
  try {
    await unlockAudio();
    if (document.hidden || dialog.open) return;
    if (['menu', 'gameover', 'won'].includes(game.phase)) game.start();
    else if (game.phase === 'paused') game.pause();
    else game.launch();
    canvas.focus({preventScroll: true}); dirty = true;
  } finally { starting = false; }
}
function pause() {
  resetInput(); game.pause();
  if (game.phase !== 'paused') { unlockAudio(); canvas.focus({preventScroll: true}); }
  dirty = true; sync();
}
function restart() {
  if (dialog.open) return;
  resetInput(); unlockAudio(); game.start(); canvas.focus({preventScroll: true}); dirty = true;
}
function boost() { unlockAudio(); if (game.activateBoost()) dirty = true; }
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('game-app').requestFullscreen) await $('game-app').requestFullscreen();
    else toast('Используйте полноэкранный режим браузера');
  } catch { toast('Полноэкранный режим сейчас недоступен'); }
}
startButton.addEventListener('click', primary);
$('pause-game').addEventListener('click', pause); $('restart-game').addEventListener('click', restart);
$('fullscreen').addEventListener('click', fullscreen);
$('boost-button').addEventListener('click', boost); $('touch-boost').addEventListener('click', boost);

let keyboardFire = false, drag = null, mouseControl = false;
const firePointers = new Set();
function updateFire() { game.keys.fire = keyboardFire || firePointers.size > 0; }
function position(clientX) {
  const rect = canvas.getBoundingClientRect(); game.moveTo((clientX - rect.left) / rect.width * game.width);
}
canvas.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') { mouseControl = true; position(event.clientX); }
});
addEventListener('pointermove', event => {
  if (dialog.open || !['playing', 'ready'].includes(game.phase)) return;
  if (event.pointerType === 'mouse' && mouseControl) position(event.clientX);
  else if (drag?.id === event.pointerId && drag.surface === canvas) {
    game.moveTo(drag.target + (event.clientX - drag.startX) / canvas.getBoundingClientRect().width * game.width);
    drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
  }
});
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || dialog.open) return;
  event.preventDefault(); canvas.focus({preventScroll: true}); canvas.setPointerCapture(event.pointerId);
  unlockAudio();
  if (event.pointerType === 'mouse') { mouseControl = true; position(event.clientX); firePointers.add(event.pointerId); updateFire(); primary(); }
  else drag = {id: event.pointerId, surface: canvas, startX: event.clientX, target: game.paddle.target, moved: 0};
});
const touchZone = $('touch-zone');
touchZone.addEventListener('pointerdown', event => {
  event.preventDefault(); touchZone.setPointerCapture(event.pointerId); unlockAudio();
  drag = {id: event.pointerId, surface: touchZone, startX: event.clientX, target: game.paddle.target, moved: 0};
});
touchZone.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId || drag.surface !== touchZone) return;
  game.moveTo(drag.target + (event.clientX - drag.startX) / touchZone.clientWidth * game.width);
  drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
});
$('touch-fire').addEventListener('pointerdown', event => {
  event.preventDefault(); $('touch-fire').setPointerCapture(event.pointerId);
  firePointers.add(event.pointerId); updateFire(); primary();
});
function releasePointer(event) {
  firePointers.delete(event.pointerId); updateFire();
  if (drag?.id === event.pointerId) {
    if (event.type === 'pointerup' && drag.moved < 9) primary();
    drag = null;
  }
}
addEventListener('pointerup', releasePointer); addEventListener('pointercancel', releasePointer);
for (const element of [canvas, touchZone, $('touch-fire')]) element.addEventListener('lostpointercapture', releasePointer);
$('touch-fire').addEventListener('click', event => { if (event.detail === 0) primary(); });

document.addEventListener('keydown', event => {
  if (dialog.open || event.ctrlKey || event.altKey || event.metaKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (['BUTTON', 'A'].includes(event.target.tagName) && ['Enter', 'Space'].includes(event.code)) return;
  if (['ArrowLeft', 'KeyA'].includes(event.code)) { event.preventDefault(); game.keys.left = true; }
  else if (['ArrowRight', 'KeyD'].includes(event.code)) { event.preventDefault(); game.keys.right = true; }
  else if (['Space', 'Enter'].includes(event.code)) {
    event.preventDefault(); keyboardFire = true; updateFire(); if (!event.repeat) primary();
  } else if (!event.repeat) {
    if (['KeyP', 'Escape'].includes(event.code)) { event.preventDefault(); pause(); }
    if (event.code === 'KeyR') restart();
    if (event.code === 'KeyF') fullscreen();
    if (event.code === 'KeyM') toggleMusic();
    if (['ShiftLeft', 'ShiftRight'].includes(event.code)) { event.preventDefault(); boost(); }
  }
});
document.addEventListener('keyup', event => {
  if (['ArrowLeft', 'KeyA'].includes(event.code)) game.keys.left = false;
  if (['ArrowRight', 'KeyD'].includes(event.code)) game.keys.right = false;
  if (['Space', 'Enter'].includes(event.code)) { keyboardFire = false; updateFire(); }
});
function background() {
  resetInput();
  if (['ready', 'playing', 'lost', 'clear'].includes(game.phase)) game.pause();
  settingsResume = false; audio.suspend();
  storage.write('arkanoid-neon-high-score', record); dirty = true;
}
addEventListener('blur', background); addEventListener('pagehide', background);
document.addEventListener('visibilitychange', () => { if (document.hidden) background(); });

function persistSettings() { storage.write('arkanoid-neon-settings', settings); audio.updateMix(settings); dirty = true; }
let musicBeforeMute = settings.music || .6;
function toggleMusic() {
  if (settings.music > 0) { musicBeforeMute = settings.music; settings.music = 0; }
  else settings.music = musicBeforeMute;
  updateSettingsForm(); persistSettings(); unlockAudio();
}
$('music-shortcut').addEventListener('click', toggleMusic);
function updateSettingsForm() {
  for (const name of ['master', 'music', 'effects']) {
    $(`${name}-volume`).value = Math.round(settings[name] * 100);
    $(`${name}-output`).textContent = `${Math.round(settings[name] * 100)}%`;
  }
  $('graphics-quality').value = settings.quality;
  $('camera-motion').checked = settings.motion; $('haptics').checked = settings.haptics;
}
for (const name of ['master', 'music', 'effects']) {
  $(`${name}-volume`).addEventListener('input', event => {
    settings[name] = Number(event.target.value) / 100;
    $(`${name}-output`).textContent = `${event.target.value}%`; persistSettings();
  });
  $(`${name}-volume`).addEventListener('change', async () => { await unlockAudio(); if (name !== 'music') audio.sfx('paddle'); });
}
$('graphics-quality').addEventListener('change', event => {
  settings.quality = event.target.value; autoQuality = 'ultra'; slowSeconds = 0; persistSettings(); requestFit();
});
$('camera-motion').addEventListener('change', event => { settings.motion = event.target.checked; persistSettings(); });
$('haptics').addEventListener('change', event => { settings.haptics = event.target.checked; persistSettings(); if (settings.haptics) navigator.vibrate?.(15); });
$('open-settings').addEventListener('click', () => {
  settingsResume = ['ready', 'playing', 'clear', 'lost'].includes(game.phase);
  resetInput(); if (settingsResume) game.pause(); audio.setPlaying(false);
  updateSettingsForm(); dialog.showModal(); dirty = true;
});
for (const id of ['close-settings', 'save-settings']) $(id).addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => {
  if (settingsResume && game.phase === 'paused' && !document.hidden) { game.pause(); unlockAudio(); }
  settingsResume = false; canvas.focus({preventScroll: true}); dirty = true;
});

// Fixed simulation keeps bounce behaviour identical on 60, 120 and 144 Hz screens.
let previous = performance.now(), accumulator = 0, uiTime = 0, measureTime = 0, measuredFrames = 0, slowSeconds = 0;
function frame(now) {
  const elapsed = Math.min(.1, Math.max(0, (now - previous) / 1000)); previous = now;
  if (!document.hidden) {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= 1 / 120 && steps < 12) { game.update(1 / 120); accumulator -= 1 / 120; steps++; }
    renderer.draw(elapsed);
    uiTime += elapsed; measureTime += elapsed; measuredFrames++;
    if (dirty || uiTime > .1) { sync(); uiTime = 0; }
    if (measureTime >= 2) {
      const fps = measuredFrames / measureTime;
      if (settings.quality === 'auto' && fps < 43 && game.phase === 'playing') slowSeconds += measureTime;
      else slowSeconds = Math.max(0, slowSeconds - 1);
      if (slowSeconds > 5 && autoQuality !== 'low') {
        autoQuality = autoQuality === 'ultra' ? 'balanced' : 'low'; slowSeconds = 0; requestFit();
      }
      if (lastDpr !== (devicePixelRatio || 1)) requestFit();
      $('performance-label').textContent = game.boostTime > 0 ? 'OVERDRIVE ONLINE' : 'ПОЛЁТ БЕЗ ГРАНИЦ';
      measureTime = 0; measuredFrames = 0;
    }
  } else accumulator = 0;
  requestAnimationFrame(frame);
}
updateSettingsForm();
if (new URLSearchParams(location.search).get('play') === '1') game.start();
fitArena(); sync(); requestAnimationFrame(frame);
