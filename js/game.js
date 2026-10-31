// ---------- constants ----------
const TILE=40,COLS=9,ROWS=13,W=360,H=520,BASE_CAP=80,MAX_LIVES=20,WAVES_PER=10;
const SWGR={x:180,y:478,r:175};
const $=id=>document.getElementById(id);
const cv=$('game'),ctx=cv.getContext('2d');
const rnd=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ORDER=['breaker','fuse','tesla','arrester','relay','filter','cap','gen'];
const DESC={
  breaker:['Single-target trip that fires fast at the fault closest to the main. Armor slows it down until the Insulated Case tier, which pierces armor.','Pair it with a fuse upstream for a +25% coordination bonus.'],
  fuse:['Heavy hit on the highest-health enemy in range, ignoring armor. Burns out after a set number of shots and needs a $15 replacement.','Expulsion tier adds splash damage. Great against bosses.'],
  tesla:['Chain lightning that jumps between nearby enemies, losing a little damage each jump. Best against packs and colony pups.','Faraday Cage tier shields nearby towers from squirrels, arc flash, and lightning.'],
  arrester:['Pulses damage to every enemy around it, with 2.5× damage to surges. Diverts lightning strikes away from towers in its range.','Lightning Mast tier calls down a strike on the toughest enemy every 3.5s.'],
  relay:['Reveals invisible ground faults in its range so other towers can target them, and damages ground faults directly.','Upper tiers add a stun pulse, then slow everything in range.'],
  filter:['Beam that prioritizes harmonics and deals 3× damage to them and their ripples.','K-Rated tier stops harmonics from splitting when it kills them.'],
  cap:['Support tower. Doesn’t attack, but boosts the fire rate of towers in its range by 20% to 40%.','Static VAR tier also slows enemies passing through.'],
  gen:['Adds bus capacity and projects a supply ring. Towers only fire inside a ring and lose voltage near its edge. Pays income each wave.','Squirrels target generators first. Guard the ones you depend on.']
};

const DEFS={
  breaker:{name:'Circuit Breaker',short:'Breaker',tiers:[
    {name:'Thermal-Magnetic',cost:50,kw:15,dmg:12,rate:.55,range:85,rating:'100A'},
    {name:'Electronic Trip',cost:70,kw:8,dmg:18,rate:.4,range:105,rating:'225A'},
    {name:'Insulated Case',cost:120,kw:10,dmg:28,rate:.33,range:115,pierce:true,rating:'400A'}]},
  fuse:{name:'Fuse',short:'Fuse',tiers:[
    {name:'Current-Limiting',cost:40,kw:10,dmg:55,rate:1.1,range:80,shots:10},
    {name:'Dual-Element',cost:60,kw:5,dmg:75,rate:1,range:85,shots:18},
    {name:'Expulsion',cost:110,kw:8,dmg:95,rate:.95,range:90,shots:24,splash:42}]},
  tesla:{name:'Tesla Coil',short:'Tesla',tiers:[
    {name:'Tesla Coil',cost:110,kw:30,dmg:14,rate:.9,range:90,chains:3},
    {name:'Wide Arc',cost:120,kw:12,dmg:18,rate:.85,range:100,chains:5},
    {name:'Faraday Cage',cost:180,kw:15,dmg:24,rate:.8,range:105,chains:7,cage:70}]},
  arrester:{name:'Surge Arrester',short:'Arrester',tiers:[
    {name:'Station Class',cost:60,kw:10,dmg:9,rate:1.1,range:70},
    {name:'MOV Bank',cost:80,kw:8,dmg:13,rate:1,range:90},
    {name:'Lightning Mast',cost:150,kw:12,dmg:17,rate:.9,range:100,mast:true}]},
  relay:{name:'Ground Fault Relay',short:'GF Relay',tiers:[
    {name:'GFCI',cost:60,kw:8,dmg:8,rate:.8,range:90},
    {name:'Zero-Sequence CT',cost:70,kw:6,dmg:12,rate:.7,range:110,stun:true},
    {name:'Resistance Grounding',cost:120,kw:8,dmg:18,rate:.6,range:120,stun:true,slow:.65}]},
  filter:{name:'Harmonic Filter',short:'Filter',tiers:[
    {name:'Passive Tuned',cost:70,kw:12,dmg:7,rate:.5,range:95},
    {name:'Active Filter',cost:90,kw:10,dmg:11,rate:.36,range:105},
    {name:'K-Rated Isolation',cost:140,kw:10,dmg:15,rate:.3,range:115,nosplit:true}]},
  cap:{name:'Capacitor Bank',short:'Cap Bank',tiers:[
    {name:'Fixed Bank',cost:80,kw:5,range:80,boost:.2},
    {name:'Switched Bank',cost:90,kw:5,range:95,boost:.3},
    {name:'Static VAR Comp.',cost:150,kw:10,range:105,boost:.4,slow:.75}]},
  gen:{name:'Generator',short:'Gen',tiers:[
    {name:'Diesel Genset',cost:70,kw:0,cap:40,income:12,supply:150},
    {name:'Natural Gas',cost:100,kw:0,cap:70,income:20,supply:175},
    {name:'Microgrid',cost:160,kw:0,cap:110,income:32,supply:205}]}
};
const ETYPES={
  surge:{hp:30,spd:70,reward:6,dmg:1,r:9},
  harm:{hp:60,spd:42,reward:8,dmg:1,r:11},
  ripple:{hp:18,spd:62,reward:3,dmg:1,r:7},
  ground:{hp:140,spd:30,reward:14,dmg:2,r:12,armor:5},
  arc:{hp:700,spd:16,reward:120,dmg:8,r:18,armor:4,boss:true},
  hydra:{hp:900,spd:20,reward:120,dmg:8,r:19,armor:2,boss:true},
  wraith:{hp:1000,spd:19,reward:130,dmg:8,r:18,armor:5,boss:true},
  squirrel:{hp:170,spd:58,reward:40,dmg:3,r:12,sq:true,size:1.25},
  colony:{hp:380,spd:40,reward:60,dmg:5,r:18,sq:true,size:2},
  pup:{hp:55,spd:72,reward:10,dmg:1,r:8,sq:true,size:.85}
};

// ---------- campaign ----------
const LEVELS=[
  {name:'Strip Center',tag:'Radial feeder',labels:['UTILITY FEED 13.8kV'],
   lanes:[[[1,-1],[1,2],[7,2],[7,5],[1,5],[1,8],[7,8],[7,10],[4,10],[4,11.2]]],
   brief:'One radial feeder. Ground faults are invisible until a Ground Fault Relay sees them.',
   boss:'Squirrel Colony · splits into pups when it falls'},
  {name:'Hospital',tag:'Double-ended service',labels:['FEEDER A','FEEDER B'],
   lanes:[[[1,-1],[1,3],[3,3],[3,6],[1,6],[1,9],[2,9],[2,11.2]],[[7,-1],[7,3],[5,3],[5,6],[7,6],[7,9],[6,9],[6,11.2]]],
   brief:'Two feeders hit the main at once. Keep critical towers inside a generator ring.',
   boss:'Harmonic Hydra · sheds harmonics as it takes damage, during a utility outage'},
  {name:'Data Center',tag:'Ring bus',labels:['RING BUS 13.8kV'],
   lanes:[[[4,-1],[4,1],[1,1],[1,8],[4,8],[4,11.2]],[[4,-1],[4,1],[7,1],[7,8],[4,8],[4,11.2]]],
   brief:'The feed splits around the ring and rejoins. UPS and VFD loads mean heavy harmonics.',
   boss:'Arc Flash · burns out towers it passes. Faraday Cage protects.'},
  {name:'High-Rise',tag:'Twin risers',labels:['RISER A','RISER B'],
   lanes:[[[0,-1],[0,3],[4,3],[4,6],[1,6],[1,9],[4,9],[4,11.2]],[[8,-1],[8,3],[4,3],[4,6],[1,6],[1,9],[4,9],[4,11.2]]],
   brief:'Two risers merge mid-building. Surge Arresters divert lightning from towers in their range.',
   boss:'Ground Fault Wraith · invisible without a GF Relay and drains nearby towers, during a lightning storm'},
  {name:'Solar Farm',tag:'Three-phase',labels:['ØA','ØB','ØC'],
   lanes:[[[1,-1],[1,6],[2,6],[2,11.2]],[[4,-1],[4,11.2]],[[7,-1],[7,6],[6,6],[6,11.2]]],
   brief:'Three phases, three lanes, wide open pads. Build generator coverage early.',
   boss:'Total System Fault · outage, storm, arc flash and a colony at once'}
];
function buildWaves(L){
  const k=1+.08*L,n=x=>Math.max(1,Math.round(x*k)),dc=L===2;
  const w=[
    {g:[['surge',n(8),.9,0]]},
    {g:[['surge',n(10),.7,0],['harm',n(3),1.4,4]]},
    {g:[['surge',n(8),.6,0],['harm',n(4),1.2,3]]},
    {g:[['harm',n(6),1.1,0],['surge',n(6),.7,2]].concat(L>=1?[['squirrel',1,0,6]]:[])},
    {g:[['ground',n(4),1.8,0],['surge',n(8),.6,2]].concat(dc?[['harm',n(5),1,3]]:[])},
    {g:[['surge',n(12),.6,0],['squirrel',L>=3?2:1,3,5]].concat(dc?[['harm',n(6),.9,2]]:[])},
    {g:[['harm',n(8),1,0],['ground',n(4),1.6,3]]},
    {g:[['surge',n(12),.5,0],['ground',n(3),1.8,2],['harm',n(4),1.2,4]]},
    {g:[['surge',n(16),.4,0],['ground',n(5),1.4,2],['squirrel',L>=2?2:1,4,5]]},
  ];
  const boss=[
    {g:[['surge',n(12),.6,0],['harm',n(4),1.2,3],['colony',1,0,6]],boss:'Squirrel Colony'},
    {g:[['surge',n(14),.5,0],['ground',n(6),1.3,2],['harm',n(4),1,4],['hydra',1,0,7]],outage:true,boss:'Harmonic Hydra'},
    {g:[['harm',n(10),.8,0],['surge',n(10),.6,2],['arc',1,0,5]],boss:'Arc Flash'},
    {g:[['surge',n(24),.32,0],['ground',n(6),1.3,3],['squirrel',2,4,5],['wraith',1,0,6]],storm:true,boss:'Ground Fault Wraith'},
    {g:[['surge',n(16),.5,0],['harm',n(8),.9,2],['ground',n(6),1.3,3],['arc',1,0,6],['colony',1,0,12]],outage:true,storm:true,boss:'Total System Fault'}
  ][L];
  w.push(boss);return w;
}
let PATHS=[],blocked=new Set(),L=0,WAVES=[];
try{L=Math.min(LEVELS.length-1,Math.max(0,parseInt(localStorage.getItem('fl-level'))||0))}catch(e){}
function loadLevel(i){
  L=i;PATHS=[];blocked=new Set();WAVES=buildWaves(i);
  for(const lane of LEVELS[i].lanes){
    const wp=lane.map(([c,r])=>({x:c*TILE+20,y:r*TILE+20})),seg=[];let total=0;
    for(let k=0;k<wp.length-1;k++){const l=dist(wp[k],wp[k+1]);seg.push({a:wp[k],b:wp[k+1],s:total,l});total+=l}
    PATHS.push({wp,seg,total});
    for(let k=0;k<lane.length-1;k++){
      const [c1,r1]=lane[k],[c2,r2]=lane[k+1];
      if(c1===c2){for(let r=Math.max(0,Math.round(Math.min(r1,r2)));r<=Math.min(ROWS-1,Math.round(Math.max(r1,r2)));r++)blocked.add(c1+','+r)}
      else for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)blocked.add(c+','+Math.round(r1));
    }
  }
  for(let c=2;c<=6;c++)for(let r=11;r<=12;r++)blocked.add(c+','+r);
}
function pointAt(p,d){for(const s of p.seg){if(d<=s.s+s.l){const k=(d-s.s)/s.l;return{x:s.a.x+(s.b.x-s.a.x)*k,y:s.a.y+(s.b.y-s.a.y)*k}}}const l=p.wp[p.wp.length-1];return{x:l.x,y:l.y}}

// ---------- state ----------
let S,hover=null,drag=null;
function newGame(){
  loadLevel(L);
  S={money:200+50*L,lives:MAX_LIVES,wave:0,towers:[],enemies:[],fx:[],texts:[],q:[],waveT:0,active:false,lane:0,m:1,
     selected:null,placing:null,pending:null,speed:S?S.speed:1,over:null,shake:0,flash:0,toast:null,
     outage:false,storm:false,stormT:3,warnedGround:false,pairs:[],brief:true,alert:null,alerted:new Set(),
     banner:{t:'Level '+(L+1),s:LEVELS[L].name+' · '+LEVELS[L].tag,life:2.5,max:2.5},t:0};
  buildPanel();refreshTray();renderLevels();showConfirm();showBrief();
  if(typeof tutSeen==='function'){if(tut)endTut(false,true);if(L===0&&!tutSeen())startTut()}
}
const spec=t=>DEFS[t.type].tiers[t.tier];
const cap=()=>BASE_CAP+S.towers.filter(t=>t.type==='gen').reduce((a,t)=>a+spec(t).cap,0);
const towerKw=t=>DEFS[t.type].tiers.slice(0,t.tier+1).reduce((a,s)=>a+s.kw,0);
const load=()=>S.towers.reduce((a,t)=>a+towerKw(t),0);
const sellVal=t=>Math.floor(t.invested*.7);
const active=t=>t.powered&&t.disabled<=0&&!t.blown;
function sources(){const a=S.outage?[]:[SWGR];for(const t of S.towers)if(t.type==='gen'&&t.disabled<=0)a.push({x:t.x,y:t.y,r:spec(t).supply,gen:true});return a}
function voltageAt(x,y,src){let best=0;for(const s of src||sources()){const d=Math.hypot(s.x-x,s.y-y);if(d<=s.r){const v=1-.25*Math.min(1,Math.max(0,(d/s.r-.5)/.5));if(v>best)best=v}}return best}
const backupAt=(x,y)=>S.towers.some(t=>t.type==='gen'&&Math.hypot(t.x-x,t.y-y)<=spec(t).supply);
function toast(text){S.toast={text,life:2.4}}
function floatText(x,y,str,color){S.texts.push({x,y,str,color,life:1,max:1})}
function sparks(x,y,n,color,sp=90){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=rnd(20,sp);S.fx.push({k:'p',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.25,.6),max:.6,color})}}
function bolt(x1,y1,x2,y2,color,w,life=.13,jit=7){
  const pts=[],n=Math.max(3,Math.floor(Math.hypot(x2-x1,y2-y1)/11));
  for(let i=0;i<=n;i++){const k=i/n;let x=x1+(x2-x1)*k,y=y1+(y2-y1)*k;if(i&&i<n){x+=rnd(-jit,jit)/2;y+=rnd(-jit,jit)/2}pts.push([x,y])}
  S.fx.push({k:'bolt',pts,color,w,life,max:life});
}
function wave(x1,y1,x2,y2,color){
  const pts=[],len=Math.hypot(x2-x1,y2-y1),n=Math.max(6,Math.floor(len/4)),nx=-(y2-y1)/len,ny=(x2-x1)/len;
  for(let i=0;i<=n;i++){const k=i/n,o=Math.sin(k*len/5)*4;pts.push([x1+(x2-x1)*k+nx*o,y1+(y2-y1)*k+ny*o])}
  S.fx.push({k:'bolt',pts,color,w:2,life:.14,max:.14});
}
const ring=(x,y,r,color,life=.3)=>S.fx.push({k:'ring',x,y,r,life,max:life,color});

// ---------- placing / actions ----------
function canPlace(c,r,ignore){return c>=0&&r>=0&&c<COLS&&r<ROWS&&!blocked.has(c+','+r)&&!S.towers.some(t=>t!==ignore&&t.c===c&&t.r===r)}
function place(type,c,r){
  const s=DEFS[type].tiers[0];
  if(!canPlace(c,r)){toast('Pick an open pad');return false}
  if(S.money<s.cost){toast('Not enough credits');return false}
  if(load()+s.kw>cap()){toast('Bus overloaded · add a generator');return false}
  S.money-=s.cost;
  const t={type,c,r,x:c*TILE+20,y:r*TILE+20,tier:0,cd:0,scd:2,mcd:2,invested:s.cost,shots:s.shots||0,blown:false,disabled:0,guard:false,anim:0,powered:true,vf:1,coord:false,boost:0};
  S.towers.push(t);sparks(t.x,t.y,10,'#ffb547',60);
  if(type!=='gen'&&!voltageAt(t.x,t.y))floatText(t.x,t.y-22,'NO POWER','#ff6b5b');
  S.placing=null;S.pending=null;S.selected=t;buildPanel();refreshTray();showConfirm();
  return true;
}
function moveTower(t,c,r){
  if(!canPlace(c,r,t)){toast('Pick an open pad');return}
  t.c=c;t.r=r;t.x=c*TILE+20;t.y=r*TILE+20;t.cd=Math.max(t.cd,1);
  floatText(t.x,t.y-22,'MOVED','#9fd3ff');sparks(t.x,t.y,8,'#9fd3ff',50);
  S.selected=t;buildPanel();
}
function upgrade(t){
  const nx=DEFS[t.type].tiers[t.tier+1];if(!nx)return;
  if(S.money<nx.cost)return toast('Not enough credits');
  if(load()+nx.kw>cap())return toast('Bus overloaded · add a generator');
  S.money-=nx.cost;t.invested+=nx.cost;t.tier++;
  if(t.type==='fuse'){t.shots=nx.shots;t.blown=false}
  sparks(t.x,t.y,16,'#9fd3ff',90);floatText(t.x,t.y-22,nx.name.toUpperCase(),'#9fd3ff');buildPanel();
}
function guard(t){if(S.money<25)return toast('Not enough credits');S.money-=25;t.invested+=25;t.guard=true;floatText(t.x,t.y-22,'GUARDED','#ff8a3d');buildPanel()}
function replaceFuse(t){if(S.money<15)return toast('Not enough credits');S.money-=15;t.shots=spec(t).shots;t.blown=false;floatText(t.x,t.y-22,'REPLACED','#ffb547');buildPanel()}
function sell(t){
  if(t.type==='gen'&&load()>cap()-spec(t).cap)return toast("Can't sell: bus would overload");
  S.money+=sellVal(t);S.towers=S.towers.filter(o=>o!==t);S.selected=null;sparks(t.x,t.y,8,'#83919a');buildPanel();
}

// ---------- overlays ----------
function showConfirm(){
  const box=$('confirm'),p=S&&S.pending;
  if(!p){box.hidden=true;return}
  hideBrief();
  const s=DEFS[p.type].tiers[0],x=p.c*TILE+20,y=p.r*TILE+20,v=voltageAt(x,y);
  $('cTitle').textContent=`Place ${DEFS[p.type].short} here?`;
  const sub=$('cSub'),parts=['$'+s.cost];
  if(p.type==='gen')parts.push('+'+s.cap+' kW','supply '+s.supply+'px');
  else{parts.push(s.kw+' kW');parts.push(v?'voltage '+Math.round(v*100)+'%':'outside supply');if(v&&backupAt(x,y))parts.push('gen-backed')}
  sub.textContent=parts.join(' · ');sub.className=p.type==='gen'||v?'':'warn';
  box.classList.toggle('up',p.r>=7);box.hidden=false;
}
$('cYes').onclick=()=>{const p=S.pending;if(p)place(p.type,p.c,p.r);refreshTray()};
$('cNo').onclick=()=>{S.pending=null;S.placing=null;showConfirm();refreshTray()};
function showBrief(){
  const b=$('brief'),lv=LEVELS[L];
  if(!S.brief){b.hidden=true;return}
  b.innerHTML=`<div class="bt"><b>Level ${L+1} · ${lv.name}</b><span class="tag">${lv.tag}</span></div>
    <p>${lv.brief}</p><p class="boss">Wave 10 boss: ${lv.boss}</p><button class="btn" id="bOk">Got it</button>`;
  $('bOk').onclick=hideBrief;b.hidden=false;
}
function hideBrief(){if(S){S.brief=false}$('brief').hidden=true}

// ---------- waves ----------
function goPressed(){
  if(S.over==='win'){L=L+1<LEVELS.length?L+1:0;newGame();return}
  if(S.over==='lose'){newGame();return}
  if(S.active||S.wave>=WAVES_PER)return;
  hideBrief();
  const w=WAVES[S.wave];S.wave++;S.q=[];S.waveT=0;S.active=true;
  S.m=(1+.088*(S.wave-1))*(1+.15*L);
  const starts=new Set(LEVELS[L].lanes.map(l=>l[0].join())).size,mult=1+.2*(starts-1);
  for(const [type,count,int,start] of w.g){
    const solo=ETYPES[type].sq||ETYPES[type].boss,n=solo?count:Math.round(count*mult),gap=solo?int:int/mult*1.15;
    for(let i=0;i<n;i++)S.q.push({t:start+i*gap,type});
  }
  S.q.sort((a,b)=>a.t-b.t);S.alerted=new Set();
  S.outage=!!w.outage;S.storm=!!w.storm;S.stormT=2.5;
  const sq=w.g.some(g=>ETYPES[g[0]].sq);
  if(w.boss)S.banner={t:w.boss,s:w.outage&&w.storm?'Utility lost and lightning inbound':w.outage?'Utility lost · generators only':w.storm?'Arresters divert strikes':'Boss wave '+S.wave,life:2.8,max:2.8,warn:true};
  else S.banner={t:'Wave '+S.wave,s:sq?'Wildlife alert · squirrel inbound':'Disturbance on the feeder',life:2.2,max:2.2,warn:sq};
}
function spawn(type,at){
  const d=ETYPES[type],m=S.m;
  const e={type,hp:d.hp*m,maxhp:d.hp*m,spd:d.spd,reward:d.reward,dmg:d.dmg,r:d.r,armor:d.armor||0,d:0,pi:0,x:0,y:0,hit:0,dead:false,t:Math.random()*9,stun:0,inv:0,slow:1,revealed:0};
  if(d.sq){
    Object.assign(e,{sq:true,size:d.size,shorts:0,blocked:new Set(),target:null,zz:Math.random()*6,pause:0,revived:type!=='squirrel',face:1});
    if(at){e.x=at.x;e.y=at.y}else{e.x=rnd(40,320);e.y=-12}
  }else{
    if(at){e.pi=at.pi;e.d=at.d}else{e.pi=d.boss?0:S.lane++%PATHS.length}
    if(type==='hydra')e.shed=4;
    if(type==='wraith')e.drain=3;
    if(type==='ground'||type==='wraith'){e.stealth=true;if(!S.warnedGround&&!S.towers.some(t=>t.type==='relay')){S.warnedGround=true;toast('Ground faults are invisible · build a GF Relay')}}
    if(type==='arc')e.burn=2.5;
    const p=pointAt(PATHS[e.pi],e.d);e.x=p.x;e.y=p.y;
  }
  S.enemies.push(e);return e;
}

// ---------- combat ----------
const targetable=e=>!e.dead&&!(e.inv>0)&&(!e.stealth||e.revealed>0);
function inRange(t,range){return S.enemies.filter(e=>targetable(e)&&dist(e,t)<=range)}
const prog=e=>e.sq?-dist(e,SWGR):-(PATHS[e.pi].total-e.d);
function caged(t){return S.towers.some(o=>o.type==='tesla'&&o.tier===2&&active(o)&&dist(o,t)<=70)}
function damage(e,amt,pierce){
  if(e.dead||e.inv>0)return;
  if(!pierce&&e.armor)amt=Math.max(1,amt-e.armor);
  e.hp-=amt;e.hit=.08;
  if(e.type==='hydra'){while(e.shed>0&&e.hp>0&&e.hp<=e.maxhp*e.shed/5){e.shed--;floatText(e.x,e.y-26,'SHED','#c9a3ff');sparks(e.x,e.y,10,'#c9a3ff');for(let i=0;i<2;i++)spawn('harm',{pi:e.pi,d:Math.max(0,e.d-10-i*14)})}}
  if(e.hp<=0)kill(e);
}
function kill(e){
  if(e.sq&&!e.revived){
    e.revived=true;e.inv=1.6;e.stun=1.6;e.hp=e.maxhp*.6;e.spd*=1.45;e.target=null;
    floatText(e.x,e.y-20,'NINE LIVES!','#ff6b5b');sparks(e.x,e.y,14,'#c58a5a');return;
  }
  e.dead=true;S.money+=e.reward;floatText(e.x,e.y-14,'+$'+e.reward,'#ffb547');
  sparks(e.x,e.y,e.sq?20:e.type==='arc'?40:8,e.sq?'#c58a5a':e.type==='arc'?'#bfe3ff':'#ffe066');
  if(e.type==='harm'&&!e.noSplit)for(let i=0;i<2;i++)spawn('ripple',{pi:e.pi,d:Math.max(0,e.d-6+i*12)});
  if(e.type==='colony'){for(let i=0;i<3;i++)spawn('pup',{x:e.x+rnd(-14,14),y:e.y+rnd(-14,14)});toast('Colony split into pups')}
  if(e.type==='arc'){toast('Arc flash cleared');S.shake=.3}
  if(e.type==='hydra'){if(!e.noSplit)for(let i=0;i<4;i++)spawn('harm',{pi:e.pi,d:Math.max(0,e.d-i*12)});toast(e.noSplit?'Hydra filtered out':'Hydra burst into harmonics');S.shake=.3}
  if(e.type==='wraith'){toast('Wraith grounded');S.shake=.3}
}

function updateTower(t,dt){
  t.anim=Math.max(0,t.anim-dt);
  if(t.disabled>0){t.disabled-=dt;if(Math.random()<.15)sparks(t.x+rnd(-8,8),t.y+rnd(-8,8),1,'#ff6b5b',40);return}
  if(t.type==='gen'||t.type==='cap'||t.blown||!t.powered)return;
  const s=spec(t),mult=t.vf*(t.coord?1.25:1);
  t.cd-=dt*(1+t.boost);
  if(s.mast){t.mcd-=dt;if(t.mcd<=0){
    const c=S.enemies.filter(e=>targetable(e)&&dist(e,t)<=160).sort((a,b)=>b.hp-a.hp)[0];
    if(c){t.mcd=3.5;bolt(c.x+rnd(-20,20),-10,c.x,c.y,'#e8f0ff',3,.25,26);ring(c.x,c.y,40,'#e8f0ff',.35);S.flash=.12;
      damage(c,120*mult,true);for(const o of S.enemies)if(o!==c&&targetable(o)&&dist(o,c)<=40)damage(o,60*mult,true)}
  }}
  if(s.stun){t.scd-=dt;if(t.scd<=0){const l=inRange(t,s.range);if(l.length){t.scd=4;ring(t.x,t.y,s.range,'#5adc8c',.4);for(const e of l)e.stun=Math.max(e.stun,e.type==='ground'?1:ETYPES[e.type].boss?.25:.4)}}}
  if(t.cd>0)return;
  let list=inRange(t,s.range);if(!list.length)return;
  if(t.type==='breaker'){
    list.sort((a,b)=>prog(b)-prog(a));const e=list[0];t.cd=s.rate;t.anim=.15;
    bolt(t.x,t.y-12,e.x,e.y,'#9fd3ff',2);damage(e,s.dmg*mult,s.pierce);
  }else if(t.type==='fuse'){
    list.sort((a,b)=>b.hp-a.hp);const e=list[0];t.cd=s.rate;t.anim=.15;
    bolt(t.x,t.y-12,e.x,e.y,'#ff9a3c',4,.16,10);damage(e,s.dmg*mult,true);ring(e.x,e.y,s.splash||14,'#ff9a3c',.25);
    if(s.splash)for(const o of S.enemies)if(o!==e&&targetable(o)&&dist(o,e)<=s.splash)damage(o,s.dmg*mult*.5,true);
    t.shots--;
    if(t.shots<=0){t.blown=true;floatText(t.x,t.y-22,'BLOWN','#ff6b5b');sparks(t.x,t.y-6,12,'#777');if(S.selected===t)buildPanel()}
  }else if(t.type==='tesla'){
    list.sort((a,b)=>prog(b)-prog(a));t.cd=s.rate;t.anim=.15;
    let from={x:t.x,y:t.y-14},cur=list[0],hit=new Set(),dmg=s.dmg*mult;
    for(let i=0;i<s.chains&&cur;i++){
      bolt(from.x,from.y,cur.x,cur.y,'#c9b8ff',2.5,.18,12);damage(cur,dmg,false);hit.add(cur);
      from=cur;dmg*=.85;
      let nx=null,nd=60;for(const o of S.enemies)if(targetable(o)&&!hit.has(o)){const d=dist(o,from);if(d<nd){nd=d;nx=o}}
      cur=nx;
    }
  }else if(t.type==='arrester'){
    t.cd=s.rate;t.anim=.2;ring(t.x,t.y,s.range,'#ffe066',.3);
    for(const e of list)damage(e,s.dmg*mult*(e.type==='surge'?2.5:1),false);
  }else if(t.type==='relay'){
    const g=list.filter(e=>e.type==='ground'||e.type==='wraith');if(!g.length)return;
    t.cd=s.rate;t.anim=.15;
    for(const e of g){bolt(t.x,t.y-6,e.x,e.y,'#5adc8c',1.5,.12,5);damage(e,s.dmg*mult,true)}
  }else if(t.type==='filter'){
    const isH=e=>e.type==='harm'||e.type==='ripple'||e.type==='hydra';
    list.sort((a,b)=>(isH(b)-isH(a))||(prog(b)-prog(a)));const e=list[0];t.cd=s.rate;t.anim=.15;
    wave(t.x,t.y-8,e.x,e.y,'#7ee0d0');
    if(s.nosplit&&isH(e))e.noSplit=true;
    damage(e,s.dmg*mult*(isH(e)?3:1),false);
  }
}
function sqTarget(e){
  let best=null,bd=1e9;
  for(const t of S.towers){if(e.blocked.has(t)||t.disabled>0)continue;const d=dist(e,t)*(t.type==='gen'?.55:1);if(d<bd){bd=d;best=t}}
  return best;
}
function arcBurn(e){
  ring(e.x,e.y,75,'#bfe3ff',.45);S.shake=.15;
  for(const t of S.towers)if(dist(t,e)<=75){
    if(caged(t)){floatText(t.x,t.y-22,'SHIELDED','#c9b8ff');continue}
    t.disabled=Math.max(t.disabled,2.5);floatText(t.x,t.y-22,'BURNED','#bfe3ff');sparks(t.x,t.y,10,'#bfe3ff',90);
  }
}
function wraithDrain(e){
  ring(e.x,e.y,70,'#5adc8c',.45);
  for(const t of S.towers)if(dist(t,e)<=70){
    if(caged(t)){floatText(t.x,t.y-22,'SHIELDED','#c9b8ff');continue}
    t.disabled=Math.max(t.disabled,2.2);floatText(t.x,t.y-22,'DRAINED','#5adc8c');
    S.fx.push({k:'bolt',pts:[[t.x,t.y],[(t.x+e.x)/2+rnd(-8,8),(t.y+e.y)/2+rnd(-8,8)],[e.x,e.y]],color:'#5adc8c',w:1.5,life:.3,max:.3});
    if(e.hp<e.maxhp)e.hp=Math.min(e.maxhp,e.hp+e.maxhp*.02);
  }
}
function updateEnemy(e,dt){
  e.t+=dt;e.hit=Math.max(0,e.hit-dt);if(e.inv>0)e.inv-=dt;
  if(e.type==='arc'){e.burn-=dt;if(e.burn<=0){e.burn=3;arcBurn(e)}}
  if(e.type==='wraith'){e.drain-=dt;if(e.drain<=0){e.drain=2.6;wraithDrain(e)}}
  if(e.stun>0){e.stun-=dt;return}
  const spd=e.spd*e.slow;
  if(!e.sq){
    const P=PATHS[e.pi];e.d+=spd*dt;const p=pointAt(P,e.d);e.x=p.x;e.y=p.y;
    if(e.d>=P.total)breach(e);
    return;
  }
  if(e.pause>0){e.pause-=dt;return}
  if(e.target&&(!S.towers.includes(e.target)||e.target.disabled>0))e.target=null;
  if(!e.target&&e.shorts<3)e.target=sqTarget(e);
  const goal=e.target||SWGR;
  const dx=goal.x-e.x,dy=goal.y-e.y,dd=Math.hypot(dx,dy)||1;
  if(dd<12){
    if(e.target){
      const t=e.target;e.blocked.add(t);e.target=null;
      if(t.guard||caged(t)){damage(e,25,true);floatText(t.x,t.y-22,'ZAP','#ff8a3d');sparks(t.x,t.y,10,'#ff8a3d');e.pause=.4}
      else{t.disabled=4;e.shorts++;e.pause=.7;floatText(t.x,t.y-22,t.type==='gen'?'GEN DOWN!':'SHORTED!','#ff6b5b');sparks(t.x,t.y,18,'#ff6b5b',120);S.shake=.2}
    }else breach(e);
    return;
  }
  e.zz+=dt*7;
  const ux=dx/dd,uy=dy/dd,wob=Math.sin(e.zz)*.85;
  const vx=(ux-uy*wob)*spd,vy=(uy+ux*wob)*spd;
  e.x+=vx*dt;e.y+=vy*dt;if(Math.abs(vx)>4)e.face=vx>0?1:-1;
}
function breach(e){
  e.dead=true;S.lives=Math.max(0,S.lives-e.dmg);S.shake=.35;
  floatText(SWGR.x+rnd(-30,30),SWGR.y-30,'-'+e.dmg+' GRID','#ff6b5b');sparks(e.x,e.y,12,'#ff6b5b');
  if(S.lives<=0&&!S.over){S.over='lose';S.active=false;S.outage=S.storm=false;S.banner={t:'Blackout',s:LEVELS[L].name+' went dark on wave '+S.wave,life:1e9,max:1e9,warn:true}}
}
function lightning(){
  let target=null,x=rnd(30,330),y=rnd(60,420);
  if(S.towers.length&&Math.random()<.75){target=S.towers[Math.floor(Math.random()*S.towers.length)];x=target.x;y=target.y}
  const arr=target&&S.towers.find(a=>a.type==='arrester'&&active(a)&&dist(a,target)<=spec(a).range);
  S.flash=.25;
  if(arr){
    bolt(arr.x+rnd(-30,30),-10,arr.x,arr.y-16,'#e8f0ff',3,.3,30);floatText(arr.x,arr.y-24,'DIVERTED','#ffe066');ring(arr.x,arr.y,spec(arr).range,'#ffe066',.4);
    for(const e of inRange(arr,spec(arr).range))damage(e,40,true);
    return;
  }
  bolt(x+rnd(-30,30),-10,x,y,'#e8f0ff',3,.3,30);ring(x,y,30,'#e8f0ff',.3);
  if(target){if(caged(target))floatText(x,y-22,'SHIELDED','#c9b8ff');else{target.disabled=Math.max(target.disabled,3);floatText(x,y-22,'STRUCK','#ff6b5b');sparks(x,y,14,'#e8f0ff',110)}}
  for(const e of S.enemies)if(targetable(e)&&Math.hypot(e.x-x,e.y-y)<=30)damage(e,30,true);
}

// ---------- step ----------
function computeGrid(){
  const src=sources();
  for(const t of S.towers){t.vf=t.type==='gen'?1:voltageAt(t.x,t.y,src);t.powered=t.vf>0;t.coord=false;t.boost=0}
  S.pairs=[];
  const br=S.towers.filter(t=>t.type==='breaker'),fu=S.towers.filter(t=>t.type==='fuse');
  for(const b of br)for(const f of fu)if(dist(b,f)<=120&&dist(f,SWGR)>dist(b,SWGR)+10){b.coord=f.coord=true;S.pairs.push([b,f])}
  for(const c of S.towers)if(c.type==='cap'&&active(c)){const s=spec(c);for(const t of S.towers)if(t!==c&&t.type!=='gen'&&t.type!=='cap'&&dist(t,c)<=s.range)t.boost=Math.max(t.boost,s.boost)}
}
function auras(dt){
  for(const e of S.enemies){e.slow=1;if(e.revealed>0)e.revealed-=dt}
  for(const t of S.towers){
    if(!active(t))continue;const s=spec(t);
    if(t.type==='relay')for(const e of S.enemies)if(dist(e,t)<=s.range){if(e.type==='ground'||e.type==='wraith')e.revealed=1.2;if(s.slow)e.slow=Math.min(e.slow,s.slow)}
    if(t.type==='cap'&&s.slow)for(const e of S.enemies)if(dist(e,t)<=s.range)e.slow=Math.min(e.slow,s.slow);
  }
}
function step(dt){
  S.t+=dt;
  computeGrid();
  if(!S.over&&S.active){
    S.waveT+=dt;
    while(S.q.length&&S.q[0].t<=S.waveT)spawn(S.q.shift().type);
    for(const q of S.q){if(q.t-S.waveT>3)break;const a=ALERT[q.type];if(a&&!S.alerted.has(q.type)){S.alerted.add(q.type);const tx=typeof a==='function'?a():a;if(tx)S.alert={text:tx,life:3.4}}}
    auras(dt);
    if(S.storm){S.stormT-=dt;if(S.stormT<=0){S.stormT=rnd(2.2,3.6);lightning()}}
    for(const e of S.enemies)if(!e.dead)updateEnemy(e,dt);
    for(const t of S.towers)updateTower(t,dt);
    S.enemies=S.enemies.filter(e=>!e.dead);
    if(!S.q.length&&!S.enemies.length&&!S.over){
      S.active=false;S.outage=S.storm=false;
      const inc=S.towers.filter(t=>t.type==='gen').reduce((a,t)=>a+spec(t).income,0);
      const bonus=30+5*L+inc;S.money+=bonus;
      if(S.wave>=WAVES_PER){
        S.over='win';
        const last=L+1>=LEVELS.length;
        try{localStorage.setItem('fl-level',last?0:L+1)}catch(e){}
        S.banner=last?{t:'Campaign complete',s:'Every site energized. Nice protection work.',life:1e9,max:1e9}:{t:LEVELS[L].name+' secured',s:'Level '+(L+2)+' unlocked: '+LEVELS[L+1].name,life:1e9,max:1e9};
        renderLevels();
      }else S.banner={t:'Wave '+S.wave+' cleared',s:'+$'+bonus+(inc?' (incl. $'+inc+' generation)':''),life:2.2,max:2.2};
    }
  }else{for(const t of S.towers){t.anim=Math.max(0,t.anim-dt);if(t.disabled>0)t.disabled-=dt}}
  for(const f of S.fx){f.life-=dt;if(f.k==='p'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.92;f.vy*=.92}}
  S.fx=S.fx.filter(f=>f.life>0);
  for(const x of S.texts){x.life-=dt;x.y-=22*dt}
  S.texts=S.texts.filter(x=>x.life>0);
  if(S.toast&&(S.toast.life-=dt)<=0)S.toast=null;
  if(S.alert&&(S.alert.life-=dt)<=0)S.alert=null;
  if(S.banner&&(S.banner.life-=dt)<=0)S.banner=null;
  S.shake=Math.max(0,S.shake-dt);S.flash=Math.max(0,S.flash-dt);
}

// ---------- drawing ----------
function rr(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r)}
function drawBase(g){g.fillStyle='#0b0f12';g.beginPath();g.arc(0,2,16,0,7);g.fill();g.strokeStyle='#2c363c';g.lineWidth=1.5;g.stroke()}
function drawTower(g,t,x,y,time){
  g.save();g.translate(x,y);
  const dim=t.type!=='gen'&&t.powered===false;
  if(dim)g.globalAlpha*=.45;
  if(t.type==='gen'){
    g.fillStyle='#0b0f12';rr(g,-16,-14,32,30,4);g.fill();g.strokeStyle='#2c363c';g.lineWidth=1.5;g.stroke();
    g.fillStyle=['#4a6b4d','#3f6676','#62538a'][t.tier];rr(g,-13,-9,26,19,3);g.fill();
    g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;for(let i=-8;i<=2;i+=3){g.beginPath();g.moveTo(i,-6);g.lineTo(i,7);g.stroke()}
    g.fillStyle='#8c979e';g.fillRect(7,-17,4,9);
    g.fillStyle=t.disabled>0?'#ff6b5b':Math.sin(time*4)>0?'#7fd49b':'#2c4a34';g.beginPath();g.arc(8,3,2.2,0,7);g.fill();
    if(t.disabled<=0&&Math.sin(time*3+x)>.6){g.fillStyle='rgba(200,210,215,.25)';g.beginPath();g.arc(9+Math.sin(time*5)*2,-21-((time*20)%6),3,0,7);g.fill()}
  }else{
    drawBase(g);
    if(t.type==='breaker'){
      g.fillStyle=['#5d6870','#4a6680','#33557a'][t.tier];rr(g,-11,-14,22,28,3);g.fill();g.strokeStyle='#97aab5';g.lineWidth=1;g.stroke();
      g.fillStyle='#0d1114';rr(g,-6,-10,12,13,2);g.fill();
      g.fillStyle='#e8eef0';g.fillRect(-3,t.anim>0?-3:-9,6,6);
      g.fillStyle='#cfd8dc';g.font='600 6px "IBM Plex Mono",monospace';g.textAlign='center';g.fillText(DEFS.breaker.tiers[t.tier].rating,0,10);
    }else if(t.type==='fuse'){
      g.fillStyle='#b8713e';g.fillRect(-8,-15,16,4);g.fillRect(-8,11,16,4);
      const s=DEFS.fuse.tiers[t.tier];
      g.fillStyle=t.blown?'#3a332b':['#d9cba8','#ccb27c','#b88b4e'][t.tier];rr(g,-6,-13,12,26,5);g.fill();
      g.fillStyle='#1a1a1a';g.fillRect(-2.5,-8,5,16);
      if(!t.blown){const k=t.shots/s.shots;g.fillStyle=k>.3?'#ffb547':'#ff6b5b';g.fillRect(-2.5,8-16*k,5,16*k)}
      else{g.strokeStyle='#111';g.lineWidth=1.5;g.beginPath();g.moveTo(-4,-4);g.lineTo(4,4);g.moveTo(4,-4);g.lineTo(-4,4);g.stroke();
        if(Math.random()<.3){g.fillStyle='rgba(150,150,150,.3)';g.beginPath();g.arc(rnd(-3,3),-16-rnd(0,6),2.5,0,7);g.fill()}}
    }else if(t.type==='tesla'){
      g.strokeStyle='#b8713e';g.lineWidth=1.6;
      for(let i=0;i<6;i++){g.beginPath();g.ellipse(0,11-i*3.2,6,1.6,0,0,7);g.stroke()}
      g.fillStyle='#4d5960';g.fillRect(-1.5,-8,3,8);
      const tr=[10,12,14][t.tier];
      g.fillStyle='#a9b6bf';g.beginPath();g.ellipse(0,-11,tr,4.5,0,0,7);g.fill();g.fillStyle='#6c7a83';g.beginPath();g.ellipse(0,-12,tr-5,1.6,0,0,7);g.fill();
      if(t.disabled<=0&&!dim&&Math.random()<.35){g.strokeStyle='rgba(201,184,255,.8)';g.lineWidth=1;g.beginPath();const a=rnd(0,6.28);g.moveTo(Math.cos(a)*tr,-11);g.lineTo(Math.cos(a)*(tr+6)+rnd(-3,3),-11+rnd(-8,4));g.stroke()}
      if(t.tier===2){g.strokeStyle='rgba(201,184,255,.18)';g.setLineDash([3,4]);g.lineWidth=1;g.beginPath();g.arc(0,0,21,0,7);g.stroke();g.setLineDash([])}
    }else if(t.type==='arrester'){
      g.strokeStyle='#5a6268';g.lineWidth=2;g.beginPath();g.moveTo(0,14);g.lineTo(0,-12);g.stroke();
      const col=['#8a5a3c','#a9b3b8','#c8ced2'][t.tier];
      for(let i=0;i<4;i++){g.fillStyle=col;g.beginPath();g.ellipse(0,9-i*6,8-i*.6,2.6,0,0,7);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,10-i*6,6-i*.6,1.2,0,0,7);g.fill()}
      g.fillStyle='#6c757b';g.fillRect(-4,-15,8,4);
      if(t.tier===2){g.strokeStyle='#c8ced2';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-15);g.lineTo(0,-25);g.stroke();g.fillStyle='#ffe066';g.beginPath();g.arc(0,-25,2,0,7);g.fill()}
      if(t.anim>0){g.strokeStyle='#ffe066';g.lineWidth=1;g.beginPath();g.moveTo(-3,-13);g.lineTo(3,-16);g.stroke()}
    }else if(t.type==='relay'){
      g.fillStyle=['#3d5a48','#2f5a52','#2c4f63'][t.tier];rr(g,-11,-14,22,26,3);g.fill();g.strokeStyle='#7da38a';g.lineWidth=1;g.stroke();
      g.strokeStyle='#cfd8dc';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-14);g.lineTo(0,6);g.stroke();
      g.strokeStyle=t.anim>0?'#bfffd5':'#5adc8c';g.lineWidth=3;g.beginPath();g.arc(0,-5,5.5,0,7);g.stroke();
      g.strokeStyle='#cfd8dc';g.lineWidth=1.4;g.beginPath();g.moveTo(-5,6);g.lineTo(5,6);g.moveTo(-3.5,8.5);g.lineTo(3.5,8.5);g.moveTo(-1.8,11);g.lineTo(1.8,11);g.stroke();
    }else if(t.type==='filter'){
      g.fillStyle=['#2d3f45','#24464a','#1f4a4f'][t.tier];rr(g,-12,-12,24,24,3);g.fill();g.strokeStyle='#5f8c8a';g.lineWidth=1;g.stroke();
      g.strokeStyle='#b8713e';g.lineWidth=1.5;g.beginPath();for(let i=0;i<4;i++)g.arc(-6+i*4,-8,2,Math.PI,0);g.stroke();
      g.strokeStyle='#7ee0d0';g.lineWidth=1.6;g.beginPath();for(let xx=-9;xx<=9;xx++)g.lineTo(xx,3+Math.sin(xx*.7+(t.anim>0?time*30:0))*4);g.stroke();
    }else if(t.type==='cap'){
      const cans=t.tier===0?2:3;
      for(let i=0;i<cans;i++){const cx=(i-(cans-1)/2)*8;
        g.fillStyle='#5a7590';rr(g,cx-3.5,-11,7,20,2);g.fill();g.fillStyle='#9fb4c6';g.beginPath();g.ellipse(cx,-11,3.5,1.4,0,0,7);g.fill();
        g.fillStyle='#cfd8dc';g.fillRect(cx-.7,-15,1.4,4)}
      g.fillStyle='#2b343a';g.fillRect(-13,9,26,3);
      if(t.tier===2){g.fillStyle='rgba(255,181,71,'+(.5+.5*Math.sin(time*6))+')';g.fillRect(-12,13,24,1.6)}
    }
  }
  for(let i=0;i<=t.tier;i++){g.fillStyle='#ffb547';g.fillRect(-7+i*5,17,3,3)}
  if(t.guard){g.fillStyle='#ff8a3d';g.beginPath();g.moveTo(-15,16);g.lineTo(-11,6);g.lineTo(-7,16);g.closePath();g.fill();g.fillStyle='#fff';g.fillRect(-13,11,4,1.5)}
  if(t.coord){g.fillStyle='#7fd49b';rr(g,-17,-18,9,9,2);g.fill();g.fillStyle='#0b0f12';g.font='700 7px "IBM Plex Mono",monospace';g.textAlign='center';g.fillText('C',-12.5,-11)}
  if(t.boost>0&&!dim){g.fillStyle='#9fd3ff';g.beginPath();g.moveTo(14,12);g.lineTo(17,8);g.lineTo(20,12);g.closePath();g.fill()}
  if(dim){
    g.globalAlpha=Math.min(1,g.globalAlpha/.45)*(.6+.4*Math.sin(time*5));
    g.fillStyle='#0b0f12';g.beginPath();g.arc(12,-13,7,0,7);g.fill();g.strokeStyle='#ff6b5b';g.lineWidth=1.5;g.stroke();
    g.beginPath();g.moveTo(13,-18);g.lineTo(10,-12.5);g.lineTo(14,-13.5);g.lineTo(11,-8);g.stroke();
  }
  if(t.disabled>0){
    g.fillStyle='rgba(255,107,91,'+(0.18+0.12*Math.sin(time*20))+')';g.beginPath();g.arc(0,0,18,0,7);g.fill();
    g.strokeStyle='#ff6b5b';g.lineWidth=1.5;g.beginPath();g.moveTo(-6,-14);g.lineTo(-1,-5);g.lineTo(-5,-3);g.lineTo(2,8);g.stroke();
  }
  g.restore();
}
function drawSquirrel(g,e,T){
  g.scale(e.face*e.size,e.size);
  const hop=e.stun>0||e.pause>0?0:Math.abs(Math.sin(T*14))*-2.5;
  g.translate(0,hop);
  const fur=e.type==='colony'?'#5e3a24':'#a06a43',tail=e.type==='colony'?'#4a2d1c':'#7a4d31';
  g.fillStyle=tail;g.beginPath();g.moveTo(-5,2);g.bezierCurveTo(-19,5,-22,-15,-11,-18);g.bezierCurveTo(-4,-20,-1,-13,-7,-11);g.bezierCurveTo(-12,-9,-11,-1,-3,0);g.fill();
  g.fillStyle=fur;g.beginPath();g.ellipse(0,2,8.5,6,0,0,7);g.fill();
  g.fillStyle='#d9b48a';g.beginPath();g.ellipse(3,4,4.5,3.2,0,0,7);g.fill();
  g.fillStyle=fur;g.beginPath();g.arc(7.5,-3.5,5,0,7);g.fill();
  g.beginPath();g.moveTo(5,-7);g.lineTo(6.5,-12);g.lineTo(8.5,-7.5);g.fill();
  g.fillStyle=e.revived&&e.type==='squirrel'||e.type==='colony'?'#ff4d4d':'#111';g.beginPath();g.arc(9.6,-4.3,1.3,0,7);g.fill();
  g.fillStyle='#2a1a10';g.beginPath();g.arc(12.3,-2.6,.9,0,7);g.fill();
  g.strokeStyle='#5a3823';g.lineWidth=1.6;const k=Math.sin(T*18)*2;
  g.beginPath();g.moveTo(-3,7);g.lineTo(-4+k,10);g.moveTo(4,7);g.lineTo(5-k,10);g.stroke();
  if(e.type==='colony'){g.fillStyle='#ffb547';g.beginPath();g.moveTo(4,-9);g.lineTo(5,-13);g.lineTo(7,-10.5);g.lineTo(9,-14);g.lineTo(10,-9);g.closePath();g.fill()}
  if(e.stun>0){g.fillStyle='#ffe066';for(let i=0;i<3;i++){const a=T*5+i*2.1;g.beginPath();g.arc(Math.cos(a)*9,-13+Math.sin(a)*3,1.6,0,7);g.fill()}}
}
function drawEnemy(g,e,time){
  g.save();g.translate(e.x,e.y);
  const T=time+e.t;
  if(e.stealth&&!(e.revealed>0))g.globalAlpha=.14+.08*Math.sin(T*6);
  if(e.type==='surge'){
    g.fillStyle='rgba(255,224,102,.18)';g.beginPath();g.arc(0,0,15,0,7);g.fill();
    g.rotate(T*3);g.fillStyle='#ffe066';g.beginPath();
    for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?4:10+Math.sin(T*10+i)*1.5;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
    g.closePath();g.fill();
  }else if(e.type==='harm'||e.type==='ripple'){
    const R=e.r,lobes=e.type==='harm'?5:3;
    g.beginPath();for(let a=0;a<=6.3;a+=.15){const r=R+2.6*Math.sin(lobes*a+T*6);g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();
    g.fillStyle='rgba(176,124,255,.35)';g.fill();g.strokeStyle='#c9a3ff';g.lineWidth=2;g.stroke();
    g.strokeStyle='#e8dcff';g.lineWidth=1.2;g.beginPath();for(let x=-R*.6;x<=R*.6;x+=1){g.lineTo(x,Math.sin(x*.6+T*8)*R*.25)}g.stroke();
  }else if(e.type==='hydra'){
    const R=e.r;
    g.beginPath();for(let a=0;a<=6.3;a+=.1){const r=R+4*Math.sin(7*a+T*5)+2*Math.sin(3*a-T*7);g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();
    g.fillStyle='rgba(150,90,255,.4)';g.fill();g.strokeStyle='#c9a3ff';g.lineWidth=2.4;g.stroke();
    for(let i=0;i<Math.max(1,e.shed+1);i++){const a=T*1.5+i*6.28/Math.max(1,e.shed+1),hx=Math.cos(a)*(R+7),hy=Math.sin(a)*(R+7);
      g.fillStyle='#2a1745';g.beginPath();g.arc(hx,hy,4.5,0,7);g.fill();g.strokeStyle='#e8dcff';g.lineWidth=1.2;g.stroke();g.fillStyle='#ff6b5b';g.beginPath();g.arc(hx,hy,1.3,0,7);g.fill()}
    g.strokeStyle='#f1e9ff';g.lineWidth=1.6;g.beginPath();for(let x=-R*.7;x<=R*.7;x+=1){g.lineTo(x,Math.sin(x*.5+T*9)*R*.3+Math.sin(x*1.4-T*6)*2)}g.stroke();
  }else if(e.type==='wraith'){
    const R=e.r;
    g.fillStyle='rgba(90,220,140,.16)';g.beginPath();g.arc(0,0,R+10,0,7);g.fill();
    g.fillStyle='rgba(20,40,30,.85)';g.beginPath();g.moveTo(-R,4);g.quadraticCurveTo(-R,-R-4,0,-R-4);g.quadraticCurveTo(R,-R-4,R,4);
    for(let i=0;i<=4;i++){const x=R-i*R/2;g.lineTo(x,R+Math.sin(T*8+i)*3-(i%2?5:0))}g.closePath();g.fill();
    g.strokeStyle='#5adc8c';g.lineWidth=1.6;g.stroke();
    g.fillStyle='#bfffd5';g.beginPath();g.arc(-5,-5,2.2,0,7);g.arc(5,-5,2.2,0,7);g.fill();
    g.strokeStyle='#5adc8c';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(0,5);g.moveTo(-8,5);g.lineTo(8,5);g.moveTo(-5,9);g.lineTo(5,9);g.moveTo(-2,13);g.lineTo(2,13);g.stroke();
    if(e.drain<.6){g.strokeStyle='rgba(90,220,140,'+(1-e.drain/.6)+')';g.lineWidth=2;g.beginPath();g.arc(0,0,70*(1-e.drain/.6),0,7);g.stroke()}
    if(e.revealed>0){g.strokeStyle='#bfffd5';g.lineWidth=1.2;for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.beginPath();g.moveTo(sx*24,sy*16);g.lineTo(sx*24,sy*24);g.lineTo(sx*16,sy*24);g.stroke()}}
  }else if(e.type==='ground'){
    g.fillStyle='rgba(90,220,140,.2)';g.beginPath();g.arc(0,0,12,0,7);g.fill();
    g.strokeStyle='#5adc8c';g.lineWidth=2;g.setLineDash([4,3]);g.lineDashOffset=-T*12;g.stroke();g.setLineDash([]);
    g.lineWidth=1.8;g.beginPath();g.moveTo(0,-7);g.lineTo(0,0);g.moveTo(-6,0);g.lineTo(6,0);g.moveTo(-4,3);g.lineTo(4,3);g.moveTo(-2,6);g.lineTo(2,6);g.stroke();
    if(e.revealed>0){g.strokeStyle='#bfffd5';g.lineWidth=1.2;for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.beginPath();g.moveTo(sx*16,sy*10);g.lineTo(sx*16,sy*16);g.lineTo(sx*10,sy*16);g.stroke()}}
  }else if(e.type==='arc'){
    const R=e.r+Math.sin(T*20)*2;
    const gr=g.createRadialGradient(0,0,2,0,0,R+12);gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,'#d6ecff');gr.addColorStop(.7,'rgba(140,150,255,.55)');gr.addColorStop(1,'rgba(120,100,255,0)');
    g.fillStyle=gr;g.beginPath();g.arc(0,0,R+12,0,7);g.fill();
    g.strokeStyle='rgba(230,240,255,.9)';g.lineWidth=1.4;
    for(let i=0;i<5;i++){const a=rnd(0,6.28);g.beginPath();g.moveTo(Math.cos(a)*8,Math.sin(a)*8);g.lineTo(Math.cos(a+rnd(-.4,.4))*(R+8),Math.sin(a+rnd(-.4,.4))*(R+8));g.stroke()}
    if(e.burn<.6){g.strokeStyle='rgba(191,227,255,'+(1-e.burn/.6)+')';g.lineWidth=2;g.beginPath();g.arc(0,0,75*(1-e.burn/.6),0,7);g.stroke()}
  }else if(e.sq){drawSquirrel(g,e,T)}
  g.restore();
  if(e.stealth&&!(e.revealed>0))return;
  if(e.hit>0){g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.arc(e.x,e.y,e.r,0,7);g.fill()}
  if(e.hp<e.maxhp){const w=ETYPES[e.type].boss||e.type==='colony'?36:e.sq?26:18,y=e.y-e.r-(e.type==='colony'?14:8);g.fillStyle='#0b0f12';g.fillRect(e.x-w/2,y,w,3);g.fillStyle=e.hp/e.maxhp>.4?'#7fd49b':'#ff6b5b';g.fillRect(e.x-w/2,y,w*Math.max(0,e.hp/e.maxhp),3)}
  if(e.slow<1){g.fillStyle='#9fd3ff';g.fillRect(e.x-2,e.y+e.r+3,4,2)}
}
function drawMap(g,time){
  g.fillStyle='#0f1417';g.fillRect(0,0,W,H);
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){if(blocked.has(c+','+r))continue;g.fillStyle='#151c20';rr(g,c*TILE+4,r*TILE+4,TILE-8,TILE-8,4);g.fill()}
  const line=(P,w,color,dash,off)=>{g.strokeStyle=color;g.lineWidth=w;g.lineJoin='round';g.setLineDash(dash||[]);g.lineDashOffset=off||0;g.beginPath();P.wp.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.setLineDash([])};
  for(const P of PATHS)line(P,30,'#0a0d0f');
  for(const P of PATHS)line(P,24,'#1a2125');
  for(const P of PATHS)line(P,2,'#5a4232');
  for(const P of PATHS)line(P,3,S.active?'rgba(255,181,71,.8)':'rgba(138,106,82,.6)',[6,10],-time*(S.active?60:15));
  for(const P of PATHS)for(let i=1;i<P.wp.length-1;i++){g.fillStyle='#2b343a';g.beginPath();g.arc(P.wp[i].x,P.wp[i].y,4,0,7);g.fill()}
  g.font='600 8px "IBM Plex Mono",monospace';g.fillStyle='#83919a';
  LEVELS[L].labels.forEach((lab,i)=>{const x=PATHS[i].wp[0].x,right=x>200;g.textAlign=right?'right':'left';g.fillText(lab,right?x-18:x+18,14)});
  const fr=S.lives/MAX_LIVES;
  g.fillStyle='#0a0d0f';rr(g,86,446,188,68,4);g.fill();
  for(let i=0;i<4;i++){const x=92+i*45;g.fillStyle='#3a454c';rr(g,x,452,40,56,2);g.fill();g.strokeStyle='#56636b';g.lineWidth=1;g.stroke();
    g.fillStyle='#1d2428';g.fillRect(x+6,458,28,16);
    const lit=i/4<fr;g.fillStyle=S.outage?(Math.sin(time*8+i)>0?'#ff6b5b':'#2a1e1e'):lit?(fr>.5?'#7fd49b':fr>.25?'#ffb547':'#ff6b5b'):'#2a1e1e';g.beginPath();g.arc(x+12,486,3,0,7);g.fill();
    g.fillStyle='#8c979e';g.fillRect(x+30,484,4,8)}
  g.fillStyle=S.outage?'#ff6b5b':'#dde4e7';g.font='700 9px "IBM Plex Mono",monospace';g.textAlign='center';g.fillText(S.outage?'UTILITY LOST':'MAIN SWGR · 4000A',180,470);
}
function drawCoverage(g,time){
  const src=sources();
  g.save();g.fillStyle='rgba(255,181,71,.07)';
  for(const s of src){g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fill()}
  g.strokeStyle='rgba(255,181,71,.4)';g.lineWidth=1;g.setLineDash([4,6]);g.lineDashOffset=-time*10;
  for(const s of src){g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.stroke()}
  g.restore();
}
function ghostAt(g,type,c,r,time){
  const mv=drag&&drag.tower,ok=canPlace(c,r,mv),x=c*TILE+20,y=r*TILE+20,s=DEFS[type].tiers[0];
  g.fillStyle=ok?'rgba(127,212,155,.14)':'rgba(255,107,91,.18)';g.fillRect(c*TILE,r*TILE,TILE,TILE);
  if(!ok)return;
  const sp=mv?spec(mv):s,rng=type==='gen'?sp.supply:sp.range;
  g.strokeStyle=type==='gen'?'rgba(255,181,71,.6)':'rgba(127,212,155,.55)';g.setLineDash([5,5]);g.lineWidth=1.2;g.beginPath();g.arc(x,y,rng,0,7);g.stroke();g.setLineDash([]);
  const t=mv?{...mv,coord:false,boost:0}:{type,tier:0,anim:0,disabled:0,shots:s.shots,blown:false};
  t.powered=type==='gen'||voltageAt(x,y)>0;
  g.globalAlpha=.7;drawTower(g,t,x,y,time);g.globalAlpha=1;
}
function draw(){
  const time=S.t;
  ctx.setTransform(scale,0,0,scale,0,0);
  if(S.shake>0)ctx.translate(rnd(-3,3)*S.shake*6,rnd(-3,3)*S.shake*6);
  drawMap(ctx,time);
  if(S.storm){ctx.fillStyle='rgba(30,40,90,.22)';ctx.fillRect(0,0,W,H)}
  const sel=S.selected,dragging=drag&&drag.moved;
  if(S.placing||S.pending||dragging||(sel&&sel.type==='gen')||(tut&&TUT[tut.i].rings))drawCoverage(ctx,time);
  if(sel&&sel.type!=='gen'&&!dragging){const rg=spec(sel).range;ctx.strokeStyle='rgba(159,211,255,.55)';ctx.fillStyle='rgba(159,211,255,.06)';ctx.setLineDash([5,5]);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(sel.x,sel.y,rg,0,7);ctx.fill();ctx.stroke();ctx.setLineDash([])}
  if(sel&&!dragging){
    ctx.strokeStyle='#9fd3ff';ctx.lineWidth=1.5;rr(ctx,sel.c*TILE+2,sel.r*TILE+2,TILE-4,TILE-4,5);ctx.stroke();
    ctx.strokeStyle='rgba(127,212,155,.8)';ctx.setLineDash([3,3]);ctx.lineWidth=1.5;
    for(const [b,f] of S.pairs)if(b===sel||f===sel){ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(f.x,f.y);ctx.stroke()}
    ctx.setLineDash([]);
  }
  for(const t of S.towers){if(dragging&&drag.tower===t){ctx.globalAlpha=.25;drawTower(ctx,t,t.x,t.y,time);ctx.globalAlpha=1}else drawTower(ctx,t,t.x,t.y,time)}
  if(tut&&tut.pad&&canPlace(tut.pad[0],tut.pad[1])){const [pc,pr]=tut.pad,pa=.55+.45*Math.sin(time*5);ctx.strokeStyle=`rgba(255,181,71,${pa})`;ctx.lineWidth=2.5;rr(ctx,pc*TILE+3,pr*TILE+3,TILE-6,TILE-6,6);ctx.stroke();ctx.fillStyle=`rgba(255,181,71,${pa*.18})`;ctx.fill();ctx.fillStyle='#ffb547';ctx.font='700 9px "IBM Plex Mono",monospace';ctx.textAlign='center';ctx.fillText('HERE',pc*TILE+20,pr*TILE+(pr===0?52:-4))}
  if(dragging&&drag.cell)ghostAt(ctx,drag.type,drag.cell.c,drag.cell.r,time);
  else if(S.pending)ghostAt(ctx,S.pending.type,S.pending.c,S.pending.r,time);
  else if(S.placing&&hover)ghostAt(ctx,S.placing,hover.c,hover.r,time);
  for(const e of S.enemies)drawEnemy(ctx,e,time);
  for(const f of S.fx){
    const a=f.life/f.max;
    if(f.k==='bolt'){
      ctx.globalAlpha=a*.35;ctx.strokeStyle=f.color;ctx.lineWidth=f.w*3;ctx.lineCap='round';ctx.beginPath();f.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
      ctx.globalAlpha=a;ctx.strokeStyle='#ffffff';ctx.lineWidth=f.w*.6;ctx.stroke();
      ctx.strokeStyle=f.color;ctx.lineWidth=f.w;ctx.globalAlpha=a*.8;ctx.stroke();
    }else if(f.k==='ring'){ctx.globalAlpha=a*.8;ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.1-a*.4),0,7);ctx.stroke()}
    else{ctx.globalAlpha=Math.min(1,a*1.5);ctx.fillStyle=f.color;ctx.fillRect(f.x-1.2,f.y-1.2,2.4,2.4)}
  }
  ctx.globalAlpha=1;ctx.lineCap='butt';ctx.textAlign='center';
  if(S.flash>0){ctx.fillStyle='rgba(230,240,255,'+S.flash*.9+')';ctx.fillRect(0,0,W,H)}
  for(const x of S.texts){ctx.globalAlpha=Math.min(1,x.life*2);ctx.fillStyle=x.color;ctx.font='700 11px "Saira Condensed","Arial Narrow",sans-serif';ctx.fillText(x.str,x.x,x.y)}
  ctx.globalAlpha=1;
  if(S.toast){ctx.font='600 10px "IBM Plex Mono",monospace';const w=ctx.measureText(S.toast.text).width+20;ctx.globalAlpha=Math.min(1,S.toast.life*3);ctx.fillStyle='rgba(10,13,15,.92)';rr(ctx,180-w/2,24,w,22,11);ctx.fill();ctx.strokeStyle='#ff6b5b';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#dde4e7';ctx.fillText(S.toast.text,180,39);ctx.globalAlpha=1}
  if(S.alert){ctx.font='600 10px "IBM Plex Mono",monospace';const tx='INCOMING · '+S.alert.text,w=Math.min(W-16,ctx.measureText(tx).width+20);ctx.globalAlpha=Math.min(1,S.alert.life*3)*(.75+.25*Math.sin(S.t*10));ctx.fillStyle='rgba(30,20,6,.94)';rr(ctx,180-w/2,52,w,22,11);ctx.fill();ctx.strokeStyle='#ffb547';ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle='#ffb547';ctx.fillText(tx,180,67,W-30);ctx.globalAlpha=1}
  if(S.banner){
    const b=S.banner,a=Math.min(1,b.life*2,(b.max-b.life)*4+.2);
    ctx.globalAlpha=a;ctx.fillStyle='rgba(10,13,15,.85)';ctx.fillRect(0,206,W,78);
    ctx.fillStyle=b.warn?'#ff6b5b':'#ffb547';ctx.fillRect(0,206,W,2);ctx.fillRect(0,282,W,2);
    ctx.font='800 32px "Saira Condensed","Arial Narrow",sans-serif';ctx.fillStyle='#dde4e7';ctx.fillText(b.t.toUpperCase(),180,248);
    ctx.font='600 10px "IBM Plex Mono",monospace';ctx.fillStyle=b.warn?'#ff6b5b':'#83919a';ctx.fillText(b.s,180,268);ctx.globalAlpha=1;
  }
}

// ---------- UI ----------
let scale=1;
function resize(){const w=cv.clientWidth||360,dpr=window.devicePixelRatio||1;cv.width=Math.round(w*dpr);cv.height=Math.round(w*H/W*dpr);scale=cv.width/W}
new ResizeObserver(resize).observe(cv);resize();

function icon(canvas,type,tier,size=32){
  const dpr=window.devicePixelRatio||1;canvas.width=size*dpr;canvas.height=size*dpr;
  const g=canvas.getContext('2d');g.setTransform(dpr*size/44,0,0,dpr*size/44,0,0);g.clearRect(0,0,44,44);
  const s=DEFS[type].tiers[tier];
  drawTower(g,{type,tier,anim:0,disabled:0,shots:s.shots||0,blown:false,guard:false,powered:true,coord:false,boost:0},22,22,0);
}
function renderLevels(){
  const box=$('levels');
  box.innerHTML=LEVELS.map((lv,i)=>{
    const st=i<L||(i===L&&S&&S.over==='win')?'done':i===L?'cur':'lock';
    return `<div class="lv ${st}" title="${lv.name}"><i></i><span>${st==='cur'?'Level '+(i+1)+' · '+lv.name:'L'+(i+1)}</span></div>`;
  }).join('');
}
const trayBtns={};
function makeTray(){
  const tray=$('tray');
  for(const type of ORDER){
    const s=DEFS[type].tiers[0],b=document.createElement('button');b.className='tb';
    b.innerHTML=`<canvas></canvas><span class="n">${DEFS[type].short}</span><span class="c">$${s.cost} · ${type==='gen'?'+'+s.cap:s.kw}kW</span>`;
    b.setAttribute('aria-label',`${DEFS[type].name}, $${s.cost}. Drag onto the map or tap to select.`);
    b.addEventListener('pointerdown',ev=>{
      if(S.over)return;
      drag={kind:'new',type,sx:ev.clientX,sy:ev.clientY,moved:false,cell:null};
      try{b.setPointerCapture(ev.pointerId)}catch(e){}
    });
    b.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();togglePlacing(type)}});
    tray.appendChild(b);trayBtns[type]=b;icon(b.querySelector('canvas'),type,0);
  }
}
function togglePlacing(type){S.placing=S.placing===type?null:type;S.pending=null;S.selected=null;buildPanel();refreshTray();showConfirm()}
function refreshTray(){
  for(const t in trayBtns)trayBtns[t].classList.toggle('sel',S.placing===t);
  const box=$('info'),ty=S.placing||(S.pending&&S.pending.type);
  if(ty){const s=DEFS[ty].tiers[0];box.innerHTML=`<div class="it"><b>${DEFS[ty].name}</b><span>$${s.cost} · ${ty==='gen'?'+'+s.cap+' kW cap':s.kw+' kW'}${s.range?' · range '+s.range:''}</span></div><p>${DESC[ty][0]}</p><p class="tip">${DESC[ty][1]}</p>`;box.hidden=false}
  else box.hidden=true;
  hint();
}

function canvasCell(clientX,clientY){
  const r=cv.getBoundingClientRect();
  if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return null;
  return{c:Math.floor((clientX-r.left)/r.width*COLS),r:Math.floor((clientY-r.top)/r.height*ROWS)};
}
function showGhost(type,x,y){const g=$('ghost');if(g.dataset.type!==type){icon(g.querySelector('canvas'),type,0,44);g.dataset.type=type}g.hidden=false;g.style.transform=`translate(${x-22}px,${y-70}px)`}
window.addEventListener('pointermove',ev=>{
  if(!drag)return;
  if(!drag.moved&&Math.hypot(ev.clientX-drag.sx,ev.clientY-drag.sy)>8){
    drag.moved=true;S.placing=null;S.pending=null;showConfirm();hideBrief();
    if(drag.kind==='new'){S.selected=null;buildPanel()}
    refreshTray();
  }
  if(drag.moved){
    const cell=canvasCell(ev.clientX,ev.clientY-(ev.pointerType==='touch'?36:0));
    drag.cell=cell;
    if(drag.kind==='new'&&!cell)showGhost(drag.type,ev.clientX,ev.clientY);else $('ghost').hidden=true;
  }
});
function endDrag(cancel){
  if(!drag)return;
  const d=drag;drag=null;$('ghost').hidden=true;
  if(cancel)return;
  if(d.kind==='new'){if(d.moved){if(d.cell)place(d.type,d.cell.c,d.cell.r)}else togglePlacing(d.type)}
  else if(d.kind==='move'){
    if(d.moved){if(d.cell&&!(d.cell.c===d.tower.c&&d.cell.r===d.tower.r))moveTower(d.tower,d.cell.c,d.cell.r);else{S.selected=d.tower;buildPanel()}}
    else{S.selected=d.tower;S.placing=null;S.pending=null;buildPanel();refreshTray();showConfirm()}
  }
}
window.addEventListener('pointerup',()=>endDrag(false));
window.addEventListener('pointercancel',()=>endDrag(true));
cv.addEventListener('pointermove',ev=>{if(!drag)hover=canvasCell(ev.clientX,ev.clientY)});
cv.addEventListener('pointerleave',()=>{hover=null});
cv.addEventListener('pointerdown',ev=>{
  const cell=canvasCell(ev.clientX,ev.clientY);if(!cell||S.over)return;
  hover=ev.pointerType==='mouse'?cell:null;
  const t=S.towers.find(t=>t.c===cell.c&&t.r===cell.r);
  if(t&&!S.placing){
    drag={kind:'move',tower:t,type:t.type,sx:ev.clientX,sy:ev.clientY,moved:false,cell:null};
    try{cv.setPointerCapture(ev.pointerId)}catch(e){}
    return;
  }
  if(S.placing){
    if(canPlace(cell.c,cell.r)){S.pending={type:S.placing,c:cell.c,r:cell.r};showConfirm()}
    else toast('Pick an open pad');
    return;
  }
  S.selected=null;buildPanel();
});

let pRefs={};
function statsHTML(t){
  const s=spec(t),o=[],pct=v=>Math.round(v*100)+'%';
  if(t.type==='gen'){o.push(['Capacity','+'+s.cap+' kW'],['Supply radius',s.supply+'px'],['Income','$'+s.income+'/wave'])}
  else{
    o.push(['Voltage',t.powered?pct(t.vf):'NO POWER']);
    o.push(['Backup gen',backupAt(t.x,t.y)?'yes':'no']);
    const m=t.vf*(t.coord?1.25:1);
    if(t.type==='cap'){o.push(['Rate boost','+'+pct(s.boost)],['Range',s.range]);if(s.slow)o.push(['Slows',pct(1-s.slow)])}
    else{
      o.push(['Damage',Math.round(s.dmg*m)],['Rate',((1+t.boost)/s.rate).toFixed(1)+'/s'],['Range',s.range]);
      if(t.type==='breaker')o.push(['Armor',s.pierce?'pierces':'blocked'],['Targets','first']);
      if(t.type==='fuse'){o.push(['Shots',t.blown?'BLOWN':t.shots+'/'+s.shots],['Targets','highest HP']);if(s.splash)o.push(['Splash',s.splash])}
      if(t.type==='tesla'){o.push(['Chains',s.chains]);if(s.cage)o.push(['Cage','shields 70px'])}
      if(t.type==='arrester'){o.push(['vs Surges','×2.5'],['Lightning','diverts in range']);if(s.mast)o.push(['Mast strike','every 3.5s'])}
      if(t.type==='relay'){o.push(['Reveals','ground faults']);if(s.stun)o.push(['Stun pulse','every 4s']);if(s.slow)o.push(['Slows',pct(1-s.slow)])}
      if(t.type==='filter'){o.push(['vs Harmonics','×3']);if(s.nosplit)o.push(['Splits','blocked'])}
      if(t.type==='breaker'||t.type==='fuse')o.push(['Coordination',t.coord?'+25%':'none']);
      if(t.boost)o.push(['Cap boost','+'+pct(t.boost)]);
    }
    o.push(['Load',towerKw(t)+' kW']);
  }
  o.push(['Wildlife',t.guard?'guarded':'exposed']);
  const bad=new Set(['BLOWN','exposed','NO POWER','no','none']),good=new Set(['+25%','yes','guarded']);
  return o.map(([k,v])=>`<span class="${bad.has(String(v))?'st-bad':good.has(String(v))?'st-good':''}"><em>${k}</em>${v}</span>`).join('');
}
function buildPanel(){
  const t=S.selected,p=$('panel'),tray=$('tray');
  if(!t){p.hidden=true;tray.hidden=false;pRefs={};hint();return}
  p.hidden=false;tray.hidden=true;
  const D=DEFS[t.type],s=spec(t),nx=D.tiers[t.tier+1];
  p.innerHTML=`<div class="ph"><canvas id="picon"></canvas><div><b>${D.name}</b><span>Tier ${t.tier+1} · ${s.name}</span></div><button class="x" id="pclose" aria-label="Close inspector">×</button></div>
  <div class="pstats" id="pstats">${statsHTML(t)}</div>
  <div class="pact">
    ${nx?`<button id="pup" class="btn pri">Upgrade<small>${nx.name} · $${nx.cost}${t.type==='gen'?' · +'+(nx.supply-s.supply)+'px':' · +'+nx.kw+' kW'}</small></button>`:`<button class="btn" disabled>Max tier<small>${s.name}</small></button>`}
    ${t.type==='fuse'&&t.blown?`<button id="prep" class="btn warn">Replace fuse<small>$15 · full refill</small></button>`:''}
    ${!t.guard?`<button id="pguard" class="btn">Wildlife guard<small>$25 · squirrel-proof</small></button>`:''}
    <button id="psell" class="btn">Sell<small>+$${sellVal(t)}</small></button>
  </div>`;
  icon($('picon'),t.type,t.tier,38);
  $('pclose').onclick=()=>{S.selected=null;buildPanel()};
  pRefs={up:$('pup'),guard:$('pguard'),rep:$('prep'),nx,t,sig:''};
  if(pRefs.up)pRefs.up.onclick=()=>upgrade(t);
  if(pRefs.guard)pRefs.guard.onclick=()=>guard(t);
  if(pRefs.rep)pRefs.rep.onclick=()=>replaceFuse(t);
  $('psell').onclick=()=>sell(t);
  hint();
}
const ENAME={surge:'Surges',harm:'Harmonics',ground:'Ground faults',squirrel:'Squirrels',colony:'Squirrel Colony',arc:'Arc Flash',hydra:'Harmonic Hydra',wraith:'GF Wraith'};
const ECOL={surge:'#ffe066',harm:'#c9a3ff',ground:'#5adc8c',squirrel:'#c58a5a',colony:'#c58a5a',arc:'#bfe3ff',hydra:'#c9a3ff',wraith:'#5adc8c'};
const ALERT={
  squirrel:'Squirrel in 3s · guard generators',
  colony:'Squirrel Colony in 3s · Tesla clears pups',
  arc:'Arc Flash in 3s · burns towers near feeder',
  hydra:'Harmonic Hydra in 3s · focus Filters',
  wraith:()=>'GF Wraith in 3s'+(S.towers.some(t=>t.type==='relay')?' · hit it with Fuses':' · invisible without GF Relay'),
  ground:()=>S.towers.some(t=>t.type==='relay')?null:'Ground faults in 3s · need a GF Relay'
};
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
function waveCounts(w){
  const starts=new Set(LEVELS[L].lanes.map(l=>l[0].join())).size,mult=1+.2*(starts-1),c={};
  for(const [type,count] of w.g){const solo=ETYPES[type].sq||ETYPES[type].boss;c[type]=(c[type]||0)+(solo?count:Math.round(count*mult))}
  return c;
}
function intelTips(w,c){
  const has=ty=>S.towers.some(t=>t.type===ty),tips=[],add=(lv,tx)=>tips.push([lv,tx]);
  if(!S.towers.length)add('warn','No protection yet. Start with a Breaker and a Fuse at a bend in the feeder.');
  const dark=S.towers.filter(t=>t.type!=='gen'&&!t.powered).length;if(dark)add('bad',`${plural(dark,'tower')} with no power. Move into a supply ring or add a generator.`);
  const blown=S.towers.filter(t=>t.blown).length;if(blown)add('bad',`${plural(blown,'blown fuse')}. Tap to replace for $15.`);
  if(c.ground||c.wraith)add(has('relay')?'ok':'bad',has('relay')?'GF Relay online. It reveals ground faults for your other towers.':'Ground faults are invisible. Place a GF Relay beside the feeder or nothing can hit them.');
  if(c.harm||c.hydra)add(has('filter')?'ok':'warn',has('filter')?'Harmonic Filter ready. Harmonics take 3× damage from it.':'Harmonics split into ripples when killed. A Harmonic Filter deals 3× damage to them.');
  if((c.surge||0)>=14&&!has('arrester'))add('warn',`Big surge pack (${c.surge}). A Surge Arrester hits every surge in range for 2.5× damage.`);
  if(c.squirrel||c.colony){
    const exp=S.towers.filter(t=>!t.guard&&!caged(t)),gens=exp.filter(t=>t.type==='gen').length;
    add(gens?'bad':exp.length?'warn':'ok',gens?`Squirrels hit generators first. ${plural(gens,'unguarded generator')}: tap and add a wildlife guard.`:exp.length?`Squirrels short unguarded towers for 4s. ${plural(exp.length,'tower')} exposed.`:'Every tower is guarded against squirrels.');
  }
  if(c.colony)add(has('tesla')?'ok':'warn','The Colony splits into 3 fast pups when it falls. Tesla chain lightning clears them.');
  if(c.arc)add(S.towers.some(t=>t.type==='tesla'&&t.tier===2)?'ok':'warn','Arc Flash burns out towers within 75px. A Faraday Cage (Tesla tier 3) shields them, and Fuses ignore its armor.');
  if(c.hydra)add('warn','The Hydra sheds 2 harmonics every 20% of health. Stack Filters, and a K-Rated Filter kill stops its final burst.');
  if(c.wraith)add('warn','The Wraith drains towers within 70px and heals itself. Once a Relay reveals it, burn it down with Fuses.');
  if(w.outage){const n=S.towers.filter(t=>t.type!=='gen'&&!backupAt(t.x,t.y)).length;add(n?'bad':'ok',n?`Utility outage: ${plural(n,'tower')} outside a generator ring will go dark.`:'Every tower is generator-backed for the outage.')}
  if(w.storm){const n=S.towers.filter(t=>!caged(t)&&!S.towers.some(a=>a.type==='arrester'&&dist(a,t)<=spec(a).range)).length;add(n?'warn':'ok',n?`Lightning storm: ${plural(n,'tower')} not covered by a Surge Arrester can be knocked out.`:'Every tower is covered by an arrester.')}
  const rank={bad:0,warn:1,ok:2};tips.sort((a,b)=>rank[a[0]]-rank[b[0]]);
  return tips.slice(0,3);
}
let lastIntel='';
function renderIntel(){
  const box=$('intel');
  const show=!S.active&&!S.over&&!S.placing&&!S.pending&&!S.selected&&S.wave<WAVES_PER;
  if(!show){if(!box.hidden){box.hidden=true;lastIntel=''}return}
  const w=WAVES[S.wave],c=waveCounts(w);
  const chips=Object.keys(c).map(t=>`<span style="--c:${ECOL[t]}">${ENAME[t]} ×${c[t]}</span>`).join('')+(w.outage?'<span style="--c:#ff6b5b">Utility outage</span>':'')+(w.storm?'<span style="--c:#e8f0ff">Lightning storm</span>':'');
  const tips=intelTips(w,c).map(([lv,tx])=>`<li class="${lv}">${tx}</li>`).join('');
  const html=`<div class="ih"><b>Next · Wave ${S.wave+1}</b>${w.boss?`<span class="bt">Boss · ${w.boss}</span>`:'<span>Intel</span>'}</div><div class="chips">${chips}</div>${tips?`<ul class="tips">${tips}</ul>`:''}`;
  if(html!==lastIntel){lastIntel=html;box.innerHTML=html;box.classList.toggle('boss',!!w.boss)}
  box.hidden=false;
}
let helpOpen=false;
function openHelp(){
  $('helpEnemies').innerHTML=[
    ['Surge','Fast, weak, comes in packs. Arresters deal 2.5×.'],
    ['Harmonic','Splits into 2 ripples when killed. Filters deal 3×.'],
    ['Ground fault','Armored and invisible. Needs a GF Relay to be seen.'],
    ['Squirrel','Ignores the feeder, shorts towers for 4s, revives once. Guard towers.'],
    ['Colony (boss)','Giant squirrel that splits into 3 pups. Tesla chains clear them.'],
    ['Hydra (boss)','Sheds harmonics as it loses health. Filters, K-Rated finish.'],
    ['Arc Flash (boss)','Armored plasma that burns nearby towers. Faraday Cage, Fuses.'],
    ['GF Wraith (boss)','Invisible, drains towers and heals. GF Relay plus Fuses.']
  ].map(([a,b])=>`<b>${a}</b><span>${b}</span>`).join('');
  $('helpTowers').innerHTML=ORDER.map(t=>`<b>${DEFS[t].short}</b><span>${DESC[t][0]}</span>`).join('');
  helpOpen=true;$('help').hidden=false;$('helpClose').focus();
}
function closeHelp(){helpOpen=false;$('help').hidden=true;$('helpBtn').focus()}
$('helpBtn').onclick=openHelp;
$('helpClose').onclick=closeHelp;
$('help').addEventListener('pointerdown',ev=>{if(ev.target.id==='help')closeHelp()});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&helpOpen)closeHelp()});
function hint(){
  const h=$('hint');
  if(S.pending)h.textContent='Confirm placement, or tap another pad.';
  else if(S.placing)h.textContent=`Tap a pad for the ${DEFS[S.placing].name}. Voltage drops near the edge of a ring.`;
  else if(S.selected){const t=S.selected.type;h.textContent=t==='breaker'||t==='fuse'?'Fuse upstream of a breaker (farther from the main) = coordinated +25%.':t==='gen'?'Squirrels love generators. A shorted gen drops its ring.':'Drag a tower to move it.'}
  else if(S.over==='win')h.textContent=L+1<LEVELS.length?'Next site unlocked.':'Campaign complete.';
  else if(S.over==='lose')h.textContent='Blackout. Rethink your coordination and retry.';
  else if(!S.towers.length)h.textContent='Drag a tower onto a pad, or tap one then tap a pad.';
  else h.textContent='Towers outside a supply ring stay dark. Generators extend it.';
}
let lastSig='';
function hud(){
  $('wave').textContent=S.wave;
  $('money').textContent='$'+S.money;
  $('lives').textContent=S.lives+' / '+MAX_LIVES;
  const lf=S.lives/MAX_LIVES,lb=$('livesBar');lb.style.width=lf*100+'%';lb.style.background=lf>.5?'var(--ok)':lf>.25?'var(--live)':'var(--bad)';
  const Ld=load(),C=cap(),k=Math.min(1,Ld/C),bb=$('loadBar');
  $('load').textContent=Ld+' / '+C+' kW';bb.style.width=k*100+'%';bb.style.background=k<.75?'var(--ok)':k<.95?'var(--live)':'var(--bad)';
  for(const type in trayBtns){const s=DEFS[type].tiers[0];trayBtns[type].classList.toggle('poor',S.money<s.cost||Ld+s.kw>C)}
  if(pRefs.up&&pRefs.nx)pRefs.up.disabled=S.money<pRefs.nx.cost||Ld+pRefs.nx.kw>C;
  if(pRefs.guard)pRefs.guard.disabled=S.money<25;
  if(pRefs.rep)pRefs.rep.disabled=S.money<15;
  if(pRefs.t){const t=pRefs.t,sig=[t.vf,t.coord,t.boost,t.shots,t.blown,S.towers.length].join();if(sig!==pRefs.sig){pRefs.sig=sig;$('pstats').innerHTML=statsHTML(t)}}
  if(S.pending&&!$('confirm').hidden)$('cYes').disabled=S.money<DEFS[S.pending.type].tiers[0].cost;
  const go=$('go');
  const label=S.over==='win'?(L+1<LEVELS.length?'Next level':'Restart campaign'):S.over==='lose'?'Retry level':S.active?'Wave live…':'Energize wave '+(S.wave+1);
  if(go.textContent!==label)go.textContent=label;
  go.disabled=S.active&&!S.over;
  const sig=(S.selected?'s':'')+(S.over||'');if(sig!==lastSig){lastSig=sig;hint()}
  renderIntel();
  if(tut){const st=TUT[tut.i];if(st.done&&st.done())tutNext();if(tut)renderCoach()}
}
// ---------- tutorial ----------
let tut=null,lastCoach='',hlEl=null;
const tutSeen=()=>{try{return localStorage.getItem('fl-tut')==='1'}catch(e){return false}};
const nearPath=(c,r)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dc,dr])=>r+dr<11&&blocked.has((c+dc)+','+(r+dr)));
function pathNear(c,r){let n=0;for(const k of blocked){const [a,b]=k.split(',').map(Number);if(b<11&&Math.hypot(a-c,b-r)<=2.2)n++}return n}
function pickGen(){
  let best=null,bs=-1e9;
  for(let c=0;c<COLS;c++)for(let r=1;r<=6;r++){if(!canPlace(c,r))continue;const x=c*TILE+20,y=r*TILE+20;let sc=0;
    for(let cc=0;cc<COLS;cc++)for(let rr=0;rr<11;rr++){const px=cc*TILE+20,py=rr*TILE+20;if(Math.hypot(px-x,py-y)<=150&&!voltageAt(px,py))sc++}
    sc-=nearPath(c,r)?4:0;if(sc>bs){bs=sc;best=[c,r]}}
  return best;
}
function pickNear(fuse){
  const brs=S.towers.filter(t=>t.type==='breaker');let best=null,bs=-1e9;
  for(let c=0;c<COLS;c++)for(let r=0;r<11;r++){if(!canPlace(c,r)||!nearPath(c,r))continue;const x=c*TILE+20,y=r*TILE+20,v=voltageAt(x,y);if(v<.8)continue;
    let sc=pathNear(c,r)+v*3;
    if(fuse&&brs.some(b=>Math.hypot(b.x-x,b.y-y)<=120&&Math.hypot(x-SWGR.x,y-SWGR.y)>dist(b,SWGR)+10))sc+=100;
    if(sc>bs){bs=sc;best=[c,r]}}
  return best;
}
const TUT=[
  {pos:'top',t:'Welcome to Fault Line',b:'Faults travel down the feeder toward the main switchgear at the bottom. Each one that gets through costs grid integrity. Hit zero and the site blacks out.',next:true},
  {pos:'top',t:'Power comes first',b:'Towers only fire inside a supply ring. The dashed amber circle is the switchgear\'s ring. Towers outside every ring stay dark.',next:true,rings:true},
  {t:'Place a generator',b:'Drag the Gen from the tray onto the glowing pad. Or tap Gen, tap the pad, then Place.',el:()=>trayBtns.gen,pick:pickGen,rings:true,done:()=>S.towers.some(t=>t.type==='gen')},
  {pos:'bottom',t:'Your grid just grew',b:'The generator adds a big supply ring and +40 kW of bus capacity. Every tower draws kW from the bus meter, so more towers need more generators. Generators also pay income each wave.',next:true,rings:true,el:()=>$('load').parentElement},
  {pos:'bottom',t:'Generator tips',b:'Upgrades widen the ring and add capacity. Squirrels go after generators first, and a shorted one drops its ring, so add a wildlife guard ($25) before squirrel waves. During a utility outage, only towers inside a generator ring keep firing.',next:true,rings:true},
  {t:'Place a Breaker',b:'Breakers fire fast at the fault closest to the main. Put one on the glowing pad, next to the feeder and inside a ring.',el:()=>trayBtns.breaker,pick:()=>pickNear(false),rings:true,done:()=>S.towers.some(t=>t.type==='breaker')},
  {t:'Add a Fuse upstream',b:'Fuses hit the toughest fault in range hard. Placed farther from the main than a Breaker, both get +25% damage and a green C badge.',el:()=>trayBtns.fuse,pick:()=>pickNear(true),rings:true,done:()=>S.towers.some(t=>t.type==='fuse')},
  {pos:'top',t:'Read the intel',b:'Before every wave, the card under the map lists what\'s coming and flags gaps in red. Fix red items before you energize.',next:true,el:()=>$('intel')},
  {pos:'top',t:'Energize the feeder',b:'Press Energize to start wave 1. Between waves, tap a tower to upgrade it. The ? button opens the full guide anytime.',el:()=>$('go'),done:()=>S.active||S.wave>0}
];
function setHL(el){if(hlEl===el)return;if(hlEl)hlEl.classList.remove('hl');hlEl=el;if(el)el.classList.add('hl')}
function startTut(){tut={i:0,pad:null};hideBrief();enterStep()}
function enterStep(){
  const st=TUT[tut.i];
  if(S.selected){S.selected=null;buildPanel()}
  tut.pad=st.pick?st.pick():null;lastCoach='';
}
function tutNext(){tut.i++;if(tut.i>=TUT.length){endTut(true);return}enterStep()}
function endTut(done,quiet){
  tut=null;try{localStorage.setItem('fl-tut','1')}catch(e){}
  setHL(null);$('coach').hidden=true;lastCoach='';
  if(done&&!quiet)S.banner={t:'Tutorial complete',s:'Hold the line. Good luck.',life:2.2,max:2.2};
}
function renderCoach(){
  const box=$('coach'),st=TUT[tut.i];
  box.hidden=!!S.pending||!!(drag&&drag.moved)||helpOpen;
  const pos=st.pos||(tut.pad&&tut.pad[1]>=6?'top':'bottom');
  const extra=st.pick&&!tut.pad?' Any open pad inside a ring works.':'';
  const html=`<div class="ch"><span>Tutorial · ${tut.i+1}/${TUT.length}</span><button class="lnk" id="tSkip">Skip tutorial</button></div><b>${st.t}</b><p>${st.b}${extra}</p>${st.next?'<button class="btn pri" id="tNext">Next</button>':''}`;
  if(html!==lastCoach){
    lastCoach=html;box.innerHTML=html;box.className='coach '+pos;
    $('tSkip').onclick=()=>endTut(false);
    if(st.next)$('tNext').onclick=tutNext;
  }
  setHL(st.el?st.el():null);
}
$('tutReplay').onclick=()=>{closeHelp();if(S.active){toast('Finish this wave, then replay the tutorial');return}if(S.over){newGame()}startTut()};

$('go').onclick=goPressed;
$('speed').onclick=()=>{S.speed=S.speed===1?2:1;$('speed').textContent=S.speed+'×'};

makeTray();newGame();if(L===0&&!tutSeen())startTut();
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!helpOpen)for(let i=0;i<S.speed;i++)step(dt);
  draw();hud();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
