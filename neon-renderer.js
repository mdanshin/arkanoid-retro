import {POWERUPS} from './modern-levels.js';
export function resolution(width,height,dpr=1,quality='ultra'){
 const budget=quality==='low'?3500000:quality==='balanced'?9000000:16500000;
 const ratio=Math.min(dpr,quality==='low'?1.5:4,Math.sqrt(budget/Math.max(1,width*height)));
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),ratio};
}
function round(c,x,y,w,h,r=4){c.beginPath();c.roundRect(x,y,w,h,r);}
function hex(c,x,y,r,turn=0,n=6){c.beginPath();for(let i=0;i<n;i++){const a=i/n*Math.PI*2+turn;c[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
function glowTexture(color){const a=document.createElement('canvas');a.width=a.height=128;const c=a.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color+'ad');g.addColorStop(.18,color+'56');g.addColorStop(.5,color+'15');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,128,128);return a;}
export class NeonRenderer{
 constructor(canvas,game,settings){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});this.game=game;this.settings=settings;this.quality='ultra';this.sprites=new Map();this.glows=new Map();this.pointer={x:0,y:0};this.phaseTime=0;this.lastLevel=-1;this.lastSize='';this.stars=Array.from({length:140},(_,i)=>({x:((i*7919)%104729)/104729,y:((i*3253+24589)%65521)/65521,size:i%13===0?1.5:.6,a:.1+(i%9)/30}));}
 resize(quality){this.quality=quality;const box=this.canvas.getBoundingClientRect(),size=resolution(box.width,box.height,window.devicePixelRatio||1,quality);if(this.canvas.width!==size.width||this.canvas.height!==size.height){this.canvas.width=size.width;this.canvas.height=size.height;this.sprites.clear();}return size;}
 glow(color,x,y,w,h=w,alpha=1){if(!this.glows.has(color))this.glows.set(color,glowTexture(color));const c=this.ctx;c.save();c.globalAlpha*=alpha;c.globalCompositeOperation='lighter';c.drawImage(this.glows.get(color),x-w/2,y-h/2,w,h);c.restore();}
 brickSprite(b){
  const scale=Math.max(2,Math.min(4,this.canvas.width/this.game.width)),key=b.color+'|'+b.type+'|'+b.w+'|'+scale;
  if(this.sprites.has(key))return this.sprites.get(key);
  const a=document.createElement('canvas'),pad=10,w=b.w,h=b.h;a.width=Math.ceil((w+pad*2)*scale);a.height=Math.ceil((h+pad*2+6)*scale);const c=a.getContext('2d');c.scale(scale,scale);c.translate(pad,pad);
  const shade=c.createLinearGradient(0,0,0,h+5);shade.addColorStop(0,b.color+'50');shade.addColorStop(.35,b.color+'24');shade.addColorStop(1,'#071325');
  c.shadowColor=b.color+'6e';c.shadowBlur=8;c.fillStyle=b.color+'26';round(c,0,0,w,h,4);c.fill();c.shadowBlur=0;
  c.fillStyle='#030815c9';round(c,2,5,w,h,4);c.fill();c.fillStyle=b.color+'4a';round(c,0,4,w,h,4);c.fill();c.fillStyle=shade;round(c,0,0,w,h,4);c.fill();c.strokeStyle=b.color+'b3';c.lineWidth=.8;c.stroke();
  c.fillStyle=b.color+'b0';round(c,2,1,w-4,1.6,.8);c.fill();c.fillStyle='#fff8';c.fillRect(5,1,Math.max(8,w*.2),1);
  const gloss=c.createLinearGradient(0,2,0,h);gloss.addColorStop(0,'#ffffff16');gloss.addColorStop(.5,'#ffffff00');c.fillStyle=gloss;round(c,2,3,w-4,h*.45,2);c.fill();
  c.fillStyle=b.color+'72';c.fillRect(w-7,h-6,2,2);c.fillRect(5,h-6,2,2);
  if(b.type==='s'||b.type==='x'){c.strokeStyle=b.color+'ab';c.lineWidth=1;hex(c,w/2,h/2,4,Math.PI/6,b.type==='s'?4:6);c.stroke();}
  this.sprites.set(key,{image:a,pad,w:w+pad*2,h:h+pad*2+6});return this.sprites.get(key);
 }
 drawBrick(b,alpha=1,offset=0){const s=this.brickSprite(b),c=this.ctx;c.save();c.globalAlpha=alpha;c.drawImage(s.image,b.x-s.pad,b.y-s.pad+offset,s.w,s.h);if(b.flash>0){c.fillStyle='#e6ffff';c.globalAlpha=b.flash*4;round(c,b.x,b.y,b.w,b.h,4);c.fill();}if(b.hp>1&&Number.isFinite(b.hp)){c.globalAlpha=.85;c.fillStyle=b.color;for(let i=0;i<Math.min(b.hp,5);i++)c.fillRect(b.x+b.w/2-b.hp*2.5+i*5,b.y+b.h-4,3,1);}c.restore();}
 paddle(){const g=this.game,c=this.ctx,p=g.paddle,x=p.x,y=g.paddleY,w=p.width,color=g.boostTime>0?'#b191ff':POWERUPS[p.mode]?.color||'#6befd4';
  this.glow(color,x,y+17,w*1.4,78,.7);c.save();c.translate(x,y);const body=c.createLinearGradient(0,-6,0,18);body.addColorStop(0,'#c4f5f3');body.addColorStop(.15,'#53889d');body.addColorStop(.4,'#172c45');body.addColorStop(1,'#081425');
  c.beginPath();c.moveTo(-w/2+12,-2);c.lineTo(w/2-12,-2);c.lineTo(w/2,7);c.lineTo(w/2-8,15);c.lineTo(-w/2+8,15);c.lineTo(-w/2,7);c.closePath();c.fillStyle=body;c.fill();c.strokeStyle='#83c5cc8f';c.lineWidth=1;c.stroke();
  c.fillStyle=color;round(c,-w/2+12,-3,w-24,3,1.5);c.fill();c.fillStyle='#dcffff';round(c,-w/2+17,-3,w-34,.8,.3);c.fill();
  const cockpit=c.createLinearGradient(0,0,0,10);cockpit.addColorStop(0,'#4bc7d3');cockpit.addColorStop(1,'#102c44');c.fillStyle=cockpit;round(c,-w*.15,2,w*.3,7,3);c.fill();c.strokeStyle=color+'80';c.stroke();
  for(const sign of [-1,1]){c.fillStyle=color;c.fillRect(sign*(w/2-7)-1,3,2,6);c.fillStyle='#91e5e96a';for(let i=0;i<3;i++)c.fillRect(sign*(w/2-25)-3+i*3,6,1,3);}
  if(p.mode==='L'){c.fillStyle='#ffc3d3';round(c,-w/2+10,-13,4,13,2);c.fill();round(c,w/2-14,-13,4,13,2);c.fill();}if(p.mode==='C'){c.strokeStyle=color+'90';c.beginPath();c.arc(0,-3,w*.42,Math.PI*1.18,Math.PI*1.82);c.stroke();}
  c.restore();
 }
 ball(b){const c=this.ctx,g=this.game,color=g.boostTime>0?'#ba91ff':'#8cfff0';
  if(b.trail?.length>1){c.save();c.lineCap='round';for(let i=1;i<b.trail.length;i++){const a=1-i/b.trail.length;c.strokeStyle=color+Math.round(a*.40*255).toString(16).padStart(2,'0');c.lineWidth=b.r*1.7*a;c.beginPath();c.moveTo(b.trail[i-1].x,b.trail[i-1].y);c.lineTo(b.trail[i].x,b.trail[i].y);c.stroke();}c.restore();}
  this.glow(color,b.x,b.y,g.boostTime>0?95:64,undefined,1);c.fillStyle=color;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);c.fill();c.fillStyle='#f4ffff';c.beginPath();c.arc(b.x-1,b.y-1,b.r*.68,0,Math.PI*2);c.fill();
 }
 capsule(d){const c=this.ctx,p=POWERUPS[d.type];this.glow(p.color,d.x,d.y,76,55,.65);c.save();c.translate(d.x,d.y);const r=14;c.rotate(Math.sin(d.age*2)*.12);hex(c,0,0,r,Math.PI/6);c.fillStyle='#0a1b32';c.fill();c.strokeStyle=p.color;c.lineWidth=1.3;c.stroke();c.strokeStyle=p.color+'55';hex(c,0,0,r+4,Math.PI/6);c.stroke();c.fillStyle=p.color;c.font='600 15px "Segoe UI Symbol","Arial Unicode MS",Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(p.icon,0,1);c.restore();}
 enemy(e){const c=this.ctx,color=['#8ba8fb','#ffc58d','#e29fe2'][e.kind];this.glow(color,e.x,e.y,65,65,.3);c.save();c.translate(e.x,e.y);c.rotate(e.age*(e.kind===1?.65:-.4));hex(c,0,0,12,0,e.kind===1?4:6);c.fillStyle='#121a35';c.fill();c.strokeStyle=color;c.lineWidth=1.1;c.stroke();c.rotate(-e.age*.5);hex(c,0,0,7,Math.PI/4,4);c.stroke();c.fillStyle='#e9faff';c.beginPath();c.arc(0,0,2,0,Math.PI*2);c.fill();c.restore();}
 boss(){const c=this.ctx,g=this.game,b=g.boss;if(!b||b.hp<=0)return;const x=b.x+b.w/2,y=b.y+b.h/2,color=b.hp<12?'#ff739e':'#ad8cff';this.glow(color,x,y,340,340,.65);c.save();c.translate(x,y);c.strokeStyle=color+'7a';c.lineWidth=1;for(let j=0;j<3;j++){c.rotate(g.time*.025+j*.3);c.beginPath();c.ellipse(0,0,90-j*8,60+j*8,g.time*.1+j,0,Math.PI*2);c.stroke();}c.restore();c.save();c.translate(x,y);c.rotate(g.time*.16);const grad=c.createLinearGradient(-60,-60,60,70);grad.addColorStop(0,b.flash>0?'#ffefff':'#b99bea');grad.addColorStop(.45,'#44355f');grad.addColorStop(1,'#161b31');hex(c,0,0,70,Math.PI/6,6);c.fillStyle=grad;c.fill();c.strokeStyle=color;c.lineWidth=2;c.stroke();for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.PI/6;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*70,Math.sin(a)*70);c.strokeStyle=color+'45';c.stroke();}c.restore();this.glow(color,x,y,100,100,.8);c.fillStyle='#efe5ff';hex(c,x,y,12,g.time*.5,6);c.fill();c.fillStyle='#202e47';round(c,x-90,b.y-23,180,4,2);c.fill();c.fillStyle=color;round(c,x-90,b.y-23,Math.max(.1,180*b.hp/b.maxHp),4,2);c.fill();}
 draw(dt=0){const g=this.game,c=this.ctx;if(!c)return;this.phaseTime+=dt;if(this.lastLevel!==g.level){this.phaseTime=0;this.lastLevel=g.level;}c.setTransform(this.canvas.width/g.width,0,0,this.canvas.height/g.height,0,0);c.clearRect(0,0,g.width,g.height);
  c.save();const motion=this.settings.motion&&!this.settings.reduced;if(g.shake>0&&motion)c.translate(Math.sin(g.time*81)*g.shake*.65,Math.cos(g.time*89)*g.shake*.35);
  const width=g.width,height=g.height,t=g.time;c.fillStyle='#3859780c';for(let x=48;x<width;x+=48)c.fillRect(x,56,1,height-90);for(let y=56;y<height;y+=48)c.fillRect(28,y,width-56,1);
  const starTime=this.settings.reduced?0:t,starCount=this.quality==='low'?40:140;for(let i=0;i<starCount;i++){const s=this.stars[i],a=s.a*(.6+.4*Math.sin(starTime*.8+i));c.fillStyle=`rgba(155,204,231,${a})`;const x=s.x*width+(motion?this.pointer.x*(i%3+1)*2:0),y=(s.y*height+starTime*(i%3+1)*1.1)%height;c.beginPath();c.arc(x,y,s.size,0,Math.PI*2);c.fill();}
  const edgeColor=g.boostTime>0?'#b18cff':'#62d9d1',edge=c.createLinearGradient(0,60,0,height);edge.addColorStop(0,edgeColor+'10');edge.addColorStop(.45,edgeColor+'62');edge.addColorStop(.9,edgeColor+'9a');edge.addColorStop(1,edgeColor+'00');c.fillStyle=edge;c.fillRect(g.wall-1,55,1,height-78);c.fillRect(width-g.wall,55,1,height-78);c.strokeStyle='#b1e8ff2c';c.lineWidth=1;c.beginPath();c.moveTo(g.wall+12,54);c.lineTo(g.wall,54);c.lineTo(g.wall,70);c.moveTo(width-g.wall-12,54);c.lineTo(width-g.wall,54);c.lineTo(width-g.wall,70);c.stroke();
  for(const b of g.bricks)if(b.alive){const enter=this.settings.reduced?1:Math.min(1,Math.max(0,(this.phaseTime-b.spawn+.2)*3));this.drawBrick(b,enter,(1-enter)*-16);}
  if(this.quality!=='low')for(const b of g.broken){c.save();c.translate(b.x+b.w/2,b.y+b.h/2);c.rotate((.45-b.life)*.3);c.translate(-b.x-b.w/2,-b.y-b.h/2);this.drawBrick(b,b.life/.45*.3,(.45-b.life)*35);c.restore();}
  this.boss();for(const e of g.enemies)if(!e.dead)this.enemy(e);for(const d of g.drops)this.capsule(d);
  for(const l of g.lasers){this.glow('#ff7098',l.x,l.y,25,60,.5);c.fillStyle='#ffe2f0';round(c,l.x-1.5,l.y,3,20,1.5);c.fill();}
  for(const b of g.bullets){this.glow('#ff7098',b.x,b.y,70,70,.8);c.fillStyle='#ffe1e7';hex(c,b.x,b.y,6,t*2,4);c.fill();}
  if(!['lost','gameover'].includes(g.phase))this.paddle();
  if(g.phase==='menu'){const x=width/2+Math.sin(t*.65)*width*.24;this.ball({x,y:height*.62+Math.cos(t*.9)*height*.12,r:g.radius,trail:[]});}else if(!['clear','gameover','won'].includes(g.phase))for(const b of g.balls)this.ball(b);
  if(g.phase==='ready' || (g.phase==='playing'&&g.balls.some(b=>b.attached))){const b=g.balls.find(b=>b.attached);if(b){c.strokeStyle='#9ddcca62';c.lineWidth=1;c.setLineDash([3,8]);c.beginPath();c.moveTo(b.x,b.y-15);c.lineTo(b.x+Math.sin(.16)*110,b.y-Math.cos(.16)*110);c.stroke();c.setLineDash([]);}}
  if(g.gate){this.glow('#b58dff',width-g.wall,g.paddleY,110,160,.8);c.strokeStyle='#c2a5ff';c.lineWidth=3;c.beginPath();c.ellipse(width-g.wall,g.paddleY,12,33,0,0,Math.PI*2);c.stroke();}
  for(const fx of g.effects){c.globalAlpha=fx.life/fx.max;c.strokeStyle=fx.color;c.lineWidth=1.5;c.beginPath();c.arc(fx.x,fx.y,fx.r,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
  const maxParticles=this.quality==='low'?70:this.quality==='balanced'?200:600,particles=g.particles.slice(-maxParticles);c.save();c.globalCompositeOperation='lighter';for(const p of particles){c.globalAlpha=Math.min(1,p.life*2);c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.size*.8,0,Math.PI*2);c.fill();if(this.quality==='ultra'){c.globalAlpha*=.5;c.strokeStyle=p.color;c.lineWidth=.7;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);c.stroke();}}c.restore();
  for(const f of g.floats){c.globalAlpha=Math.min(1,f.life*2);c.font='500 13px Arial';c.textAlign='center';c.fillStyle='#bdfbea';c.fillText(f.text,f.x,f.y);}c.globalAlpha=1;c.restore();
 }
}
