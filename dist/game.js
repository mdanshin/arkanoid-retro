import {Engine,WIDTH,HEIGHT,WALL,PADDLE_Y,clamp} from './engine.js';
import {ArcadeAudio} from './audio.js';
import {BACKGROUNDS,POWERUPS} from './levels.js';
import {pixelText} from './font.js';

const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
let settings={sfx:true,music:true,volume:.55,crt:true},highScore=0;
try {settings={...settings,...JSON.parse(localStorage.getItem('arkanoid-settings')||'{}')};highScore=Number(localStorage.getItem('arkanoid-high-score'))||0;}catch{}
settings.volume=clamp(Number(settings.volume)||0,0,1);
const audio=new ArcadeAudio(settings);
let readySound=false,toastTimer=0,lastPhase='menu',lastScore=-1,lastHigh=-1,activePointer=null,pointerStart=null;
const game=new Engine(handleEvent);
let background=null,backgroundLevel=-1;
function persist(){try{localStorage.setItem('arkanoid-settings',JSON.stringify(settings));localStorage.setItem('arkanoid-high-score',String(highScore));}catch{}}
function handleEvent(type,data){
  if(type==='sound')audio.effect(data.name,data.variant);
  if(type==='toast'){ $('game-toast').textContent=data.text;$('game-toast').classList.add('visible');toastTimer=2.5; }
}
function updateSoundUI(){
  $('sfx-toggle').setAttribute('aria-checked',String(settings.sfx));$('music-toggle').setAttribute('aria-checked',String(settings.music));
  $('crt-toggle').setAttribute('aria-checked',String(settings.crt));document.body.classList.toggle('crt-off',!settings.crt);
  $('volume').value=Math.round(settings.volume*100);$('volume-value').value=Math.round(settings.volume*100)+'%';
  const playing=audio.running && settings.volume>0;
  $('equalizer').classList.toggle('playing',playing);$('track-dot').classList.toggle('playing',playing);
  $('track-label').textContent=!readySound?'ГОТОВ К ВОСПРОИЗВЕДЕНИЮ':playing?'NOW PLAYING · ORBITAL RUN':!settings.music?'МУЗЫКА ВЫКЛЮЧЕНА':'МУЗЫКА НА ПАУЗЕ';
}
async function unlockAudio(){readySound=await audio.unlock();audio.sfx=settings.sfx;audio.music=settings.music;if(['playing','ready'].includes(game.phase))audio.start(game.level);updateSoundUI();}
function newGame(){const hadAudio=readySound;game.start();$('overlay').hidden=true;lastPhase='';canvas.focus({preventScroll:true});unlockAudio().then(()=>{if(!hadAudio)audio.effect('start');});}
function primaryAction(){
  if(['menu','gameover','won'].includes(game.phase)){newGame();return;}
  if(game.phase==='paused'){game.pause();canvas.focus({preventScroll:true});unlockAudio();return;}
  if(['ready','playing'].includes(game.phase)){game.launch();unlockAudio();}
}
function syncUI(){
  if(game.score>highScore){highScore=game.score;persist();}
  if(lastScore!==game.score){$('score').textContent=String(game.score).padStart(6,'0');lastScore=game.score;}
  if(lastHigh!==highScore){$('high-score').textContent=String(highScore).padStart(6,'0');lastHigh=highScore;}
  $('round').innerHTML=String(game.level+1).padStart(2,'0')+'<span> / 33</span>';
  const lifeCount=Math.min(7,game.lives);
  if($('lives').dataset.count!==String(game.lives)){$('lives').innerHTML='<span class="mini-paddle"></span>'.repeat(lifeCount)+(game.lives>7?'<span>+'+(game.lives-7)+'</span>':'');$('lives').dataset.count=String(game.lives);$('lives').setAttribute('aria-label',game.lives+' жизней');}
  const power=game.paddle.mode;
  $('active-power').textContent=game.gate?'ВЫХОД СПРАВА →':power==='E'?'EXPAND / ШИРОКАЯ':power==='L'?'LASER / ЛАЗЕР':power==='C'?'CATCH / ЗАХВАТ':game.balls.length>1?'DISRUPT / ТРИ МЯЧА':game.slow?'SLOW / ЗАМЕДЛЕНИЕ':game.phase==='playing'?'VAUS В ПОЛЁТЕ':'VAUS ГОТОВ';
  $('power-light').classList.toggle('active',!!power||game.gate||game.balls.length>1||game.slow);
  if(lastPhase===game.phase)return;
  lastPhase=game.phase;
  const paused=game.phase==='paused';
  $('pause-button').disabled=!['ready','playing','paused'].includes(game.phase);
  $('pause-button').querySelector('span').textContent=paused?'Продолжить':'Пауза';
  if(['ready','playing'].includes(game.phase)){if(readySound)audio.start(game.level);}else audio.stop(['gameover','won'].includes(game.phase));
  updateSoundUI();
  const overlay=$('overlay');
  overlay.hidden=!['menu','paused','gameover','won'].includes(game.phase);
  if(game.phase==='paused')setOverlay('ТАЙМ-АУТ','ПАУЗА','Автомат подождёт.<br>Возвращайтесь в игру.','ПРОДОЛЖИТЬ','P или пробел — продолжить');
  if(game.phase==='gameover')setOverlay('GAME OVER','ЕЩЁ РАЗ?','Ваш счёт: <strong>'+String(game.score).padStart(6,'0')+'</strong><br>Пройдено раундов: '+game.level,'ИГРАТЬ СНОВА','Рекорд сохранён в этом браузере');
  if(game.phase==='won')setOverlay('MISSION COMPLETE','ПОБЕДА!','DOH повержен. Все 33 раунда пройдены.<br>Ваш счёт: <strong>'+String(game.score).padStart(6,'0')+'</strong>','ЕЩЁ ОДНА ИГРА','Вы — легенда этого автомата.');
  if(!overlay.hidden && game.phase!=='menu')$('start-button').focus({preventScroll:true});
}
function setOverlay(kicker,title,text,button,hint){$('overlay-kicker').textContent=kicker;$('overlay-title').textContent=title;$('overlay-text').innerHTML=text;$('start-label').textContent=button;$('overlay-hint').textContent=hint;}
function makeBackground(){
  backgroundLevel=game.level;const colors=BACKGROUNDS[Math.floor(game.level/2)%BACKGROUNDS.length];
  background=document.createElement('canvas');background.width=WIDTH;background.height=HEIGHT;const c=background.getContext('2d');
  c.fillStyle=colors.base;c.fillRect(0,0,WIDTH,HEIGHT);
  c.save();c.beginPath();c.rect(WALL,26,WIDTH-WALL*2,HEIGHT-26);c.clip();
  if(game.level%4<2){
    for(let y=20;y<HEIGHT;y+=32)for(let x=12-(Math.floor(y/32)%2)*16;x<WIDTH;x+=32){
      c.fillStyle=colors.edge;c.fillRect(x,y,29,1);c.fillRect(x,y,1,29);
      c.fillStyle=colors.tile;c.fillRect(x+2,y+2,26,26);c.fillStyle=colors.base;c.fillRect(x+5,y+5,20,20);
      c.fillStyle=colors.tile;c.fillRect(x+12,y+12,6,6);
    }
  }else{
    for(let y=28;y<HEIGHT;y+=30)for(let x=21;x<WIDTH;x+=30){c.strokeStyle=colors.tile;c.lineWidth=2;c.strokeRect(x+4,y+4,21,21);c.fillStyle=colors.edge;c.fillRect(x+13,y+13,3,3);}
  }
  c.restore();
  // Metallic perimeter and the two enemy hatches.
  c.fillStyle='#040a10';c.fillRect(0,0,WIDTH,26);c.fillRect(0,0,20,HEIGHT);c.fillRect(460,0,20,HEIGHT);
  const steel=c.createLinearGradient(0,0,20,0);steel.addColorStop(0,'#273c46');steel.addColorStop(.23,'#c5d0bf');steel.addColorStop(.46,'#839aaa');steel.addColorStop(.68,'#dce1ce');steel.addColorStop(.83,'#5e7c88');steel.addColorStop(1,'#253f54');
  for(const x of [4,462]){c.save();c.translate(x-4,0);c.fillStyle=steel;c.fillRect(4,8,14,HEIGHT-8);c.restore();for(let y=42;y<HEIGHT;y+=70){c.fillStyle='#152536';c.fillRect(x,y,14,5);c.fillStyle='#d4e0d3';c.fillRect(x+2,y+6,10,2);c.fillStyle='#ae5146';c.fillRect(x+3,y+10,8,9);c.fillStyle='#ee9174';c.fillRect(x+4,y+10,6,2);}}
  const top=c.createLinearGradient(0,5,0,25);top.addColorStop(0,'#b5c3b8');top.addColorStop(.3,'#7893a2');top.addColorStop(.6,'#d2d9c9');top.addColorStop(1,'#304b5c');c.fillStyle=top;c.fillRect(18,8,444,14);
  for(const x of [72,370]){c.fillStyle='#09101a';c.fillRect(x,6,38,18);c.fillStyle='#80999a';c.fillRect(x+2,8,34,5);c.fillStyle='#a9b7ab';for(let xx=x+3;xx<x+35;xx+=5)c.fillRect(xx,9,2,3);c.fillStyle='#a76548';c.fillRect(x+12,18,14,3);}
  c.fillStyle='#02050aaa';c.fillRect(20,HEIGHT-22,440,22);c.fillStyle='#304655';c.fillRect(20,HEIGHT-23,440,1);
}
function drawBrick(b){
  const x=Math.round(b.x),y=Math.round(b.y);ctx.fillStyle='#02091099';ctx.fillRect(x+3,y+4,b.w,b.h);
  ctx.fillStyle=b.flash>0?'#fff6da':b.color;ctx.fillRect(x,y,b.w,b.h);
  ctx.fillStyle=b.light;ctx.fillRect(x,y,b.w,2);ctx.fillRect(x,y,2,b.h-2);
  ctx.fillStyle=b.dark;ctx.fillRect(x,y+b.h-3,b.w,3);ctx.fillRect(x+b.w-2,y+2,2,b.h-2);
  if(b.type==='s'||b.type==='x'){
    ctx.fillStyle=b.light;ctx.fillRect(x+4,y+4,7,2);ctx.fillRect(x+5,y+6,3,2);
    ctx.fillStyle=b.dark;ctx.fillRect(x+22,y+6,5,2);
    if(b.type==='s'&&b.hp<b.maxHp){ctx.fillStyle='#314854';ctx.fillRect(x+14,y+2,2,5);ctx.fillRect(x+12,y+7,2,4);ctx.fillRect(x+14,y+11,2,3);}
  }
}
function drawPaddle(x,y,width,mode=null,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;x=Math.round(x-width/2);y=Math.round(y);
  ctx.fillStyle='#02050b88';ctx.fillRect(x+3,y+6,width,11);
  ctx.fillStyle='#4c6e80';ctx.fillRect(x+8,y,width-16,13);ctx.fillStyle='#bed5d4';ctx.fillRect(x+9,y,width-18,4);ctx.fillStyle='#f6f4df';ctx.fillRect(x+11,y+1,width-22,2);
  ctx.fillStyle=mode==='C'?'#64d3a1':'#9ab9c8';ctx.fillRect(x+9,y+4,width-18,4);ctx.fillStyle='#d7e5e0';ctx.fillRect(x+9,y+9,width-18,2);
  for(const end of [x,x+width-13]){ctx.fillStyle=mode==='L'?'#dd4954':'#d94f46';ctx.fillRect(end,y+2,13,9);ctx.fillRect(end+3,y,7,13);ctx.fillStyle='#ffac91';ctx.fillRect(end+3,y+1,7,2);ctx.fillStyle='#8e2e39';ctx.fillRect(end+2,y+9,9,3);}
  ctx.fillStyle='#276a92';ctx.fillRect(x+width/2-7,y+4,14,5);ctx.fillStyle='#88e4e5';ctx.fillRect(x+width/2-5,y+4,10,2);
  if(mode==='L'){ctx.fillStyle='#bedede';ctx.fillRect(x+4,y-7,4,9);ctx.fillRect(x+width-8,y-7,4,9);ctx.fillStyle='#ff7562';ctx.fillRect(x+4,y-7,4,2);ctx.fillRect(x+width-8,y-7,4,2);}
  if(mode==='C'){ctx.fillStyle='#73ef9b';for(let xx=x+15;xx<x+width-14;xx+=7)ctx.fillRect(xx,y-2,4,2);}
  ctx.restore();
}
function drawBall(b){
  if(settings.crt)for(let i=b.trail.length-1;i>=0;i--){ctx.fillStyle=`rgba(154,211,224,${(.16-i*.025).toFixed(3)})`;ctx.fillRect(Math.round(b.trail[i].x)-2,Math.round(b.trail[i].y)-2,4,4);}
  const x=Math.round(b.x),y=Math.round(b.y);ctx.fillStyle='#3d6580';ctx.fillRect(x-3,y-2,7,7);ctx.fillStyle='#b0ced2';ctx.fillRect(x-3,y-3,6,6);ctx.fillStyle='#ffffed';ctx.fillRect(x-2,y-3,4,4);ctx.fillStyle='#fff';ctx.fillRect(x-1,y-2,2,2);
}
function drawCapsule(d){
  const p=POWERUPS[d.type],x=Math.round(d.x)-13,y=Math.round(d.y)-8;
  const shimmer=Math.floor(d.age*6)%4;
  ctx.fillStyle='#02091088';ctx.fillRect(x+2,y+3,27,16);
  ctx.fillStyle=p.color;ctx.fillRect(x+3,y,21,16);ctx.fillRect(x,y+3,27,10);
  ctx.fillStyle='#ffffff55';ctx.fillRect(x+4,y+1,19,2);ctx.fillRect(x+1,y+4,2,7);
  ctx.fillStyle='#0004';ctx.fillRect(x+4,y+13,19,2);ctx.fillRect(x+24,y+4,2,7);
  ctx.fillStyle='#fff2';ctx.fillRect(x+4,y+3+shimmer*2,19,2);
  pixelText(ctx,d.type,d.x,d.y-5,1.5,'#fff6e2','center');
}
function drawEnemy(e){
  const x=Math.round(e.x),y=Math.round(e.y),frame=Math.floor(e.age*6)%2;
  ctx.save();ctx.translate(x,y);
  if(e.kind===0){ctx.fillStyle='#9693c6';ctx.fillRect(-8,-7,16,14);ctx.fillRect(-11,-3,22,7);ctx.fillStyle='#d2cff7';ctx.fillRect(-5,-9,10,4);ctx.fillStyle='#4a447a';ctx.fillRect(-8,5,16,4);ctx.fillStyle='#fc8997';ctx.fillRect(-5,-1,3,3);ctx.fillRect(3,-1,3,3);ctx.fillStyle='#d2cff7';ctx.fillRect(-8-frame*2,9,4,3);ctx.fillRect(4+frame*2,9,4,3);}
  else if(e.kind===1){ctx.fillStyle='#d6905b';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(11,0);ctx.lineTo(0,12);ctx.lineTo(-11,0);ctx.fill();ctx.fillStyle='#ffe5ac';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,0);ctx.lineTo(0,4);ctx.lineTo(-6,0);ctx.fill();ctx.fillStyle='#824b40';ctx.fillRect(-2,3,4,6);}
  else{ctx.fillStyle='#9ebdaa';ctx.fillRect(-9,-5,18,11);ctx.fillRect(-5,-9,10,19);ctx.fillStyle='#ecdfad';ctx.fillRect(-5,-5,10,10);ctx.fillStyle='#4e695b';ctx.fillRect(-2,-2,4,4);ctx.fillStyle='#afc9c8';for(const side of [-1,1])ctx.fillRect(side*10-2,-6+frame*7,4,6);}
  ctx.restore();
}
function drawBoss(b){
  if(b.hp<=0)return;const x=b.x,y=b.y;
  // Pixel sculpture for the final round; the body itself is the collision target.
  ctx.save();ctx.translate(x,y);const base=b.flash>0?'#f6d2b5':'#95534e',light=b.flash>0?'#fff9dd':'#c97a68',dark='#4f2f37';
  ctx.fillStyle='#05080b66';ctx.fillRect(14,11,126,143);
  ctx.fillStyle=dark;ctx.fillRect(13,0,105,144);ctx.fillRect(0,16,132,111);
  ctx.fillStyle=base;ctx.fillRect(17,0,92,136);ctx.fillRect(6,16,115,95);
  ctx.fillStyle=light;ctx.fillRect(17,1,81,10);ctx.fillRect(9,17,12,80);ctx.fillRect(25,12,8,29);
  ctx.fillStyle='#b46658';ctx.fillRect(30,16,65,28);ctx.fillRect(30,104,66,16);
  ctx.fillStyle=dark;ctx.fillRect(19,42,37,22);ctx.fillRect(73,42,39,22);ctx.fillRect(34,64,18,12);ctx.fillRect(83,64,19,12);
  ctx.fillStyle='#e8a875';ctx.fillRect(25,47,25,5);ctx.fillRect(77,47,26,5);
  ctx.fillStyle=light;ctx.fillRect(57,36,18,50);ctx.fillRect(49,73,36,13);ctx.fillStyle=dark;ctx.fillRect(63,50,11,29);ctx.fillRect(50,86,35,6);
  ctx.fillStyle='#291e2b';ctx.fillRect(34,97,65,8);ctx.fillStyle=light;ctx.fillRect(34,94,62,3);ctx.fillRect(41,106,50,5);
  ctx.fillStyle='#773d42';ctx.fillRect(19,120,92,17);ctx.fillStyle=light;ctx.fillRect(25,137,82,5);ctx.restore();
  pixelText(ctx,'DOH',240,65,2,'#e8b08f','center');ctx.fillStyle='#07101b';ctx.fillRect(140,82,200,5);ctx.fillStyle='#cf695b';ctx.fillRect(140,82,200*b.hp/b.maxHp,5);
}
function drawGate(){if(!game.gate)return;ctx.fillStyle='#080b17';ctx.fillRect(459,PADDLE_Y-16,21,43);ctx.fillStyle='#ac85dc';ctx.fillRect(459,PADDLE_Y-18,21,3);ctx.fillRect(459,PADDLE_Y+28,21,3);if(Math.floor(game.time*3)%2===0){pixelText(ctx,'>',469,PADDLE_Y+1,1,'#eee','center');ctx.fillStyle='#ddbaee';ctx.fillRect(464,PADDLE_Y-5,9,2);}}
function draw(){
  if(!background || backgroundLevel!==game.level)makeBackground();
  ctx.drawImage(background,0,0);ctx.save();
  if(game.shake>0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)ctx.translate(Math.sin(game.time*83)*game.shake,Math.cos(game.time*91)*game.shake*.5);
  if(game.phase==='menu'){
    for(const b of game.bricks)drawBrick(b);
    const x=240+Math.sin(game.time*.8)*126;
    drawPaddle(x,PADDLE_Y,76);drawBall({x:240+Math.sin(game.time*1.3)*155,y:350+Math.cos(game.time*1.8)*103,trail:[]});
    pixelText(ctx,'1 PLAYER',240,51,1.5,'#9bb6c5','center');
  }else{
    for(const b of game.bricks)if(b.alive)drawBrick(b);
    if(game.boss)drawBoss(game.boss);
    for(const e of game.enemies)if(!e.dead)drawEnemy(e);
    for(const d of game.drops)drawCapsule(d);
    for(const l of game.lasers){ctx.fillStyle='#f6d9a1';ctx.fillRect(l.x-1,l.y,2,11);ctx.fillStyle='#e85d60';ctx.fillRect(l.x-2,l.y+5,4,5);}
    for(const b of game.bullets){ctx.fillStyle='#f46c4b';ctx.fillRect(b.x-5,b.y-5,10,10);ctx.fillStyle='#ffe9a0';ctx.fillRect(b.x-3,b.y-3,6,6);}
    if(!['lost','gameover'].includes(game.phase))drawPaddle(game.paddle.x,PADDLE_Y,game.paddle.width,game.paddle.mode);
    if(!['clear','gameover','won'].includes(game.phase))for(const b of game.balls)drawBall(b);
    drawGate();
    if(game.phase==='ready'){
      ctx.fillStyle='#061320dc';ctx.fillRect(107,342,266,83);
      pixelText(ctx,game.level===32?'FINAL ROUND':'ROUND '+String(game.level+1).padStart(2,'0'),240,356,2.5,'#f5e5bd','center');
      pixelText(ctx,'READY',240,387,2,'#8ed3d3','center');
      pixelText(ctx,'ПРОБЕЛ ИЛИ КАСАНИЕ',240,462,1.5,'#c7d4d3','center');
    }
    if(game.phase==='clear'){
      ctx.fillStyle='#061320eb';ctx.fillRect(52,327,376,90);
      pixelText(ctx,game.level===32?'DOH DEFEATED':'ROUND CLEAR',240,342,2.5,'#a5e7bb','center');
      pixelText(ctx,'+'+(1000*(game.level+1)),240,380,2,'#f6d6a5','center');
    }
    if(game.phase==='lost')pixelText(ctx,'VAUS LOST',240,375,2.5,'#f1a18a','center');
    if(game.level!==32 && game.phase!=='ready'){
      pixelText(ctx,'ROUND '+String(game.level+1).padStart(2,'0'),36,52,1.5,'#849fac');
      const remaining=game.bricks.filter(b=>b.alive&&b.type!=='x').length;
      pixelText(ctx,String(remaining).padStart(2,'0')+' BLOCKS',444,52,1.5,'#849fac','right');
    }
  }
  for(const p of game.particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}ctx.globalAlpha=1;
  for(const f of game.floats){ctx.globalAlpha=Math.min(1,f.life*2);pixelText(ctx,f.text,f.x,f.y,1,f.color,'center');}ctx.globalAlpha=1;
  ctx.restore();
  pixelText(ctx,'VAUS',35,HEIGHT-15,1,'#6d8e9f');pixelText(ctx,game.level===32?'FINAL ENCOUNTER':'BREAK ALL THE BRICKS',445,HEIGHT-15,1,'#6d8e9f','right');
}
// Pointer, keyboard, and touch share the same game actions.
$('start-button').addEventListener('click',primaryAction);
$('restart-button').addEventListener('click',newGame);
$('pause-button').addEventListener('click',()=>{game.pause();if(game.phase!=='paused')canvas.focus({preventScroll:true});unlockAudio();});
$('fire-button').addEventListener('pointerdown',e=>{e.preventDefault();primaryAction();game.keys.fire=true;});
window.addEventListener('pointerup',()=>{game.keys.fire=false;});
function pointerX(e){const rect=canvas.getBoundingClientRect();return(e.clientX-rect.left)/rect.width*WIDTH;}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerId===activePointer){game.moveTo(pointerX(e));if(pointerStart)pointerStart.moved=Math.max(pointerStart.moved,Math.abs(e.clientX-pointerStart.x));}});
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
  pointerStart={x:e.clientX,moved:0,wasReady:game.phase==='ready'};game.moveTo(pointerX(e));
  if(e.pointerType==='mouse'){primaryAction();game.keys.fire=true;}else unlockAudio();
});
canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse' && pointerStart && pointerStart.moved<14)primaryAction();activePointer=null;pointerStart=null;game.keys.fire=false;});
canvas.addEventListener('pointercancel',()=>{activePointer=null;pointerStart=null;game.keys.fire=false;});
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement)return;
  const interactive=e.target instanceof HTMLButtonElement;
  if(['ArrowLeft','ArrowRight','Space'].includes(e.code)&&!interactive)e.preventDefault();
  if(e.code==='ArrowLeft'||e.code==='KeyA')game.keys.left=true;
  if(e.code==='ArrowRight'||e.code==='KeyD')game.keys.right=true;
  if(e.repeat){if(e.code==='Space'&&!interactive)game.keys.fire=true;return;}
  if((e.code==='Space'||e.code==='Enter')&&!interactive){e.preventDefault();primaryAction();game.keys.fire=true;}
  if(e.code==='KeyP'||e.code==='Escape'){game.pause();if(game.phase!=='paused')canvas.focus({preventScroll:true});unlockAudio();}
  if(e.code==='KeyR')newGame();
  if(e.code==='KeyF')fullscreen();
  if(e.code==='KeyM'){const on=!(settings.music||settings.sfx);settings.music=on;settings.sfx=on;audio.sfx=on;audio.music=on;if(!on)audio.stop();unlockAudio();persist();updateSoundUI();}
});
window.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA'].includes(e.code))game.keys.left=false;if(['ArrowRight','KeyD'].includes(e.code))game.keys.right=false;if(e.code==='Space')game.keys.fire=false;});
function leave(){game.keys={left:false,right:false,fire:false};if(['playing','ready'].includes(game.phase))game.pause();audio.stop();}
window.addEventListener('blur',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});
for(const [id,key] of [['sfx-toggle','sfx'],['music-toggle','music'],['crt-toggle','crt']])$(id).addEventListener('click',()=>{
  settings[key]=!settings[key];audio.sfx=settings.sfx;audio.music=settings.music;
  if(!settings.music)audio.stop();if(key!=='crt')unlockAudio();persist();updateSoundUI();
});
$('volume').addEventListener('input',e=>{settings.volume=Number(e.target.value)/100;audio.setVolume(settings.volume);persist();updateSoundUI();});
$('volume').addEventListener('change',unlockAudio);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if($('screen-frame').requestFullscreen)await $('screen-frame').requestFullscreen();else{handleEvent('toast',{text:'ПОВЕРНИТЕ УСТРОЙСТВО ДЛЯ УДОБНОЙ ИГРЫ'});}}catch{handleEvent('toast',{text:'ПОЛНОЭКРАННЫЙ РЕЖИМ НЕДОСТУПЕН'});}}
$('fullscreen-button').addEventListener('click',fullscreen);
updateSoundUI();syncUI();
let last=0,accumulator=0,hudElapsed=0;
function frame(now){
  const elapsed=Math.min((now-last)/1000||0,0.1);last=now;accumulator+=elapsed;
  while(accumulator>=1/120){game.update(1/120);accumulator-=1/120;}
  if(toastTimer>0){toastTimer-=elapsed;if(toastTimer<=0)$('game-toast').classList.remove('visible');}
  hudElapsed+=elapsed;if(hudElapsed>.05||lastPhase!==game.phase){syncUI();hudElapsed=0;}
  draw();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
