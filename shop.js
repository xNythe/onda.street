(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const root=document.documentElement;
let CFG=null;

/* ---------- data: saved by the admin page (API), with the built-in default as a fallback ---------- */
async function loadCfg(){
  if(window.__CFG__)return window.__CFG__;
  try{
    const r=await fetch('/api/data',{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&j.cfg)return j.cfg;}
  }catch(e){}
  const r=await fetch('/default-data.json');return r.json();
}

/* ---------- theme / texts ---------- */
const lum=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return 0;const n=parseInt(m[1],16);return(0.2126*(n>>16&255)+0.7152*(n>>8&255)+0.0722*(n&255))/255;};
function applyTheme(t){
  const r=root.style;r.setProperty('--bg',t.bg);r.setProperty('--ink',t.ink);
  r.setProperty('--logo-f',lum(t.ink)<0.5?'invert(1)':'none');r.setProperty('color-scheme',lum(t.bg)<0.5?'dark':'light');
}
const logoSrc=$('logo').getAttribute('src');$('logo2').src=logoSrc;$('logo3').src=logoSrc;
const find=slug=>slug==='all'?{slug:'all',label:'All Products'}:(CFG.categories.find(c=>c.slug===slug)||null);
const labelOf=slug=>{const c=find(slug);return c?c.label:slug;};
const baht=n=>n==null?'\u0E3F \u2014':'\u0E3F'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');

function renderShop(){
  applyTheme(CFG.theme);
  $('gtag').textContent=CFG.site.tagline||'';$('hsub').textContent=CFG.site.tagline||'';
  [].forEach.call(document.querySelectorAll('.ig'),a=>{
    const ok=/^https:\/\//.test(CFG.site.ig||'');a.hidden=!ok;
    if(ok){a.href=CFG.site.ig;a.querySelector('span').textContent=CFG.site.igLabel||'';a.setAttribute('aria-label','Instagram '+(CFG.site.igLabel||''));}
  });
  $('ctiles').innerHTML=[{slug:'all',label:'All Products'}].concat(CFG.categories).map((c,i)=>
    '<li><a class="tile" href="#c-'+esc(c.slug)+'" style="--i:'+i+'"><b>'+esc(c.label)+'</b></a></li>').join('');
}

/* ---------- music (starts on the first tap; the entry screen is that tap) ---------- */
const box=$('music'),btn=$('toggle'),vol=$('vol');
let audio=null,userPaused=false,tapped=false;
function setupMusic(){
  const M=CFG.music;box.hidden=!(M&&M.src&&M.on);if(box.hidden)return;
  vol.value=M.vol==null?60:M.vol;
  audio=new Audio(M.src);audio.loop=true;audio.preload='auto';audio.volume=vol.value/100;
  const ui=on=>{box.classList.toggle('on',on);btn.setAttribute('aria-pressed',on);btn.setAttribute('aria-label',on?'Pause music':'Play music');};
  audio.addEventListener('play',()=>ui(true));audio.addEventListener('pause',()=>ui(false));
  const play=()=>{userPaused=false;audio.play().catch(()=>ui(false));};
  btn.addEventListener('click',e=>{e.stopPropagation();audio.paused?play():(userPaused=true,audio.pause());});
  vol.addEventListener('input',()=>{audio.volume=vol.value/100;});
  const evts=['click','touchend','pointerup','keydown'];
  const gesture=e=>{if(box.contains(e.target)||userPaused)return;if(audio.paused)audio.play().catch(()=>{});};
  const arm=on=>evts.forEach(t=>document[on?'addEventListener':'removeEventListener'](t,gesture,true));
  audio.addEventListener('playing',()=>arm(false));
  arm(true);
  if(tapped)play();else audio.play().catch(()=>{});
}

/* ---------- navigation ---------- */
const home=$('home'),cats=$('categories'),catv=$('catv'),back=$('back'),gear=$('gear'),ticker=$('ticker');
let view=null,key=null,pending=null,swapTimer=null;
const RANK={home:0,cats:1,cat:2};
const els=v=>v==='home'?[home,ticker]:v==='cats'?[cats]:[catv];
function go(v,slug){
  const k=v+(slug?':'+slug:'');if(k===key)return;
  if(pending){clearTimeout(swapTimer);pending();}
  const first=key===null,outEls=first?[]:els(view),inEls=els(v);
  document.body.setAttribute('data-dir',first||RANK[v]>=RANK[view]?'fwd':'back');
  view=v;key=k;
  function swap(){
    pending=null;
    [home,ticker,cats,catv].forEach(e=>{e.hidden=true;e.classList.remove('leave','arrive');});
    if(v==='cat'){$('ctitle').textContent=labelOf(slug);renderProducts(slug);}
    inEls.forEach(e=>{e.hidden=false;});
    gear.hidden=(v!=='cats');
    const wasHidden=back.hidden;back.hidden=(v==='home');back.classList.remove('arrive');
    window.scrollTo(0,0);
    if(!first){void document.body.offsetWidth;inEls.forEach(e=>e.classList.add('arrive'));if(v!=='home'&&wasHidden)back.classList.add('arrive');}
  }
  if(first){swap();return;}
  outEls.forEach(e=>e.classList.add('leave'));pending=swap;swapTimer=setTimeout(swap,240);
}
function route(){
  const h=location.hash;
  if(h==='#categories')go('cats');
  else if(h.indexOf('#c-')===0&&find(h.slice(3)))go('cat',h.slice(3));
  else go('home');
}
function setAddr(h){try{history.pushState(null,'',h);}catch(e){try{location.hash=h;}catch(e2){}}}
function open(v,slug,addr){go(v,slug);setAddr(addr);}
$('shop').addEventListener('click',e=>{e.preventDefault();open('cats',null,'#categories');});
$('ctiles').addEventListener('click',e=>{
  const a=e.target.closest?e.target.closest('.tile'):null;if(!a)return;
  e.preventDefault();const s=a.getAttribute('href').slice(3);open('cat',s,'#c-'+s);
});
back.addEventListener('click',e=>{e.preventDefault();if(view==='cat')open('cats',null,'#categories');else open('home',null,'#home');});
window.addEventListener('hashchange',route);window.addEventListener('popstate',route);

/* ---------- products ---------- */
const ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="%s"/></svg>';
function sliderHtml(p,i){
  const one=p.imgs.length<2;
  return '<div class="slides" tabindex="0" aria-label="'+esc(p.name)+' photos">'+p.imgs.map((_,k)=>
    '<img data-p="'+i+'" data-k="'+k+'" width="1059" height="1059" alt="'+esc(p.name)+' - photo '+(k+1)+'" decoding="async" loading="lazy">').join('')+'</div>'+
    (one?'':'<div class="dots">'+p.imgs.map((_,k)=>'<i'+(k?'':' class="on"')+'></i>').join('')+'</div>'+
    '<button class="nav prev" type="button" data-dir="-1" aria-label="Previous photo">'+ARROW.replace('%s','M15 5l-7 7 7 7')+'</button>'+
    '<button class="nav next" type="button" data-dir="1" aria-label="Next photo">'+ARROW.replace('%s','M9 5l7 7-7 7')+'</button>');
}
function fillImgs(sel){[].forEach.call(document.querySelectorAll(sel),im=>{im.src=CFG.products[+im.getAttribute('data-p')].imgs[+im.getAttribute('data-k')];});}
const grid=$('cgrid');
function renderProducts(slug){
  const all=slug==='all';let html='',n=0;
  CFG.products.forEach((p,i)=>{
    if(!all&&p.cat!==slug)return;
    html+='<li style="--i:'+Math.min(n++,11)+'"><article class="card"><div class="ph slider">'+sliderHtml(p,i)+
      '<button class="more" type="button" data-p="'+i+'">\u0E2D\u0E48\u0E32\u0E19\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>'+
      '<div class="pmeta"><h3 class="pname">'+esc(p.name)+'</h3>'+(all?'<p class="ptag">'+esc(labelOf(p.cat))+'</p>':'')+'</div></article></li>';
  });
  grid.innerHTML=html;fillImgs('#cgrid img');
}
function onNav(e){
  const b=e.target.closest?e.target.closest('.nav'):null;if(!b)return false;
  const s=b.parentNode.querySelector('.slides');s.scrollBy({left:(+b.getAttribute('data-dir'))*s.clientWidth,behavior:'smooth'});return true;
}
function onScroll(e){
  const s=e.target;if(!s.classList||!s.classList.contains('slides'))return;
  const k=Math.round(s.scrollLeft/(s.clientWidth||1));
  [].forEach.call(s.parentNode.querySelectorAll('.dots i'),(d,j)=>d.classList.toggle('on',j===k));
}
const sheet=$('sheet'),sslider=$('sslider');let opener=null,closeTimer=null;
function openSheet(b){
  const i=+b.getAttribute('data-p'),p=CFG.products[i];
  const from=b.parentNode&&b.parentNode.querySelector?b.parentNode.querySelector('.slides'):null;
  const k=from&&from.clientWidth?Math.round(from.scrollLeft/from.clientWidth):0;
  opener=b;$('sname').textContent=p.name;$('scat').textContent=labelOf(p.cat);
  sslider.innerHTML=sliderHtml(p,i);fillImgs('#sslider img');
  $('sbody').innerHTML=(p.brand?'<div><dt>Brand</dt><dd>'+esc(p.brand)+'</dd></div>':'')+
    (p.options&&p.options.length?'<div><dt>Price</dt><dd>'+p.options.map(o=>'<span class="opt">'+esc(o.label)+' <b>'+baht(o.price)+'</b></span>').join('')+'</dd></div>':'');
  clearTimeout(closeTimer);sheet.hidden=false;void sheet.offsetWidth;
  const s=sslider.querySelector?sslider.querySelector('.slides'):null;if(s&&k)s.scrollLeft=k*s.clientWidth;
  sheet.classList.add('open');root.classList.add('lock');$('sx').focus();
}
function closeSheet(){
  if(!sheet.classList.contains('open'))return;
  sheet.classList.remove('open');root.classList.remove('lock');
  closeTimer=setTimeout(()=>{sheet.hidden=true;if(opener&&opener.focus)opener.focus();},320);
}
grid.addEventListener('click',e=>{if(onNav(e))return;const b=e.target.closest?e.target.closest('.more'):null;if(b)openSheet(b);});
grid.addEventListener('scroll',onScroll,true);sheet.addEventListener('scroll',onScroll,true);
sheet.addEventListener('click',e=>{if(onNav(e))return;if(e.target.closest&&e.target.closest('[data-close]'))closeSheet();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

/* ---------- entry screen + logo that follows the mouse ---------- */
const gate=$('gate');
gate.addEventListener('click',()=>{
  tapped=true;if(audio&&!userPaused)audio.play().catch(()=>{});
  gate.classList.add('out');setTimeout(()=>{gate.style.display='none';},800);
});
gate.focus();
(function(){
  if(!window.matchMedia||!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const items=['logo','logo2','logo3'].map(id=>({el:$(id),x:0,y:0,r:0,tx:0,ty:0,tr:0}));
  let mx=-9999,my=-9999,running=false;
  function aim(s){
    const r=s.el.getBoundingClientRect();if(!r.width){s.tx=s.ty=s.tr=0;return;}
    const cx=r.left+r.width/2-s.x,cy=r.top+r.height/2-s.y,dx=mx-cx,dy=my-cy,dist=Math.sqrt(dx*dx+dy*dy)||1;
    const R=Math.max(320,r.width*.85);let k=Math.max(0,1-dist/R);k=k*k*(3-2*k);
    const reach=Math.min(26,r.width*.06);
    s.tx=dx/dist*reach*k;s.ty=dy/dist*reach*k;s.tr=Math.max(-1,Math.min(1,dx/R))*3.5*k;
  }
  function frame(){
    let moving=false;
    items.forEach(s=>{
      aim(s);s.x+=(s.tx-s.x)*.12;s.y+=(s.ty-s.y)*.12;s.r+=(s.tr-s.r)*.12;
      if(Math.abs(s.tx-s.x)>.05||Math.abs(s.ty-s.y)>.05||Math.abs(s.tr-s.r)>.01)moving=true;
      s.el.style.translate=s.x.toFixed(2)+'px '+s.y.toFixed(2)+'px';s.el.style.rotate=s.r.toFixed(2)+'deg';
    });
    if(moving)requestAnimationFrame(frame);else running=false;
  }
  const kick=()=>{if(!running){running=true;requestAnimationFrame(frame);}};
  document.addEventListener('pointermove',e=>{if(e.pointerType&&e.pointerType!=='mouse')return;mx=e.clientX;my=e.clientY;kick();});
  root.addEventListener('mouseleave',()=>{mx=my=-9999;kick();});
})();

/* ---------- start ---------- */
loadCfg().then(cfg=>{CFG=cfg;renderShop();setupMusic();route();})
  .catch(()=>{$('gtag').textContent='Please reload the page';});
})();
