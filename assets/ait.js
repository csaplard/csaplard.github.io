/* © 2026 Csaplár Dániel · CC BY-NC-SA 4.0 */
/* AI-tananyagok · Tér — viselkedés (vanilla). window.AIT */
(function(){
"use strict";
var doc=document, html=doc.documentElement;
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function $(s,r){return (r||doc).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||doc).querySelectorAll(s))}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}

/* ------------------------------------------------------------------
   Valódi tokenek (nyílt o200k_base tokenizáló, előre kiszámolva)
   ------------------------------------------------------------------ */
var TOK={
  "Mesterséges intelligencia,":[["M",44],["esters",63673],["éges",129232],[" intellig",14237],["encia",5174],[",",11]],
  " érthetően.":[[" ér",53048],["thet",178602],["ően",185227],[".",13]],
  " magyarul.":[[" magyar",110460],["ul",361],[".",13]],
  " ingyen.":[[" ing",4012],["yen",31069],[".",13]],
  " mindenkinek.":[[" mind",4246],["enk",17039],["inek",64731],[".",13]],
  " lépésről lépésre.":[[" lé",25423],["p",79],["és",1756],["r",81],["ől",46442],[" lé",25423],["p",79],["és",1756],["re",264],[".",13]],
  "Figyelem: ki kire néz a mondatban?":[["Fig",37833],["ye",2422],["lem",6596],[":",25],[" ki",3314],[" k",372],["ire",594],[" né",14832],["z",89],[" a",261],[" mond",20179],["at",266],["ban",6893],["?",30]],
  "Több fej, több nézőpont":[["T",51],["ö",573],["bb",10029],[" fej",130213],[",",11],[" több",86816],[" né",14832],["ző",74133],["pont",132439]]
};
function tokens(arr){
  return arr.map(function(p){var sp=/^ /.test(p[0]);return (sp?" ":"")+'<span class="t" data-id="'+p[1]+'">'+esc(sp?p[0].slice(1):p[0])+'</span>'}).join("");
}
var CANDS=[[" érthetően.",.38],[" magyarul.",.21],[" ingyen.",.17],[" mindenkinek.",.14],[" lépésről lépésre.",.10]];

/* ------------------------------------------------------------------
   Figyelem-ívek: bármely tokenekre bontott címen.
   Rámutatva a szórészlet ívet húz az összes korábbi részletre,
   vastagság = (szemléltető) figyelemsúly. Előre sosem néz.
   ------------------------------------------------------------------ */
function attend(stage, heading, read){
  var arcs=$("svg.arcs",stage); if(!arcs){arcs=doc.createElementNS("http://www.w3.org/2000/svg","svg");arcs.setAttribute("class","arcs");arcs.setAttribute("aria-hidden","true");stage.insertBefore(arcs,stage.firstChild)}
  var readDefault=read?read.textContent:"";
  function all(){return $$(".t",heading)}
  function startsWord(t){var p=t.previousSibling;return !p||(p.nodeType===3&&/\s$/.test(p.textContent))||(p.nodeType===1&&!p.classList.contains("t"))}
  function weights(i,ts){
    var s=[],sum=0,starts=ts.map(startsWord),txt=ts.map(function(t){return t.textContent});
    for(var j=0;j<i;j++){
      var same=true; for(var m=j+1;m<=i;m++){if(starts[m]){same=false;break}}
      var v=-0.45*(i-j)+(same?1.4:0)+(txt[j].length>3?0.35:0)+(/^[,.:?]$/.test(txt[j])?-1.3:0);
      s.push(Math.exp(v)); sum+=Math.exp(v);
    }
    return s.map(function(x){return x/sum});
  }
  function clear(){arcs.innerHTML="";all().forEach(function(t){t.classList.remove("hot","src")});if(read)read.textContent=readDefault}
  function show(i){
    var ts=all(); clear(); ts[i].classList.add("src");
    if(i===0){if(read)read.textContent="Az első szórészlet még nem tud visszanézni semmire.";return}
    var w=weights(i,ts),sr=stage.getBoundingClientRect(),a=ts[i].getBoundingClientRect(),best=0,out="";
    var ax=a.left+a.width/2-sr.left, ay=a.top-sr.top+a.height*0.14;
    w.forEach(function(x,j){
      if(x>w[best])best=j; if(x<0.04)return;
      var b=ts[j].getBoundingClientRect(),bx=b.left+b.width/2-sr.left,by=b.top-sr.top+b.height*0.14;
      var h=Math.min(130,26+Math.abs(ax-bx)*0.22+Math.abs(ay-by)*0.2),my=Math.min(ay,by)-h;
      out+='<path d="M'+ax.toFixed(1)+" "+ay.toFixed(1)+" C"+ax.toFixed(1)+" "+my.toFixed(1)+" "+bx.toFixed(1)+" "+my.toFixed(1)+" "+bx.toFixed(1)+" "+by.toFixed(1)+'" stroke-width="'+(0.8+x*9).toFixed(2)+'" opacity="'+(0.3+x*0.85).toFixed(2)+'"/>';
    });
    arcs.innerHTML=out; ts[best].classList.add("hot");
    if(read)read.innerHTML="„"+esc(ts[i].textContent)+"” leginkább ide figyel: „"+esc(ts[best].textContent)+"” (szemléltető súly: "+Math.round(w[best]*100)+" %). Előre sosem néz.";
  }
  function bind(){all().forEach(function(t,i){t.tabIndex=0;t.onmouseenter=t.onfocus=function(){show(i)};t.onmouseleave=t.onblur=clear;t.ontouchstart=function(){show(i)}})}
  addEventListener("resize",clear); bind();
  return {bind:bind,clear:clear};
}
/* címek automatikus tokenizálása: <h? data-attend> + opcionális data-read="#id" */
function initAttend(root){
  $$("[data-attend]",root).forEach(function(h){
    if(h._ait)return; h._ait=1;
    var txt=h.textContent.trim(), arr=TOK[txt]; if(!arr)return;
    h.innerHTML=tokens(arr);
    var stage=h.closest(".stage")||h.parentNode; stage.classList.add("stage");
    attend(stage,h,h.getAttribute("data-read")?$(h.getAttribute("data-read")):null);
  });
}

/* ------------------------------------------------------------------
   A nyitóoldal élő címe: tippelő + ívek
   ------------------------------------------------------------------ */
function hero(o){
  var cur=0;
  if(o.read&&matchMedia("(hover: none)").matches)o.read.textContent="Koppints a cím egy darabjára: megmutatja, mire figyel.";
  o.lead.innerHTML=tokens(TOK[o.lead.textContent.trim()]);
  var at=attend(o.stage,o.say,o.read);
  function renderSlot(){o.slot.innerHTML=tokens(TOK[CANDS[cur][0]]);at.bind()}
  var cands=[];
  if(o.ribbon){
    o.ribbon.innerHTML=CANDS.map(function(c,i){var w=c[0].trim().replace(/\.$/,"");
      return '<button class="cand" type="button" role="radio" style="--p:'+c[1]+'" aria-checked="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'"><span class="bar"></span><span class="w">'+esc(w)+'</span><span class="pr">'+c[1].toFixed(2).replace(".",",")+"</span></button>"}).join("");
    cands=$$(".cand",o.ribbon);
    cands.forEach(function(b,i){
      b.addEventListener("click",function(){pick(i)});
      b.addEventListener("keydown",function(e){var d=e.key==="ArrowRight"||e.key==="ArrowDown"?1:e.key==="ArrowLeft"||e.key==="ArrowUp"?-1:0;if(d){e.preventDefault();pick((i+d+cands.length)%cands.length,true)}});
    });
  }
  function pick(i,focus){
    if(i===cur)return; cur=i;
    cands.forEach(function(b,j){b.setAttribute("aria-checked",String(j===i));b.tabIndex=j===i?0:-1});
    if(focus&&cands[i])cands[i].focus();
    if(reduce){renderSlot();return}
    o.slot.classList.add("swap"); setTimeout(function(){renderSlot();o.slot.classList.remove("swap")},170);
  }
  if(o.resample)o.resample.addEventListener("click",function(){var r=Math.random(),a=0,k=0;for(;k<CANDS.length;k++){a+=CANDS[k][1];if(r<a)break}pick(Math.min(k,CANDS.length-1))});
  renderSlot();
  return {pick:pick};
}
function initHero(root){
  $$("[data-hero]",root).forEach(function(el){
    if(el._ait)return; el._ait=1;
    hero({stage:$(".stage",el),say:$(".say",el),lead:$(".lead-part",el),slot:$(".slot",el),read:$(".read",el),ribbon:$(".ribbon",el),resample:$("[data-resample]",el)});
  });
}

/* ------------------------------------------------------------------
   A 3D modell (vanilla canvas: perspektíva + festő-algoritmus)
   Nincs folyamatos animáció: csak húzásra és nézetváltáskor rajzol.
   ------------------------------------------------------------------ */
var GEO=(function(){
  var B=[];function box(r,c,s,x){B.push(Object.assign({r:r,c:c,s:s},x||{}))}
  for(var i=0;i<5;i++)box("input",[-2+i,0,0],[.72,.28,.72],i===2?{lab:"tokenek"}:null);
  box("embed",[0,.8,0],[5,.3,1.5],{lab:"beágyazás"});
  for(var b=0;b<4;b++){
    var y=1.9+b*1.55;
    box(b?"attn deep":"attn",[-1.45,y,0],[2.1,.95,1.5],{lab:b===0?"figyelem":null});
    box(b?"mlp deep":"mlp",[1.45,y,0],[2.1,.95,1.5],{lab:b===0?"MLP":(b===3?"mélyebb rétegek":null)});
    box("qkv",[-2.0,y,1.0],[.16,.8,.16],{col:"q"});box("qkv",[-1.72,y,1.0],[.16,.8,.16],{col:"k"});box("qkv",[-1.44,y,1.0],[.16,.8,.16],{col:"v"});
  }
  box("out",[0,8.35,0],[5,.36,1.5],{lab:"kimenet: következő szó"});
  box("out",[-1.2,9.05,0],[2.4,.12,.3]);box("out",[.55,9.05,0],[1.1,.12,.3]);box("out",[1.4,9.05,0],[.5,.12,.3]);
  box("loss",[3.9,8.35,0],[1.5,.7,1],{lab:"veszteség"});
  box("docs",[-4,.3,.3],[1,1.3,.12],{lab:"dokumentumok"});box("docs",[-4.2,.25,-.1],[1,1.3,.12]);
  box("user",[4,.2,0],[1.3,.7,.9],{lab:"te"});
  return {B:B,STREAM:[[0,.6,0],[0,8.2,0]],LINKS:[[[-3.4,.3,.3],[-2.4,.1,0],"docs"],[[3.35,.2,0],[2.4,.1,0],"user"],[[3.9,8,0],[3.9,1,0],"user"],[[2.5,8.35,0],[3.15,8.35,0],"loss"]]};
})();
var CAMS={
  home:{yaw:.62,pitch:.32,dist:21,ty:4.6,lit:[]},
  s1:{yaw:.35,pitch:.22,dist:19,ty:3.6,lit:["input","embed","attn","out"]},
  s2:{yaw:1.05,pitch:.5,dist:21,ty:4.6,lit:["all"]},
  s3:{yaw:.05,pitch:.3,dist:13,ty:8.2,lit:["out","loss"]},
  s4:{yaw:-.45,pitch:.18,dist:14,ty:4.8,lit:["attn","mlp","deep"]},
  s5:{yaw:.95,pitch:.28,dist:18,ty:4.5,lit:["out","user"],warn:1},
  s6:{yaw:1.0,pitch:.2,dist:10,ty:.8,lit:["user"]},
  s7:{yaw:.15,pitch:.3,dist:20,ty:4.6,lit:["all"],wire:1},
  s8:{yaw:-.55,pitch:.35,dist:13,ty:1.2,lit:["docs","input"]},
  attn:{yaw:.55,pitch:.28,dist:12.5,ty:3.4,lit:["attn"],only:1},
  tokens:{yaw:.3,pitch:.45,dist:9,ty:.4,lit:["input","embed"]},
  whole:{yaw:.62,pitch:.32,dist:21,ty:4.6,lit:["all"]}
};
function css(el,n){return getComputedStyle(el).getPropertyValue(n).trim()}
function hex(c){c=c.replace("#","");if(c.length===3)c=c.split("").map(function(x){return x+x}).join("");return[parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)]}
function mix(a,b,t){return "rgb("+a.map(function(x,i){return Math.round(x+(b[i]-x)*t)}).join(",")+")"}
function Model(cv,opt){
  opt=opt||{};
  var ctx=cv.getContext("2d"),W=0,H=0,DPR=1,state=CAMS[opt.cam||"home"],cam=Object.assign({},state),from,to,t0,dyaw=0,dpitch=0,drag=null;
  function lit(r){if(!state.lit.length)return false;if(state.lit[0]==="all")return r!=="qkv";return state.lit.some(function(l){return(" "+r+" ").indexOf(" "+l+" ")>=0})}
  function size(){DPR=Math.min(2,devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);draw()}
  function draw(){
    if(!W||!H)return;
    var C={fa:hex(css(cv,"--face-a")||"#1a1c20"),fb:hex(css(cv,"--face-b")||"#2c2f35"),edge:css(cv,"--line-2"),gold:css(cv,"--gold"),gw:hex(css(cv,"--gold-wash")||"#2a2312"),ink:css(cv,"--ink"),ink3:css(cv,"--ink-3"),q:css(cv,"--q"),k:css(cv,"--k"),v:css(cv,"--v"),alert:css(cv,"--alert")};
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
    var place=opt.place?opt.place(W,H):{cx:W/2,cy:H/2,f:Math.min(W,H)*1.35};
    var cx=place.cx,cy=place.cy,f=place.f;
    var yaw=cam.yaw+dyaw,pitch=Math.max(-.2,Math.min(1.2,cam.pitch+dpitch)),cy1=Math.cos(yaw),sy1=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    function P(p){var x=p[0],y=p[1]-cam.ty,z=p[2];var x1=x*cy1-z*sy1,z1=x*sy1+z*cy1;var y2=y*cp-z1*sp,z2=y*sp+z1*cp;var zc=cam.dist-z2;return[cx+f*x1/zc,cy-f*y2/zc,zc,x1,y2,z2]}
    var L=[.35,.8,.5],faces=[],labels=[],wire=!!state.wire,attnLit=lit("attn");
    GEO.B.forEach(function(bx){
      if(state.only&&!lit(bx.r)&&bx.r!=="qkv"&&bx.r!=="embed")return;
      var c=bx.c,s=bx.s,hx=s[0]/2,hy=s[1]/2,hz=s[2]/2;
      var V=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(function(k){return P([c[0]+k[0]*hx,c[1]+k[1]*hy,c[2]+k[2]*hz])});
      var O=P(c),l=lit(bx.r);
      [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]].forEach(function(fc){
        var mx=0,my=0,mz=0;fc.forEach(function(k){mx+=V[k][3]/4;my+=V[k][4]/4;mz+=V[k][5]/4});
        var nx=mx-O[3],ny=my-O[4],nz=mz-O[5],nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
        if(nx*(-mx)+ny*(-my)+nz*(cam.dist-mz)<=0)return;
        faces.push({p:fc.map(function(k){return V[k]}),z:fc.reduce(function(m,k){return m+V[k][2]},0)/4,sh:Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]),lit:l,col:bx.col});
      });
      if(bx.lab&&l&&!opt.nolabels){var p=P([c[0],c[1]+hy,c[2]+hz]);labels.push([p[0],p[1],bx.lab])}
    });
    faces.sort(function(a,b){return (a.col?1:0)-(b.col?1:0)||b.z-a.z}); // a Q/K/V oszlopok mindig a blokk előtt állnak
    function line(a,b,col,w,dash){var p=P(a),q=P(b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=col;ctx.lineWidth=w;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([])}
    if(!state.only)GEO.LINKS.forEach(function(k){line(k[0],k[1],lit(k[2])?C.gold:C.edge,1,[3,4])});
    faces.forEach(function(fc){
      ctx.beginPath();fc.p.forEach(function(p,i){i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.closePath();
      if(fc.col){ctx.globalAlpha=attnLit||!state.lit.length?1:.35;ctx.fillStyle=C[fc.col];if(!wire)ctx.fill();ctx.globalAlpha=1;if(wire){ctx.strokeStyle=C[fc.col];ctx.lineWidth=1;ctx.stroke()}return}
      if(!wire){ctx.fillStyle=fc.lit?mix(C.gw,C.fb,.12+(1-fc.sh)*.22):mix(C.fa,C.fb,fc.sh);ctx.fill()}
      ctx.strokeStyle=fc.lit||wire?(state.warn&&fc.lit?C.alert:C.gold):C.edge;ctx.lineWidth=fc.lit||wire?1.4:1;ctx.stroke();
    });
    if(!state.only)line(GEO.STREAM[0],GEO.STREAM[1],C.gold,opt.thin?2:3.5);
    ctx.font="500 13px Geologica, system-ui, sans-serif";ctx.textBaseline="bottom";
    labels.forEach(function(l){ctx.strokeStyle=C.ink3;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[0]+6,l[1]-6);ctx.stroke();ctx.fillStyle=C.ink;ctx.fillText(l[2],l[0]+8,l[1]-8)});
  }
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function tick(now){var t=Math.min(1,(now-t0)/850),e=ease(t);["yaw","pitch","dist","ty"].forEach(function(k){cam[k]=from[k]+(to[k]-from[k])*e});draw();if(t<1)requestAnimationFrame(tick)}
  function go(key){var tgt=typeof key==="string"?CAMS[key]:key;if(!tgt||tgt===state)return;state=tgt;if(reduce){cam=Object.assign({},tgt);draw();return}from=Object.assign({},cam);to=tgt;t0=performance.now();requestAnimationFrame(tick)}
  if(opt.interactive!==false){
    cv.addEventListener("pointerdown",function(e){drag=[e.clientX,e.clientY,dyaw,dpitch];cv.setPointerCapture(e.pointerId)});
    cv.addEventListener("pointermove",function(e){if(!drag)return;dyaw=drag[2]+(e.clientX-drag[0])*.008;dpitch=drag[3]+(e.clientY-drag[1])*.005;draw()});
    cv.addEventListener("pointerup",function(){drag=null});
    cv.addEventListener("keydown",function(e){var d={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]}[e.key];if(d){e.preventDefault();dyaw+=d[0];dpitch+=d[1];draw()}});
  }
  addEventListener("resize",size);
  new MutationObserver(draw).observe(html,{attributes:true,attributeFilter:["data-theme"]});
  matchMedia("(prefers-color-scheme: light)").addEventListener("change",draw);
  if(doc.fonts)doc.fonts.ready.then(draw);
  size();
  return {go:go,draw:draw,size:size};
}
/* beágyazott modell-nézet: <canvas data-model="attn"> + opcionális gombok [data-cam] */
function initModels(root){
  $$("canvas[data-model]",root).forEach(function(cv){
    if(cv._ait)return;
    var m=Model(cv,{cam:cv.getAttribute("data-model"),place:function(W,H){return{cx:W/2,cy:H*.55,f:Math.min(W,H*1.3)*1.2}}});cv._ait=m;
    var fig=cv.closest("figure");
    if(fig)$$("[data-cam]",fig).forEach(function(b){b.addEventListener("click",function(){$$("[data-cam]",fig).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});m.go(b.getAttribute("data-cam"));var cap=$("[data-cap]",fig);if(cap)cap.textContent=b.getAttribute("data-say")||""})});
  });
}

/* ------------------------------------------------------------------
   Mélységi fülek
   ------------------------------------------------------------------ */
function initTabs(root){
  $$('[role="tablist"]',root).forEach(function(list){
    if(list._ait)return;list._ait=1;
    var tabs=$$('[role="tab"]',list);
    function sel(t,f){tabs.forEach(function(x){var on=x===t;x.setAttribute("aria-selected",String(on));x.tabIndex=on?0:-1;var p=doc.getElementById(x.getAttribute("aria-controls"));if(p)p.hidden=!on});if(f)t.focus()}
    tabs.forEach(function(t,i){t.addEventListener("click",function(){sel(t)});t.addEventListener("keydown",function(e){var j=e.key==="ArrowRight"?(i+1)%tabs.length:e.key==="ArrowLeft"?(i-1+tabs.length)%tabs.length:e.key==="Home"?0:e.key==="End"?tabs.length-1:null;if(j!==null){e.preventDefault();sel(tabs[j],true)}})});
  });
}

/* ------------------------------------------------------------------
   Haladásjelző: 12 szint = 12 réteg (egymásra rakott lapok)
   ------------------------------------------------------------------ */
function setProgress(el,done){
  var total=+el.getAttribute("data-total")||12;done=Math.max(0,Math.min(total,done));el.setAttribute("data-done",done);
  $$(".slab",el).forEach(function(s,i){s.classList.toggle("done",i<done);s.classList.toggle("now",i===done)});
  var c=$("[data-count]",el);if(c)c.textContent=done;
  var pb=$('[role="progressbar"]',el);if(pb){pb.setAttribute("aria-valuenow",done);pb.setAttribute("aria-valuetext",done+" szint kész, összesen "+total)}
}
function initProgress(root){
  $$(".layers",root).forEach(function(el){
    if(el._ait)return;el._ait=1;
    var svg=$("svg",el),out="";
    var total=+el.getAttribute("data-total")||12,stepY=Math.min(12.5,150/total);for(var i=0;i<total;i++){var y=160-i*stepY;out+='<g class="slab" transform="translate(0 '+y+')"><path class="top" d="M10 10 L70 0 L130 10 L70 20 Z"/><path class="side-l" d="M10 10 L70 20 L70 26 L10 16 Z"/><path class="side-r" d="M70 20 L130 10 L130 16 L70 26 Z"/></g>'}
    out+='<line class="stream" x1="70" y1="190" x2="70" y2="18"/>';
    svg.innerHTML=out;
    setProgress(el,+el.getAttribute("data-done")||0);
  });
}

/* ------------------------------------------------------------------
   Szintzáró kvíz
   ------------------------------------------------------------------ */
function initQuiz(root){
  $$(".quiz",root).forEach(function(qz){
    if(qz._ait)return;qz._ait=1;
    var need=+qz.getAttribute("data-need")||4,qs=$$(".q",qz),n=qs.length,track=$(".track",qz),txt=$(".score-text",qz),retry=$("[data-retry]",qz);
    var target=doc.getElementById(qz.getAttribute("data-progress")||""),base=target?+target.getAttribute("data-done"):0,bumped=false;
    track.innerHTML=qs.map(function(){return"<i></i>"}).join("")+'<b class="need" style="left:'+(need/n*100)+'%"></b>';
    function update(){
      var r=0,a=0;qs.forEach(function(q,i){var st=q.getAttribute("data-answered");track.children[i].className=st||"";if(st)a++;if(st==="r")r++});
      var status=a<n?"open":r>=need?"passed":"failed";qz.setAttribute("data-status",status);
      txt.innerHTML=status==="open"?"<b>"+r+"/"+n+"</b> helyes eddig. A továbblépéshez <b>"+need+"/"+n+"</b> kell."
        :status==="passed"?"<b>✓ Teljesítve, "+r+"/"+n+".</b> Megnyílt a következő szint."
        :"<b>✕ "+r+"/"+n+".</b> Ez most nem elég, "+need+" kell. Olvasd át a magyarázatokat, és próbáld újra.";
      retry.hidden=status==="open";
      if(status==="passed"&&target&&!bumped){bumped=true;setProgress(target,base+1);target.classList.remove("pulse");void target.offsetWidth;if(!reduce)target.classList.add("pulse")}
    }
    qs.forEach(function(q){
      var ok=+q.getAttribute("data-correct");
      $$('input[type="radio"]',q).forEach(function(inp,idx){inp.addEventListener("change",function(){
        if(q.hasAttribute("data-answered"))return;
        var right=idx===ok,opts=$$(".opt",q);q.setAttribute("data-answered",right?"r":"w");
        opts[idx].classList.add(right?"is-right":"is-wrong");$(".mark",opts[idx]).textContent=right?"✓ Helyes":"✕ Nem ez";
        if(!right){opts[ok].classList.add("is-right");$(".mark",opts[ok]).textContent="✓ Ez a helyes"}
        $$('input[type="radio"]',q).forEach(function(x){x.disabled=true});
        var fb=$(".fb",q);fb.hidden=false;fb.innerHTML=$("template",q).innerHTML;update();
      })});
    });
    retry.addEventListener("click",function(){
      qs.forEach(function(q){q.removeAttribute("data-answered");$$(".opt",q).forEach(function(o){o.classList.remove("is-right","is-wrong");$(".mark",o).textContent=""});$$('input[type="radio"]',q).forEach(function(x){x.disabled=false;x.checked=false});$(".fb",q).hidden=true});
      if(target&&bumped){setProgress(target,base);bumped=false}
      update();$("input",qs[0]).focus();
    });
    update();
  });
}

/* ------------------------------------------------------------------
   Kísérlet: softmax hőmérséklettel
   ------------------------------------------------------------------ */
function initExperiment(root){
  $$('[data-exp="temperature"]',root).forEach(function(ex){
    if(ex._ait)return;ex._ait=1;
    var words=ex.getAttribute("data-words").split("|"),z=ex.getAttribute("data-logits").split("|").map(Number);
    var s=$('input[type="range"]',ex),out=$("output",ex),bars=$(".bars",ex),top=$("[data-top]",ex),ent=$("[data-entropy]",ex);
    bars.innerHTML=words.map(function(w){return'<div class="bar"><span class="w">'+esc(w)+'</span><span class="tr"><i></i></span><span class="pc"></span></div>'}).join("");
    function run(){
      var T=+s.value,m=Math.max.apply(null,z),e=z.map(function(x){return Math.exp((x-m)/T)}),sum=e.reduce(function(a,b){return a+b},0),p=e.map(function(x){return x/sum});
      var best=p.indexOf(Math.max.apply(null,p)),H=-p.reduce(function(a,x){return a+(x>0?x*Math.log2(x):0)},0);
      var f=function(x,d){return x.toFixed(d).replace(".",",")};
      out.textContent=f(T,2);s.setAttribute("aria-valuetext","Hőmérséklet "+f(T,2));s.style.setProperty("--p",((T-s.min)/(s.max-s.min)*100)+"%");
      $$(".bar",bars).forEach(function(b,i){b.classList.toggle("best",i===best);$("i",b).style.width=(p[i]*100).toFixed(1)+"%";$(".pc",b).textContent=f(p[i]*100,1)+" %"});
      top.textContent=words[best]+", "+Math.round(p[best]*100)+" %";ent.textContent=f(H,2)+" bit";
    }
    s.addEventListener("input",run);$("[data-reset]",ex).addEventListener("click",function(){s.value=s.getAttribute("value");run()});run();
  });
}

/* ------------------------------------------------------------------
   Kód másolása, téma
   ------------------------------------------------------------------ */
function initCopy(root){
  $$("[data-copy]",root).forEach(function(b){
    if(b._ait)return;b._ait=1;
    b.addEventListener("click",function(){
      var pre=doc.getElementById(b.getAttribute("data-copy"));if(!pre)return;
      var text=$$(".ln",pre).map(function(l){var c=l.cloneNode(true);$$(".an",c).forEach(function(a){a.remove()});return c.textContent.replace(/\s+$/,"")}).join("\n");
      function done(ok){b.textContent=ok?"Másolva":"Nem sikerült";setTimeout(function(){b.textContent="Másolás"},1500)}
      try{navigator.clipboard.writeText(text).then(function(){done(true)},function(){done(false)})}catch(e){done(false)}
    });
  });
}
function initTheme(root){
  var t=store("ait-theme");if(t==="dark"||t==="light")html.setAttribute("data-theme",t);
  $$("[data-theme-toggle]",root).forEach(function(b){
    if(b._ait)return;b._ait=1;
    b.addEventListener("click",function(){var cur=html.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var nx=cur==="dark"?"light":"dark";html.setAttribute("data-theme",nx);store("ait-theme",nx)});
  });
}

function initScene(root){
  $$("[data-scene]",root).forEach(function(sc){
    if(sc._ait)return;sc._ait=1;
    var cv=$("canvas",sc);
    var m=Model(cv,{cam:"home",place:function(W,H){var d=W>=900;return{cx:d?W*.68:W*.5,cy:d?H*.52:H*.3,f:(d?Math.min(W*.55,H*1.05):Math.min(W*1.05,H*.62))*1.25}}});
    function on(key){$$(".step",sc).forEach(function(s){s.classList.toggle("on",s.getAttribute("data-cam")===key)});m.go(key)}
    if("IntersectionObserver" in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting)on(en.target.getAttribute("data-cam"))})},{rootMargin:"-45% 0px -50% 0px"});
      $$("[data-cam]",sc).forEach(function(s){io.observe(s)});
    }
  });
}

function init(root){root=root||doc;initTheme(root);initHero(root);initAttend(root);initScene(root);initModels(root);initTabs(root);initProgress(root);initQuiz(root);initExperiment(root);initCopy(root)}
window.AIT={init:init,Model:Model,CAMS:CAMS,attend:attend,tokens:tokens,TOK:TOK,setProgress:setProgress};
if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",function(){init()});else init();
})();
