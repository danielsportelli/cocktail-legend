// ═══════════════════════════════════
// PASSWORD — cambia il valore qui sotto quando vuoi
var SECRET = "legend2025";
// ═══════════════════════════════════

(function() {
  var overlay = document.getElementById("login-overlay");
  var input   = document.getElementById("login-pwd");
  var btn     = document.getElementById("login-btn");
  var err     = document.getElementById("login-err");
  var eye     = document.getElementById("login-eye");
  var STORE   = "cl_auth";

  // Controlla se già autenticato (localStorage)
  if (localStorage.getItem(STORE) === "1") {
    overlay.style.display = "none";
    return;
  }

  // Blocca body scroll finché non loggato
  document.body.style.overflow = "hidden";

  function tryLogin() {
    if (input.value === SECRET) {
      localStorage.setItem(STORE, "1");
      overlay.style.transition = "opacity .35s";
      overlay.style.opacity = "0";
      setTimeout(function() {
        overlay.style.display = "none";
        document.body.style.overflow = "";
      }, 350);
    } else {
      err.textContent = "Password sbagliata.";
      input.value = "";
      input.focus();
      input.style.borderColor = "#f87171";
      setTimeout(function() { input.style.borderColor = ""; }, 1500);
    }
  }

  btn.addEventListener("click", tryLogin);
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") tryLogin();
  });

  // Mostra/nascondi password
  eye.addEventListener("click", function() {
    if (input.type === "password") {
      input.type = "text";
      eye.innerHTML = "&#128064;";
    } else {
      input.type = "password";
      eye.innerHTML = "&#128065;";
    }
  });
})();

var DATA = [];
fetch("database/it/cocktails-it.json")
  .then(function(res){ return res.json(); })
  .then(function(json){
    DATA = json;

    initF();        // crea i filtri
    render();       // mostra i cocktail
    updateAllCounts();
  });
var AF = {cat:[], dis:[], abv:[], sap:[], frz:[], bic:[]};
var Q = "";
var RES = [];
var USE_OZ = false;
var LAST_IDX = 0;
var AO = {"Analcolico":0,"Basso":1,"Medio basso":2,"Medio":3,"Medio alto":4,"Alto":5,"Molto alto":6};
var FMAP = {cat:"categoria", dis:"distillato", abv:"abv"};
var LABELS = {cat:"Categoria", dis:"Ingredienti", abv:"Tenore ABV", sap:"Sapore", frz:"Frizzante", bic:"Bicchiere"};

// ═══════════ PREFERITI ═══════════
var FAVS_KEY = "cl_favs";
var FAV_ONLY = false;
var HEART_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
var HEART_ON  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
function loadFavs(){try{return JSON.parse(localStorage.getItem(FAVS_KEY)||"[]");}catch(e){return[];}}
function saveFavs(arr){try{localStorage.setItem(FAVS_KEY,JSON.stringify(arr));}catch(e){}}
function isFav(name){return loadFavs().indexOf(name)!==-1;}
function toggleFav(name){var f=loadFavs();var i=f.indexOf(name);if(i===-1)f.push(name);else f.splice(i,1);saveFavs(f);return i===-1;}
function refreshAllHearts(){
  document.querySelectorAll(".fav-heart").forEach(function(b){
    var n=b.dataset.name;
    if(isFav(n)){b.classList.add("on");b.innerHTML=HEART_ON;}
    else{b.classList.remove("on");b.innerHTML=HEART_OFF;}
  });
}
// ═════════════════════════════════

function bclass(b){return b==="Pre dinner"?"b-pre":b==="After dinner"?"b-after":"b-all";}
function aclass(a){if(a==="Molto alto")return "c-va";if(a==="Alto")return "c-a";if(a==="Medio alto")return "c-ma";if(a==="Medio basso")return "c-mb";if(a==="Basso")return "c-b";if(a==="Analcolico")return "c-an";return "c-m";}

function mlToOz(qty) {
  var norm = qty.replace(",",".");
  var m = norm.match(/^(\d+(?:\.\d+)?)\s*ml$/i);
  if (!m) return qty;
  var ml = parseFloat(m[1]);
  // Eccezioni barman (arrotondamento freepour)
  if (ml===5)    return "¼ oz";
  if (ml===10)   return "½ oz";
  if (ml===20)   return "¾ oz";
  if (ml===25)   return "¾ oz";
  // Tabella standard (multipli di 7,5 ml)
  if (ml===7.5)  return "¼ oz";
  if (ml===15)   return "½ oz";
  if (ml===22.5) return "¾ oz";
  if (ml===30)   return "1 oz";
  if (ml===37.5) return "1¼ oz";
  if (ml===45)   return "1½ oz";
  if (ml===50)   return "1¾ oz";
  if (ml===52.5) return "1¾ oz";
  if (ml===60)   return "2 oz";
  if (ml===90)   return "3 oz";
  if (ml===105)  return "3½ oz";
  if (ml===120)  return "4 oz";
  // Calcolo automatico per altri valori
  var oz = ml / 30;
  var whole = Math.floor(oz);
  var frac = oz - whole;
  var fracStr = "";
  if (Math.abs(frac - 0.25) < 0.05) fracStr = "¼";
  else if (Math.abs(frac - 0.5)  < 0.05) fracStr = "½";
  else if (Math.abs(frac - 0.75) < 0.05) fracStr = "¾";
  if (whole > 0 && fracStr) return whole + fracStr + " oz";
  if (whole > 0) return whole + " oz";
  if (fracStr) return fracStr + " oz";
  return ml + " ml";
}
function fmtQty(qty){return USE_OZ ? mlToOz(qty) : qty;}

function uniq(key) {
  var s = {};
  for (var i=0;i<DATA.length;i++){
    var c=DATA[i];
    if(key==="sap"){for(var j=0;j<c.sapori.length;j++)s[c.sapori[j]]=1;}
    else if(key==="dis"){
      for(var j=0;j<c.distillato.length;j++)s[c.distillato[j]]=1;
      for(var j=0;j<c.ingredienti.length;j++)s[c.ingredienti[j][1]]=1;
    }
    else if(key==="frz"){s[c.frizzante?"Si":"No"]=1;}
    else if(key==="bic"){s[c.bicchiere]=1;}
    else{s[c[key]]=1;}
  }
  return Object.keys(s).sort();
}

function countFor(key, val) {
  // Filtra con tutti i filtri attivi TRANNE quello della stessa chiave
  var base = DATA.filter(function(c){
    if(AF.cat.length && key!=="cat" && AF.cat.indexOf(c.categoria)===-1) return false;
    if(AF.dis.length && key!=="dis"){var vl2;var ok=AF.dis.some(function(d){vl2=d.toLowerCase();return c.distillato.some(function(x){return x.toLowerCase()===vl2;})||c.ingredienti.some(function(i){return i[1].toLowerCase()===vl2;});});if(!ok)return false;}
    if(AF.abv.length && key!=="abv" && AF.abv.indexOf(c.abv)===-1) return false;
    if(AF.sap.length && key!=="sap" && !AF.sap.some(function(s){return c.sapori.indexOf(s)!==-1;})) return false;
    if(AF.frz.length && key!=="frz" && AF.frz.indexOf(c.frizzante?"Si":"No")===-1) return false;
    if(AF.bic.length && key!=="bic" && AF.bic.indexOf(c.bicchiere)===-1) return false;
    if(FAV_ONLY){var favs=loadFavs();if(favs.indexOf(c.name)===-1)return false;}
    return true;
  });
  if(key==="sap") return base.filter(function(c){return c.sapori.indexOf(val)!==-1;}).length;
  if(key==="dis"){var vl=val.toLowerCase();return base.filter(function(c){return c.distillato.some(function(x){return x.toLowerCase()===vl;})||c.ingredienti.some(function(i){return i[1].toLowerCase()===vl;});}).length;}
  if(key==="frz") return base.filter(function(c){return (c.frizzante?"Si":"No")===val;}).length;
  if(key==="bic") return base.filter(function(c){return c.bicchiere===val;}).length;
  var field = FMAP[key] || key;
  return base.filter(function(c){return c[field]===val;}).length;
}

function buildDropdown(id, key, items) {
  var el = document.getElementById(id);
  el.innerHTML = "";
  for(var i=0;i<items.length;i++){
    var v = items[i];
    var div = document.createElement("div");
    div.className = "ci";
    div.dataset.key = key;
    div.dataset.val = v;
    var cnt = countFor(key, v);
    div.innerHTML =
      '<div class="cb"><svg class="ck" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'+
      '<span class="ci-lbl">'+v+'</span>'+
      '<span class="ci-n">'+cnt+'</span>';
    div.addEventListener("click", function(e){
      e.stopPropagation();
      if(this.classList.contains("ci-disabled")) return;
      var k=this.dataset.key, vv=this.dataset.val;
      var arr=AF[k], idx=arr.indexOf(vv);
      var cb=this.querySelector(".cb");
      if(idx===-1){arr.push(vv);cb.classList.add("on");this.classList.add("on");}
      else{arr.splice(idx,1);cb.classList.remove("on");this.classList.remove("on");}
      updateBadges();
      render();
      updateAllCounts();
      if(_activeBtn){
        positionDropdown(_activeBtn.btn, _activeBtn.dd);
      }
    });
    el.appendChild(div);
  }
}

function updateAllCounts() {
  document.querySelectorAll(".ci").forEach(function(div){
    var k = div.dataset.key, v = div.dataset.val;
    var cnt = countFor(k, v);
    var el = div.querySelector(".ci-n");
    if(el) el.textContent = cnt;
    // Grigio se 0 e non selezionato
    if(cnt === 0 && !div.classList.contains("on")){
      div.style.opacity = "0.4";
      div.classList.add("ci-disabled");
    } else {
      div.style.opacity = "";
      div.classList.remove("ci-disabled");
    }
  });
}

function initF() {
  buildDropdown("dd-cat","cat",uniq("categoria"));
  (function(){
    var ing = {};
    DATA.forEach(function(c){
      c.ingredienti.forEach(function(row){
        var name = row[1];
        if(name && name.trim()){
          var n = name.trim();
          n = n.charAt(0).toUpperCase() + n.slice(1);
          ing[n] = true;
        }
      });
    });
    var list = Object.keys(ing).sort(function(a,b){return a.localeCompare(b,"it");});
    buildDropdown("dd-dis","dis",list);
  })();
  buildDropdown("dd-abv","abv",["Analcolico","Basso","Medio basso","Medio","Medio alto","Alto","Molto alto"]);
  buildDropdown("dd-sap","sap",uniq("sap"));
  buildDropdown("dd-frz","frz",["Si","No"]);
  buildDropdown("dd-bic","bic",uniq("bic"));
}

// Dropdown toggle per ogni fg-btn
var _activeBtn = null;

function positionDropdown(btn, dd) {
  var rect = btn.getBoundingClientRect();
  var top = rect.bottom + 6;
  var left = rect.left;
  // Assicura che non esca dallo schermo a destra
  var maxLeft = window.innerWidth - 210;
  if(left > maxLeft) left = maxLeft;
  dd.style.position = "fixed";
  dd.style.top = top + "px";
  dd.style.left = left + "px";
  dd.style.minWidth = Math.max(rect.width, 200) + "px";
  dd.classList.remove("repositioning");
}

document.querySelectorAll(".fg-btn").forEach(function(btn){
  btn.addEventListener("click", function(e){
    e.stopPropagation();
    var key = this.dataset.fg;
    var dd = document.getElementById("dd-"+key);
    var isOpen = dd.classList.contains("open");
    // chiudi tutti
    document.querySelectorAll(".fg-dropdown").forEach(function(d){d.classList.remove("open");});
    document.querySelectorAll(".fg-btn").forEach(function(b){b.classList.remove("open");});
    _activeBtn = null;
    if(!isOpen){
      dd.classList.add("open");
      this.classList.add("open");
      _activeBtn = { btn: this, dd: dd };
      positionDropdown(this, dd);
    }
  });
});

window.addEventListener("scroll", function(){
  if(_activeBtn){
    positionDropdown(_activeBtn.btn, _activeBtn.dd);
  }
}, {passive:true});

// Chiudi dropdown cliccando fuori
document.addEventListener("click", function(){
  document.querySelectorAll(".fg-dropdown").forEach(function(d){d.classList.remove("open");});
  document.querySelectorAll(".fg-btn").forEach(function(b){b.classList.remove("open");});
});

// Toggle pannello filtri
document.getElementById("btn-filters").addEventListener("click", function(e){
  e.stopPropagation();
  var panel = document.getElementById("filter-panel");
  var open = panel.classList.toggle("open");
  this.classList.toggle("open", open);
  // Chiudi tutte le tendine aperte
  if (!open) {
    document.querySelectorAll(".fg-btn.open").forEach(function(btn){ btn.classList.remove("open"); });
    document.querySelectorAll(".fg-dropdown.open").forEach(function(dd){ dd.classList.remove("open"); });
  }
});

function updateBadges() {
  var total = AF.cat.length + AF.dis.length + AF.abv.length + AF.sap.length + AF.frz.length + AF.bic.length;
  var badge = document.getElementById("active-badge");
  badge.textContent = total;
  badge.classList.toggle("show", total > 0);

  // contatori sui singoli btn
  ["cat","dis","abv","sap","frz","bic"].forEach(function(k){
    var cnt = document.getElementById("cnt-"+k);
    cnt.textContent = AF[k].length;
    cnt.classList.toggle("show", AF[k].length > 0);
  });

  // tag rimovibili
  var tagsEl = document.getElementById("active-tags");
  tagsEl.innerHTML = "";
  var allKeys = ["cat","dis","abv","sap"];
  for(var ki=0;ki<allKeys.length;ki++){
    var k=allKeys[ki];
    for(var vi=0;vi<AF[k].length;vi++){
      var v=AF[k][vi];
      var tag=document.createElement("div");
      tag.className="active-tag";
      tag.innerHTML='<span>'+v+'</span><span class="x">&#x2715;</span>';
      tag.dataset.key=k;
      tag.dataset.val=v;
      tag.addEventListener("click",function(){
        var kk=this.dataset.key, vv=this.dataset.val;
        var idx=AF[kk].indexOf(vv);
        if(idx!==-1) AF[kk].splice(idx,1);
        // aggiorna checkbox visiva
        var cbs=document.querySelectorAll("#dd-"+kk+" .ci");
        cbs.forEach(function(ci){
          if(ci.dataset.val===vv){ci.classList.remove("on");ci.querySelector(".cb").classList.remove("on");}
        });
        updateBadges();
        render();
      });
      tagsEl.appendChild(tag);
    }
  }
}

function render() {
  var res=DATA.slice();
  var q=Q.toLowerCase().trim();
  if(q){res=res.filter(function(c){
    var dis=Array.isArray(c.distillato)?c.distillato.join(" "):c.distillato;
    var ing=c.ingredienti.map(function(i){return i[1];}).join(" ");
    return c.name.toLowerCase().indexOf(q)!==-1||
           dis.toLowerCase().indexOf(q)!==-1||
           ing.toLowerCase().indexOf(q)!==-1||
           (c.garnish||"").toLowerCase().indexOf(q)!==-1||
           c.sapori.join(" ").toLowerCase().indexOf(q)!==-1;
  });}
  if(AF.cat.length){res=res.filter(function(c){return AF.cat.indexOf(c.categoria)!==-1;});}
  if(AF.dis.length){res=res.filter(function(c){return AF.dis.some(function(d){var dl=d.toLowerCase();return c.distillato.some(function(x){return x.toLowerCase()===dl;})||c.ingredienti.some(function(i){return i[1].toLowerCase()===dl;});});});}
  if(AF.abv.length){res=res.filter(function(c){return AF.abv.indexOf(c.abv)!==-1;});}
  if(AF.frz.length){res=res.filter(function(c){return AF.frz.indexOf(c.frizzante?"Si":"No")!==-1;});}  
  if(AF.bic.length){res=res.filter(function(c){return AF.bic.indexOf(c.bicchiere)!==-1;});}
  if(AF.sap.length){res=res.filter(function(c){return AF.sap.some(function(s){return c.sapori.indexOf(s)!==-1;});});}
  if(FAV_ONLY){var favs=loadFavs();res=res.filter(function(c){return favs.indexOf(c.name)!==-1;});}
  var s=document.getElementById("srt").value;
  if(s==="az")res.sort(function(a,b){return a.name.localeCompare(b.name);});
  else if(s==="za")res.sort(function(a,b){return b.name.localeCompare(a.name);});
  else if(s==="abv+")res.sort(function(a,b){return(AO[a.abv]||0)-(AO[b.abv]||0);});
  else if(s==="abv-")res.sort(function(a,b){return(AO[b.abv]||0)-(AO[a.abv]||0);});
  RES=res;
  showCards();
}

function showCards(){
  var g=document.getElementById("grid");
  document.getElementById("rcnt").textContent=RES.length;
  g.innerHTML="";
  if(!RES.length){
    var em=document.createElement("div");em.className="empty";
    if(FAV_ONLY){
      em.innerHTML='<div class="ico">❤️</div><h3>Lista preferiti vuota</h3><p>Tocca il cuore su un cocktail per aggiungerlo ai tuoi preferiti</p>';
    } else {
      em.innerHTML='<div class="ico">&#128269;</div><h3>Nessun cocktail trovato</h3><p>Modifica i filtri per ampliare la ricerca</p>';
    }
    g.appendChild(em);return;
  }
  for(var i=0;i<RES.length;i++){
    var c=RES[i];
    var card=document.createElement("div");
    card.className="card";card.style.animationDelay=Math.min(i*35,450)+"ms";
    if(!c.img){ c.img='https://danielsportelli.github.io/cocktail-legend/immagini/'+c.id+'.JPG';
    }
    var sapHtml="";
    for(var si=0;si<c.sapori.length;si++){
      sapHtml+='<span class="sap-t">'+c.sapori[si]+'</span>';
      if(si<c.sapori.length-1)sapHtml+='<span class="sap-d">&#8226;</span>';
    }
    card.innerHTML=
      '<div class="card-img"><div class="card-ph">&#127864;</div>'+
      '<img data-src="'+c.img+'" alt="'+c.name+'">'+
      '<button class="fav-heart" data-name="'+c.name.replace(/"/g,"&quot;")+'">'+(isFav(c.name)?HEART_ON:HEART_OFF)+'</button>'+
      '<div class="sap-strip">'+sapHtml+'</div></div>'+
      '<div class="card-body">'+
      '<div class="card-top"><div class="card-name">'+c.name+'</div></div>'+
      '<div class="card-meta">'+
      '<div class="mrow">🥃&nbsp;'+(Array.isArray(c.distillato)?c.distillato[0]:c.distillato)+'</div>'+
      '<div class="mrow mrow-garnish">🌿&nbsp;'+c.garnish+'</div>'+
      '</div>'+
      '<div class="abv-row"><span class="abv-lbl">ABV</span>'+
      '<span class="abv-v '+aclass(c.abv)+'">'+c.abv+'</span></div>'+
      '<div class="cat-row"><span class="cat-lbl">Cat</span>'+
      '<span class="cat-v">'+c.categoria+'</span></div>'+
      '</div>';
    var img=card.querySelector("img");
    img.onerror=function(){this.style.display="none";};
    img.loading="lazy";
    img.src=c.img;
    // cuoricino card — stopPropagation per non aprire il modal
    (function(name,card){
      card.querySelector(".fav-heart").addEventListener("click",function(e){
        e.stopPropagation();
        toggleFav(name);
        if(isFav(name)){this.classList.add("on");this.innerHTML=HEART_ON;}
        else{this.classList.remove("on");this.innerHTML=HEART_OFF;}
        // aggiorna cuoricino modal se aperto sullo stesso drink
        var mh=document.getElementById("m-fav-heart");
        if(mh && mh.dataset.name===name){
          if(isFav(name)){mh.classList.add("on");mh.innerHTML=HEART_ON;}
          else{mh.classList.remove("on");mh.innerHTML=HEART_OFF;}
        }
        if(FAV_ONLY)render();
      });
    })(c.name, card);
    card.addEventListener("click",(function(idx){return function(){openM(idx);};})(i));
    g.appendChild(card);
  }
}

function openM(i){
  var st=document.getElementById("tab-bar");if(st)st.style.display="none";
  var c=RES[i];if(!c)return;LAST_IDX=i;
  var img=document.getElementById("m-img");
  img.onerror=function(){this.style.display="none";};
  img.style.display="block";img.src="";img.loading="lazy";
    img.src=c.img;img.alt=c.name;
  var sapHtml="";
  for(var si=0;si<c.sapori.length;si++){
    sapHtml+='<span class="m-st">'+c.sapori[si]+'</span>';
    if(si<c.sapori.length-1)sapHtml+='<span class="m-sd">&#8226;</span>';
  }
  document.getElementById("m-sap").innerHTML=sapHtml;
  document.getElementById("m-name").textContent=c.name;
  var stTitle=document.getElementById("m-sticky-title");
  if(stTitle)stTitle.textContent=c.name;
  document.getElementById("m-badges").innerHTML=
    '<span class="m-badge '+bclass(c.categoria)+'">'+c.categoria+'</span>'+
    '<span class="m-badge '+aclass(c.abv)+'">ABV: '+c.abv+'</span>';
  document.getElementById("m-grid").innerHTML=
    '<div class="mi"><div class="mi-lbl">Distillato</div><div class="mi-val">'+(Array.isArray(c.distillato)?c.distillato.join(' + '):c.distillato)+'</div></div>'+
    '<div class="mi"><div class="mi-lbl">Garnish</div><div class="mi-val">'+c.garnish+'</div></div>'+
    '<div class="mi"><div class="mi-lbl">Categoria</div><div class="mi-val">'+c.categoria+'</div></div>'+
    '<div class="mi"><div class="mi-lbl">Bicchiere</div><div class="mi-val">'+(c.bicchiere||'-')+'</div></div>';
  var ingHtml="";
  for(var ii=0;ii<c.ingredienti.length;ii++){
    ingHtml+='<div class="ing-row"><span class="ing-q">'+fmtQty(c.ingredienti[ii][0])+'</span><span class="ing-n">'+c.ingredienti[ii][1]+'</span></div>';
  }
  document.getElementById("m-ing").innerHTML=ingHtml;

  // Varianti
  var vwrap = document.getElementById("m-varianti-wrap");
  vwrap.innerHTML = "";
  vwrap.style.marginBottom = (c.varianti && c.varianti.length > 0) ? "1.4rem" : "";
  if(c.varianti && c.varianti.length > 0){
    var vbtn = document.createElement("button");
    vbtn.className = "varianti-btn";
    vbtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></svg> Varianti famose ('+c.varianti.length+')';
    var vpop = document.createElement("div");
    vpop.className = "varianti-popup";
    c.varianti.forEach(function(v){
      var row = document.createElement("div");
      row.className = "varianti-row";
      row.innerHTML = '<div class="varianti-nome">'+v.nome+'</div><div class="varianti-note">'+v.note+'</div>';
      vpop.appendChild(row);
    });
    vbtn.addEventListener("click", function(){
      vpop.classList.toggle("open");
      vbtn.style.borderBottomLeftRadius = vpop.classList.contains("open") ? "0" : "";
      vbtn.style.borderBottomRightRadius = vpop.classList.contains("open") ? "0" : "";
    });
    vwrap.appendChild(vbtn);
    vwrap.appendChild(vpop);
  }
  var prepHtml="";
  for(var pi=0;pi<c.prep.length;pi++){
    prepHtml+='<div class="prep-row"><span class="prep-num">'+(pi+1)+'</span><span>'+c.prep[pi]+'</span></div>';
  }
  document.getElementById("m-prep").innerHTML=prepHtml;
  document.getElementById("m-stor").textContent=c.storia;
  document.getElementById("ov").classList.add("open");
  document.body.style.overflow="hidden";
  var fb=document.getElementById("filter-bar");if(fb)fb.style.zIndex="0";
  // aggiorna cuoricino sticky bar
  var mh=document.getElementById("m-fav-heart");
  if(mh){
    mh.dataset.name=c.name;
    if(isFav(c.name)){mh.classList.add("on");mh.innerHTML=HEART_ON;}
    else{mh.classList.remove("on");mh.innerHTML=HEART_OFF;}
  }
}

function closeModal(){var st=document.getElementById("tab-bar");if(st)st.style.display="";
  document.getElementById("ov").classList.remove("open");document.body.style.overflow="";
  var fb=document.getElementById("filter-bar");if(fb)fb.style.zIndex="";}

document.getElementById("m-close").addEventListener("click",closeModal);
document.getElementById("ov").addEventListener("click",function(e){if(e.target===this)closeModal();});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();});

// cuoricino sticky modal
document.getElementById("m-fav-heart").addEventListener("click",function(){
  var name=this.dataset.name;if(!name)return;
  toggleFav(name);
  if(isFav(name)){this.classList.add("on");this.innerHTML=HEART_ON;}
  else{this.classList.remove("on");this.innerHTML=HEART_OFF;}
  refreshAllHearts();
  if(FAV_ONLY)render();
});

// bottone preferiti
document.getElementById("btn-favonly").addEventListener("click",function(){
  FAV_ONLY=!FAV_ONLY;
  this.classList.toggle("active",FAV_ONLY);
  if(!FAV_ONLY){this.blur();}
  render();
  updateAllCounts();
});
document.getElementById("srch").addEventListener("input",function(e){Q=e.target.value;render();});
document.getElementById("srt").addEventListener("change",render);
document.getElementById("btn-reset").addEventListener("click",function(){
  AF={cat:[],dis:[],abv:[],sap:[],frz:[],bic:[]};
  document.querySelectorAll(".cb").forEach(function(el){el.classList.remove("on");});
  document.querySelectorAll(".ci").forEach(function(el){el.classList.remove("on");});
  document.getElementById("srch").value="";Q="";
  updateBadges();render();updateAllCounts();
});
document.getElementById("btn-ml").addEventListener("click",function(){
  USE_OZ=false;
  document.getElementById("btn-ml").classList.add("active");
  document.getElementById("btn-oz").classList.remove("active");
  openM(LAST_IDX);
});
document.getElementById("btn-oz").addEventListener("click",function(){
  USE_OZ=true;
  document.getElementById("btn-oz").classList.add("active");
  document.getElementById("btn-ml").classList.remove("active");
  openM(LAST_IDX);
});

function setFbH(){
  var h = document.getElementById("filter-bar").getBoundingClientRect().height;
  document.documentElement.style.setProperty("--fb-h", h + "px");
}
setFbH();
window.addEventListener("resize", setFbH);
document.getElementById("filter-panel").addEventListener("transitionend", setFbH);

// Altezza reale tab-bar per drawer
function setTabBarH(){
  var tb = document.querySelector(".tab-bar");
  if(tb) document.documentElement.style.setProperty("--tab-bar-h", tb.offsetHeight + "px");
}
setTabBarH();
window.addEventListener("resize", setTabBarH);
</script>


<!-- DRAWER: VANTAGGI -->
<div class="drawer" id="drawer-vnt">
  <div class="drawer-handle"></div>
  <div class="drawer-inner">
    <div class="drawer-header">Vantaggi esclusivi</div>
    <p style="font-size:.72rem;color:var(--txt2);line-height:1.5;margin-bottom:1rem;">Ecco i tuoi codici coupon esclusivi riservati agli acquirenti di Cocktail Legend.</p>
    <div class="vnt-item">
      <div class="vnt-item-title">🎓 I miei corsi di Mixology</div>
      <div class="vnt-item-desc">-20% sui singoli corsi. Non valido sulla promo Bundle.</div>
      <div class="vnt-code" id="copy-corsi">LEGEND20<span class="vnt-code-copy">copia</span></div>
      <a href="https://danielsportelli.github.io/academy" target="_blank" rel="noopener" class="vnt-link">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        Vai ai corsi
      </a>
    </div>
    <div class="vnt-item">
      <div class="vnt-item-title">🍸 Lumian Bar Tools</div>
      <div class="vnt-item-desc">-20% con minimo d&rsquo;ordine 50&euro;. Non valido durante alcuni periodi dell&rsquo;anno (es. Black Friday, Natale, ecc.).</div>
      <div class="vnt-code" id="copy-lumian">LEGEND20<span class="vnt-code-copy">copia</span></div>
      <a href="https://www.lumianbartools.com/" target="_blank" rel="noopener" class="vnt-link">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        Vai su Lumian
      </a>
    </div>
  </div>
</div>

<!-- DRAWER: TEMPERATURE -->
<div class="drawer" id="drawer-tmp">
  <div class="drawer-handle"></div>
  <div class="drawer-inner">
    <div class="drawer-header">Temperatura &amp; Sentori</div>
    <p style="font-size:.7rem;color:var(--txt2);line-height:1.5;margin-bottom:1rem;">Come la temperatura influenza la percezione aromatica. Pi&#xF9; il distillato &egrave; complesso, pi&#xF9; calore serve per esprimersi.</p>
    <div id="tmp-zones-drawer"></div>
    <div style="margin-top:.8rem;padding:.75rem;background:var(--bg);border:1px solid var(--brd);border-radius:10px;font-size:.65rem;color:var(--dim);line-height:1.7;">
      <strong style="color:var(--txt2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.1em;">Principi chiave</strong>
      &#x2744;&#xFE0F; Freddo &rarr; meno molecole aromatiche &rarr; profumo debole<br>
      &#x1F525; Calore &rarr; aromi si liberano, ma troppo fa dominare l&rsquo;alcol<br>
      &#x1F943; Pi&#xF9; il distillato &egrave; complesso, pi&#xF9; richiede temperatura elevata
    </div>

    <div style="margin-top:.8rem;padding:.85rem;background:var(--bg);border:1px solid rgba(201,151,42,.2);border-radius:10px;font-size:.65rem;color:var(--dim);line-height:1.75;">
      <strong style="color:var(--txt2);display:block;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.1em;">Note di degustazione</strong>
      <strong style="color:var(--amber);display:block;margin-bottom:.2rem;">Lascia respirare il distillato</strong>
      Dopo aver versato, lascia riposare il bicchiere senza agitarlo &mdash; in inglese si chiama <em>letting it breathe</em>. La regola empirica: <strong style="color:var(--txt)">1 minuto per ogni anno di invecchiamento</strong>. Un 12 anni &rarr; 12 minuti. Serve a far evaporare le note alcoliche pi&ugrave; pungenti e lasciar emergere la complessit&agrave;.<br><br>
      <strong style="color:var(--amber);display:block;margin-bottom:.2rem;">Non agitare</strong>
      A differenza del vino, i distillati vanno tenuti fermi. Agitare il bicchiere disperde gli aromi pi&ugrave; fini e accentua la percezione alcolica.<br><br>
      <strong style="color:var(--amber);display:block;margin-bottom:.2rem;">Poche gocce d&rsquo;acqua</strong>
      Aggiungi 2&ndash;3 gocce di acqua fredda direttamente nel bicchiere. Servono a rompere i <em>cluster molecolari</em> che si formano tra etanolo e acqua nel distillato: i composti aromatici intrappolati in queste strutture vengono liberati, diventando pi&ugrave; percepibili al naso e al palato. Questo serve ad aprire il distillato.<br><br>
      <strong style="color:var(--amber);display:block;margin-bottom:.2rem;">Acqua a parte per il palato</strong>
      Un bicchiere d&rsquo;acqua fredda tra un assaggio e l&rsquo;altro resetta il palato, evitando che l&rsquo;alcol del sorso precedente copra le note del successivo.<br><br>
      <strong style="color:var(--amber);display:block;margin-bottom:.2rem;">Il primo sorso non conta</strong>
      Il palato ha bisogno di scaldarsi. Il primo sorso prepara le mucose: &egrave; il secondo quello in cui percepisci davvero il distillato.
    </div>
  </div>
</div>

<!-- DRAWER: GLOSSARIO -->
<div class="drawer" id="drawer-bic">
  <div class="drawer-handle"></div>
  <div class="drawer-inner">
    <div class="drawer-header">Glossario</div>
    <p style="font-size:.7rem;color:var(--txt2);line-height:1.5;margin-bottom:1rem;">Tutti i termini essenziali del mondo bar, dalla A alla Z.</p>

    <!-- A -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.4rem 0 .5rem;">A</div>
    <div class="vnt-item"><div class="vnt-item-title">ABV (Alcohol by Volume)</div><div class="vnt-item-desc">Percentuale di alcol presente in una bevanda.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Aging</div><div class="vnt-item-desc">Invecchiamento di distillati o cocktail in botti o contenitori.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Aromatizzanti</div><div class="vnt-item-desc">Ingredienti come bitter o liquori usati per aggiungere complessità aromatica.</div></div>

    <!-- B -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">B</div>
    <div class="vnt-item"><div class="vnt-item-title">Barback</div><div class="vnt-item-desc">Assistente del bartender che si occupa di rifornire il banco bar, oltre a mantenere l'area di lavoro organizzata e pulita.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Batching</div><div class="vnt-item-desc">Preparazione anticipata di cocktail in grandi quantità.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Bitters</div><div class="vnt-item-desc">Estratti concentrati di erbe, spezie e radici, usati in piccole dosi.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Blended</div><div class="vnt-item-desc">Ha due significati: nel mondo dei distillati indica una bottiglia composta da distillati provenienti da diversi produttori o distillerie (es. Blended Whisky). Nel mondo della miscelazione indica i drink frullati con ghiaccio, come i Frozen e le Coladas.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Bouncer</div><div class="vnt-item-desc">Tecnica per interrompere il flusso del liquido abbassando la bottiglia durante la versata.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Build</div><div class="vnt-item-desc">Tecnica di preparazione in cui si versano direttamente gli ingredienti nel bicchiere, senza l'utilizzo di shaker o mixing glass.</div></div>

    <!-- C -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">C</div>
    <div class="vnt-item"><div class="vnt-item-title">Chiarificazione</div><div class="vnt-item-desc">Tecniche per rendere limpido un cocktail.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Cocktail Glass</div><div class="vnt-item-desc">Coppetta per servire cocktail "straight up".</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Colada</div><div class="vnt-item-desc">Come i frozen ma con consistenza simile al frappé.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Crusta</div><div class="vnt-item-desc">Decorazione del bordo del bicchiere.</div></div>

    <!-- D -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">D</div>
    <div class="vnt-item"><div class="vnt-item-title">Dash</div><div class="vnt-item-desc">Piccolissima quantità di un ingrediente (es. bitters).</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Diluizione</div><div class="vnt-item-desc">Quantità di acqua che si incorpora in un drink tramite ghiaccio o miscelazione.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Dirty Dump</div><div class="vnt-item-desc">Tecnica di servizio in cui tutto il contenuto dello shaker viene versato direttamente nel bicchiere senza filtrare.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Double Strain</div><div class="vnt-item-desc">Filtrazione doppia con l'utilizzo del Fine Strainer per eliminare residui solidi e ghiaccio.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Drop</div><div class="vnt-item-desc">Micro quantità di un liquido, dosata goccia a goccia.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Dry Shake</div><div class="vnt-item-desc">Tecnica per emulsionare albume o aquafaba senza ghiaccio prima di shakerare con ghiaccio.</div></div>

    <!-- F -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">F</div>
    <div class="vnt-item"><div class="vnt-item-title">Fast Shake</div><div class="vnt-item-desc">Shakerata rapida usata con ghiaccio pilé, spesso in abbinata alla tecnica Dirty Dump.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Fat Washing</div><div class="vnt-item-desc">Tecnica per infondere sapori grassi (es. burro, bacon) in distillati.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Fine Strainer</div><div class="vnt-item-desc">Colino a maglia fine utilizzato per effettuare la double strain.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Flair Bartending</div><div class="vnt-item-desc">Tecniche acrobatiche di bartending con lanci di bottiglie e attrezzi.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Float</div><div class="vnt-item-desc">Tecnica con cui un ingrediente viene versato delicatamente sopra al drink finito, creando uno strato galleggiante. Lo si può versare utilizzando la stessa tecnica con cui vengono creati i drink layered, versando lentamente il liquido sul dorso del bar spoon.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Free Pouring</div><div class="vnt-item-desc">Tecnica di versata senza l'uso del jigger, basata sul conteggio mentale del tempo. È alla base dell'American bartending e garantisce velocità e precisione allo stesso tempo.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Frozen</div><div class="vnt-item-desc">Cocktail frullato con ghiaccio fino a ottenere una consistenza simile a un sorbetto.</div></div>

    <!-- G -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">G</div>
    <div class="vnt-item"><div class="vnt-item-title">Garnish</div><div class="vnt-item-desc">Decorazione che completa e arricchisce il cocktail.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Ghiaccio Pilé</div><div class="vnt-item-desc">Ghiaccio tritato a scaglie irregolari, ottenuto frantumando cubetti di ghiaccio.</div></div>

    <!-- H -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">H</div>
    <div class="vnt-item"><div class="vnt-item-title">Hard Shake</div><div class="vnt-item-desc">Shakerata vigorosa usata per creare una texture cremosa. Tecnica codificata e resa famosa dal leggendario bartender giapponese Kazuo Uyeda del Tender Bar di Tokyo.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Highball</div><div class="vnt-item-desc">Ha due significati: il bicchiere alto e stretto usato per i long drink, e una tipologia di cocktail composta da un distillato allungato con acqua gassata o soda (es. Whisky Highball, Tequila Highball), servita in bicchiere alto con ghiaccio.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Homemade</div><div class="vnt-item-desc">Preparazioni fatte in casa (sciroppi, premix ecc).</div></div>

    <!-- I -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">I</div>
    <div class="vnt-item"><div class="vnt-item-title">Infusione</div><div class="vnt-item-desc">Tecnica per aromatizzare alcolici o per creare alcolati, estraendo aromi e proprietà organolettiche da frutta, erbe e spezie mediante macerazione.</div></div>

    <!-- J -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">J</div>
    <div class="vnt-item"><div class="vnt-item-title">Jigger</div><div class="vnt-item-desc">Strumento di precisione per dosare i liquidi.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Julep Strainer</div><div class="vnt-item-desc">Strainer a forma di cucchiaio forato usato per filtrare cocktail stir &amp; strain. Nato originariamente come accessorio per bere il Mint Julep — veniva appoggiato sopra il ghiaccio pilé per permettere di sorseggiare il drink senza ingerire il ghiaccio.</div></div>

    <!-- L -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">L</div>
    <div class="vnt-item"><div class="vnt-item-title">Layered</div><div class="vnt-item-desc">Cocktail composto da strati di liquidi con densità diverse, ottenuti versando lentamente ogni ingrediente sul dorso del bar spoon.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Long Drink</div><div class="vnt-item-desc">Cocktail con grande quantità di parte analcolica, servito in bicchiere alto.</div></div>

    <!-- M -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">M</div>
    <div class="vnt-item"><div class="vnt-item-title">Mixing Glass</div><div class="vnt-item-desc">Contenitore di vetro o acciaio usato per miscelare cocktail con ghiaccio tramite bar spoon, mediante la tecnica dello stir &amp; strain.</div></div>

    <!-- N -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">N</div>
    <div class="vnt-item"><div class="vnt-item-title">Naked</div><div class="vnt-item-desc">Cocktail servito senza garnish o decorazioni.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Neat</div><div class="vnt-item-desc">Distillato, amaro o liquore servito liscio, a temperatura ambiente, senza ghiaccio o acqua.</div></div>

    <!-- O -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">O</div>
    <div class="vnt-item"><div class="vnt-item-title">Old Fashioned</div><div class="vnt-item-desc">Bicchiere basso in stile vintage, usato generalmente per i drink spirit forward.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">On the Rocks</div><div class="vnt-item-desc">Bevanda o cocktail servito con ghiaccio.</div></div>

    <!-- P -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">P</div>
    <div class="vnt-item"><div class="vnt-item-title">Premix</div><div class="vnt-item-desc">Miscela analcolica (generalmente con frutta fresca) già pronta usata per velocizzare il servizio.</div></div>

    <!-- R -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">R</div>
    <div class="vnt-item"><div class="vnt-item-title">Rinse</div><div class="vnt-item-desc">Tecnica che consiste nel versare poche gocce o uno spruzzo di un liquido — solitamente un liquore o bitter aromatico — nel bicchiere, ruotarlo per rivestirne le pareti e scartare l'eccesso. Serve ad aromatizzare il bicchiere prima di costruire il drink. Esempio classico: il Sazerac con l'assenzio.</div></div>

    <!-- S -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">S</div>
    <div class="vnt-item"><div class="vnt-item-title">Shake &amp; Strain</div><div class="vnt-item-desc">Tecnica in cui si shakera il cocktail con ghiaccio e in seguito si filtra con l'utilizzo di uno strainer direttamente nel bicchiere.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Short Drink</div><div class="vnt-item-desc">Cocktail con minor volume di liquido rispetto a un long drink, generalmente servito in un bicchiere piccolo o coppetta, a gradazione più alta. Es. Margarita, Daiquiri.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Spirit Forward</div><div class="vnt-item-desc">Tipologia di short drink in cui il distillato è l'elemento predominante sia a livello di gusto che di struttura. Composto da sola parte alcolica, senza succhi, sciroppi o componenti analcoliche (es. Negroni, Manhattan, Old Fashioned).</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Straight Up</div><div class="vnt-item-desc">Cocktail raffreddato mediante tecnica shake &amp; strain o stir &amp; strain e servito senza ghiaccio, generalmente in coppetta.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Sweet &amp; Sour</div><div class="vnt-item-desc">Premix solitamente composto da succo di limone e sciroppo di zucchero, che costituisce la base dei drink bilanciati tra acidità e dolcezza.</div></div>

    <!-- T -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">T</div>
    <div class="vnt-item"><div class="vnt-item-title">Throwing</div><div class="vnt-item-desc">Tecnica elegante e scenica per miscelare e ossigenare il drink, versandolo più volte tra due contenitori. Viene utilizzata prevalentemente per il Bloody Mary.</div></div>
    <div class="vnt-item"><div class="vnt-item-title">Twist on Classic</div><div class="vnt-item-desc">Versione modificata di un cocktail classico, senza stravolgerne la struttura di base. Altrimenti non si parla più di un twist sul classico.</div></div>

    <!-- Z -->
    <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:.9rem 0 .5rem;">Z</div>
    <div class="vnt-item"><div class="vnt-item-title">Zest</div><div class="vnt-item-desc">Scorza di agrume usata come garnish per il drink, e a volte anche per aromatizzarlo sprizzandone gli oli essenziali direttamente sulla superficie (questa tecnica di sprizzare gli oli essenziali si chiama fare il twist).</div></div>
  </div>
</div>

<!-- DRAWER: CALCOLATORE ABV -->
<div class="drawer" id="drawer-abv">
  <div class="drawer-handle"></div>
  <div class="drawer-inner">
    <div class="drawer-header">Calcolatore ABV%</div>
    <p style="font-size:.7rem;color:var(--txt2);line-height:1.5;margin-bottom:1rem;">Calcola la gradazione alcolica stimata del tuo cocktail in base agli ingredienti.</p>
    <div id="abv-ingredients">
      <div class="abv-row-calc" data-idx="0">
        <input type="number" class="abv-ml" placeholder="ml" min="0" max="500" style="width:70px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">
        <span style="color:var(--dim);font-size:.75rem;">ml</span>
        <input type="number" class="abv-pct" placeholder="%" min="0" max="100" style="width:65px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">
        <span style="color:var(--dim);font-size:.75rem;">%</span>
      </div>
    </div>
    <div style="display:flex;gap:.6rem;margin-top:.8rem;">
      <button id="abv-add-row" style="flex:1;background:var(--surf);border:1px solid var(--brd);border-radius:8px;padding:.5rem;color:var(--txt2);font-size:.75rem;font-weight:600;font-family:inherit;cursor:pointer;">+ Aggiungi ingrediente</button>
      <button id="abv-reset" style="background:var(--surf);border:1px solid var(--brd);border-radius:8px;padding:.5rem .8rem;color:var(--dim);font-size:.75rem;font-family:inherit;cursor:pointer;">Reset</button>
    </div>
    <div style="margin-top:1rem;padding:1rem;background:var(--bg);border:1px solid rgba(245,158,11,.2);border-radius:12px;text-align:center;will-change:contents;transform:translateZ(0);">
      <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:.3rem;">ABV stimato</div>
      <div id="abv-result" style="font-size:2.2rem;font-weight:900;color:var(--amber);line-height:1;">—</div>
      <div id="abv-desc" style="font-size:.68rem;color:var(--txt2);margin-top:.3rem;"></div>
      <div id="abv-alcol" style="font-size:.72rem;color:var(--dim);margin-top:.4rem;"></div>
    </div>
    <div style="margin-top:.85rem;padding:.75rem 1rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;font-size:.65rem;color:var(--dim);line-height:1.6;">
      <span style="color:var(--txt2);font-weight:700;">💡 ABV vs Alcol etilico</span><br>
      L'ABV indica la <em>percentuale</em> di alcol sul volume totale del drink — non quanto alcol hai ingerito. Uno shot da 50ml di Gin 40° e un Gin Tonic con gli stessi 50ml di Gin hanno <strong style="color:var(--txt)">identici ml di alcol etilico (20ml)</strong>, ma ABV diverso (40% vs ~10%). Ai fini del tasso alcolemico ciò che conta è la quantità assoluta di alcol etilico, non l'ABV del drink.
    </div>
  </div>
</div>

<!-- TOAST COPIA -->
<div class="copied-toast" id="copied-toast">Codice copiato! ✓</div>

<script>
// ═══ KEYBOARD DETECTION — evita lampeggio drawer ═══
(function(){
  var initialHeight = window.innerHeight;
  window.addEventListener('resize', function(){
    var drawers = document.querySelectorAll('.drawer');
    if (window.innerHeight < initialHeight * 0.85) {
      // tastiera aperta
      drawers.forEach(function(d){ if(d.classList.contains('open')) d.classList.add('keyboard-open'); });
    } else {
      // tastiera chiusa
      drawers.forEach(function(d){ d.classList.remove('keyboard-open'); });
      initialHeight = window.innerHeight;
    }
  });
})();

// ═══ DRAWER SYSTEM ═══
var CURRENT_DRAWER = null;

function openDrawer(id) {
  var drawer = document.getElementById('drawer-' + id);
  var overlay = document.getElementById('drawer-overlay');
  var btn = document.getElementById('tbtn-' + id);
  if (!drawer) return;
  if (CURRENT_DRAWER === id) {
    closeAllDrawers();
    return;
  }
  closeAllDrawers(true);
  CURRENT_DRAWER = id;
  drawer.classList.add('open');
  overlay.classList.add('show');
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  // Nascondi filter-bar e rbar sotto il drawer
  var fb=document.getElementById('filter-bar');if(fb)fb.style.zIndex='40';
  var rb=document.getElementById('rbar');if(rb)rb.style.zIndex='40';
}

function closeAllDrawers(silent) {
  document.querySelectorAll('.drawer').forEach(function(d){ d.classList.remove('open'); });
  document.getElementById('drawer-overlay').classList.remove('show');
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  if (!silent) CURRENT_DRAWER = null;
  // Ripristina z-index solo se chiusura definitiva
  if (!silent) {
    var fb=document.getElementById('filter-bar');if(fb)fb.style.zIndex='';
    var rb=document.getElementById('rbar');if(rb)rb.style.zIndex='';
  }
}

// Swipe down per chiudere
document.querySelectorAll('.drawer-handle').forEach(function(handle) {
  var startY = 0;
  handle.addEventListener('touchstart', function(e){ startY = e.touches[0].clientY; }, {passive:true});
  handle.addEventListener('touchend', function(e){
    if (e.changedTouches[0].clientY - startY > 40) closeAllDrawers();
  }, {passive:true});
});

// Overlay click — delay per dare precedenza al click sulle tab
document.getElementById('drawer-overlay').addEventListener('click', function(){
  setTimeout(closeAllDrawers, 50);
});

// ═══ COPIA CODICE (Vantaggi drawer) ═══
(function(){
  var toast = document.getElementById('copied-toast');
  function copyCode(id, code) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function(){
      var inp = document.createElement('input');
      inp.value = code;
      inp.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
      document.body.appendChild(inp);
      inp.focus(); inp.setSelectionRange(0, code.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch(e){}
      document.body.removeChild(inp);
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(code).catch(function(){});
      toast.classList.add('show');
      setTimeout(function(){ toast.classList.remove('show'); }, 2000);
    });
  }
  copyCode('copy-corsi',  'LEGEND20');
  copyCode('copy-lumian', 'LEGEND20');
})();

// ═══ TEMPERATURE DRAWER ═══
(function(){
  var zonesEl = document.getElementById('tmp-zones-drawer');
  if (!zonesEl) return;
  var ZONES = [
    { range:'< 0\u00b0C',    name:'Sotto Zero',       color:'#4a7acc', sentori:'Percezione quasi nulla. Solo note mentolate ed eucaliptolici resistono.', dist:'Non consigliato per distillati di qualit\u00e0' },
    { range:'0\u20135\u00b0C',  name:'Freddo da frigo',  color:'#3ab8d4', sentori:'Agrumato, mentolato. Note leggere e volatili ancora percepibili.',        dist:'Vodka ghiacciata' },
    { range:'4\u20138\u00b0C',  name:'Servizio freddo',  color:'#2da89a', sentori:'Erbe fresche, agrumi, fiori bianchi leggeri. Calore alcolico ridotto.',   dist:'Gin \u00b7 Vodka' },
    { range:'8\u201313\u00b0C', name:'Fresco temperato', color:'#4db86a', sentori:'Verdi: fico, basilico, erba tagliata. Fruttate fresche: mela verde, pera. Floreali leggeri.', dist:'Grappa giovane \u00b7 Acquaviti bianche \u00b7 Pisco' },
    { range:'13\u201315\u00b0C',name:'Temperato',        color:'#88bb2a', sentori:'Floreali leggeri, lavanda, spezie dolci. Buon equilibrio freschezza e aroma.', dist:'Rum bianco \u00b7 Tequila blanco \u00b7 Mezcal \u00b7 Sotol \u00b7 Cacha\u00e7a' },
    { range:'16\u201318\u00b0C',name:'Caldo moderato',   color:'#d4a020', sentori:'Caramello, fruttato maturo, spezie calde, note cerealicole. Complessit\u00e0 emergente.', dist:'Bourbon \u00b7 Rye Whiskey \u00b7 Irish Whiskey \u00b7 Scotch blended \u00b7 Japanese Whisky \u00b7 Tequila reposado \u00b7 Rum a\u00f1ejo \u00b7 Grappa barricata' },
    { range:'18\u201322\u00b0C',name:'Caldo espressivo', color:'#e8701a', sentori:'Torba, cuoio, frutta secca, spezie intense. Massima espressione aromatica.', dist:'Scotch single malt \u00b7 Whisky torbato \u00b7 Tequila a\u00f1ejo \u00b7 Cognac VS-VSOP \u00b7 Armagnac \u00b7 Calvados' },
    { range:'20\u201324\u00b0C',name:'Caldo profondo',   color:'#c83820', sentori:'Legnoso, resinoso, balsamico, ambra, vaniglia, cacao. Aromi ricchi e persistenti.', dist:'Cognac XO \u00b7 Armagnac millesimato \u00b7 Rum XO \u00b7 Brandy Riserva-XO' }
  ];
  ZONES.forEach(function(z){
    var d = document.createElement('div');
    d.className = 'vnt-item';
    d.style.borderLeft = '3px solid ' + z.color;
    d.innerHTML = '<div class="vnt-item-title" style="color:' + z.color + '">' + z.range + ' \u2014 ' + z.name + '</div>'
      + '<div class="vnt-item-desc" style="font-style:italic">' + z.sentori + '</div>'
      + '<div style="font-size:.68rem;font-weight:600;color:' + z.color + '">' + z.dist + '</div>';
    zonesEl.appendChild(d);
  });
})();

// ═══ CALCOLATORE ABV ═══
(function(){
  var wrap = document.getElementById('abv-ingredients');
  var result = document.getElementById('abv-result');
  var desc = document.getElementById('abv-desc');
  var rowIdx = 1;

  function addRow() {
    var row = document.createElement('div');
    row.className = 'abv-row-calc';
    row.style.cssText = 'display:flex;align-items:center;gap:.4rem;margin-top:.5rem;';
    row.innerHTML = '<input type="number" class="abv-ml" placeholder="ml" min="0" max="500" style="width:70px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'
      + '<span style="color:var(--dim);font-size:.75rem;">ml</span>'
      + '<input type="number" class="abv-pct" placeholder="%" min="0" max="100" style="width:65px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'
      + '<span style="color:var(--dim);font-size:.75rem;">%</span>'
      + '<button onclick="this.parentElement.remove();debouncedCalc();" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:.9rem;padding:0 .2rem;">✕</button>';
    wrap.appendChild(row);
    row.querySelectorAll('input').forEach(function(i){ i.addEventListener('input', debouncedCalc); });
  }

  // Style prima riga
  var firstRow = wrap.querySelector('.abv-row-calc');
  if (firstRow) firstRow.style.cssText = 'display:flex;align-items:center;gap:.4rem;';

  document.getElementById('abv-add-row').addEventListener('click', addRow);
  document.getElementById('abv-reset').addEventListener('click', function(){
    wrap.innerHTML = '';
    addRow(); addRow();
    result.textContent = '\u2014';
    desc.textContent = '';
    var ae=document.getElementById('abv-alcol');if(ae)ae.textContent='';
  });

  wrap.querySelectorAll('input').forEach(function(i){ i.addEventListener('input', debouncedCalc); });

  // Aggiungi una seconda riga di default
  addRow();
})();

var _abvTimer = null;
function debouncedCalc(){ clearTimeout(_abvTimer); _abvTimer = setTimeout(calcABV, 400); }

function calcABV() {
  var rows = document.querySelectorAll('#abv-ingredients .abv-row-calc');
  var totalVol = 0, totalAlc = 0;
  rows.forEach(function(row){
    var ml = parseFloat(row.querySelector('.abv-ml').value) || 0;
    var pct = parseFloat(row.querySelector('.abv-pct').value) || 0;
    totalVol += ml;
    totalAlc += ml * (pct / 100);
  });
  var result = document.getElementById('abv-result');
  var desc = document.getElementById('abv-desc');
  if (totalVol <= 0) {
    result.textContent = '\u2014';
    desc.textContent = '';
    var ae=document.getElementById('abv-alcol');if(ae)ae.textContent='';
    return;
  }
  var abv = (totalAlc / totalVol * 100).toFixed(1);
  var label = abv < 10 ? 'Basso' : abv < 20 ? 'Medio' : abv < 30 ? 'Medio-alto' : 'Alto';
  // Aggiorna solo se il valore è cambiato, evita repaint inutili
  var newText = abv + '%';
  var newDesc = label + ' \u2014 ' + totalVol.toFixed(0) + ' ml totali';
  var newAlcol = 'Alcol etilico puro: ' + totalAlc.toFixed(1) + ' ml';
  if (result.textContent !== newText) result.textContent = newText;
  if (desc.textContent !== newDesc) desc.textContent = newDesc;
  var alcolEl = document.getElementById('abv-alcol');
  if (alcolEl) alcolEl.textContent = newAlcol;
}