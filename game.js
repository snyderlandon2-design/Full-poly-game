window.Game=(()=>{
let active=false,scene,camera,renderer,player,enemy,keys={},hp=100,ehp=100,stamina=100,lastAttack=0,mode="bot",difficulty=1,roomCode="";
let joy={x:0,z:0},sprint=false,raf=0,otherPlayers=new Map();
const $=id=>document.getElementById(id);
function model(color){
  const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color,roughness:.35});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.5,.7),m);torso.position.y=1.4;g.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshStandardMaterial({color:0xffdbac}));head.position.y=2.4;g.add(head);
  for(const [x,y] of [[-.9,1.4],[.9,1.4]]){const a=new THREE.Mesh(new THREE.BoxGeometry(.4,1.2,.4),m);a.position.set(x,y,0);g.add(a)}
  for(const x of [-.35,.35]){const l=new THREE.Mesh(new THREE.BoxGeometry(.4,1.2,.4),new THREE.MeshStandardMaterial({color:0x222222}));l.position.set(x,.6,0);g.add(l)}
  return g;
}
function init(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x070707);scene.fog=new THREE.FogExp2(0x070707,.025);
  camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,1000);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,.75));const dl=new THREE.DirectionalLight(0xffffff,1);dl.position.set(10,20,10);scene.add(dl);
  const ground=new THREE.Mesh(new THREE.BoxGeometry(80,1,80),new THREE.MeshStandardMaterial({color:0x111111}));ground.position.y=-.5;scene.add(ground);
  for(let i=0;i<16;i++){let x=(Math.random()-.5)*65,z=(Math.random()-.5)*65;if(Math.hypot(x,z)>8){let p=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,3.5),new THREE.MeshStandardMaterial({color:0x8a2020}));p.position.set(x,1.7,z);let q=new THREE.Mesh(new THREE.SphereGeometry(1.8),new THREE.MeshStandardMaterial({color:0x9b7827}));q.position.set(x,3.8,z);scene.add(p,q)}}
  const c=window.CHARACTERS[profile.selected_char][3];player=model(c);player.position.set(-4,0,0);scene.add(player);
  enemy=model(0xc62828);enemy.position.set(4,0,0);scene.add(enemy);
}
function start(m,d=1,code=""){mode=m;difficulty=d;roomCode=code;active=true;hp=100;ehp=100;stamina=100;init();$("gameUI").classList.remove("hidden");$("arenaTitle").textContent=m==="bot"?`BOT: ${["EASY","NORMAL","HARD","EXPERT","NIGHTMARE"][d]}`:m.toUpperCase();if("ontouchstart"in window)$("touchControls").classList.remove("hidden");loop()}
function attack(){
  const now=performance.now();if(now-lastAttack<450)return;lastAttack=now;
  if(player.position.distanceTo(enemy.position)<3.5){let dmg=15+(profile.fighter_levels[profile.selected_char]||1)*3;if(adminRole?.powers?.doubleDamage&&$("powerToggle")?.classList.contains("on"))dmg*=2;ehp=Math.max(0,ehp-dmg)}
}
function loop(){
  if(!active)return;raf=requestAnimationFrame(loop);
  const dt=1/60;let dx=0,dz=0;if(keys.KeyW)dz--;if(keys.KeyS)dz++;if(keys.KeyA)dx--;if(keys.KeyD)dx++;if(mode!=="bot"&&joy.x||joy.z){dx=joy.x;dz=joy.z}
  let sp=.12;if(sprint&&stamina>0){sp=.21;stamina=Math.max(0,stamina-.8)}else stamina=Math.min(100,stamina+.35);
  const len=Math.hypot(dx,dz)||1;if(dx||dz){player.position.x+=dx/len*sp;player.position.z+=dz/len*sp;player.rotation.y=Math.atan2(dx,dz)}
  if(mode==="bot"){let dist=enemy.position.distanceTo(player.position);let botSp=.025+difficulty*.012;if(dist>2){enemy.lookAt(player.position);enemy.translateZ(botSp)}else if(Math.random()<.01+difficulty*.008)hp=Math.max(0,hp-(1+difficulty*.8))}
  camera.position.lerp(new THREE.Vector3(player.position.x,6,player.position.z+9),.1);camera.lookAt(player.position.x,1,player.position.z);
  $("hpText").textContent=Math.round(hp);$("enemyHpText").textContent=Math.round(ehp);$("gamePoints").textContent=profile.points;
  if(hp<=0)return finish(false);if(ehp<=0)return finish(true);
  renderer.render(scene,camera);
}
async function finish(win){active=false;cancelAnimationFrame(raf);if(win){await saveProfile({points:profile.points+150,wins:profile.wins+1,xp:profile.xp+100});alert("Victory! +150 pts.");}else{await saveProfile({losses:profile.losses+1});alert("Defeated.");}stop(false);show("menuScreen")}
function stop(back=true){active=false;cancelAnimationFrame(raf);if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null} $("gameUI").classList.add("hidden");$("touchControls").classList.add("hidden");if(back)show("menuScreen")}
window.addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="KeyJ")attack();if(e.code==="ShiftLeft"||e.code==="ShiftRight")sprint=true});
window.addEventListener("keyup",e=>{keys[e.code]=false;if(e.code==="ShiftLeft"||e.code==="ShiftRight")sprint=false});
$("attackBtn").ontouchstart=e=>{e.preventDefault();attack()};$("sprintBtn").ontouchstart=()=>sprint=true;$("sprintBtn").ontouchend=()=>sprint=false;
$("joy").addEventListener("touchmove",e=>{const r=$("joy").getBoundingClientRect(),t=e.touches[0],cx=r.left+r.width/2,cy=r.top+r.height/2;let x=t.clientX-cx,z=t.clientY-cy,d=Math.hypot(x,z),m=45;if(d>m){x=x/d*m;z=z/d*m}$("knob").style.transform=`translate(${x}px,${z}px)`;joy.x=x/m;joy.z=z/m},{passive:false});
$("joy").addEventListener("touchend",()=>{joy.x=joy.z=0;$("knob").style.transform="translate(0,0)"});
return {start,stop,get active(){return active}};
})();