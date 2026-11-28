(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clone=o=>JSON.parse(JSON.stringify(o));
const root=document.documentElement;
const baht=n=>n==null?'\u0E3F \u2014':'\u0E3F'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');

let token='',CFG=null,draft=null,dirty=false,tab='products',editId=null,fOpts=[],fImgs=[],sureT=null,HIST=[];
try{token=sessionStorage.getItem('onda_token')||'';}catch(e){}

/* ---------- API ---------- */
async function api(path,opts){
  opts=opts||{};const headers=Object.assign({},opts.headers||{});
  if(token)headers.authorization='Bearer '+token;
  let r;try{r=await fetch(path,Object.assign({},opts,{headers:headers,cache:'no-store'}));}catch(e){return{ok:false,status:0,data:null};}
  let data=null;try{data=await r.json();}catch(e){}
  return{ok:r.ok,status:r.status,data:data};
}
const setToken=t=>{token=t||'';try{t?sessionStorage.setItem('onda_token',t):sessionStorage.removeItem('onda_token');}catch(e){}};

/* ---------- theme ---------- */
const lum=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return 0;const n=parseInt(m[1],16);return(0.2126*(n>>16&255)+0.7152*(n>>8&255)+0.0722*(n&255))/255;};
function applyTheme(t){
  const r=root.style;r.setProperty('--bg',t.bg);r.setProperty('--ink',t.ink);
  r.setProperty('--logo-f',lum(t.ink)<0.5?'invert(1)':'none');r.setProperty('color-scheme',lum(t.bg)<0.5?'dark':'light');
}

/* ---------- sign in ---------- */
function showLogin(msg){
  $('loginv').hidden=false;$('admin').hidden=true;$('asave').hidden=true;
  $('lerr').textContent=msg||'';
}
$('lform').addEventListener('submit',async e=>{
  e.preventDefault();const err=$('lerr'),b=$('lbtn');
  if(!$('lu').value.trim()||!$('lp').value){err.textContent='\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2A\u0E48 user \u0E41\u0E25\u0E30\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19';return;}
  b.disabled=true;err.textContent='';
  const r=await api('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user:$('lu').value.trim(),password:$('lp').value})});
  b.disabled=false;$('lp').value='';
  if(r.ok&&r.data&&r.data.token){setToken(r.data.token);$('lu').value='';await enter();}
  else if(r.status===401)err.textContent='user \u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07';
  else if(r.data&&r.data.error==='not_configured')err.textContent='\u0E22\u0E31\u0E07\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 ADMIN_USER / ADMIN_PASS / SESSION_SECRET \u0E43\u0E19 Vercel (\u0E14\u0E39 README)';
  else err.textContent='\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49';
});
async function loadData(){
  const r=await api('/api/data');
  if(r.ok&&r.data&&r.data.cfg)return r.data.cfg;
  const d=await fetch('/default-data.json');return d.json();
}
async function loadHistory(){
  const r=await api('/api/history');
  if(r.status===401){setToken('');showLogin('\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48');return false;}
  HIST=(r.ok&&r.data&&r.data.items)||[];return true;
}
async function enter(){
  CFG=await loadData();
  if(!(await loadHistory()))return;
  $('loginv').hidden=true;$('admin').hidden=false;$('asave').hidden=false;
  if(CFG.site&&CFG.site.icon)$('fav').href=CFG.site.icon;
  startDraft();
}
$('blogout').addEventListener('click',()=>{setToken('');showLogin('');});

/* ---------- draft ---------- */
const aStatus=(t,ok)=>{const s=$('astatus');s.textContent=t||'';s.className='err'+(ok?' ok':'');};
function markDirty(v){dirty=v!==false;$('dirty').hidden=!dirty;$('clean').hidden=dirty;}
function startDraft(){draft=clone(CFG);markDirty(false);aStatus('');resetForm();renderAdmin();applyTheme(CFG.theme);}
function renderAdmin(){aProducts();aCats();aColors();aMusic();aSite();aBackup();showTab(tab);}
function showTab(t){
  tab=t;[].forEach.call(document.querySelectorAll('#tabs .tab'),b=>b.classList.toggle('on',b.getAttribute('data-t')===t));
  ['products','cats','colors','music','site','backup'].forEach(n=>{$('pane-'+n).hidden=(n!==t);});
}
$('tabs').addEventListener('click',e=>{const b=e.target.closest?e.target.closest('.tab'):null;if(b)showTab(b.getAttribute('data-t'));});
function sure(b,label,fn){                       // two-step confirm, no pop-ups
  if(b.getAttribute('data-sure')!=='1'){
    b.setAttribute('data-sure','1');b.textContent='\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19?';clearTimeout(sureT);
    sureT=setTimeout(()=>{b.setAttribute('data-sure','0');b.textContent=label;},3000);
  }else{b.setAttribute('data-sure','0');fn();}
}
const labelOf=slug=>{const c=draft.categories.find(x=>x.slug===slug);return c?c.label:slug;};

/* ---------- products ---------- */
function aProducts(){
  $('fc').innerHTML=draft.categories.map(c=>'<option value="'+esc(c.slug)+'">'+esc(c.label)+'</option>').join('');
  $('alist').innerHTML=draft.products.length?draft.products.map((p,i)=>
    '<li class="arow"><img class="athumb" data-i="'+i+'" alt=""><div class="ainfo"><b>'+esc(p.name)+'</b><small>'+esc(labelOf(p.cat))+
    (p.options&&p.options.length?' \u00B7 '+p.options.filter(o=>o.price!=null).map(o=>baht(o.price)).join(' / '):'')+'</small></div>'+
    '<div class="aact"><button class="btn ghost sm" type="button" data-act="edit" data-i="'+i+'">\u0E41\u0E01\u0E49\u0E44\u0E02</button>'+
    '<button class="btn ghost sm" type="button" data-act="del" data-i="'+i+'">\u0E25\u0E1A</button></div></li>').join(''):
    '<li class="aempty">\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32</li>';
  [].forEach.call(document.querySelectorAll('#alist img'),im=>{const p=draft.products[+im.getAttribute('data-i')];im.src=(p.imgs&&p.imgs[0])||'';});
}
$('alist').addEventListener('click',e=>{
  const b=e.target.closest?e.target.closest('[data-act]'):null;if(!b)return;
  const i=+b.getAttribute('data-i'),p=draft.products[i];
  if(b.getAttribute('data-act')==='edit'){
    editId=p.id;$('fn').value=p.name;$('fb').value=p.brand||'';$('fc').value=p.cat;
    fOpts=(p.options||[]).map(o=>({label:o.label,price:o.price}));if(!fOpts.length)fOpts=[{label:'Option 1',price:null}];
    fImgs=(p.imgs||[]).slice();renderOpts();renderThumbs();
    $('ftitle').textContent='\u0E41\u0E01\u0E49\u0E44\u0E02\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32';$('fsave').textContent='\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02';$('fcancel').hidden=false;$('ferr').textContent='';
    if($('pform').scrollIntoView)$('pform').scrollIntoView({behavior:'smooth',block:'start'});
  }else sure(b,'\u0E25\u0E1A',()=>{const was=draft.products[i];draft.products.splice(i,1);if(editId===was.id)resetForm();markDirty();aProducts();});
});
function renderOpts(){
  $('fopts').innerHTML=fOpts.map((o,i)=>
    '<div class="orow"><input class="in" data-i="'+i+'" data-f="label" placeholder="\u0E0A\u0E37\u0E48\u0E2D\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01" value="'+esc(o.label)+'">'+
    '<input class="in" data-i="'+i+'" data-f="price" inputmode="numeric" placeholder="\u0E23\u0E32\u0E04\u0E32" value="'+(o.price==null?'':o.price)+'">'+
    '<button class="rm" type="button" data-rm="'+i+'" aria-label="Remove">&times;</button></div>').join('');
}
function renderThumbs(){
  $('fthumbs').innerHTML=fImgs.map((s,i)=>'<div class="thumb"><img data-i="'+i+'" alt=""><button type="button" data-rm="'+i+'" aria-label="Remove">&times;</button></div>').join('');
  [].forEach.call(document.querySelectorAll('#fthumbs img'),im=>{im.src=fImgs[+im.getAttribute('data-i')];});
}
function resetForm(){
  editId=null;$('fn').value='';$('fb').value='';fOpts=[{label:'Option 1',price:null}];fImgs=[];renderOpts();renderThumbs();
  $('ftitle').textContent='\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48';$('fsave').textContent='\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32';$('fcancel').hidden=true;$('ferr').textContent='';$('ferr').className='err';
}
$('fopts').addEventListener('input',e=>{
  const t=e.target,f=t.getAttribute('data-f');if(!f)return;const i=+t.getAttribute('data-i');
  if(f==='label')fOpts[i].label=t.value;else{const d=t.value.replace(/[^\d]/g,'');fOpts[i].price=d===''?null:Number(d);}
});
$('fopts').addEventListener('click',e=>{const b=e.target.closest?e.target.closest('[data-rm]'):null;if(b){fOpts.splice(+b.getAttribute('data-rm'),1);renderOpts();}});
$('faddopt').addEventListener('click',()=>{fOpts.push({label:'Option '+(fOpts.length+1),price:null});renderOpts();});
$('fthumbs').addEventListener('click',e=>{const b=e.target.closest?e.target.closest('[data-rm]'):null;if(b){fImgs.splice(+b.getAttribute('data-rm'),1);renderThumbs();}});
$('fcancel').addEventListener('click',resetForm);

/* uploads go to Vercel Blob through /api/upload; the page keeps only the returned link */
async function uploadFile(blob,kind){
  const r=await api('/api/upload?kind='+kind,{method:'POST',headers:{'content-type':blob.type||'application/octet-stream'},body:blob});
  if(r.ok&&r.data&&r.data.url)return r.data.url;
  const code=r.data&&r.data.error;
  throw new Error(code==='too_large'?'\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B':code==='unauthorized'?'\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48':code==='bad_type'?'\u0E0A\u0E19\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A':'\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08');
}
function fitPhoto(file){                          // fit any picture inside a 1059 x 1059 transparent square
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{
      const S=1059,c=document.createElement('canvas');c.width=c.height=S;
      const sc=Math.min(S/im.width,S/im.height),w=im.width*sc,h=im.height*sc;
      c.getContext('2d').drawImage(im,(S-w)/2,(S-h)/2,w,h);URL.revokeObjectURL(url);
      c.toBlob(b=>b?res(b):rej(new Error('\u0E2D\u0E48\u0E32\u0E19\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49')),'image/webp',.86);
    };
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('\u0E2D\u0E48\u0E32\u0E19\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49'));};im.src=url;
  });
}
$('ff').addEventListener('change',e=>{
  const files=[].slice.call(e.target.files||[]);let chain=Promise.resolve();$('ferr').className='err';$('ferr').textContent='';
  files.forEach(f=>{chain=chain.then(async()=>{
    if(fImgs.length>=8){$('ferr').textContent='\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 8 \u0E23\u0E39\u0E1B\u0E15\u0E48\u0E2D\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32';return;}
    try{$('ferr').className='err ok';$('ferr').textContent='\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14...';
      fImgs.push(await uploadFile(await fitPhoto(f),'image'));renderThumbs();$('ferr').textContent='';}
    catch(err){$('ferr').className='err';$('ferr').textContent=err.message;}
  });});
  chain.then(()=>{e.target.value='';});
});
$('pform').addEventListener('submit',e=>{
  e.preventDefault();const ferr=$('ferr');ferr.className='err';
  const name=$('fn').value.trim();
  if(!name){ferr.textContent='\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2A\u0E48\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32';return;}
  if(!draft.categories.length||!$('fc').value){ferr.textContent='\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48\u0E01\u0E48\u0E2D\u0E19';return;}
  if(!fImgs.length){ferr.textContent='\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E39\u0E1B\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E23\u0E39\u0E1B';return;}
  const options=fOpts.filter(o=>o.label.trim()||o.price!=null).map(o=>({label:o.label.trim()||'Option',price:o.price}));
  const prod={id:editId||('p'+Date.now()),cat:$('fc').value,name:name,brand:$('fb').value.trim(),options:options,imgs:fImgs.slice()};
  const at=draft.products.findIndex(p=>p.id===editId);
  if(editId&&at>=0)draft.products[at]=prod;else draft.products.push(prod);
  markDirty();resetForm();aProducts();
  ferr.className='err ok';ferr.textContent='\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E14 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E30\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E2B\u0E47\u0E19';
});

/* ---------- categories ---------- */
function slugify(t){const s=t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return s||('c'+Date.now().toString(36));}
function aCats(){
  $('clist').innerHTML=draft.categories.length?draft.categories.map((c,i)=>
    '<li class="arow"><input class="in" data-i="'+i+'" value="'+esc(c.label)+'" aria-label="Category name">'+
    '<div class="aact"><button class="btn ghost sm" type="button" data-act="up" data-i="'+i+'" aria-label="Up">\u2191</button>'+
    '<button class="btn ghost sm" type="button" data-act="down" data-i="'+i+'" aria-label="Down">\u2193</button>'+
    '<button class="btn ghost sm" type="button" data-act="del" data-i="'+i+'">\u0E25\u0E1A</button></div></li>').join(''):
    '<li class="aempty">\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48</li>';
  $('fc').innerHTML=draft.categories.map(c=>'<option value="'+esc(c.slug)+'">'+esc(c.label)+'</option>').join('');
}
$('clist').addEventListener('input',e=>{const i=e.target.getAttribute('data-i');if(i==null)return;draft.categories[+i].label=e.target.value;markDirty();});
$('clist').addEventListener('click',e=>{
  const b=e.target.closest?e.target.closest('[data-act]'):null;if(!b)return;
  const i=+b.getAttribute('data-i'),act=b.getAttribute('data-act'),L=draft.categories;
  if(act==='up'&&i>0){[L[i-1],L[i]]=[L[i],L[i-1]];markDirty();aCats();}
  else if(act==='down'&&i<L.length-1){[L[i+1],L[i]]=[L[i],L[i+1]];markDirty();aCats();}
  else if(act==='del'){
    if(draft.products.some(p=>p.cat===L[i].slug)){$('cerr').className='err';$('cerr').textContent='\u0E21\u0E35\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E2B\u0E21\u0E27\u0E14\u0E19\u0E35\u0E49 \u0E15\u0E49\u0E2D\u0E07\u0E22\u0E49\u0E32\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E1A\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E01\u0E48\u0E2D\u0E19';return;}
    sure(b,'\u0E25\u0E1A',()=>{L.splice(i,1);markDirty();aCats();$('cerr').textContent='';});
  }
});
$('cadd').addEventListener('click',()=>{
  const v=$('cnew').value.trim(),err=$('cerr');err.className='err';
  if(!v){err.textContent='\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2A\u0E48\u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48';return;}
  let s=slugify(v);while(draft.categories.some(c=>c.slug===s)||s==='all')s+='-'+Math.floor(Math.random()*90+10);
  draft.categories.push({slug:s,label:v});$('cnew').value='';err.textContent='';markDirty();aCats();
});

/* ---------- colors ---------- */
const PRESETS=[['\u0E14\u0E33 / \u0E02\u0E32\u0E27 (\u0E40\u0E14\u0E34\u0E21)','#000000','#ffffff'],['\u0E02\u0E32\u0E27 / \u0E14\u0E33','#ffffff','#000000'],['\u0E01\u0E23\u0E21\u0E17\u0E48\u0E32\u0E21\u0E37\u0E14','#0b0f1a','#e8edf7'],['\u0E19\u0E49\u0E33\u0E15\u0E32\u0E25\u0E40\u0E02\u0E49\u0E21','#1a1410','#f2e8d8'],['\u0E40\u0E02\u0E35\u0E22\u0E27\u0E40\u0E02\u0E49\u0E21','#07140f','#e3f5ea']];
const HEX=/^#[0-9a-f]{6}$/i;
function aColors(){
  $('cbg').value=draft.theme.bg;$('cbgt').value=draft.theme.bg;$('cink').value=draft.theme.ink;$('cinkt').value=draft.theme.ink;
  $('presets').innerHTML=PRESETS.map((p,i)=>'<button class="preset" type="button" data-i="'+i+'" style="--pb:'+p[1]+';--pi:'+p[2]+'"><i></i><span>'+esc(p[0])+'</span></button>').join('');
}
function setColor(k,v){if(!HEX.test(v))return;draft.theme[k]=v.toLowerCase();applyTheme(draft.theme);markDirty();
  $(k==='bg'?'cbg':'cink').value=draft.theme[k];$(k==='bg'?'cbgt':'cinkt').value=draft.theme[k];}
$('cbg').addEventListener('input',e=>setColor('bg',e.target.value));$('cink').addEventListener('input',e=>setColor('ink',e.target.value));
$('cbgt').addEventListener('change',e=>setColor('bg',e.target.value.trim()));$('cinkt').addEventListener('change',e=>setColor('ink',e.target.value.trim()));
$('presets').addEventListener('click',e=>{const b=e.target.closest?e.target.closest('.preset'):null;if(!b)return;const p=PRESETS[+b.getAttribute('data-i')];setColor('bg',p[1]);setColor('ink',p[2]);});

/* ---------- music ---------- */
function aMusic(){
  const M=draft.music;$('mon').checked=!!M.on;$('mvol').value=M.vol==null?60:M.vol;
  $('mname').textContent=M.src?('\u0E40\u0E1E\u0E25\u0E07\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: '+(M.name||'\u0E44\u0E21\u0E48\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D')):'\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E1E\u0E25\u0E07';
}
$('mon').addEventListener('change',e=>{draft.music.on=e.target.checked;markDirty();});
$('mvol').addEventListener('input',e=>{draft.music.vol=+e.target.value;markDirty();});
$('mdel').addEventListener('click',e=>sure(e.target,'\u0E25\u0E1A\u0E40\u0E1E\u0E25\u0E07',()=>{draft.music={src:'',name:'',on:false,vol:draft.music.vol};markDirty();aMusic();}));
$('mfile').addEventListener('change',async e=>{
  const f=(e.target.files||[])[0],err=$('merr');err.className='err';err.textContent='';if(!f)return;
  if(f.size>4.4e6){err.textContent='\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19 4 MB \u0E25\u0E2D\u0E07\u0E1A\u0E35\u0E1A\u0E2D\u0E31\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E01\u0E48\u0E2D\u0E19';e.target.value='';return;}
  try{
    err.className='err ok';err.textContent='\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14...';
    const src=await uploadFile(f,'audio');
    draft.music={src:src,name:f.name,on:true,vol:draft.music.vol==null?60:draft.music.vol};markDirty();aMusic();
    err.textContent='\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E01\u0E14\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01';
  }catch(x){err.className='err';err.textContent=x.message;}
  e.target.value='';
});

/* ---------- shop info ---------- */
const DEF_ICON='/assets/icon-512.png',DEF_BANNER='/assets/og-banner.jpg';
function aSite(){
  const S=draft.site;
  $('s-tag').value=S.tagline||'';$('s-ig').value=S.ig||'';$('s-igl').value=S.igLabel||'';
  $('s-title').value=S.title||'';$('s-desc').value=S.desc||'';
  $('icoPrev').src=S.icon||DEF_ICON;$('banPrev').src=S.banner||DEF_BANNER;
}
[['s-tag','tagline'],['s-ig','ig'],['s-igl','igLabel'],['s-title','title'],['s-desc','desc']].forEach(p=>$(p[0]).addEventListener('input',e=>{draft.site[p[1]]=e.target.value;markDirty();}));

function loadImage(file){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{URL.revokeObjectURL(url);res(im);};
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('\u0E2D\u0E48\u0E32\u0E19\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49'));};im.src=url;
  });
}
const toBlob=(c,type,q)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49')),type,q));
const sMsg=(t,ok)=>{const e=$('serr');e.className='err'+(ok?' ok':'');e.textContent=t||'';};

// icon: the picture sits centred on a square 512 x 512 canvas filled with the chosen colour
$('ifile').addEventListener('change',async e=>{
  const f=(e.target.files||[])[0];e.target.value='';if(!f)return;
  try{
    sMsg('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14...',true);
    const im=await loadImage(f),S=512,c=document.createElement('canvas');c.width=c.height=S;
    const x=c.getContext('2d');x.fillStyle=$('icoBg').value||'#000000';x.fillRect(0,0,S,S);
    const box=S*0.76,k=Math.min(box/im.width,box/im.height),w=im.width*k,h=im.height*k;
    x.drawImage(im,(S-w)/2,(S-h)/2,w,h);
    draft.site.icon=await uploadFile(await toBlob(c,'image/png'),'image');
    markDirty();aSite();sMsg('\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E44\u0E2D\u0E04\u0E2D\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E14\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E08\u0E23\u0E34\u0E07',true);
  }catch(x){sMsg(x.message);}
});
// banner: cropped from the centre to 1200 x 630 (the size link previews use)
$('bfile').addEventListener('change',async e=>{
  const f=(e.target.files||[])[0];e.target.value='';if(!f)return;
  try{
    sMsg('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14...',true);
    const im=await loadImage(f),W=1200,H=630,c=document.createElement('canvas');c.width=W;c.height=H;
    const k=Math.max(W/im.width,H/im.height),w=im.width*k,h=im.height*k;
    c.getContext('2d').drawImage(im,(W-w)/2,(H-h)/2,w,h);
    draft.site.banner=await uploadFile(await toBlob(c,'image/jpeg',.88),'image');
    markDirty();aSite();sMsg('\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E41\u0E1A\u0E19\u0E40\u0E19\u0E2D\u0E23\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E14\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E08\u0E23\u0E34\u0E07',true);
  }catch(x){sMsg(x.message);}
});
$('ireset').addEventListener('click',()=>{draft.site.icon=DEF_ICON;markDirty();aSite();sMsg('');});
$('breset').addEventListener('click',()=>{draft.site.banner=DEF_BANNER;markDirty();aSite();sMsg('');});

/* ---------- backup / restore ---------- */
const fmtTime=iso=>{try{return new Date(iso).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});}catch(e){return iso;}};
function aBackup(){
  $('hlist').innerHTML=HIST.length?HIST.map((h,i)=>
    '<li class="arow"><div class="ainfo"><b>'+esc(fmtTime(h.at))+'</b><small>\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32</small></div>'+
    '<div class="aact"><button class="btn ghost sm" type="button" data-i="'+i+'">\u0E04\u0E37\u0E19\u0E04\u0E48\u0E32\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E43\u0E0A\u0E49</button></div></li>').join(''):
    '<li class="aempty">\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01</li>';
}
function loadIntoDraft(cfg,msg){draft=clone(cfg);markDirty();resetForm();renderAdmin();applyTheme(draft.theme);aStatus(msg,true);}
$('hlist').addEventListener('click',async e=>{
  const b=e.target.closest?e.target.closest('button'):null;if(!b)return;
  const h=HIST[+b.getAttribute('data-i')];aStatus('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...',true);
  const r=await api('/api/history?id='+encodeURIComponent(h.id));
  if(r.ok&&r.data&&r.data.cfg)loadIntoDraft(r.data.cfg,'\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E01\u0E48\u0E32\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E14 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E30\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E08\u0E23\u0E34\u0E07');
  else aStatus('\u0E42\u0E2B\u0E25\u0E14\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49');
});
$('bfactory').addEventListener('click',e=>sure(e.target,'\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E48\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E02\u0E2D\u0E07\u0E23\u0E49\u0E32\u0E19',async()=>{
  const d=await fetch('/default-data.json');loadIntoDraft(await d.json(),'\u0E42\u0E2B\u0E25\u0E14\u0E04\u0E48\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E14 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E30\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E08\u0E23\u0E34\u0E07');
}));
$('bdl').addEventListener('click',()=>{
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));
  a.download='onda-street-backup.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  aStatus('\u0E14\u0E32\u0E27\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E41\u0E25\u0E49\u0E27',true);
});
$('bimp').addEventListener('change',async e=>{
  const f=(e.target.files||[])[0];if(!f)return;
  try{
    const c=JSON.parse(await f.text());
    if(!c||!c.theme||!Array.isArray(c.categories)||!Array.isArray(c.products)||!c.site||!c.music)throw new Error('bad');
    loadIntoDraft(c,'\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E44\u0E1F\u0E25\u0E4C\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E14 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E30\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E08\u0E23\u0E34\u0E07');
  }catch(x){aStatus('\u0E44\u0E1F\u0E25\u0E4C\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07');}
  e.target.value='';
});

/* ---------- save / discard ---------- */
$('discard').addEventListener('click',()=>{
  if(!dirty){aStatus('\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02\u0E43\u0E2B\u0E49\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01');return;}
  startDraft();aStatus('\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E25\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E17\u0E35\u0E48\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48',true);
});
$('publish').addEventListener('click',async()=>{
  if(!dirty){aStatus('\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E49\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01');return;}
  const pb=$('publish');pb.disabled=true;aStatus('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01...',true);
  const r=await api('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cfg:draft})});
  pb.disabled=false;
  if(r.status===401){setToken('');showLogin('\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48 (\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E41\u0E01\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01)');return;}
  if(!r.ok){
    const c=r.data&&r.data.error;
    aStatus(c==='too_large'?'\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B':c==='invalid_data'?'\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19':c==='storage_error'?'\u0E40\u0E01\u0E47\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E15\u0E23\u0E27\u0E08\u0E27\u0E48\u0E32\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21 Blob Store \u0E01\u0E31\u0E1A\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C\u0E41\u0E25\u0E49\u0E27 (\u0E14\u0E39 README)':'\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07');
    return;
  }
  CFG=clone(draft);markDirty(false);await loadHistory();aBackup();
  aStatus('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E49\u0E27 \u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E2B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E43\u0E19\u0E44\u0E21\u0E48\u0E01\u0E35\u0E48\u0E27\u0E34\u0E19\u0E32\u0E17\u0E35',true);
});

/* ---------- start ---------- */
(async function(){
  if(token){const r=await api('/api/login');if(r.ok){await enter();return;}setToken('');}
  showLogin('');
})();
})();
