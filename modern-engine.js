import {createLevel,POWERUPS} from './modern-levels.js';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export class HorizonEngine {
  constructor(onEvent=()=>{},random=Math.random,portrait=false) {
    this.portrait=portrait;this.width=portrait?600:960;this.height=portrait?900:720;this.paddleY=portrait?814:660;this.wall=28;this.radius=7;this.paddleWidth=portrait?106:138;this.baseSpeed=portrait?320:405;this.combo=0;this.comboTime=0;this.energy=0;this.boostTime=0;this.effects=[];this.broken=[];
    this.onEvent=onEvent;this.random=random;this.level=0;this.score=0;this.lives=3;this.phase='menu';
    this.nextLife=20000;this.time=0;this.keys={left:false,right:false,fire:false};
    this.particles=[];this.floats=[];this.shake=0;this.prepareLevel();this.phase='menu';
  }
  emit(type,data={}) {this.onEvent(type,data);}
  sound(name,variant=0,x=this.paddle?.x??this.width/2) {this.emit('sound',{name,variant,pan:clamp(x/this.width*2-1,-1,1)});}
  start() {this.level=0;this.score=0;this.lives=3;this.nextLife=20000;this.combo=0;this.comboTime=0;this.energy=0;this.boostTime=0;this.keys={left:false,right:false,fire:false};this.prepareLevel();this.emit('change');this.sound('start');}
  prepareLevel() {
    this.bricks=createLevel(this.level,this.width,this.portrait);this.total=this.bricks.filter(b=>b.type!=='x').length;
    this.balls=[];this.drops=[];this.lasers=[];this.enemies=[];this.bullets=[];this.particles=[];this.floats=[];
    this.paddle={x:this.width/2,target:this.width/2,width:this.paddleWidth,y:this.paddleY,mode:null};this.speed=this.baseSpeed+Math.min(this.level,24)*6;
    this.slow=false;this.gate=false;this.enemyTimer=11;this.laserTimer=0;this.roundTime=0;this.shake=0;
    this.lastBreakTime=0;this.rescueUsed=false;this.boss=this.level===32?{x:this.width/2-90,y:140,w:180,h:184,hp:36,maxHp:36,flash:0,timer:2.5}:null;
    this.effects=[];this.broken=[];this.boostTime=0;this.combo=0;this.comboTime=0;this.attachBall();this.phase='ready';this.emit('change');
  }
  attachBall() {this.balls.push({x:this.paddle.x,y:this.paddleY-12,vx:0,vy:0,r:this.radius,attached:true,offset:0,hold:0,trail:[],age:0});}
  launch() {
    if(!['ready','playing'].includes(this.phase)) return;
    let launched=false;
    for(const ball of this.balls) if(ball.attached) {
      ball.attached=false;const angle=(ball.offset/(this.paddle.width/2))*.9+.16;
      ball.vx=Math.sin(angle)*this.speed;ball.vy=-Math.cos(angle)*this.speed;ball.age=0;launched=true;
    }
    if(launched) {this.phase='playing';this.sound('launch');this.emit('change');}
    else if(this.paddle.mode==='L') this.fire();
  }
  fire() {
    if(this.phase!=='playing' || this.paddle.mode!=='L' || this.laserTimer>0) return;
    for(const side of [-1,1]) this.lasers.push({x:this.paddle.x+side*(this.paddle.width/2-8),y:this.paddleY-9,alive:true});
    this.laserTimer=.19;this.sound('laser');
  }
  moveTo(x) {this.paddle.target=clamp(x,this.wall+this.paddle.width/2,this.width-this.wall-this.paddle.width/2);}
  pause() {if(['playing','ready','clear','lost'].includes(this.phase)){this.previous=this.phase;this.phase='paused';this.emit('change');}else if(this.phase==='paused'){this.phase=this.previous;this.emit('change');}}
  addScore(amount,x,y) {
    this.score+=amount;
    if(x!==undefined) this.floats.push({text:String(amount),x,y,life:.75,color:'#ecedcc'});
    while(this.score>=this.nextLife){this.lives++;this.nextLife=this.nextLife===20000?60000:this.nextLife+60000;this.sound('life');this.emit('toast',{text:'БОНУС ЗА СЧЁТ · ДОПОЛНИТЕЛЬНАЯ ЖИЗНЬ'});}
    this.emit('score');
  }
  applyPower(type) {
    if(!POWERUPS[type]) return;
    this.addScore(1000);this.energy=Math.min(100,this.energy+8);this.sound(type==='P'?'life':'power');
    if(['E','L','C'].includes(type)) {
      this.paddle.mode=type;this.paddle.width=type==='E'?this.paddleWidth*1.5:this.paddleWidth;
      this.moveTo(this.paddle.target);this.paddle.x=clamp(this.paddle.x,this.wall+this.paddle.width/2,this.width-this.wall-this.paddle.width/2);
      if(type!=='C') for(const b of this.balls) if(b.attached) {b.attached=false;b.vx=this.speed*.2;b.vy=-this.speed*.98;}
    }
    if(type==='D') {
      if(this.balls.every(b=>b.attached)) this.launch();
      const origin=this.balls[0];
      if(origin) for(let i=this.balls.length;i<3;i++) {
        const angle=Math.atan2(origin.vx,-origin.vy)+(i===1?-.42:.42);
        const vx=Math.sin(angle)*this.speed,vy=-Math.cos(angle)*this.speed;
        this.balls.push({...origin,vx,vy,attached:false,trail:[],age:0});
      }
      this.paddle.mode=null;this.paddle.width=this.paddleWidth;
    }
    if(type==='S') {this.speed=Math.max(this.baseSpeed*.65,this.speed*.72);this.slow=true;this.normalizeBalls();}
    if(type==='P') this.lives++;
    if(type==='B') this.gate=true;
    this.emit('toast',{text:POWERUPS[type].name});this.emit('change');
  }
  normalizeBalls() {
    for(const b of this.balls) if(!b.attached) {
      const speed=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/speed*this.speed;b.vy=b.vy/speed*this.speed;
      if(Math.abs(b.vy)<this.speed*.22) {b.vy=(b.vy<0?-1:1)*this.speed*.22;b.vx=(b.vx<0?-1:1)*Math.sqrt(this.speed*this.speed-b.vy*b.vy);}
    }
  }
  burst(x,y,color,count=10,speed=90) {
    for(let i=0;i<count;i++){const a=this.random()*Math.PI*2,v=(.3+this.random())*speed;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+this.random()*.55,max:.9,color,size:1+Math.floor(this.random()*3)});}
    if(this.particles.length>600)this.particles.splice(0,this.particles.length-600);
  }
  hitBrick(brick) {
    brick.flash=.12;
    if(brick.type==='x') {this.sound('metal');this.burst(brick.x+brick.w/2,brick.y+brick.h/2,'#e7be63',3,35);return;}
    brick.hp--;
    if(brick.hp>0) {this.sound('metal');return;}
    brick.alive=false;this.lastBreakTime=this.roundTime;
    const points=brick.type==='s'?50*(this.level+1):brick.points;
    this.combo=this.comboTime>0?this.combo+1:1;this.comboTime=4;const multiplier=Math.min(8,1+Math.floor(this.combo/4));
    this.addScore(points*multiplier);this.energy=Math.min(100,this.energy+3.5);
    this.sound('brick',Math.min(this.combo,12),brick.x+brick.w/2);
    this.emit('impact',{x:brick.x+brick.w/2,y:brick.y+brick.h/2,color:brick.color,power:1});
    this.effects.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,r:0,life:.5,max:.5,color:brick.color});
    this.broken.push({...brick,life:.45});
    this.burst(brick.x+brick.w/2,brick.y+brick.h/2,brick.color,18,135);this.shake=Math.max(this.shake,1.4);
    this.speed=Math.min(this.baseSpeed*1.85,this.speed+1.5);this.normalizeBalls();
    // Only one capsule at a time, and no capsules during multiball, like the arcade.
    if(this.balls.length===1 && this.drops.length===0 && this.random()<.18) {
      const weighted=['E','E','L','L','D','D','C','S','S','P','B'];
      const type=weighted[Math.floor(this.random()*weighted.length)];
      this.drops.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,type,age:0});
    }
    if(this.bricks.every(b=>!b.alive || b.type==='x')) this.clearLevel();
  }
  clearLevel() {
    if(this.phase!=='playing') return;
    this.phase='clear';this.transition=2.8;this.emit('celebrate');this.sound('clear');
    this.addScore(1000*(this.level+1));this.emit('change');
  }
  loseLife() {
    if(this.phase!=='playing')return;
    this.lives--;this.combo=0;this.comboTime=0;this.boostTime=0;this.phase='lost';this.transition=1.65;this.sound('lose');
    this.burst(this.paddle.x,this.paddleY,'#e8f5ec',36,190);this.burst(this.paddle.x,this.paddleY,'#ef7560',26,180);
    this.shake=6;this.drops=[];this.lasers=[];this.enemies=[];this.bullets=[];this.emit('change');
  }
  resetLife() {
    if(this.lives<=0){this.phase='gameover';this.sound('gameover');this.emit('change');return;}
    this.paddle={x:this.width/2,target:this.width/2,width:this.paddleWidth,y:this.paddleY,mode:null};
    this.speed=this.baseSpeed+Math.min(this.level,24)*6;this.slow=false;this.gate=false;this.enemyTimer=9;
    this.balls=[];this.effects=[];this.broken=[];this.boostTime=0;this.attachBall();this.phase='ready';this.emit('change');
  }
  reflectRect(ball,rect) {
    const nx=clamp(ball.x,rect.x,rect.x+rect.w),ny=clamp(ball.y,rect.y,rect.y+rect.h);
    const dx=ball.x-nx,dy=ball.y-ny,dist2=dx*dx+dy*dy;
    if(dist2>ball.r*ball.r)return false;
    if(dist2>0.000001){
      const dist=Math.sqrt(dist2),ux=dx/dist,uy=dy/dist,dot=ball.vx*ux+ball.vy*uy;
      if(dot>=0)return false;
      ball.x+=ux*(ball.r-dist+.03);ball.y+=uy*(ball.r-dist+.03);
      ball.vx-=2*dot*ux;ball.vy-=2*dot*uy;
    }else{
      const sides=[{d:ball.x-rect.x,nx:-1,ny:0},{d:rect.x+rect.w-ball.x,nx:1,ny:0},{d:ball.y-rect.y,nx:0,ny:-1},{d:rect.y+rect.h-ball.y,nx:0,ny:1}];
      const side=sides.reduce((a,b)=>a.d<b.d?a:b);
      ball.x+=side.nx*(side.d+ball.r+.03);ball.y+=side.ny*(side.d+ball.r+.03);
      const dot=ball.vx*side.nx+ball.vy*side.ny;
      if(dot<0){ball.vx-=2*dot*side.nx;ball.vy-=2*dot*side.ny;}
    }
    return true;
  }
  update(dt) {
    if(this.phase==='paused')return;
    this.time+=dt;
    for(const fx of this.effects){fx.r+=180*dt;fx.life-=dt;}this.effects=this.effects.filter(f=>f.life>0);
    for(const b of this.broken)b.life-=dt;this.broken=this.broken.filter(b=>b.life>0);
    this.shake=Math.max(0,this.shake-dt*15);
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const f of this.floats){f.y-=25*dt;f.life-=dt;}this.floats=this.floats.filter(f=>f.life>0);
    for(const b of this.bricks) b.flash=Math.max(0,b.flash-dt);
    if(['lost','clear'].includes(this.phase)) {
      this.transition-=dt;
      if(this.transition<=0){if(this.phase==='lost')this.resetLife();else if(this.level===32){this.phase='won';this.emit('change');}else{this.level++;this.prepareLevel();this.sound('start');}}
      return;
    }
    if(!['ready','playing'].includes(this.phase))return;
    const direction=Number(this.keys.right)-Number(this.keys.left);
    if(direction)this.moveTo(this.paddle.x+direction*this.width*.9*dt);
    const delta=this.paddle.target-this.paddle.x;
    this.paddle.x+=clamp(delta,-this.width*3*dt,this.width*3*dt);
    this.paddle.x=clamp(this.paddle.x,this.wall+this.paddle.width/2,this.width-this.wall-this.paddle.width/2);
    for(const b of this.balls)if(b.attached){b.x=this.paddle.x+clamp(b.offset,-this.paddle.width/2+5,this.paddle.width/2-5);b.y=this.paddleY-12;b.hold+=dt;if(this.phase==='playing' && b.hold>4)this.launch();}
    if(this.phase==='ready')return;
    this.roundTime+=dt;this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.combo=0;this.boostTime=Math.max(0,this.boostTime-dt);this.laserTimer=Math.max(0,this.laserTimer-dt);
    if(this.keys.fire)this.fire();
    if(this.gate && this.paddle.x+this.paddle.width/2>=this.width-this.wall-2){this.addScore(10000);this.clearLevel();return;}
    if(!this.boss) {
      this.enemyTimer-=dt;
      if(this.enemyTimer<=0 && this.enemies.length<3){this.enemies.push({x:this.random()<.5?this.width*.2:this.width*.8,y:34,age:0,kind:Math.floor(this.random()*3),vx:(this.random()-.5)*50,seed:this.random()*6,r:11});this.enemyTimer=11+this.random()*8;}
    }
    for(const enemy of this.enemies){
      enemy.age+=dt;enemy.y+=(18+Math.min(14,this.level))*dt;enemy.x+=Math.sin(enemy.age*2+enemy.seed)*40*dt+enemy.vx*dt;
      if(enemy.x<36 || enemy.x>this.width-36){enemy.vx*=-1;enemy.x=clamp(enemy.x,36,this.width-36);}
      for(const brick of this.bricks)if(brick.alive && enemy.x>brick.x-9 && enemy.x<brick.x+brick.w+9 && enemy.y>brick.y-9 && enemy.y<brick.y+brick.h+9){enemy.x+=enemy.x<this.width/2?-dt*65:dt*65;break;}
      if(enemy.y>this.paddleY-13 && Math.abs(enemy.x-this.paddle.x)<this.paddle.width/2+8){enemy.dead=true;this.burst(enemy.x,enemy.y,'#bbb6df',12);this.sound('enemy');this.addScore(100);}
    }
    this.enemies=this.enemies.filter(e=>!e.dead && e.y<this.height+20);
    for(const ball of this.balls) {
      if(ball.attached)continue;
      ball.age+=dt;
      const steps=Math.max(1,Math.ceil(this.speed*dt/(this.radius*.75))),sub=dt/steps;
      for(let step=0;step<steps;step++){
        if(this.phase!=='playing' || ball.attached)break;
        const oldY=ball.y;ball.x+=ball.vx*sub;ball.y+=ball.vy*sub;
        if(ball.x<this.wall+ball.r){ball.x=this.wall+ball.r;ball.vx=Math.abs(ball.vx);this.sound('wall');}
        if(ball.x>this.width-this.wall-ball.r){ball.x=this.width-this.wall-ball.r;ball.vx=-Math.abs(ball.vx);this.sound('wall');}
        if(ball.y<54+ball.r){ball.y=54+ball.r;ball.vy=Math.abs(ball.vy);this.sound('wall');}
        if(ball.vy>0 && oldY+ball.r<=this.paddleY+3 && ball.y+ball.r>=this.paddleY && Math.abs(ball.x-this.paddle.x)<this.paddle.width/2+ball.r){
          const offset=clamp((ball.x-this.paddle.x)/(this.paddle.width/2),-1,1);
          const angle=offset*1.10;
          ball.y=this.paddleY-ball.r-.1;ball.vx=Math.sin(angle)*this.speed;ball.vy=-Math.cos(angle)*this.speed;
          if(Math.abs(ball.vx)<this.speed*.07)ball.vx=this.speed*.07*(ball.vx<0?-1:1);
          if(this.paddle.mode==='C'){ball.attached=true;ball.offset=ball.x-this.paddle.x;ball.hold=0;ball.trail=[];}
          this.sound('paddle',Math.abs(offset),ball.x);this.emit('impact',{x:ball.x,y:this.paddleY,color:'#6df6df',power:.35});this.burst(ball.x,this.paddleY,'#c5eff2',5,40);
        }
        for(const brick of this.bricks)if(brick.alive){
          if(this.boostTime>0 && brick.type!=='x'){if(this.overlap(ball,brick)){brick.hp=1;this.hitBrick(brick);}}
          else if(this.reflectRect(ball,brick)){this.hitBrick(brick);break;}
        }
        if(this.boss && this.boss.hp>0 && this.reflectRect(ball,this.boss))this.hitBoss();
        for(const enemy of this.enemies)if(!enemy.dead && Math.hypot(ball.x-enemy.x,ball.y-enemy.y)<enemy.r+ball.r){
          const angle=Math.atan2(ball.y-enemy.y,ball.x-enemy.x);ball.vx=Math.cos(angle)*this.speed;ball.vy=Math.sin(angle)*this.speed;
          enemy.dead=true;this.addScore(100,enemy.x,enemy.y);this.sound('enemy');this.burst(enemy.x,enemy.y,'#c2afeb',16);this.normalizeBalls();break;
        }
      }
      // Keep long rallies from settling into a repeating orbit.
      if(this.roundTime-this.lastBreakTime>18 && ball.age>18){ball.vx+=this.speed*.08*(this.random()<.5?-1:1);this.normalizeBalls();ball.age=0;}
      ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>22)ball.trail.pop();
    }
    if(this.phase!=='playing')return;
    this.balls=this.balls.filter(b=>b.y<this.height+12);
    if(!this.balls.length){this.loseLife();return;}
    for(const drop of this.drops){
      drop.y+=100*dt;drop.age+=dt;
      if(drop.y+9>=this.paddleY && drop.y-9<=this.paddleY+12 && Math.abs(drop.x-this.paddle.x)<this.paddle.width/2+12){drop.dead=true;this.applyPower(drop.type);}
    }
    this.drops=this.drops.filter(d=>!d.dead && d.y<this.height+10);
    for(const laser of this.lasers){
      laser.y-=800*dt;
      for(const brick of this.bricks)if(laser.alive && brick.alive && laser.x>=brick.x && laser.x<=brick.x+brick.w && laser.y<=brick.y+brick.h && laser.y+10>=brick.y){laser.alive=false;this.hitBrick(brick);break;}
      for(const enemy of this.enemies)if(laser.alive && !enemy.dead && Math.hypot(laser.x-enemy.x,laser.y-enemy.y)<15){laser.alive=false;enemy.dead=true;this.burst(enemy.x,enemy.y,'#b9abe0',12);this.addScore(100);this.sound('enemy');}
      if(this.boss && laser.alive && laser.x>this.boss.x && laser.x<this.boss.x+this.boss.w && laser.y<this.boss.y+this.boss.h){laser.alive=false;this.hitBoss();}
    }
    this.lasers=this.lasers.filter(l=>l.alive && l.y>54);
    if(this.boss && this.phase==='playing'){
      this.boss.flash=Math.max(0,this.boss.flash-dt);this.boss.timer-=dt;
      if(this.boss.timer<=0){
        this.boss.timer=this.boss.hp<12?1.55:2.6;const x=this.boss.x+this.boss.w/2,y=this.boss.y+this.boss.h-15;
        const angle=Math.atan2(this.paddleY-y,this.paddle.x-x);
        for(const a of [-.16,.16])this.bullets.push({x,y,vx:Math.cos(angle+a)*160,vy:Math.sin(angle+a)*160});
        this.sound('boss');
      }
    }
    for(const bullet of this.bullets){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;if(bullet.y+6>=this.paddleY && bullet.y-6<this.paddleY+12 && Math.abs(bullet.x-this.paddle.x)<this.paddle.width/2+5){this.loseLife();return;}}
    this.bullets=this.bullets.filter(b=>b.y<this.height+10 && b.x>this.wall && b.x<this.width-this.wall);
  }
  overlap(ball,rect) {const dx=ball.x-clamp(ball.x,rect.x,rect.x+rect.w),dy=ball.y-clamp(ball.y,rect.y,rect.y+rect.h);return dx*dx+dy*dy<=ball.r*ball.r;}
  activateBoost() {
    if(this.energy<100 || this.phase!=='playing' || this.boostTime>0)return false;
    this.energy=0;this.boostTime=7;this.sound('boost');this.emit('toast',{text:'OVERDRIVE · ПРОБИВАЙТЕ БЛОКИ НАСКВОЗЬ'});
    this.effects.push({x:this.paddle.x,y:this.paddleY,r:10,life:1,max:1,color:'#ad8cff'});return true;
  }
  resizeArena(portrait) {
    if(this.portrait===portrait)return false;
    const oldW=this.width,oldH=this.height,oldBase=this.baseSpeed;
    this.portrait=portrait;this.width=portrait?600:960;this.height=portrait?900:720;this.paddleY=portrait?814:660;this.paddleWidth=portrait?106:138;this.baseSpeed=portrait?320:405;
    this.speed*=this.baseSpeed/oldBase;
    const sx=this.width/oldW,sy=this.height/oldH;
    this.paddle.width=this.paddleWidth*(this.paddle.mode==='E'?1.5:1);this.paddle.x=clamp(this.paddle.x*sx,this.wall+this.paddle.width/2,this.width-this.wall-this.paddle.width/2);this.paddle.target*=sx;this.paddle.y=this.paddleY;this.moveTo(this.paddle.target);
    for(const b of this.balls){b.x=clamp(b.x*sx,this.wall+b.r,this.width-this.wall-b.r);b.y=b.attached?this.paddleY-12:Math.min(b.y*sy,this.paddleY-20);b.offset*=sx;b.trail=[];}
    const layout=createLevel(this.level,this.width,this.portrait);for(let i=0;i<this.bricks.length;i++){const b=this.bricks[i],n=layout[i];if(n)Object.assign(b,{x:n.x,y:n.y,w:n.w,h:n.h});}
    for(const set of [this.drops,this.enemies,this.bullets,this.lasers])for(const obj of set){obj.x*=sx;obj.y*=sy;}
    if(this.boss)this.boss.x=this.width/2-this.boss.w/2;
    this.effects=[];this.broken=[];this.particles=[];this.normalizeBalls();
    if(this.phase==='playing')this.pause();return true;
  }
  hitBoss() {
    if(this.boss.flash>0 || this.boss.hp<=0)return;
    this.boss.hp--;this.boss.flash=.09;this.shake=3;this.sound('boss');this.addScore(250);
    this.burst(this.boss.x+this.boss.w/2,this.boss.y+this.boss.h/2,'#d87972',18,110);
    if(this.boss.hp===0){this.burst(this.width/2,230,'#ffd59c',150,280);this.addScore(50000);this.clearLevel();}
  }
}
