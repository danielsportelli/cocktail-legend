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
    initF();
    render();
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

// ═══════════ RICERCA CON SUGGESTIONS ═══════════
(function(){
  var inp = null;
  var box = null;
  var activeIdx = -1;
  var lastQ = '';

  function initSearch(){
    inp = document.getElementById('srch');
    box = document.getElementById('srch-suggestions');
    if(!inp || !box) return;

    inp.addEventListener('input', function(){
      Q = this.value;
      lastQ = Q;
      activeIdx = -1;
      showSuggestions(Q);
      render();
    });

    inp.addEventListener('keydown', function(e){
      var items = box.querySelectorAll('.srch-sug-item');
      if(e.key === 'ArrowDown'){
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        highlightItem(items);
      } else if(e.key === 'ArrowUp'){
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, -1);
        highlightItem(items);
      } else if(e.key === 'Enter'){
        e.preventDefault();
        if(activeIdx >= 0 && items[activeIdx]){
          selectSuggestion(items[activeIdx].dataset.name);
        } else {
          closeSuggestions();
          inp.blur();
        }
      } else if(e.key === 'Escape'){
        closeSuggestions();
        inp.blur();
      }
    });

    inp.addEventListener('focus', function(){
      if(Q.length >= 1) showSuggestions(Q);
    });
    // tasto cerca/invio su tastiera mobile
    inp.addEventListener('search', function(){
      closeSuggestions();
      inp.blur();
      render();
    });

    document.addEventListener('click', function(e){
      if(!e.target.closest('.srch-wrap')) closeSuggestions();
    });
  }

  function showSuggestions(q){
    if(!box || !DATA) return;
    q = q.toLowerCase().trim();
    if(!q){ closeSuggestions(); return; }

    var matches = DATA.filter(function(c){
      return c.name.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 7);

    if(!matches.length){ closeSuggestions(); return; }

    box.innerHTML = matches.map(function(c){
      var name = c.name;
      var idx = name.toLowerCase().indexOf(q);
      var hi = name.substring(0, idx) +
               '<strong>' + name.substring(idx, idx + q.length) + '</strong>' +
               name.substring(idx + q.length);
      return '<div class="srch-sug-item" data-name="' + name.replace(/"/g,'&quot;') + '">' + hi + '</div>';
    }).join('');

    box.querySelectorAll('.srch-sug-item').forEach(function(item){
      item.addEventListener('mousedown', function(e){
        e.preventDefault();
        selectSuggestion(this.dataset.name);
      });
    });

    box.classList.add('open');
  }

  function highlightItem(items){
    items.forEach(function(el){ el.classList.remove('active'); });
    if(activeIdx >= 0 && items[activeIdx]) items[activeIdx].classList.add('active');
  }

  function selectSuggestion(name){
    inp.value = name;
    Q = name;
    closeSuggestions();
    render();
  }

  function closeSuggestions(){
    if(box) box.classList.remove('open');
    activeIdx = -1;
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();


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

// ═══ TOGGLE ML / OZ ═══
document.addEventListener('DOMContentLoaded', function(){
  var btnMl = document.getElementById('btn-ml');
  var btnOz = document.getElementById('btn-oz');
  if(!btnMl || !btnOz) return;
  function setUnit(oz){
    USE_OZ = oz;
    btnMl.classList.toggle('active', !oz);
    btnOz.classList.toggle('active', oz);
    // Aggiorna le quantità nella modal se aperta
    document.querySelectorAll('.ing-q').forEach(function(el){
      // il testo originale è salvato in data-ml o lo prendiamo dal dataset
      var raw = el.dataset.raw;
      if(raw) el.textContent = fmtQty(raw);
    });
  }
  btnMl.addEventListener('click', function(){ setUnit(false); });
  btnOz.addEventListener('click', function(){ setUnit(true); });
});

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
  if (!Q) return null; // nessuna ricerca attiva → comportamento normale
  // Calcola da DATA filtrato solo per Q (non per AF), così i filtri rimangono cliccabili
  var src = DATA.filter(function(c){
    var q2 = Q.toLowerCase().trim();
    return c.name.toLowerCase().indexOf(q2) !== -1;
  });
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
  return s;
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
    // filtro testuale: solo nome cocktail
    if(Q){var q2=Q.toLowerCase().trim();if(c.name.toLowerCase().indexOf(q2)===-1)return false;}
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
  // Pre-calcola i resSet per chiave una sola volta
  var _resSets = {};
  ["cat","dis","abv","sap","frz","bic"].forEach(function(k){ _resSets[k] = uniqFromRes(k); });
  document.querySelectorAll(".ci").forEach(function(div){
    var k = div.dataset.key, v = div.dataset.val;
    var cnt = countFor(k, v);
    var el = div.querySelector(".ci-n");
    if (el) el.textContent = cnt;

    // Se c'è una query attiva, nascondi le voci non presenti nei risultati correnti
    var resSet = _resSets[k];
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

// Aggiorna --fb-h dinamicamente (altezza filter-bar sticky)
function updateFbH(){
  var fb=document.getElementById('filter-bar');
  if(!fb) return;
  void fb.offsetHeight; // forza reflow
  document.documentElement.style.setProperty('--fb-h', fb.offsetHeight+'px');
}
updateFbH();
window.addEventListener('resize', updateFbH);
window.addEventListener('load', function(){ updateFbH(); setTimeout(updateFbH, 300); });
// Su desktop: ricalcola al primo scroll per catturare altezze non ancora stabilizzate
(function(){
  var done = false;
  window.addEventListener('scroll', function(){
    if(!done){ done=true; updateFbH(); }
  }, {passive:true, once:true});
})();
// Aggiorna anche quando il pannello filtri si apre/chiude
var _fpObs = new MutationObserver(updateFbH);
document.addEventListener('DOMContentLoaded', function(){
  var fp=document.getElementById('filter-panel');
  if(fp) _fpObs.observe(fp, {attributes:true, attributeFilter:['class']});
  updateFbH();
});

function initF() {
  // Tutto costruito da DATA — zero fetch aggiuntivi
  var catSet = {}, ingSet = {}, sapSet = {}, bicSet = {};
  DATA.forEach(function(c){
    catSet[c.categoria] = 1;
    c.distillato.forEach(function(d){ ingSet[d] = 1; });
    c.ingredienti.forEach(function(i){ ingSet[i[1]] = 1; });
    c.sapori.forEach(function(s){ sapSet[s] = 1; });
    bicSet[c.bicchiere] = 1;
  });
  var cats = Object.keys(catSet).sort(function(a,b){ return a.localeCompare(b,"it"); });
  var ings = Object.keys(ingSet).sort(function(a,b){ return a.localeCompare(b,"it"); });
  var saps = Object.keys(sapSet).sort(function(a,b){ return a.localeCompare(b,"it"); });
  var bics = Object.keys(bicSet).sort(function(a,b){ return a.localeCompare(b,"it"); });

  buildDropdown("dd-cat","cat", cats);
  buildDropdown("dd-dis","dis", ings);
  buildDropdown("dd-sap","sap", saps);
  buildDropdown("dd-frz","frz", ["Si","No"]);
  buildDropdown("dd-bic","bic", bics);
  buildDropdown("dd-abv","abv", ["Analcolico","Basso","Medio basso","Medio","Medio alto","Alto","Molto alto"]);
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
  // Ricalcola altezza filter-bar — polling durante tutta l'animazione (280ms)
  updateFbH();
  var _fbTimer = setInterval(updateFbH, 30);
  setTimeout(function(){ clearInterval(_fbTimer); updateFbH(); }, 350);
});


// ═══ RESET COMPLETO (filtri + ricerca) ═══
document.addEventListener('DOMContentLoaded', function(){
  var resetBtn = document.getElementById('btn-reset');
  if(resetBtn) resetBtn.addEventListener('click', function(){
    AF = {cat:[], dis:[], abv:[], sap:[], frz:[], bic:[]};
    Q = '';
    var srch = document.getElementById('srch');
    if(srch) srch.value = '';
    document.querySelectorAll('.ci.on').forEach(function(ci){
      ci.classList.remove('on');
      var cb = ci.querySelector('.cb');
      if(cb) cb.classList.remove('on');
    });
    document.querySelectorAll('.fg-btn.open').forEach(function(b){ b.classList.remove('open'); });
    document.querySelectorAll('.fg-dropdown.open').forEach(function(d){ d.classList.remove('open'); });
    // Chiudi anche il pannello filtri e ricalcola altezza
    var panel = document.getElementById('filter-panel');
    var btnF = document.getElementById('btn-filters');
    if(panel){ panel.classList.remove('open'); }
    if(btnF){ btnF.classList.remove('open'); }
    updateFbH();
    var _fbTimer2 = setInterval(updateFbH, 30);
    setTimeout(function(){ clearInterval(_fbTimer2); updateFbH(); }, 350);
    updateBadges();
    render();
    updateAllCounts();
  });
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
    res=res.filter(function(c){
      return c.name.toLowerCase().indexOf(q)!==-1;
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
  clearTimeout(window._uacTimer);
  window._uacTimer = setTimeout(updateAllCounts, 150);
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
    ingHtml+='<div class="ing-row"><span class="ing-q" data-raw="'+c.ingredienti[ii][0]+'">'+fmtQty(c.ingredienti[ii][0])+'</span><span class="ing-n">'+c.ingredienti[ii][1]+'</span></div>';
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
// ═══════════ AUTOCOMPLETE RICERCA ═══════════
(function(){
  var WORKER_URL = 'https://cocktail-legend-ai.daniel-sportelli.workers.dev';
  var USAGE_KEY = 'cl_ai_usage';
  var USAGE_MONTH = 'cl_ai_month';
  var MAX = 50;
  var currentCmd = null;
  var selectedPill = null;
  var lastRawText = '';
  var giornoTipo = null; // 'alcolico' o 'analcolico'

  // Stato multi-step signature
  var sig = { tipo: null, momento: null, gusto: null, tenore: null, bicchiere: null };

  // ─── PROMPTS per i 5 comandi semplici ───────────────────────────
  var PROMPTS = {
    twist: {
      maxTokens: 1200,
      label: 'Scrivi un drink classico e ti propongo 3 varianti',
      placeholder: 'es. Negroni, Old Fashioned, Margarita...',
      usePills: false,
      fuType: 'tre',
      build: function(v){
        return 'Voglio fare un twist creativo su: ' + v + '.\n\nProponmi esattamente 3 reinterpretazioni originali, separate da ---.\nPer ognuna usa questa struttura esatta:\n## NOME TWIST\nConcept in 1 riga.\n## RICETTA\n- dose Ingrediente (lista completa)\n**Tecnica:** su riga separata\n**Bicchiere:** su riga separata\n**Garnish:** su riga separata\n## PERSONALIZZAZIONE\nVariazione chiave rispetto al classico e consiglio di bilanciamento.\n\nNessuna sezione extra. Tre drink completi.';
      }
    },
    pairing: {
      maxTokens: 1200,
      label: 'Descrivi il piatto e ti propongo 3 drink',
      placeholder: 'es. Tartare di tonno con avocado e sesamo...',
      usePills: false,
      fuType: 'tre',
      build: function(v){
        return 'Devo abbinare cocktail a questo piatto: ' + v + '.\n\nProponmi esattamente 3 drink (uno per contrasto, uno per affinità, uno creativo/inaspettato), separati da ---.\nPer ognuno usa questa struttura esatta:\n## NOME DRINK\nPerché funziona con il piatto in 1 riga.\n## RICETTA\n- dose Ingrediente (lista completa)\n**Tecnica:** su riga separata\n**Bicchiere:** su riga separata\n**Garnish:** su riga separata\n## PERSONALIZZAZIONE\nConsiglio di bilanciamento sul piatto.\n\nNessuna sezione extra. Tre drink completi.';
      }
    },
    giorno: {
      maxTokens: 600,
      label: 'In che stile lo vuoi?',
      placeholder: '',
      usePills: true,
      fuType: 'sino',
      build: function(v){
        var now = new Date();
        var mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
        var stagioni = ['inverno','inverno','primavera','primavera','primavera','estate','estate','estate','autunno','autunno','autunno','inverno'];
        var mese = mesi[now.getMonth()];
        var stagione = stagioni[now.getMonth()];
        var ingredientiStagione = {
          'dicembre':'agrumi (arancia, mandarino), melograno, cannella, chiodi di garofano, castagne, cachi',
          'gennaio':'agrumi (limone, arancia amara), melograno, vaniglia, radici invernali',
          'febbraio':'agrumi (pompelmo, bergamotto), carciofi, finocchio',
          'marzo':'fragole precoci, asparagi, piselli, menta fresca',
          'aprile':'fragole, ciliegie precoci, asparagi, menta, fiori di sambuco',
          'maggio':'fragole, ciliegie, fiori di sambuco, menta, basilico fresco',
          'giugno':'fragole, ciliegie, albicocche, fiori di sambuco, basilico, pesche',
          'luglio':'pesche, albicocche, anguria, melone, basilico, mirtilli, lamponi',
          'agosto':'pesche, anguria, melone, fichi, pomodori, basilico, lavanda',
          'settembre':'fichi, uva, pere, mele, mirtilli, rosmarino, salvia',
          'ottobre':'mele, pere, uva, fichi, melograno, zucca, rosmarino, timo',
          'novembre':'melograno, mele cotogne, castagne, arancia, spezie calde, cachi'
        };
        var ing = ingredientiStagione[mese] || 'ingredienti di stagione';
        var tipoStr = giornoTipo==='analcolico' ? 'ANALCOLICO (zero alcol)' : 'ALCOLICO, stile '+v;
        var stileNote = giornoTipo==='analcolico' ? '' : '\nStile: '+v+'.';
        return 'Oggi è il ' + now.getDate() + ' ' + mese + ', siamo in ' + stagione + '.\n\nCrea il cocktail del giorno '+tipoStr+'.\n\nREGOLA FONDAMENTALE: devi usare obbligatoriamente almeno un ingrediente fresco di stagione di questo periodo tra questi: ' + ing + '.\nQuesto ingrediente stagionale deve essere il cuore del drink, non un semplice garnish.'+stileNote+'\n\nRispondi SOLO con questa struttura:\n## NOME DRINK\nConcept in 1 riga.\n## RICETTA\n- dose Ingrediente (lista completa)\n**Tecnica:** su riga separata\n**Bicchiere:** su riga separata\n**Garnish:** su riga separata\n## INGREDIENTE STAGIONALE\nQuale ingrediente di stagione hai usato e perché è perfetto in questo momento.\n## PERSONALIZZAZIONE\nConsiglio di bilanciamento.';
      }
    }
  };

  // ─── BUILD PROMPT SIGNATURE ──────────────────────────────────────
  function buildSignaturePrompt(ingredienti){
    var tipo = sig.tipo;
    var lines = [];
    if(tipo === 'alcolico'){
      lines.push('Crea un signature drink ALCOLICO con queste caratteristiche:');
      lines.push('- Momento: ' + sig.momento);
      lines.push('- Tenore alcolico: ' + sig.tenore);
      if(sig.bicchiere) lines.push('- Bicchiere: ' + sig.bicchiere);
    } else {
      lines.push('Crea un signature drink ANALCOLICO (zero alcol) con queste caratteristiche:');
      lines.push('- Profilo gusto: ' + sig.gusto);
    }
    lines.push('- Ingredienti disponibili: ' + ingredienti);
    lines.push('');
    lines.push('Dammi:');
    lines.push('1. Nome del drink e concept in 1 riga.');
    lines.push('2. Ricetta completa: dosi precise, tecnica, bicchiere, garnish.');
    lines.push('3. Una nota su come personalizzarlo o bilanciarlo sul momento.');
    lines.push('');
    lines.push('Punto di partenza da assaggiare e bilanciare sul momento.');
    return lines.join('\n');
  }

  // ─── USAGE ───────────────────────────────────────────────────────
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
    var fill=document.getElementById('ai-usage-fill');
    if(fill){fill.style.width=pct+'%';fill.style.background=pct>=80?'#ef4444':'var(--amber)';}
    var txt=document.getElementById('ai-usage-txt');
    if(txt)txt.textContent=u+'/'+MAX;
    if(u>=MAX)showExhausted();
  }
  function showExhausted(){
    var b=document.getElementById('ai-exhausted');
    var btn=document.getElementById('ai-btn');
    var sigBtn=document.getElementById('sig-btn');
    if(b)b.style.display='block';
    if(btn)btn.disabled=true;
    if(sigBtn)sigBtn.disabled=true;
    var now=new Date();
    var next=new Date(now.getFullYear(),now.getMonth()+1,1);
    var d=document.getElementById('ai-reset-date');
    if(d)d.textContent='Si resetterà il '+next.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
  }

  // ─── NAVIGAZIONE PRINCIPALE ───────────────────────────────────────
  function showCmds(){
    currentCmd=null; selectedPill=null; giornoTipo=null;
    sig={tipo:null,momento:null,gusto:null,tenore:null,bicchiere:null};
    // Titolo: torna a default
    var hdr=document.getElementById('ai-header-title');
    if(hdr)hdr.textContent='Chiedi al Barman';
    // Nascondi tasto back header
    var aiBackHdr=document.getElementById('ai-back-header-btn');
    if(aiBackHdr)aiBackHdr.classList.remove('visible');
    // Nascondi tasto Tips
    var tipsBtn=document.getElementById('ai-tips-btn');
    if(tipsBtn)tipsBtn.style.display='none';

    setVisible('ai-step-cmds',true);
    setVisible('ai-step-signature',false);
    setVisible('ai-step-input',false);
    setVisible('ai-response',false);
    setVisible('ai-error',false);
    setVisible('ai-exhausted',false);
    var inp=document.getElementById('ai-input');
    if(inp)inp.value='';
    var sigInp=document.getElementById('sig-input');
    if(sigInp)sigInp.value='';
    // reset pill: rimuovi classi sel e group-active
    document.querySelectorAll('.sig-pill.sel,.ai-pill.sel').forEach(function(p){
      p.classList.remove('sel');
    });
    document.querySelectorAll('.sig-pill-group-active,.ai-pill-group-active').forEach(function(el){
      el.classList.remove('sig-pill-group-active','ai-pill-group-active');
    });
    // reset step signature visibilità
    setVisible('sig-step-2a',false);
    setVisible('sig-step-2b',false);
    setVisible('sig-step-3',false);
    setVisible('sig-step-4',false);
    setVisible('sig-step-5',false);
        setVisible('sig-step-5',false);
  }

  function setVisible(id, show){
    var el=document.getElementById(id);
    if(el)el.style.display=show?'block':'none';
  }

  function selectCmd(cmd){
    if(getUsage()>=MAX){showExhausted();return;}
    currentCmd=cmd;

    // ── Titolo dinamico ──
    var TITLES={signature:'Crea un Signature',twist:'Twist on Classic',pairing:'Food Pairing',giorno:'Cocktail del Giorno'};
    var hdr=document.getElementById('ai-header-title');
    if(hdr)hdr.textContent=TITLES[cmd]||'Chiedi al Barman';
    // Mostra tasto back header
    var aiBackHdr=document.getElementById('ai-back-header-btn');
    if(aiBackHdr)aiBackHdr.classList.add('visible');
    // Mostra tasto Tips
    var tipsBtn=document.getElementById('ai-tips-btn');
    if(tipsBtn)tipsBtn.style.display='inline-flex';

    setVisible('ai-step-cmds',false);
    setVisible('ai-response',false);
    setVisible('ai-error',false);

    if(cmd==='signature'){
      // reset stato sig
      sig={tipo:null,momento:null,gusto:null,tenore:null,bicchiere:null};
      setVisible('ai-step-signature',true);
      setVisible('sig-step-1',true);
      setVisible('sig-step-2a',false);
      setVisible('sig-step-2b',false);
      setVisible('sig-step-3',false);
      setVisible('sig-step-4',false);
        setVisible('sig-step-5',false);
      // reset tutte le pill signature
      document.querySelectorAll('.sig-pill').forEach(function(p){ pillOff(p); });
      document.querySelectorAll('.sig-pill-group-active').forEach(function(el){ el.classList.remove('sig-pill-group-active'); });
    } else if(cmd==='giorno'){
      // multi-step giorno: step1 alcolico/analcolico
      giornoTipo=null; selectedPill=null;
      setVisible('ai-step-input',true);
      setVisible('giorno-step-1',true);
      setVisible('giorno-step-2',false);
      var label=document.getElementById('ai-input-label');
      if(label)label.style.display='none';
      var pills=document.getElementById('ai-pills');
      if(pills)pills.style.display='none';
      var inp=document.getElementById('ai-input');
      if(inp)inp.style.display='none';
      document.querySelectorAll('.giorno-tipo-pill,.ai-pill').forEach(function(p){ pillOff(p); });
      document.querySelectorAll('.sig-pill-group-active').forEach(function(el){ el.classList.remove('sig-pill-group-active'); });
      updateBtn();
    } else {
      var cfg=PROMPTS[cmd];
      setVisible('ai-step-input',true);
      setVisible('giorno-step-1',false);
      setVisible('giorno-step-2',false);
      var label=document.getElementById('ai-input-label');
      if(label){label.textContent=cfg.label;label.style.display='block';}
      var pills=document.getElementById('ai-pills');
      var inp=document.getElementById('ai-input');
      selectedPill=null;
      if(cfg.usePills){
        if(pills)pills.style.display='flex';
        if(inp)inp.style.display='none';
        document.querySelectorAll('.ai-pill').forEach(function(p){ pillOff(p); });
      } else {
        if(pills)pills.style.display='none';
        if(inp){inp.style.display='block';inp.placeholder=cfg.placeholder;inp.value='';setTimeout(function(){inp.focus();},100);}
      }
      updateBtn();
    }
  }

  // ─── SIGNATURE MULTI-STEP ─────────────────────────────────────────
  function pillOn(el){
    el.classList.add('sel');
    el.style.background='';
    el.style.borderColor='';
    el.style.color='';
    // dimma le altre pill dello stesso gruppo
    var parent=el.parentElement;
    if(parent){
      if(parent.querySelectorAll('.sig-pill').length) parent.classList.add('sig-pill-group-active');
      if(parent.querySelectorAll('.ai-pill').length) parent.classList.add('ai-pill-group-active');
    }
  }
  function pillOff(el){
    el.classList.remove('sel');
    el.style.background='';
    el.style.borderColor='';
    el.style.color='';
  }

  function onSigPill(btn){
    var step=btn.dataset.step;
    var val=btn.dataset.val;
    // deseleziona le altre pill dello stesso step
    document.querySelectorAll('.sig-pill[data-step="'+step+'"]').forEach(function(p){ pillOff(p); });
    pillOn(btn);

    if(step==='1'){
      sig.tipo=val;
      if(val==='alcolico'){
        setVisible('sig-step-2a',true);
        setVisible('sig-step-2b',false);
        setVisible('sig-step-3',false);
        setVisible('sig-step-4',false);
        setVisible('sig-step-5',false);
        sig.momento=null; sig.tenore=null;
        document.querySelectorAll('.sig-pill[data-step="2a"]').forEach(function(p){ pillOff(p); });
      } else {
        setVisible('sig-step-2b',true);
        setVisible('sig-step-2a',false);
        setVisible('sig-step-3',false);
        setVisible('sig-step-4',false);
        setVisible('sig-step-5',false);
        sig.gusto=null;
        document.querySelectorAll('.sig-pill[data-step="2b"]').forEach(function(p){ pillOff(p); });
      }
    } else if(step==='2a'){
      sig.momento=val;
      setVisible('sig-step-3',true);
      setVisible('sig-step-4',false);
        setVisible('sig-step-5',false);
      sig.tenore=null;
      document.querySelectorAll('.sig-pill[data-step="3"]').forEach(function(p){ pillOff(p); });
    } else if(step==='2b'){
      sig.gusto=val;
      // analcolico: vai diretto a ingredienti
      setVisible('sig-step-4',true);
      var si=document.getElementById('sig-input');
      if(si){si.value='';setTimeout(function(){si.focus();},100);}
      updateSigBtn();
    } else if(step==='3'){
      sig.tenore=val;
      setVisible('sig-step-4',true);
      setVisible('sig-step-5',false);
      sig.bicchiere=null;
      document.querySelectorAll('.sig-pill[data-step="4"]').forEach(function(p){ pillOff(p); });
    } else if(step==='4'){
      sig.bicchiere=val;
      setVisible('sig-step-5',true);
      var si=document.getElementById('sig-input');
      if(si){si.value='';setTimeout(function(){si.focus();},100);}
      updateSigBtn();
    }
  }

  function updateSigBtn(){
    var btn=document.getElementById('sig-btn');
    var inp=document.getElementById('sig-input');
    if(!btn)return;
    var hasText=inp&&inp.value.trim().length>0;
    var active=hasText&&getUsage()<MAX;
    btn.disabled=!active;
    btn.style.background=active?'var(--amber)':'var(--surf)';
    btn.style.color=active?'#0a0f1e':'var(--dim)';
    btn.style.border=active?'none':'1px solid var(--brd)';
    btn.style.cursor=active?'pointer':'not-allowed';
    btn.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
    btn.style.opacity=active?'1':'.5';
  }

  // ─── BOTTONE INVIO (altri comandi) ────────────────────────────────
  function updateBtn(){
    var btn=document.getElementById('ai-btn');
    var inp=document.getElementById('ai-input');
    if(!btn||!currentCmd)return;
    var cfg=PROMPTS[currentCmd];
    if(!cfg)return;
    var hasVal;
    if(currentCmd==='giorno'){
      // abilitato se: analcolico selezionato, oppure alcolico + stile selezionato
      hasVal=(giornoTipo==='analcolico')||(giornoTipo==='alcolico'&&selectedPill!==null);
    } else {
      hasVal=cfg.usePills ? selectedPill!==null : (inp&&inp.value.trim().length>0);
    }
    var active=hasVal&&getUsage()<MAX;
    btn.disabled=!active;
    btn.textContent=currentCmd==='giorno'?'✦ Crea il drink del giorno':'✦ Chiedi al Barman';
    btn.style.background=active?'var(--amber)':'var(--surf)';
    btn.style.color=active?'#0a0f1e':'var(--dim)';
    btn.style.border=active?'none':'1px solid var(--brd)';
    btn.style.cursor=active?'pointer':'not-allowed';
    btn.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
    btn.style.opacity=active?'1':'.5';
  }

  // ─── MARKDOWN → HTML ──────────────────────────────────────────────
  function mdToHtml(md){
    var SEZIONI = ['RICETTA','PREPARAZIONI','PERSONALIZZAZIONE','MODIFICHE APPORTATE'];
    var lines = md.split('\n');
    var out = lines.map(function(line){
      if(/^## .+/.test(line)){
        var title = line.replace(/^## /, '');
        var isSezione = SEZIONI.indexOf(title.trim().toUpperCase()) !== -1;
        if(isSezione){
          return '<div style="font-size:.6rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--blue-l);margin:18px 0 6px;padding-bottom:5px;border-bottom:1px solid rgba(96,165,250,.2);">'+title+'</div>';
        } else {
          // Nome drink
          return '<div style="font-size:1.1rem;font-weight:800;color:var(--txt);margin:14px 0 6px;letter-spacing:-.01em;">'+title+'</div>';
        }
      }
      if(/^### .+/.test(line)) return '<div style="font-size:.82rem;font-weight:700;color:var(--txt);margin:12px 0 3px;">'+line.replace(/^### /,'')+'</div>';
      if(/^- .+/.test(line)) return '<div style="padding:3px 0 3px 10px;border-left:2px solid rgba(96,165,250,.25);color:var(--txt2);font-size:.78rem;">'+line.replace(/^- /,'')+'</div>';
      if(/^---$/.test(line)) return '<hr style="border:none;border-top:1px solid var(--brd);margin:12px 0;">';
      return line;
    }).join('\n');
    return out
      .replace(/\*\*(.+?)\*\*/g,'<strong style="color:var(--amber);font-weight:700;">$1</strong>')
      .replace(/\*(.+?)\*/g,'<em style="color:var(--txt2);">$1</em>')
      .replace(/\n\n/g,'<br><br>')
      .replace(/\n/g,'<br>');
  }

  // ─── FETCH ────────────────────────────────────────────────────────
  function showFollowUp(){
    // Determina tipo follow-up
    var fuType = 'sino'; // default: signature e giorno
    if(currentCmd==='twist'||currentCmd==='pairing') fuType='tre';

    var fuBlock=document.getElementById('fu-block');
    if(fuBlock)fuBlock.style.display='block';

    // Nascondi tutti i tipi
    ['fu-type-sino','fu-type-tre','fu-chat-cont','fu-scelta-drink'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.style.display='none';
    });

    // Mostra il tipo corretto
    var typeEl=document.getElementById('fu-type-'+fuType);
    if(typeEl)typeEl.style.display='block';
    // Assicura che i bottoni interni del blocco tre siano visibili
    if(fuType==='tre'){
      var treOpts=document.getElementById('fu-tre-opts');
      if(treOpts)treOpts.style.display='block';
    }

    var cn=document.getElementById('ai-new');
    if(cn)cn.style.display='inline-flex';
  }

  async function doFetch(prompt, maxTokensOverride){
    var resp=document.getElementById('ai-response');
    var body=document.getElementById('ai-body');
    var err=document.getElementById('ai-error');
    setVisible('ai-step-input',false);
    setVisible('ai-step-signature',false);
    if(err)err.style.display='none';
    // Nascondi tutto il follow-up e torna-ai-comandi durante il fetch
    ['fu-block','ai-new'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.style.display='none';
    });
    if(resp)resp.style.display='block';
    if(body)body.innerHTML='<span style="color:var(--dim);">Il barman sta pensando…</span>';
    try{
      var res=await fetch(WORKER_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:maxTokensOverride||(currentCmd&&PROMPTS[currentCmd]&&PROMPTS[currentCmd].maxTokens?PROMPTS[currentCmd].maxTokens:1000),
          system:'Sei un barman creativo di fama internazionale. Parli sempre in italiano. Tono diretto e professionale, da collega a collega. Non citare mai database o fonti esterne. Rispondi SEMPRE con questa struttura esatta: ## NOME DRINK (una riga di concept). ## RICETTA (lista ingredienti con - dose Ingrediente). **Tecnica:** su riga separata. **Bicchiere:** su riga separata. **Garnish:** su riga separata. ## PREPARAZIONI (solo se servono sciroppi artigianali, infusi o wash - ogni voce: **Nome prep:** istruzioni 1 riga - altrimenti ometti la sezione). ## PERSONALIZZAZIONE (consiglio bilanciamento, sempre presente). Usa ## per titoli, **grassetto** per label come Tecnica/Bicchiere/Garnish e nomi preparazioni, - per ingredienti. Nessuna sezione extra fuori da questa struttura.',
          messages:[{role:'user',content:prompt}]
        })
      });
      var data=await res.json();
      var text=data&&data.content&&data.content[0]?data.content[0].text:'';
      if(!text)throw new Error((data&&data.error&&data.error.message)||'Risposta vuota');
      lastRawText=text;
      if(body)body.innerHTML=mdToHtml(text);
      incUsage(); renderUsage();
      // mostra follow-up
      showFollowUp();
    }catch(e){
      if(resp)resp.style.display='none';
      if(err){err.style.display='block';err.textContent='⚠️ '+(e.message||'Errore. Riprova.');}
      // ripristina il pannello precedente
      if(currentCmd==='signature'){
        setVisible('ai-step-signature',true);
        var sigBtn=document.getElementById('sig-btn');
        if(sigBtn){sigBtn.disabled=false;sigBtn.textContent='✦ Chiedi al Barman';}
      } else {
        setVisible('ai-step-input',true);
        var btn=document.getElementById('ai-btn');
        if(btn){btn.disabled=false;btn.textContent='✦ Chiedi al Barman';}
      }
    }
  }

  async function askSignature(){
    if(getUsage()>=MAX){showExhausted();return;}
    var inp=document.getElementById('sig-input');
    var val=inp?inp.value.trim():'';
    if(!val)return;
    var sigBtn=document.getElementById('sig-btn');
    if(sigBtn){sigBtn.disabled=true;sigBtn.textContent='...';}
    await doFetch(buildSignaturePrompt(val), 500);
    if(sigBtn)sigBtn.textContent='✦ Chiedi al Barman';
  }

  async function askBarman(){
    if(getUsage()>=MAX){showExhausted();return;}
    var inp=document.getElementById('ai-input');
    var cfg=PROMPTS[currentCmd];
    if(!cfg)return;
    var val;
    if(currentCmd==='giorno'){
      val=giornoTipo==='analcolico'?'analcolico':selectedPill;
    } else {
      val=cfg.usePills ? selectedPill : (inp?inp.value.trim():'');
    }
    if(!val||!currentCmd)return;
    var btn=document.getElementById('ai-btn');
    if(btn){btn.disabled=true;btn.textContent='...';}
      await doFetch(cfg.build(val), cfg.maxTokens||1000);
    if(btn)btn.textContent='✦ Crea il drink del giorno';
  }

  // ─── INIT ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded',function(){
    renderUsage();

    // Back btn header AI → torna alla schermata principale
    var aiBackHdr=document.getElementById('ai-back-header-btn');
    if(aiBackHdr)aiBackHdr.addEventListener('click',showCmds);

    // Bottoni comando principali
    document.querySelectorAll('.ai-cmd-btn').forEach(function(b){
      b.addEventListener('click',function(){ selectCmd(this.dataset.cmd); });
      b.addEventListener('mouseenter',function(){ this.style.borderColor='rgba(37,99,235,.4)'; this.style.background='rgba(37,99,235,.06)'; });
      b.addEventListener('mouseleave',function(){ this.style.borderColor='var(--brd)'; this.style.background='var(--bg)'; });
    });

    // Pill signature (multi-step)
    document.querySelectorAll('.sig-pill').forEach(function(p){
      p.addEventListener('click',function(){ onSigPill(this); });
    });

    // Pill tipo giorno (alcolico/analcolico) — step 1
    document.querySelectorAll('.giorno-tipo-pill').forEach(function(p){
      p.addEventListener('click',function(){
        giornoTipo=this.dataset.val;
        // dimma le altre
        document.querySelectorAll('.giorno-tipo-pill').forEach(function(x){ pillOff(x); });
        pillOn(this);
        if(giornoTipo==='alcolico'){
          // mostra step 2 con le pill stile
          setVisible('giorno-step-2',true);
          var label=document.getElementById('ai-input-label');
          if(label)label.textContent='In che stile lo vuoi?';
          var pills=document.getElementById('ai-pills');
          if(pills){pills.style.display='flex';pills.style.marginBottom='0';}
          var inp=document.getElementById('ai-input');
          if(inp)inp.style.display='none';
          document.querySelectorAll('.ai-pill').forEach(function(x){ pillOff(x); });
          selectedPill=null;
        } else {
          // analcolico: niente stile, abilita direttamente il bottone
          setVisible('giorno-step-2',false);
          var inp=document.getElementById('ai-input');
          if(inp)inp.style.display='none';
          selectedPill=null;
        }
        updateBtn();
      });
    });

    // Pill giorno stile (pre/after/all day)
    document.querySelectorAll('.ai-pill').forEach(function(p){
      p.addEventListener('click',function(){
        selectedPill=this.dataset.val;
        document.querySelectorAll('.ai-pill').forEach(function(x){ pillOff(x); });
        pillOn(this);
        updateBtn();
      });
    });

    // Textarea altri comandi
    var inp=document.getElementById('ai-input');
    if(inp)inp.addEventListener('input',updateBtn);

    // Textarea signature
    var sigInp=document.getElementById('sig-input');
    if(sigInp)sigInp.addEventListener('input',updateSigBtn);

    // Bottoni invio
    var btn=document.getElementById('ai-btn');
    if(btn)btn.addEventListener('click',askBarman);
    var sigBtn=document.getElementById('sig-btn');
    if(sigBtn)sigBtn.addEventListener('click',askSignature);

    // Bottoni back (tutti quelli con .ai-back-btn)
    document.querySelectorAll('.ai-back-btn').forEach(function(b){
      b.addEventListener('click',function(){
        var target=this.dataset.target;
        if(target==='cmds') showCmds();
      });
    });

    // Torna ai comandi
    var newBtn=document.getElementById('ai-new');
    if(newBtn)newBtn.addEventListener('click',showCmds);

    // ── FOLLOW-UP ──────────────────────────────────────────────
    // Variabile che tiene l'ultimo prompt inviato (per contesto)
    // e l'ultima risposta (per modifiche)
    
    function makeSendBtn(btnId, inpId, buildFn){
      var btn=document.getElementById(btnId);
      var inp=document.getElementById(inpId);
      if(inp) inp.addEventListener('input', function(){
        if(!btn)return;
        var active=this.value.trim().length>0&&getUsage()<MAX;
        btn.disabled=!active;
        btn.style.background=active?'var(--amber)':'var(--surf)';
        btn.style.color=active?'#0a0f1e':'var(--dim)';
        btn.style.border=active?'none':'1px solid var(--brd)';
        btn.style.cursor=active?'pointer':'not-allowed';
        btn.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
      });
      if(btn) btn.addEventListener('click', function(){
        var val=inp?inp.value.trim():'';
        if(!val)return;
        this.disabled=true;this.textContent='...';
        var prompt=buildFn(val);
        doFetch(prompt, 600).then(function(){ resetFollowUp(); });
      });
    }

    // Sì
    var fuYes=document.getElementById('fu-yes');
    if(fuYes)fuYes.addEventListener('click',function(){
      setVisible('fu-q1',false);
      setVisible('fu-yes-opts',true);
    });

    // No
    var fuNo=document.getElementById('fu-no');
    if(fuNo)fuNo.addEventListener('click',function(){
      setVisible('fu-q1',false);
      setVisible('fu-no-opts',true);
    });

    // ── FOLLOW-UP LISTENERS ──────────────────────────────────────

    // Salva (placeholder fino a Firebase)
    function setupSaveBtn(id){
      var b=document.getElementById(id);
      if(b)b.addEventListener('click',function(){
        this.textContent='✓ Salvato!';
        this.style.background='rgba(34,197,94,.15)';
        this.style.borderColor='rgba(34,197,94,.4)';
        this.style.color='#4ade80';
        var self=this;
        setTimeout(function(){
          self.textContent='Salva';
          self.style.background='rgba(245,158,11,.12)';
          self.style.borderColor='rgba(245,158,11,.3)';
          self.style.color='var(--amber)';
        },2000);
      });
    }
    setupSaveBtn('fu-save');
    setupSaveBtn('fu-save-tre');

    // Lavoriamo su questa (sino)
    var fuLavora=document.getElementById('fu-lavora');
    if(fuLavora)fuLavora.addEventListener('click',function(){
      setVisible('fu-type-sino',false);
      var chat=document.getElementById('fu-chat-cont');
      if(chat)chat.style.display='block';
      var cs=document.getElementById('fu-cont-send');
      if(cs)cs.textContent='✦ Modifica';
      setTimeout(function(){var i=document.getElementById('fu-cont-inp');if(i)i.focus();},80);
    });

    // Nuova proposta (sino)
    var fuNuova=document.getElementById('fu-nuova');
    if(fuNuova)fuNuova.addEventListener('click',function(){
      var prompt;
      if(currentCmd==='signature'){
        var sigInp=document.getElementById('sig-input');
        prompt=buildSignaturePrompt(sigInp?sigInp.value.trim():'stessi ingredienti')+' Proponi un drink completamente diverso.';
        doFetch(prompt,500).then(function(){resetFollowUp();showFollowUp();});
      } else if(currentCmd==='giorno'){
        prompt=PROMPTS.giorno.build(selectedPill||'all day')+' Proponi un drink completamente diverso.';
        doFetch(prompt,500).then(function(){resetFollowUp();showFollowUp();});
      }
    });

    // Modifica una proposta (tre) — apre i 3 bottoni Prima/Seconda/Terza
    var fuModTre=document.getElementById('fu-modifica-tre');
    if(fuModTre)fuModTre.addEventListener('click',function(){
      setVisible('fu-tre-opts',false);
      var scelta=document.getElementById('fu-scelta-drink');
      if(scelta)scelta.style.display='block';
    });

    // Bottoni Prima / Seconda / Terza
    document.querySelectorAll('.fu-scelta-num').forEach(function(btn){
      btn.addEventListener('click',function(){
        var num=this.dataset.num;
        var labels=['prima','seconda','terza'];
        var label=labels[parseInt(num)-1]||num;
        setVisible('fu-scelta-drink',false);
        var chat=document.getElementById('fu-chat-cont');
        if(chat)chat.style.display='block';
        var ci=document.getElementById('fu-cont-inp');
        if(ci){ci.value='';ci.placeholder='Cosa vuoi cambiare della '+label+' proposta?';ci.focus();}
        var cs=document.getElementById('fu-cont-send');
        if(cs){cs.textContent='✦ Modifica';cs.disabled=true;
          cs.style.background='var(--surf)';cs.style.color='var(--dim)';
          cs.style.border='1px solid var(--brd)';cs.style.cursor='not-allowed';
          cs.style.opacity='.5';cs.style.boxShadow='none';}
        // Salva quale proposta è selezionata per il contesto
        var body=document.getElementById('ai-body');
        if(body)body.dataset.selectedDrinkNum=num;
      });
    });

    // Altre 3 varianti
    var fuAltreTre=document.getElementById('fu-altre-tre');
    if(fuAltreTre)fuAltreTre.addEventListener('click',function(){
      var inp=document.getElementById('ai-input');
      var val=inp?inp.value.trim():'';
      var body=document.getElementById('ai-body');
      var prev=body?body.innerText.substring(0,200):'';
      var prompt=(currentCmd==='twist'?PROMPTS.twist.build(val):PROMPTS.pairing.build(val))+
        ' Proponi 3 varianti completamente diverse dalle precedenti.';
      doFetch(prompt,700).then(function(){resetFollowUp();showFollowUp();});
    });

    // Chat continua
    var fuContInp=document.getElementById('fu-cont-inp');
    var fuContSend=document.getElementById('fu-cont-send');
    if(fuContInp)fuContInp.addEventListener('input',function(){
      if(!fuContSend)return;
      var active=this.value.trim().length>0&&getUsage()<MAX;
      fuContSend.disabled=!active;
      fuContSend.style.background=active?'var(--amber)':'var(--surf)';
      fuContSend.style.color=active?'#0a0f1e':'var(--dim)';
      fuContSend.style.border=active?'none':'1px solid var(--brd)';
      fuContSend.style.cursor=active?'pointer':'not-allowed';
      fuContSend.style.opacity=active?'1':'.5';
      fuContSend.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
    });
    if(fuContSend)fuContSend.addEventListener('click',function(){
      var val=fuContInp?fuContInp.value.trim():'';
      if(!val)return;
      var body=document.getElementById('ai-body');
      var prev='';
      var numLabel=['prima','seconda','terza'];
      var drinkNum=body&&body.dataset.selectedDrinkNum?parseInt(body.dataset.selectedDrinkNum):0;
      if((currentCmd==='twist'||currentCmd==='pairing')&&drinkNum&&lastRawText){
        // Split sul markdown grezzo usando --- come separatore tra i 3 drink
        var parts=lastRawText.split(/\n---\n/);
        if(parts.length>=drinkNum){
          prev=parts[drinkNum-1].trim().substring(0,800);
        } else {
          // fallback: split per ## che precede ogni nome drink
          var allDrinks=lastRawText.split(/(?=\n## )/).filter(function(s){return s.trim().length>30;});
          prev=(allDrinks[drinkNum-1]||lastRawText).trim().substring(0,800);
        }
      } else {
        prev=lastRawText.substring(0,600)||'';
      }
      var context=drinkNum?'Stai modificando la '+numLabel[drinkNum-1]+' proposta.\n\n':'';
      // Per signature: aggiungi i vincoli originali così l'AI li rispetta
      var sigContext='';
      if(currentCmd==='signature'){
        var sigLines=[];
        if(sig.tipo==='alcolico'){
          if(sig.momento)sigLines.push('- Momento: '+sig.momento);
          if(sig.tenore)sigLines.push('- Tenore alcolico: '+sig.tenore);
          if(sig.bicchiere)sigLines.push('- Bicchiere: '+sig.bicchiere);
        } else if(sig.tipo==='analcolico'){
          sigLines.push('- Tipo: ANALCOLICO');
          if(sig.gusto)sigLines.push('- Profilo gusto: '+sig.gusto);
        }
        if(sigLines.length)sigContext='VINCOLI ORIGINALI DA RISPETTARE (non cambiare questi parametri):\n'+sigLines.join('\n')+'\n\n';
      }
      if(currentCmd==='giorno'&&(giornoTipo||selectedPill)){
        var gLines=[];
        if(giornoTipo)gLines.push('- Tipo: '+(giornoTipo==='analcolico'?'ANALCOLICO (zero alcol)':'ALCOLICO'));
        if(giornoTipo==='alcolico'&&selectedPill)gLines.push('- Stile: '+selectedPill);
        sigContext='VINCOLI ORIGINALI DA RISPETTARE (non cambiare questi parametri):\n'+gLines.join('\n')+'\n\n';
      }
      var isModifyMode=(currentCmd==='twist'||currentCmd==='pairing')&&drinkNum>0;
      var prompt=context+sigContext+'Sulla base di questa proposta:\n"""\n'+prev+'\n"""\n\nRichiesta di modifica: '+val+'\n\nRispondi con la stessa struttura esatta (## NOME DRINK, ## RICETTA, ## PERSONALIZZAZIONE) e aggiungi in fondo ## MODIFICHE APPORTATE con elenco sintetico dei cambiamenti.';
      fuContSend.disabled=true;fuContSend.textContent='...';
      var maxTok=(currentCmd==='signature'||currentCmd==='giorno')?600:900;
      doFetch(prompt,maxTok).then(function(){
        if(isModifyMode){
          showModifyFollowUp();
        } else {
          resetFollowUp();
          showFollowUp();
        }
      });
    });

        // Bottoni back (tutti quelli con .ai-back-btn)
    document.querySelectorAll('.ai-back-btn').forEach(function(b){
      b.addEventListener('click',function(){
        var target=this.dataset.target;
        if(target==='cmds') showCmds();
      });
    });

    // Torna ai comandi
    var newBtn=document.getElementById('ai-new');
    if(newBtn)newBtn.addEventListener('click',showCmds);

    // ── FOLLOW-UP ──────────────────────────────────────────────
    // Variabile che tiene l'ultimo prompt inviato (per contesto)
    // e l'ultima risposta (per modifiche)
    
    function resetFollowUp(){
      var fuBlock=document.getElementById('fu-block');
      if(fuBlock)fuBlock.style.display='none';
      ['fu-type-sino','fu-type-tre','fu-chat-cont','fu-scelta-drink'].forEach(function(id){
        var el=document.getElementById(id);if(el)el.style.display='none';
      });
      var treOpts=document.getElementById('fu-tre-opts');
      if(treOpts)treOpts.style.display='block';
      var ci=document.getElementById('fu-cont-inp');if(ci){ci.value='';ci.placeholder='Dimmi cosa vuoi che faccia...';}
      var cs=document.getElementById('fu-cont-send');
      if(cs){cs.disabled=true;cs.textContent='✦ Modifica';
        cs.style.background='var(--surf)';cs.style.color='var(--dim)';
        cs.style.border='1px solid var(--brd)';cs.style.boxShadow='none';cs.style.opacity='.5';}
    }

    // Dopo una modifica su drink specifico: non resettare, lascia barra chat attiva
    function showModifyFollowUp(){
      var fuBlock=document.getElementById('fu-block');
      if(fuBlock)fuBlock.style.display='block';
      // Nascondi tutto tranne la barra chat
      ['fu-type-sino','fu-type-tre','fu-scelta-drink'].forEach(function(id){
        var el=document.getElementById(id);if(el)el.style.display='none';
      });
      var chat=document.getElementById('fu-chat-cont');
      if(chat)chat.style.display='block';
      var ci=document.getElementById('fu-cont-inp');
      if(ci){ci.value='';ci.placeholder='Chiedi altre modifiche a questo drink...';}
      var cs=document.getElementById('fu-cont-send');
      if(cs){cs.disabled=true;cs.textContent='✦ Modifica';
        cs.style.background='var(--surf)';cs.style.color='var(--dim)';
        cs.style.border='1px solid var(--brd)';cs.style.boxShadow='none';cs.style.opacity='.5';}
      var cn=document.getElementById('ai-new');
      if(cn)cn.style.display='inline-flex';
    }

    function makeSendBtn(btnId, inpId, buildFn){
      var btn=document.getElementById(btnId);
      var inp=document.getElementById(inpId);
      if(inp) inp.addEventListener('input', function(){
        if(!btn)return;
        var active=this.value.trim().length>0&&getUsage()<MAX;
        btn.disabled=!active;
        btn.style.background=active?'var(--amber)':'var(--surf)';
        btn.style.color=active?'#0a0f1e':'var(--dim)';
        btn.style.border=active?'none':'1px solid var(--brd)';
        btn.style.cursor=active?'pointer':'not-allowed';
        btn.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
      });
      if(btn) btn.addEventListener('click', function(){
        var val=inp?inp.value.trim():'';
        if(!val)return;
        this.disabled=true;this.textContent='...';
        var prompt=buildFn(val);
        doFetch(prompt, 600).then(function(){ resetFollowUp(); });
      });
    }

    // Sì
    var fuYes=document.getElementById('fu-yes');
    if(fuYes)fuYes.addEventListener('click',function(){
      setVisible('fu-q1',false);
      setVisible('fu-yes-opts',true);
    });

    // No
    var fuNo=document.getElementById('fu-no');
    if(fuNo)fuNo.addEventListener('click',function(){
      setVisible('fu-q1',false);
      setVisible('fu-no-opts',true);
    });

    // SI: niente bottone extra, c'è già "Torna ai comandi" fisso in basso

    // NO: barra chat unica — modifica o nuova proposta
    var fuNoInp=document.getElementById('fu-no-inp');
    var fuNoSend=document.getElementById('fu-no-send');
    if(fuNoInp){
      fuNoInp.addEventListener('input',function(){
        if(!fuNoSend)return;
        var active=this.value.trim().length>0&&getUsage()<MAX;
        fuNoSend.disabled=!active;
        fuNoSend.style.background=active?'var(--amber)':'var(--surf)';
        fuNoSend.style.color=active?'#0a0f1e':'var(--dim)';
        fuNoSend.style.border=active?'none':'1px solid var(--brd)';
        fuNoSend.style.cursor=active?'pointer':'not-allowed';
        fuNoSend.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
        fuNoSend.style.opacity=active?'1':'.5';
      });
    }
    if(fuNoSend){
      fuNoSend.addEventListener('click',function(){
        var val=fuNoInp?fuNoInp.value.trim():'';
        if(!val)return;
        var prev=lastRawText.substring(0,600)||'';
        var prompt='Sulla base di questa proposta precedente:\n"""\n'+prev+'\n"""\n\nRichiesta: '+val+'\n\nRispondi con la stessa struttura esatta (## NOME DRINK, ## RICETTA, ecc.).';
        fuNoSend.disabled=true;fuNoSend.textContent='...';
        doFetch(prompt, 600).then(function(){
          resetFollowUp();
          showFollowUp();
        });
      });
    }

    // ── TIPS POPUP ──────────────────────────────────────────────────
    var TIPS_CONTENT = {
      signature: '<strong style="color:var(--txt);display:block;margin-bottom:.5rem;">Come creare una Drink List Signature</strong>'
        + 'Un signature non nasce a caso — nasce da un\'idea. Parti da un tema che racconta qualcosa: il territorio (botaniche locali, agrumi di stagione, erbe spontanee), la stagionalità (cosa offre la natura in questo momento), oppure un concept narrativo come un film, un\'epoca, un viaggio tra nazioni.<br><br>'
        + '<strong style="color:var(--amber);">Punta su questi filoni:</strong><br>'
        + '• <strong style="color:var(--txt);">Territorio</strong> — ingredienti tipici della tua zona, produttori locali, distillati regionali<br>'
        + '• <strong style="color:var(--txt);">Stagionalità</strong> — frutta fresca, erbe aromatiche, spezie di stagione<br>'
        + '• <strong style="color:var(--txt);">Tema narrativo</strong> — un film, un\'era storica, una nazione, un profumo<br><br>'
        + 'Più dai contesto al nostro Barman Intelligente, più il risultato sarà centrato. Scrivi nell\'input gli ingredienti che vuoi usare e aggiungi note libere: <em style="color:var(--dim);">es. "gin, cardamomo, yuzu — voglio qualcosa di elegante e floreale per un menu estivo".</em>',

      twist: '<strong style="color:var(--txt);display:block;margin-bottom:.5rem;">La logica del Twist on Classic</strong>'
        + 'Un twist si differenzia da un signature perché mantiene la struttura e l\'identità del classico di partenza. Non si stravolge: si reinterpreta.<br><br>'
        + 'La regola d\'oro è lavorare su <strong style="color:var(--amber);">massimo 1 o 2 ingredienti</strong>: cambia una parte alcolica, sostituisci l\'amaro, usa un bitter diverso, swappa lo sciroppo con un infuso artigianale. Se tocchi tutto, non è più un twist — diventa un drink nuovo.<br><br>'
        + '<strong style="color:var(--amber);">Esempi di approccio:</strong><br>'
        + '• Negroni → sostituisci il Campari con un bitter ai fiori di sambuco<br>'
        + '• Margarita → swappa il Cointreau con un liquore al passion fruit<br>'
        + '• Old Fashioned → usa uno sciroppo al miele invece dello zucchero<br><br>'
        + 'Scrivi il nome del classico e il nostro Barman Intelligente propone 3 varianti con logiche diverse.',

      pairing: '<strong style="color:var(--txt);display:block;margin-bottom:.5rem;">Come funziona il Food Pairing</strong>'
        + 'L\'abbinamento drink-cibo segue tre logiche principali:<br><br>'
        + '• <strong style="color:var(--amber);">Abbinamento per similitudine</strong> — stessi profili aromatici. Un cocktail agrumato con un piatto di pesce fresco. Un drink speziato con una cucina orientale.<br><br>'
        + '• <strong style="color:var(--amber);">Abbinamento per contrasto</strong> — opposti che si compensano. Un cocktail amaro e secco con una tartare di carne grassa. Un drink dolce e fruttato con un piatto sapido.<br><br>'
        + '• <strong style="color:var(--amber);">Abbinamento inaspettato</strong> — combo distanti ma vincenti. Funziona quando entrambi hanno un elemento umami o aromatico in comune non ovvio.<br><br>'
        + 'Descrivi il piatto con qualche dettaglio (cottura, ingredienti principali, sapore dominante) e ricevi 3 proposte con logiche di abbinamento diverse.',

      giorno: '<strong style="color:var(--txt);display:block;margin-bottom:.5rem;">Come sfruttare il Cocktail del Giorno</strong>'
        + 'Questa funzione è pensata per chi lavora dietro al bancone ogni giorno. Avere sempre un cocktail del giorno da proporre ai clienti abituali è uno strumento di fidelizzazione potente — evita che si trovino sempre la stessa drink list e crea attesa e curiosità.<br><br>'
        + 'La logica è la <strong style="color:var(--amber);">stagionalità</strong>: il nostro Barman Intelligente parte da ciò che offre la natura oggi — frutta, verdure, erbe, spezie di stagione — e costruisce un drink che racconta questo momento preciso dell\'anno.<br><br>'
        + 'Non è un signature generico: è una proposta ancorata al calendario, pensata per oggi. Perfetta da scrivere sulla lavagna del locale, da raccontare al cliente che chiede "cosa mi consigli?" o da inserire nel menu come speciale della settimana.'
    };

    var tipsBtn2=document.getElementById('ai-tips-btn');
    var tipsOverlay=document.getElementById('tips-overlay');
    var tipsClose=document.getElementById('tips-close');
    var tipsContent=document.getElementById('tips-content');

    if(tipsBtn2){
      tipsBtn2.addEventListener('click',function(){
        if(!currentCmd||!TIPS_CONTENT[currentCmd])return;
        if(tipsContent)tipsContent.innerHTML=TIPS_CONTENT[currentCmd];
        if(tipsOverlay){tipsOverlay.style.display='flex';}
      });
    }
    function closeTips(){
      if(tipsOverlay)tipsOverlay.style.display='none';
    }
    if(tipsClose)tipsClose.addEventListener('click',closeTips);
    if(tipsOverlay){
      tipsOverlay.addEventListener('click',function(e){
        if(e.target===tipsOverlay)closeTips();
      });
    }

  });
})();
// ═══ RISORSE E CALCOLATORI DRAWER ═══
(function(){

  // Hover card stile Barman AI
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.ris-cmd-btn,.calc-cmd-btn').forEach(function(b){
      b.addEventListener('mouseenter',function(){ this.style.borderColor='rgba(37,99,235,.4)'; this.style.background='rgba(37,99,235,.06)'; });
      b.addEventListener('mouseleave',function(){ this.style.borderColor='var(--brd)'; this.style.background='var(--bg)'; });
    });

    // Titoli dinamici
    var RIS_TITLES={tmp:'Temperature',bic:'Glossario',glass:'Bicchieri'};
    var CALC_TITLES={abv:'Calcola ABV',cost:'Drink Cost'};

    function showRisCmds(){
      var t=document.getElementById('ris-header-title');
      if(t)t.textContent='Risorse';
      var b=document.getElementById('ris-back-header-btn');
      if(b)b.classList.remove('visible');
      document.getElementById('ris-step-cmds').style.display='block';
      document.getElementById('ris-step-tmp').style.display='none';
      document.getElementById('ris-step-bic').style.display='none';
      document.getElementById('ris-step-glass').style.display='none';
    }
    function showCalcCmds(){
      var t=document.getElementById('calc-header-title');
      if(t)t.textContent='Calcolatori';
      var b=document.getElementById('calc-back-header-btn');
      if(b)b.classList.remove('visible');
      document.getElementById('calc-step-cmds').style.display='block';
      document.getElementById('calc-step-abv').style.display='none';
      document.getElementById('calc-step-cost').style.display='none';
    }

    // Click card Risorse
    document.querySelectorAll('.ris-cmd-btn').forEach(function(b){
      b.addEventListener('click',function(){
        var cmd=this.dataset.cmd;
        var t=document.getElementById('ris-header-title');
        if(t)t.textContent=RIS_TITLES[cmd]||'Risorse';
        var backBtn=document.getElementById('ris-back-header-btn');
        if(backBtn)backBtn.classList.add('visible');
        document.getElementById('ris-step-cmds').style.display='none';
        document.getElementById('ris-step-tmp').style.display=cmd==='tmp'?'block':'none';
        document.getElementById('ris-step-bic').style.display=cmd==='bic'?'block':'none';
        document.getElementById('ris-step-glass').style.display=cmd==='glass'?'block':'none';
        if(cmd==='bic') populateRisGlossario();
        if(cmd==='glass') populateRisGlass();
      });
    });

    // Click card Calcolatori
    document.querySelectorAll('.calc-cmd-btn').forEach(function(b){
      b.addEventListener('click',function(){
        var cmd=this.dataset.cmd;
        var t=document.getElementById('calc-header-title');
        if(t)t.textContent=CALC_TITLES[cmd]||'Calcolatori';
        var backBtn=document.getElementById('calc-back-header-btn');
        if(backBtn)backBtn.classList.add('visible');
        document.getElementById('calc-step-cmds').style.display='none';
        document.getElementById('calc-step-abv').style.display=cmd==='abv'?'block':'none';
        document.getElementById('calc-step-cost').style.display=cmd==='cost'?'block':'none';
        if(cmd==='abv') initCalcABV();
      });
    });

    // Bottoni back nell'header (nuovi) + quelli vecchi nel contenuto
    document.getElementById('ris-back-header-btn').addEventListener('click',showRisCmds);
    document.getElementById('calc-back-header-btn').addEventListener('click',showCalcCmds);
    document.querySelectorAll('.ris-back-btn').forEach(function(b){
      b.addEventListener('click',showRisCmds);
    });
    document.querySelectorAll('.calc-back-btn').forEach(function(b){
      b.addEventListener('click',showCalcCmds);
    });

    // Reset a schermata cmds quando si riapre il drawer dall'esterno
    var origOpen=window.openDrawer;
    window.openDrawer=function(id){
      if(id==='ris') showRisCmds();
      if(id==='calc') showCalcCmds();
      origOpen(id);
    };

    // Zone Temperature per drawer Risorse
    var ZONES=[
      {range:'< 0°C',   name:'Sotto Zero',      color:'#4a7acc',sentori:'Percezione quasi nulla. Solo note mentolate ed eucaliptolici resistono.',dist:'Non consigliato per distillati di qualità'},
      {range:'0–5°C',   name:'Freddo da frigo',  color:'#3ab8d4',sentori:'Agrumato, mentolato. Note leggere e volatili ancora percepibili.',dist:'Vodka ghiacciata'},
      {range:'4–8°C',   name:'Servizio freddo',  color:'#2da89a',sentori:'Erbe fresche, agrumi, fiori bianchi leggeri. Calore alcolico ridotto.',dist:'Gin · Vodka'},
      {range:'8–13°C',  name:'Fresco temperato', color:'#4db86a',sentori:'Verdi: fico, basilico, erba tagliata. Fruttate fresche: mela verde, pera.',dist:'Grappa giovane · Acquaviti bianche · Pisco'},
      {range:'13–15°C', name:'Temperato',        color:'#88bb2a',sentori:'Floreali leggeri, lavanda, spezie dolci. Buon equilibrio freschezza e aroma.',dist:'Rum bianco · Tequila blanco · Mezcal · Sotol · Cachaça'},
      {range:'16–18°C', name:'Caldo moderato',   color:'#d4a020',sentori:'Caramello, fruttato maturo, spezie calde, note cerealicole.',dist:'Bourbon · Rye · Irish Whiskey · Scotch blended · Japanese Whisky · Tequila reposado · Rum añejo · Grappa barricata'},
      {range:'18–22°C', name:'Caldo espressivo', color:'#e8701a',sentori:'Torba, cuoio, frutta secca, spezie intense. Massima espressione aromatica.',dist:'Scotch single malt · Whisky torbato · Tequila añejo · Cognac VS-VSOP · Armagnac · Calvados'},
      {range:'20–24°C', name:'Caldo profondo',   color:'#c83820',sentori:'Legnoso, resinoso, balsamico, ambra, vaniglia, cacao.',dist:'Cognac XO · Armagnac millesimato · Rum XO · Brandy Riserva-XO'}
    ];
    var risTmpZones=document.getElementById('ris-tmp-zones');
    if(risTmpZones){
      ZONES.forEach(function(z){
        var d=document.createElement('div');
        d.className='vnt-item';
        d.style.borderLeft='3px solid '+z.color;
        d.innerHTML='<div class="vnt-item-title" style="color:'+z.color+'">'+z.range+' — '+z.name+'</div>'
          +'<div class="vnt-item-desc" style="font-style:italic">'+z.sentori+'</div>'
          +'<div style="font-size:.68rem;font-weight:600;color:'+z.color+'">'+z.dist+'</div>';
        risTmpZones.appendChild(d);
      });
    }

    // Popola Glossario clonando dal drawer-glos esistente
    var _glossPopulated=false;
    function populateRisGlossario(){
      if(_glossPopulated)return;
      var src=document.querySelector('#drawer-glos .drawer-inner');
      var dst=document.getElementById('ris-glossario-content');
      if(!src||!dst)return;
      // Prendi tutto l'innerHTML ed escludi drawer-header e primo p
      var tmp=document.createElement('div');
      tmp.innerHTML=src.innerHTML;
      var hdr=tmp.querySelector('.drawer-header');
      if(hdr)hdr.remove();
      var p=tmp.querySelector('p');
      if(p)p.remove();
      dst.innerHTML=tmp.innerHTML;
      _glossPopulated=true;
    }

    // Calcolo ABV per Calcolatori
    var _calcAbvInited=false;
    function initCalcABV(){
      if(_calcAbvInited)return;
      _calcAbvInited=true;
      var wrap=document.getElementById('calc-abv-ingredients');
      if(!wrap)return;

      function addRow(){
        var row=document.createElement('div');
        row.className='calc-abv-row';
        row.style.cssText='display:flex;align-items:center;gap:.4rem;margin-top:.5rem;';
        row.innerHTML='<input type="number" class="cabv-ml" placeholder="ml" min="0" max="500" style="width:70px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'
          +'<span style="color:var(--dim);font-size:.75rem;">ml</span>'
          +'<input type="number" class="cabv-pct" placeholder="%" min="0" max="100" style="width:65px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'
          +'<span style="color:var(--dim);font-size:.75rem;">%</span>'
          +'<button onclick="this.parentElement.remove();calcAbvNew();" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:.9rem;padding:0 .2rem;">✕</button>';
        wrap.appendChild(row);
        row.querySelectorAll('input').forEach(function(i){i.addEventListener('input',calcAbvNew);});
      }

      var addBtn=document.getElementById('calc-abv-add');
      var resetBtn=document.getElementById('calc-abv-reset');
      if(addBtn)addBtn.addEventListener('click',addRow);
      if(resetBtn)resetBtn.addEventListener('click',function(){
        wrap.innerHTML='';addRow();addRow();
        var r=document.getElementById('calc-abv-result');
        var d=document.getElementById('calc-abv-desc');
        var a=document.getElementById('calc-abv-alcol');
        if(r)r.textContent='—';if(d)d.textContent='';if(a)a.textContent='';
      });
      wrap.querySelectorAll('input').forEach(function(i){i.addEventListener('input',calcAbvNew);});
      addRow();
    }
  });

  var _calcTimer=null;
  window.calcAbvNew=function(){
    clearTimeout(_calcTimer);
    _calcTimer=setTimeout(function(){
      var rows=document.querySelectorAll('#calc-abv-ingredients .calc-abv-row');
      var totalVol=0,totalAlc=0;
      rows.forEach(function(row){
        var ml=parseFloat(row.querySelector('.cabv-ml').value)||0;
        var pct=parseFloat(row.querySelector('.cabv-pct').value)||0;
        totalVol+=ml;totalAlc+=ml*(pct/100);
      });
      var result=document.getElementById('calc-abv-result');
      var desc=document.getElementById('calc-abv-desc');
      var alcol=document.getElementById('calc-abv-alcol');
      if(totalVol<=0){if(result)result.textContent='—';if(desc)desc.textContent='';if(alcol)alcol.textContent='';return;}
      var abv=(totalAlc/totalVol*100).toFixed(1);
      var label=abv<10?'Basso':abv<20?'Medio':abv<30?'Medio-alto':'Alto';
      if(result)result.textContent=abv+'%';
      if(desc)desc.textContent=label+' — '+totalVol.toFixed(0)+' ml totali';
      if(alcol)alcol.textContent='Alcol etilico puro: '+totalAlc.toFixed(1)+' ml';
    },400);
  };

})();

// ═══ BICCHIERI ═══
function populateRisGlass(){
  var el=document.getElementById('ris-glass-content');
  if(!el||el.dataset.done)return;
  el.dataset.done='1';

  var GLASSES=[
    {cat:'Bicchieri On the Rocks',color:'#3ab8d4',items:[
      {nome:'Rock / Rock Juice / Granity',uso:'Distillati puri, drink spirits forward',ml:'220–300 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="28" height="44" rx="3"/><line x1="6" y1="14" x2="34" y2="14" stroke-opacity=".3"/><line x1="6" y1="24" x2="34" y2="24" stroke-opacity=".3"/><line x1="6" y1="34" x2="34" y2="34" stroke-opacity=".3"/></svg>'},
      {nome:'Tumbler Basso / Lowball',uso:'Distillati puri, drink spirits forward',ml:'250–350 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6 L5 50 L35 50 L33 6 Z"/></svg>'},
      {nome:'Old Fashioned',uso:'Distillati puri, drink spirits forward',ml:'250–350 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5 L5 50 L35 50 L34 5 Z"/><line x1="5" y1="18" x2="35" y2="18" stroke-opacity=".25"/></svg>'},
      {nome:'Collins',uso:'Long drink sour sodati',ml:'300–350 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 L8 53 L32 53 L30 3 Z"/></svg>'},
      {nome:'Tumbler Alto / Highball',uso:'Long drink alcolici e analcolici',ml:'350–400 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2 L9 54 L31 54 L29 2 Z"/></svg>'},
      {nome:'Sling',uso:'Singapore Sling, drink fruttati',ml:'300–350 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L8 54 L32 54 L28 2 Z"/></svg>'},
      {nome:'Hurricane',uso:'Hurricane, Frozen, Colade, Tiki',ml:'450–600 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2 C10 10 6 20 10 30 C14 40 14 46 12 54 L28 54 C26 46 26 40 30 30 C34 20 30 10 24 2 Z"/></svg>'},
      {nome:'Zombie',uso:'Tiki drink',ml:'350–400 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 L9 54 L31 54 L27 2 Z"/></svg>'},
      {nome:'Balloon',uso:'Gin tonic',ml:'500–700 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4 C8 4 5 14 5 22 C5 34 12 42 18 44 L18 50 L14 52 L26 52 L22 50 L22 44 C28 42 35 34 35 22 C35 14 32 4 20 4 Z"/></svg>'},
      {nome:'Copper Mug',uso:'Moscow Mule',ml:'500–600 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8 L6 48 Q6 52 10 52 L30 52 Q34 52 34 48 L34 8 Q34 4 30 4 L10 4 Q6 4 6 8 Z"/><path d="M34 16 Q40 16 40 22 Q40 28 34 28" stroke-width="1.4"/></svg>'},
      {nome:'Julep Cup',uso:'Mint Julep',ml:'300–400 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4 L8 50 Q8 53 12 53 L28 53 Q32 53 32 50 L32 4 Z"/></svg>'},
      {nome:'Tiki Mug',uso:'Tiki drink',ml:'500–700 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 C8 3 6 8 6 14 L6 46 Q6 53 12 53 L28 53 Q34 53 34 46 L34 14 C34 8 32 3 28 3 Z"/><circle cx="20" cy="18" r="4" stroke-opacity=".5"/><line x1="15" y1="28" x2="25" y2="28" stroke-opacity=".4"/></svg>'}
    ]},
    {cat:'Bicchieri per drink "Up"',color:'#a78bfa',items:[
      {nome:'Flute',uso:'Drink con spumante',ml:'150–200 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2 C11 8 10 16 12 26 C13 32 16 36 18 38 L18 50 L14 52 L26 52 L22 50 L22 38 C24 36 27 32 28 26 C30 16 29 8 25 2 Z"/></svg>'},
      {nome:'Coppa Champagne',uso:'Vari drink in coppetta',ml:'180–250 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8 Q5 26 20 28 Q35 26 35 8 Z"/><line x1="20" y1="28" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Coppa Nick & Nora',uso:'Drink in coppetta spirits forward',ml:'120–150 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6 Q8 28 20 30 Q32 28 32 6 Z"/><line x1="20" y1="30" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Coppa Martini',uso:'Drink spirits forward',ml:'100–120 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6 L20 28 L36 6 Z"/><line x1="20" y1="28" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Doppia Coppa Martini',uso:'Drink in coppetta con succhi',ml:'180–250 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5 L20 30 L37 5 Z"/><line x1="20" y1="30" x2="20" y2="50"/><line x1="13" y1="50" x2="27" y2="50"/></svg>'},
      {nome:'Sour',uso:'Cocktail con albumina o semplici sour',ml:'200–250 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5 Q7 28 20 30 Q33 28 33 5 Z"/><line x1="20" y1="30" x2="20" y2="50"/><line x1="13" y1="50" x2="27" y2="50"/></svg>'},
      {nome:'Coppa Margarita / Sombrero',uso:'Margarita, drink frozen o colade',ml:'250–300 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8 L14 28 L26 28 L38 8 Z"/><line x1="20" y1="28" x2="20" y2="50"/><line x1="13" y1="50" x2="27" y2="50"/></svg>'},
      {nome:'Poco Grande',uso:'Drink frozen o colade',ml:'300–400 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6 Q2 26 20 30 Q38 26 38 6 Z"/><line x1="20" y1="30" x2="20" y2="50"/><line x1="13" y1="50" x2="27" y2="50"/></svg>'},
      {nome:'Cocotte in Terracotta',uso:'Canchanchara e drink cubani',ml:'220 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14 Q6 30 8 44 Q8 52 20 52 Q32 52 32 44 Q34 30 32 14 Q28 8 20 8 Q12 8 8 14 Z"/><path d="M14 8 Q14 2 20 2 Q26 2 26 8"/></svg>'}
    ]},
    {cat:'Bicchieri per Shot',color:'#f59e0b',items:[
      {nome:'Shot',uso:'Distillati puri',ml:'30–60 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6 L10 50 L30 50 L28 6 Z"/></svg>'},
      {nome:'Shooter',uso:'B-52, mini drink',ml:'60–120 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 L9 52 L31 52 L29 4 Z"/></svg>'},
      {nome:'Pousse Café',uso:'Mini cocktail stratificati dopo pasto',ml:'60–120 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 L11 50 L29 50 L27 3 Z"/><line x1="11" y1="22" x2="29" y2="22" stroke-opacity=".3"/><line x1="11" y1="36" x2="29" y2="36" stroke-opacity=".3"/></svg>'}
    ]},
    {cat:'Bicchieri da Degustazione',color:'#2da89a',items:[
      {nome:'Snifter / Brandy Cup / Napoleon',uso:'Cognac, Armagnac e Brandy',ml:'250–590 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4 Q6 26 20 30 Q34 26 34 4 Z"/><line x1="20" y1="30" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Wobble',uso:'Distillati invecchiati',ml:'200–300 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8 Q4 20 8 30 Q12 38 20 40 Q28 38 32 30 Q36 20 32 8 Z"/><line x1="20" y1="40" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Tulip',uso:'Distillati invecchiati',ml:'200–300 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 Q8 14 10 24 Q12 32 20 34 Q28 32 30 24 Q32 14 28 4 Z"/><line x1="20" y1="34" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Nosing',uso:'Distillati invecchiati',ml:'90–150 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4 Q9 14 11 22 Q13 30 20 32 Q27 30 29 22 Q31 14 27 4 Z"/><path d="M16 4 Q16 2 20 2 Q24 2 24 4"/><line x1="20" y1="32" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Grappa',uso:'Grappa, acquaviti',ml:'50–100 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 Q13 12 14 20 Q15 26 20 28 Q25 26 26 20 Q27 12 24 4 Z"/><line x1="20" y1="28" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'}
    ]},
    {cat:'Bicchieri da Liquori e Amari',color:'#e8701a',items:[
      {nome:'Cordial',uso:'Liquori dolci e creme',ml:'50–100 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4 Q12 10 13 18 Q14 24 20 26 Q26 24 27 18 Q28 10 25 4 Z"/><line x1="20" y1="26" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Liqueur',uso:'Liquori dolci e creme',ml:'60–120 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3 Q10 12 12 22 Q14 28 20 30 Q26 28 28 22 Q30 12 26 3 Z"/><line x1="20" y1="30" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Pousse Café',uso:'Mini cocktail stratificati dopo pasto',ml:'60–120 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 L11 50 L29 50 L27 3 Z"/><line x1="11" y1="22" x2="29" y2="22" stroke-opacity=".3"/><line x1="11" y1="36" x2="29" y2="36" stroke-opacity=".3"/></svg>'},
      {nome:'Amaro Glass',uso:'Digestivi, amari e liquori erbacei',ml:'80–120 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5 L9 48 Q9 52 13 52 L27 52 Q31 52 31 48 L30 5 Z"/></svg>'}
    ]},
    {cat:'Bicchieri per Drink Caldi',color:'#f87171',items:[
      {nome:'Irish Coffee',uso:'Irish coffee, drink e punch caldi',ml:'200–250 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6 L8 48 Q8 52 12 52 L28 52 Q32 52 32 48 L30 6 Z"/><path d="M32 16 Q38 16 38 24 Q38 30 32 30" stroke-width="1.4"/></svg>'}
    ]},
    {cat:'Bicchieri da Vino',color:'#c084fc',items:[
      {nome:'Flute',uso:'Champagne, Prosecco, Spumante — preserva la bollicina',ml:'150–200 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2 C11 8 10 16 12 26 C13 32 16 36 18 38 L18 50 L14 52 L26 52 L22 50 L22 38 C24 36 27 32 28 26 C30 16 29 8 25 2 Z"/></svg>'},
      {nome:'Champagne Tulip',uso:'Champagne, Prosecco — compromesso tra degustazione e eleganza',ml:'380–450 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 Q9 14 11 24 Q13 32 20 34 Q27 32 29 24 Q31 14 27 3 Z"/><line x1="20" y1="34" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Vino Bianco',uso:'Chardonnay, Sauvignon — conserva la temperatura',ml:'250–360 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 Q8 16 10 26 Q12 34 20 36 Q28 34 30 26 Q32 16 28 3 Z"/><line x1="20" y1="36" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Vino Rosso',uso:'Bordeaux, Bourgogne — favorisce ossigenazione e tannini',ml:'350–600 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 Q4 18 8 28 Q12 36 20 38 Q28 36 32 28 Q36 18 32 3 Z"/><line x1="20" y1="38" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Copita',uso:'Vini fortificati, vini passiti, vini liquorosi',ml:'120–190 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4 Q9 14 11 22 Q13 30 20 32 Q27 30 29 22 Q31 14 27 4 Z"/><line x1="20" y1="32" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'},
      {nome:'Bicchiere ISO/INAO',uso:'Degustazioni tecniche — analisi olfattiva e visiva',ml:'210–230 ml',svg:'<svg viewBox="0 0 40 56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 Q7 14 9 24 Q11 32 20 34 Q29 32 31 24 Q33 14 29 4 Z"/><path d="M15 34 Q16 38 20 38 Q24 38 25 34"/><line x1="20" y1="38" x2="20" y2="50"/><line x1="14" y1="50" x2="26" y2="50"/></svg>'}
    ]}
  ];

  var html='';
  GLASSES.forEach(function(cat){
    html+='<div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:'+cat.color+';margin:.9rem 0 .5rem;">'+cat.cat+'</div>';
    cat.items.forEach(function(g){
      html+='<div class="vnt-item" style="display:flex;align-items:center;gap:.8rem;padding:.6rem .75rem;">'
        +'<div style="flex-shrink:0;width:36px;height:50px;display:flex;align-items:center;justify-content:center;color:'+cat.color+';opacity:.85;">'+g.svg+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div class="vnt-item-title" style="font-size:.76rem;line-height:1.3;">'+g.nome+'</div>'
        +'<div class="vnt-item-desc" style="font-size:.67rem;margin-top:.15rem;">'+g.uso+'</div>'
        +'<div style="font-size:.62rem;font-weight:700;color:'+cat.color+';margin-top:.2rem;">'+g.ml+'</div>'
        +'</div>'
        +'</div>';
    });
  });
  el.innerHTML=html;
}
