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
var SYNONYMS = {}; // mappa brand → [categorie generiche]

// Carica tutti i file sinonimi dalla cartella database/it/sinonimi/
var SYNONYM_FILES = [
  "sinonimi-rum.json",
  "sinonimi-gin.json",
  "sinonimi-vodka.json",
  "sinonimi-tequila-mezcal.json",
  "sinonimi-scotch-whisky.json",
  "sinonimi-bourbon-whiskey.json",
  "sinonimi-rye-whiskey.json",
  "sinonimi-japanese-whisky.json",
  "sinonimi-irish-whiskey.json",
  "sinonimi-tennessee-whiskey.json",
  "sinonimi-cognac-armagnac-brandy.json",
  "sinonimi-pisco.json",
  "sinonimi-grappa.json",
  "sinonimi-acquavite.json",
  "sinonimi-sake-soju-baijiu.json",
  "sinonimi-anice-liquirizia.json",
  "sinonimi-liquori-amari.json",
  "sinonimi-bitter-aperitivi.json",
  "sinonimi-vermouth.json",
  "sinonimi-spumanti.json",
  "sinonimi-sciroppi-mixer.json"
];

// Espande una query testuale tramite sinonimi.
// Restituisce un array di termini da cercare (query originale + categorie mappate).
function expandQuery(q) {
  var key = q.toLowerCase().trim();
  var terms = [key];
  if (SYNONYMS[key]) {
    for (var i = 0; i < SYNONYMS[key].length; i++) {
      var cat = SYNONYMS[key][i].toLowerCase();
      if (terms.indexOf(cat) === -1) terms.push(cat);
    }
  }
  return terms;
}

// Carica cocktails + tutti i file sinonimi in parallelo
Promise.all([
  fetch("database/it/cocktails-it.json").then(function(res){ return res.json(); }),
  Promise.all(SYNONYM_FILES.map(function(f){
    return fetch("database/it/sinonimi/" + f)
      .then(function(r){ return r.ok ? r.json() : {}; })
      .catch(function(){ return {}; }); // se un file manca non blocca tutto
  }))
]).then(function(results){
  DATA = results[0];

  // Unisce tutti i file sinonimi in un'unica mappa SYNONYMS
  var synFiles = results[1];
  for (var fi = 0; fi < synFiles.length; fi++) {
    var obj = synFiles[fi];
    var keys = Object.keys(obj);
    for (var ki = 0; ki < keys.length; ki++) {
      SYNONYMS[keys[ki]] = obj[keys[ki]];
    }
  }

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
function uniqFromRes(key) {
  var src = Q ? RES : null; // usa RES solo se c'è testo nella search bar
  if (!src) return null;    // nessun filtraggio → comportamento normale
  var s = {};
  for (var i = 0; i < src.length; i++) {
    var c = src[i];
    if (key === "sap") { for (var j = 0; j < c.sapori.length; j++) s[c.sapori[j]] = 1; }
    else if (key === "dis") {
      for (var j = 0; j < c.distillato.length; j++) s[c.distillato[j]] = 1;
      for (var j = 0; j < c.ingredienti.length; j++) s[c.ingredienti[j][1]] = 1;
    }
    else if (key === "frz") { s[c.frizzante ? "Si" : "No"] = 1; }
    else if (key === "bic") { s[c.bicchiere] = 1; }
    else { var f2 = key==="cat" ? "categoria" : key==="abv" ? "abv" : key; s[c[f2]] = 1; }
  }
  return s; // set di valori presenti nei risultati correnti
}
function countFor(key, val) {
  // Filtra con tutti i filtri attivi TRANNE quello della stessa chiave
  // e rispetta anche la query testuale corrente
  var base = DATA.filter(function(c){
    if(AF.cat.length && key!=="cat" && AF.cat.indexOf(c.categoria)===-1) return false;
    if(AF.dis.length && key!=="dis"){var vl2;var ok=AF.dis.some(function(d){vl2=d.toLowerCase();return c.distillato.some(function(x){return x.toLowerCase()===vl2;})||c.ingredienti.some(function(i){return i[1].toLowerCase()===vl2;});});if(!ok)return false;}
    if(AF.abv.length && key!=="abv" && AF.abv.indexOf(c.abv)===-1) return false;
    if(AF.sap.length && key!=="sap" && !AF.sap.some(function(s){return c.sapori.indexOf(s)!==-1;})) return false;
    if(AF.frz.length && key!=="frz" && AF.frz.indexOf(c.frizzante?"Si":"No")===-1) return false;
    if(AF.bic.length && key!=="bic" && AF.bic.indexOf(c.bicchiere)===-1) return false;
    if(FAV_ONLY){var favs=loadFavs();if(favs.indexOf(c.name)===-1)return false;}
    // applica anche il filtro testuale
    if(Q){var q=Q.toLowerCase().trim();
      var terms=expandQuery(q);
      var dis=Array.isArray(c.distillato)?c.distillato.join(" "):c.distillato;
      var ingNames=c.ingredienti.map(function(i){return i[1].toLowerCase();});
      var ingStr=ingNames.join(" ");
      var matched=false;
      for(var ti=0;ti<terms.length;ti++){
        var t=terms[ti];
        if(ingNames.some(function(n){return n===t;})){matched=true;break;}
        if(c.name.toLowerCase().indexOf(t)!==-1){matched=true;break;}
        if(dis.toLowerCase().indexOf(t)!==-1){matched=true;break;}
        if(ingStr.indexOf(t)!==-1){matched=true;break;}
        if((c.garnish||"").toLowerCase().indexOf(t)!==-1){matched=true;break;}
        if(c.sapori.join(" ").toLowerCase().indexOf(t)!==-1){matched=true;break;}
      }
      if(!matched)return false;
    }
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
    if (el) el.textContent = cnt;

    // Se c'è una query attiva, nascondi le voci non presenti nei risultati correnti
    var resSet = uniqFromRes(k);
    var inRes = !resSet || resSet.hasOwnProperty(v);

    if (!inRes && !div.classList.contains("on")) {
      div.style.display = "none";
    } else {
      div.style.display = "";
      if (cnt === 0 && !div.classList.contains("on")) {
        div.style.opacity = "0.4";
        div.classList.add("ci-disabled");
      } else {
        div.style.opacity = "";
        div.classList.remove("ci-disabled");
      }
    }
  });
}
function initF() {
  Promise.all([
    fetch("database/it/categorie-it.json").then(function(r){ return r.json(); }),
    fetch("database/it/ingredienti-it.json").then(function(r){ return r.json(); }),
    fetch("database/it/sapori-it.json").then(function(r){ return r.json(); }),
    fetch("database/it/bicchieri-it.json").then(function(r){ return r.json(); })
  ]).then(function(results){
    var cats  = results[0].sort(function(a,b){ return a.localeCompare(b,"it"); });
    var ings  = results[1].sort(function(a,b){ return a.localeCompare(b,"it"); });
    var saps  = results[2].sort(function(a,b){ return a.localeCompare(b,"it"); });
    var bics  = results[3].sort(function(a,b){ return a.localeCompare(b,"it"); });

    buildDropdown("dd-cat","cat", cats);
    buildDropdown("dd-dis","dis", ings);
    buildDropdown("dd-sap","sap", saps);
    buildDropdown("dd-frz","frz", ["Si","No"]);
    buildDropdown("dd-bic","bic", bics);
    buildDropdown("dd-abv","abv", ["Analcolico","Basso","Medio basso","Medio","Medio alto","Alto","Molto alto"]);
  });
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
      updateAllCounts();
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
  if(q){
    var terms=expandQuery(q);
    res=res.filter(function(c){
      var dis=Array.isArray(c.distillato)?c.distillato.join(" "):c.distillato;
      var ingNames=c.ingredienti.map(function(i){return i[1].toLowerCase();});
      var ingStr=ingNames.join(" ");
      var garnish=(c.garnish||"").toLowerCase();
      var sapori=c.sapori.join(" ").toLowerCase();
      var nome=c.name.toLowerCase();
      for(var ti=0;ti<terms.length;ti++){
        var t=terms[ti];
        if(ingNames.some(function(n){return n===t;})) return true;
        if(nome.indexOf(t)!==-1) return true;
        if(dis.toLowerCase().indexOf(t)!==-1) return true;
        if(ingStr.indexOf(t)!==-1) return true;
        if(garnish.indexOf(t)!==-1) return true;
        if(sapori.indexOf(t)!==-1) return true;
      }
      return false;
    });
  }
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
  updateAllCounts();
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
    if(!c.img){ c.img='https://danielsportelli.github.io/cocktail-legend/immagini/'+c.id+'.webp';
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
document.getElementById("srch").addEventListener("keydown",function(e){if(e.key==="Enter")this.blur();});
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

(function(){
  var WORKER_URL = 'https://cocktail-legend-ai.daniel-sportelli.workers.dev';
  var USAGE_KEY = 'cl_ai_usage';
  var USAGE_MONTH = 'cl_ai_month';
  var MAX = 50;
  var ingredients = [];

  function getUsage(){
    var now = new Date();
    var month = now.getFullYear()+'-'+now.getMonth();
    if(localStorage.getItem(USAGE_MONTH)!==month){
      localStorage.setItem(USAGE_MONTH,month);
      localStorage.setItem(USAGE_KEY,'0');
      return 0;
    }
    return parseInt(localStorage.getItem(USAGE_KEY)||'0',10);
  }

  function incUsage(){
    var u=getUsage()+1;
    localStorage.setItem(USAGE_KEY,String(u));
    return u;
  }

  function renderUsage(){
    var u=getUsage();
    var pct=Math.min(100,(u/MAX)*100);
    var fill=document.getElementById('crea-usage-fill');
    if(fill){fill.style.width=pct+'%';fill.style.background=pct>=80?'#ef4444':'var(--amber)';}
    var txt=document.getElementById('crea-usage-txt');
    if(txt)txt.textContent=u+'/'+MAX;
    if(u>=MAX)showExhausted();
  }

  function showExhausted(){
    var b=document.getElementById('crea-exhausted');
    var btn=document.getElementById('crea-btn');
    if(b)b.style.display='block';
    if(btn)btn.disabled=true;
    var now=new Date();
    var next=new Date(now.getFullYear(),now.getMonth()+1,1);
    var d=document.getElementById('crea-reset-date');
    if(d)d.textContent='Si resetterà il '+next.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
  }

  function filterDB(){
    var list=document.getElementById('crea-db-list');
    var count=document.getElementById('crea-db-count');
    if(!ingredients.length){
      if(list)list.innerHTML='<span style="font-style:italic;">Inserisci uno o più ingredienti…</span>';
      if(count)count.innerHTML='<span style="color:var(--amber);">0</span> trovati';
      return [];
    }
    var matches=(window.DATA||[]).filter(function(d){
      var names=d.ingredienti.map(function(i){return i[1].toLowerCase();});
      return ingredients.some(function(q){return names.some(function(n){return n.includes(q);});});
    }).slice(0,10);
    if(count)count.innerHTML='<span style="color:var(--amber);">'+matches.length+'</span> trovati';
    if(list){
      if(!matches.length){list.innerHTML='<span style="font-style:italic;">Nessun match — chiedi comunque!</span>';}
      else{list.innerHTML=matches.map(function(d){return '<div style="padding:2px 0;color:var(--txt2);">• '+d.name+'</div>';}).join('');}
    }
    return matches;
  }

  function renderTags(){
    var box=document.getElementById('crea-tags');
    if(!box)return;
    box.innerHTML='';
    ingredients.forEach(function(ing){
      var t=document.createElement('div');
      t.style.cssText='display:flex;align-items:center;gap:6px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:var(--amber);font-size:.72rem;padding:4px 10px;border-radius:99px;';
      t.innerHTML=ing+'<button data-v="'+ing+'" style="background:none;border:none;color:rgba(245,158,11,.5);cursor:pointer;font-size:14px;padding:0;line-height:1;">×</button>';
      t.querySelector('button').addEventListener('click',function(){
        ingredients=ingredients.filter(function(i){return i!==this.dataset.v;}.bind(this));
        renderTags();filterDB();updateBtn();
      });
      box.appendChild(t);
    });
  }

  function updateBtn(){
    var btn=document.getElementById('crea-btn');
    if(!btn)return;
    var exhausted=getUsage()>=MAX;
    var active=ingredients.length>0&&!exhausted;
    btn.disabled=!active;
    btn.style.background=active?'#2563eb':'var(--surf)';
    btn.style.color=active?'#fff':'var(--dim)';
    btn.style.border=active?'none':'1px solid var(--brd)';
    btn.style.cursor=active?'pointer':'not-allowed';
    btn.style.opacity='1';
    btn.style.boxShadow=active?'0 4px 16px rgba(37,99,235,.4)':'none';
  }

  function addIng(raw){
    raw.split(',').forEach(function(v){
      v=v.trim().toLowerCase();
      if(v&&!ingredients.includes(v))ingredients.push(v);
    });
    renderTags();filterDB();updateBtn();
  }

 function mdToHtml(md){
  return md
    .replace(/^## (.+)$/gm,'<div style="font-size:.6rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--blue-l);margin:18px 0 6px;padding-bottom:5px;border-bottom:1px solid rgba(96,165,250,.2);">$1</div>')
    .replace(/^### (.+)$/gm,'<div style="font-size:.82rem;font-weight:700;color:var(--txt);margin:12px 0 3px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g,'<strong style="color:var(--amber);font-weight:700;">$1</strong>')
    .replace(/\*(.+?)\*/g,'<em style="color:var(--txt2);">$1</em>')
    .replace(/^- (.+)$/gm,'<div style="padding:3px 0 3px 10px;border-left:2px solid rgba(96,165,250,.25);color:var(--txt2);font-size:.78rem;">$1</div>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--brd);margin:12px 0;">')
    .replace(/\n\n/g,'<br><br>');
}

  async function askBarman(){
    if(getUsage()>=MAX){showExhausted();return;}
    var btn=document.getElementById('crea-btn');
    var resp=document.getElementById('crea-response');
    var body=document.getElementById('crea-body');
    var err=document.getElementById('crea-error');
    if(btn){btn.disabled=true;btn.textContent='...';}
    if(err)err.style.display='none';
    if(resp)resp.style.display='block';
    if(body)body.innerHTML='<span style="color:var(--dim);">Il barman sta pensando…</span>';

    var prompt='Ho questi ingredienti: **'+ingredients.join(', ')+'**.\n\nCrea per me:\n1. 2-3 cocktail originali realizzabili con questi ingredienti, con ricetta sintetica (dosi indicative, tecnica, bicchiere).\n2. 1-2 twist creativi inediti, anche non convenzionali.\n3. Un consiglio pratico su come valorizzare al meglio questi ingredienti insieme.\n\nRicorda: le ricette sono un punto di partenza creativo, da assaggiare e bilanciare sul momento.';

    try{
      var res=await fetch(WORKER_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          system:'Sei un barman creativo di fama internazionale. Il tuo compito è generare idee di cocktail originali partendo dagli ingredienti che ti vengono forniti. Parli sempre in italiano. Tono diretto e professionale, da collega a collega. Non citare mai database o fonti esterne. Usi ## per titoli sezione, **grassetto** per nomi drink e ingredienti chiave, - per liste. Precisa sempre che le ricette sono un punto di partenza da assaggiare e bilanciare.',
          messages:[{role:'user',content:prompt}]
        })
      });
      var data=await res.json();
      var text=data?.content?.[0]?.text||'';
      if(!text)throw new Error(data?.error?.message||'Risposta vuota');
      if(body)body.innerHTML=mdToHtml(text);
      incUsage();renderUsage();
    }catch(e){
      if(resp)resp.style.display='none';
      if(err){err.style.display='block';err.textContent='⚠️ '+( e.message||'Errore. Riprova.');}
    }finally{
      if(btn){btn.disabled=getUsage()>=MAX||ingredients.length===0;btn.textContent='✦ Chiedi al Barman';btn.style.opacity=btn.disabled?'.45':'1';}
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    renderUsage();
    var addBtn=document.getElementById('crea-add');
    var input=document.getElementById('crea-input');
    var askBtn=document.getElementById('crea-btn');
    if(addBtn)addBtn.addEventListener('click',function(){if(input&&input.value.trim()){addIng(input.value);input.value='';input.focus();}});
    if(input)input.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===','){e.preventDefault();if(input.value.trim()){addIng(input.value);input.value='';}}} );
    if(askBtn)askBtn.addEventListener('click',askBarman);
  });
})();