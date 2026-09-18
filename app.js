const sb = (window.supabase && window.POLYCLASH_CONFIG.SUPABASE_URL.startsWith("http"))
  ? window.supabase.createClient(window.POLYCLASH_CONFIG.SUPABASE_URL, window.POLYCLASH_CONFIG.SUPABASE_ANON_KEY)
  : null;

let profile=null, adminRole=null, selectedAdminPlayer=null, realtimeChannel=null;

const $=id=>document.getElementById(id);
window.show=function show(id){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
}
function msg(t){$("authStatus").textContent=t}
function ready(){return !!sb}

async function boot(){
  if(!ready()){msg("Open js/config.js and add your Supabase URL + publishable/anon key."); return;}
  const {data:{session}}=await sb.auth.getSession();
  if(session) await loadProfile();
  else show("authScreen");
  sb.auth.onAuthStateChange(async (_event,session)=>{
    if(session) await loadProfile(); else {profile=null;show("authScreen");}
  });
}
window.loadProfile=async function loadProfile(){
  const {data,error}=await sb.from("profiles").select("*").eq("id",(await sb.auth.getUser()).data.user.id).single();
  if(error){msg(error.message);return;}
  profile=data; $("userName").textContent=profile.username; $("points").textContent=profile.points+" pts";
  const {data:role}=await sb.from("admin_roles").select("role,powers").eq("user_id",profile.id).maybeSingle();
  adminRole=role;
  $("adminMenuBtn").classList.toggle("hidden",!role);
  buildLocker(); setupDifficulties();
  show("menuScreen");
}
async function signUp(){
  if(!ready()) return msg("Configure Supabase first.");
  const email=$("authEmail").value.trim(), password=$("authPassword").value, username=$("authUsername").value.trim();
  if(username.length<3) return msg("Username must be at least 3 characters.");
  const {error}=await sb.auth.signUp({email,password,options:{data:{username}}});
  msg(error?error.message:"Account created. Check your email if confirmation is enabled.");
}
async function signIn(){
  if(!ready()) return msg("Configure Supabase first.");
  const {error}=await sb.auth.signInWithPassword({email:$("authEmail").value.trim(),password:$("authPassword").value});
  if(error) msg(error.message);
}
async function logout(){await sb.auth.signOut()}

window.saveProfile=async function saveProfile(patch){
  const {data,error}=await sb.from("profiles").update(patch).eq("id",profile.id).select().single();
  if(error){console.error(error);return false}
  profile=data;$("points").textContent=profile.points+" pts";return true;
}
function buildLocker(){
  if(!profile)return;
  $("selectedInfo").textContent=`Selected: ${CHARACTERS[profile.selected_char][0]} • Level ${profile.fighter_levels[profile.selected_char]}`;
  const unlocked=new Set(profile.unlocked||[0]);
  $("lockerGrid").innerHTML=CHARACTERS.map((c,i)=>{
    const open=unlocked.has(i), selected=profile.selected_char===i;
    return `<div class="fighter ${open?"unlocked":"locked"} ${selected?"selected":""}" data-i="${i}">
      <div class="fighter-name">${c[0]}</div><div class="rarity">${c[1]}</div>
      <div>${open?"Level "+profile.fighter_levels[i]:"LOCKED"}</div>
    </div>`;
  }).join("");
  document.querySelectorAll(".fighter").forEach(el=>el.onclick=async()=>{
    const i=+el.dataset.i;if(!(profile.unlocked||[]).includes(i))return;
    await saveProfile({selected_char:i});buildLocker();
  });
}
async function upgrade(){
  const i=profile.selected_char, levels=[...(profile.fighter_levels||Array(20).fill(1))];
  if(profile.points<150)return alert("Not enough points.");
  levels[i]=(levels[i]||1)+1;
  await saveProfile({points:profile.points-150,fighter_levels:levels,level:Math.max(...levels)});
  buildLocker();
}
function weightedRoll(){
  const total=CHARACTERS.reduce((a,c)=>a+c[2],0);let r=Math.random()*total;
  for(let i=0;i<CHARACTERS.length;i++){r-=CHARACTERS[i][2];if(r<=0)return i}
  return CHARACTERS.length-1;
}
async function summon(){
  if(profile.points<100)return alert("Not enough points.");
  let idx=weightedRoll(), unlocked=[...(profile.unlocked||[0])], points=profile.points-100;
  if(unlocked.includes(idx)) points+=50;
  else unlocked.push(idx);
  await saveProfile({points,unlocked});
  $("summonResult").innerHTML=unlocked.includes(idx) && unlocked.filter(x=>x===idx).length ? `${CHARACTERS[idx][0]} — ${profile.unlocked.includes(idx)?"DUPLICATE +50":"UNLOCKED"}` : CHARACTERS[idx][0];
  buildLocker();
}
function setupDifficulties(){
  $("difficultyGrid").innerHTML=["Easy","Normal","Hard","Expert","Nightmare"].map((x,i)=>`<button class="choice" data-d="${i}"><b>${x}</b><br><small>${["Relaxed","Balanced","Aggressive","Very fast","Extreme"][i]}</small></button>`).join("");
  document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>startArena("bot",+b.dataset.d));
}
async function publicJoin(){startArena("public",1)}
async function createPrivate(){
  const code=Math.random().toString(36).slice(2,10).toUpperCase();
  const {error}=await sb.from("rooms").insert({code,owner_id:profile.id,is_public:false});
  if(error)return $("privateStatus").textContent=error.message;
  await saveProfile({private_room_code:code});$("privateStatus").textContent="Your private server: "+code;
}
async function joinPrivate(){
  const code=$("roomCodeInput").value.trim().toUpperCase();
  const {data,error}=await sb.from("rooms").select("*").eq("code",code).single();
  if(error||!data)return $("privateStatus").textContent="Room not found.";
  startArena("private",1,code);
}
async function adminLoadPlayers(){
  if(!adminRole)return;
  let q=$("playerSearch").value.trim();
  let req=sb.from("profiles").select("id,username,points,level,wins,losses,selected_char").order("created_at",{ascending:false}).limit(100);
  if(q) req=req.ilike("username",`%${q}%`);
  const {data,error}=await req;if(error)return;
  $("playerList").innerHTML=(data||[]).map(p=>`<div class="player" data-id="${p.id}"><b>${p.username}</b> — Lv ${p.level} — ${p.points} pts</div>`).join("");
  document.querySelectorAll(".player").forEach(x=>x.onclick=()=>selectedAdminPlayer=x.dataset.id);
}
async function adminGive(){
  if(!adminRole||!selectedAdminPlayer)return alert("Select a player.");
  const n=Number($("grantPointsInput").value)||0;
  const {data:p,error}=await sb.from("profiles").select("points").eq("id",selectedAdminPlayer).single();
  if(error)return alert(error.message);
  const {error:e}=await sb.from("profiles").update({points:p.points+n}).eq("id",selectedAdminPlayer);
  alert(e?e.message:"Points granted.");
}
async function adminUnlock(){
  if(!adminRole||!selectedAdminPlayer)return alert("Select a player.");
  const {error}=await sb.from("profiles").update({unlocked:Array.from({length:20},(_,i)=>i)}).eq("id",selectedAdminPlayer);
  alert(error?error.message:"All fighters unlocked.");
}

$("signUpBtn").onclick=signUp;$("signInBtn").onclick=signIn;$("logoutBtn").onclick=logout;
$("upgradeBtn").onclick=upgrade;$("summonBtn").onclick=summon;$("publicJoinBtn").onclick=publicJoin;
$("createPrivateBtn").onclick=createPrivate;$("joinPrivateBtn").onclick=joinPrivate;
$("refreshPlayersBtn").onclick=adminLoadPlayers;$("grantPointsBtn").onclick=adminGive;$("unlockAllBtn").onclick=adminUnlock;
$("powerToggle").onclick=()=>{$("powerToggle").classList.toggle("on");$("powerToggle").textContent=$("powerToggle").classList.contains("on")?"ON":"OFF"};
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen));
$("adminMenuBtn").onclick=()=>{show("adminScreen");adminLoadPlayers()};
$("homeBtn").onclick=()=>{if(window.Game&&Game.active)Game.stop();show(profile?"menuScreen":"authScreen")};
$("leaveGameBtn").onclick=()=>{Game.stop();show("menuScreen")};
boot();
