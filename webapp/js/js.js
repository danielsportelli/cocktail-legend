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
        }
      } else if(e.key === 'Escape'){
        closeSuggestions();
        inp.blur();
      }
    });

    inp.addEventListener('focus', function(){
      if(Q.length >= 1) showSuggestions(Q);
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
  if(fb) document.documentElement.style.setProperty('--fb-h', fb.offsetHeight+'px');
}
updateFbH();
window.addEventListener('resize', updateFbH);
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
// ═══════════ AUTOCOMPLETE RICERCA ═══════════
(function(){
  var WORKER_URL = 'https://cocktail-legend-ai.daniel-sportelli.workers.dev';
  var USAGE_KEY = 'cl_ai_usage';
  var USAGE_MONTH = 'cl_ai_month';
  var MAX = 50;
  var currentCmd = null;
  var selectedPill = null;

  // Stato multi-step signature
  var sig = { tipo: null, momento: null, gusto: null, tenore: null, bicchiere: null };

  // ─── PROMPTS per i 5 comandi semplici ───────────────────────────
  var PROMPTS = {
    consiglio: {
      label: 'La tua domanda',
      placeholder: 'es. Come gestisco un cliente che vuole un drink analcolico interessante?',
      usePills: false,
      build: function(v){ return v; }
    },
    ribilancia: {
      label: 'Descrivi il problema',
      placeholder: 'es. Il mio Margarita è troppo dolce, ho usato 20ml Triple Sec e 10ml lime...',
      usePills: false,
      build: function(v){
        return 'Ho un problema di bilanciamento: ' + v + '\n\nDammi 2-3 soluzioni pratiche concrete da applicare subito al banco.';
      }
    },
    twist: {
      label: 'Quale classico vuoi reinterpretare?',
      placeholder: 'es. Negroni, Old Fashioned, Margarita...',
      usePills: false,
      build: function(v){
        return 'Voglio fare un twist creativo su: ' + v + '.\n\nProponmi 2-3 reinterpretazioni originali mantenendo la struttura del classico ma con ingredienti o tecniche inaspettate. Per ognuna: nome, variazione chiave, ricetta sintetica.';
      }
    },
    pairing: {
      label: 'Descrivi il piatto',
      placeholder: 'es. Tartare di tonno con avocado e sesamo...',
      usePills: false,
      build: function(v){
        return 'Devo abbinare un cocktail a questo piatto: ' + v + '.\n\nSuggerisci 2-3 drink con abbinamento per contrasto o per affinità. Per ognuno spiega brevemente perché funziona con quel piatto.';
      }
    },
    giorno: {
      label: 'Che momento è?',
      placeholder: '',
      usePills: true,
      build: function(v){
        var now = new Date();
        var mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
        var stagioni = ['inverno','inverno','primavera','primavera','primavera','estate','estate','estate','autunno','autunno','autunno','inverno'];
        var data = now.getDate() + ' ' + mesi[now.getMonth()] + ' ' + now.getFullYear();
        var stagione = stagioni[now.getMonth()];
        return 'Oggi è ' + data + ', siamo in ' + stagione + '. Crea il cocktail del giorno per il momento: ' + v + '.\n\nDammi UN solo drink con:\n- Nome originale e concept stagionale\n- Ricetta completa (dosi, tecnica, bicchiere, garnish)\n- In 1 riga: perché è perfetto per questo momento\n\nDeve essere creativo, non un classico già noto.';
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
    var fill=document.getElementById('crea-usage-fill');
    if(fill){fill.style.width=pct+'%';fill.style.background=pct>=80?'#ef4444':'var(--amber)';}
    var txt=document.getElementById('crea-usage-txt');
    if(txt)txt.textContent=u+'/'+MAX;
    if(u>=MAX)showExhausted();
  }
  function showExhausted(){
    var b=document.getElementById('crea-exhausted');
    var btn=document.getElementById('crea-btn');
    var sigBtn=document.getElementById('sig-btn');
    if(b)b.style.display='block';
    if(btn)btn.disabled=true;
    if(sigBtn)sigBtn.disabled=true;
    var now=new Date();
    var next=new Date(now.getFullYear(),now.getMonth()+1,1);
    var d=document.getElementById('crea-reset-date');
    if(d)d.textContent='Si resetterà il '+next.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
  }

  // ─── NAVIGAZIONE PRINCIPALE ───────────────────────────────────────
  function showCmds(){
    currentCmd=null; selectedPill=null;
    sig={tipo:null,momento:null,gusto:null,tenore:null,bicchiere:null};
    setVisible('crea-step-cmds',true);
    setVisible('crea-step-signature',false);
    setVisible('crea-step-input',false);
    setVisible('crea-response',false);
    setVisible('crea-error',false);
    setVisible('crea-exhausted',false);
    var inp=document.getElementById('crea-input');
    if(inp)inp.value='';
    var sigInp=document.getElementById('sig-input');
    if(sigInp)sigInp.value='';
    // reset pill: rimuovi classi sel e group-active
    document.querySelectorAll('.sig-pill.sel,.crea-pill.sel').forEach(function(p){
      p.classList.remove('sel');
    });
    document.querySelectorAll('.sig-pill-group-active,.crea-pill-group-active').forEach(function(el){
      el.classList.remove('sig-pill-group-active','crea-pill-group-active');
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
    setVisible('crea-step-cmds',false);
    setVisible('crea-response',false);
    setVisible('crea-error',false);

    if(cmd==='signature'){
      // reset stato sig
      sig={tipo:null,momento:null,gusto:null,tenore:null,bicchiere:null};
      setVisible('crea-step-signature',true);
      setVisible('sig-step-1',true);
      setVisible('sig-step-2a',false);
      setVisible('sig-step-2b',false);
      setVisible('sig-step-3',false);
      setVisible('sig-step-4',false);
        setVisible('sig-step-5',false);
      // reset tutte le pill signature
      document.querySelectorAll('.sig-pill').forEach(function(p){ pillOff(p); });
      document.querySelectorAll('.sig-pill-group-active').forEach(function(el){ el.classList.remove('sig-pill-group-active'); });
    } else {
      var cfg=PROMPTS[cmd];
      setVisible('crea-step-input',true);
      var label=document.getElementById('crea-input-label');
      if(label)label.textContent=cfg.label;
      var pills=document.getElementById('crea-pills');
      var inp=document.getElementById('crea-input');
      selectedPill=null;
      if(cfg.usePills){
        if(pills)pills.style.display='flex';
        if(inp)inp.style.display='none';
        document.querySelectorAll('.crea-pill').forEach(function(p){ pillOff(p); });
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
      if(parent.querySelectorAll('.crea-pill').length) parent.classList.add('crea-pill-group-active');
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
    var btn=document.getElementById('crea-btn');
    var inp=document.getElementById('crea-input');
    if(!btn||!currentCmd)return;
    var cfg=PROMPTS[currentCmd];
    if(!cfg)return;
    var hasVal=cfg.usePills ? selectedPill!==null : (inp&&inp.value.trim().length>0);
    var active=hasVal&&getUsage()<MAX;
    btn.disabled=!active;
    btn.style.background=active?'var(--amber)':'var(--surf)';
    btn.style.color=active?'#0a0f1e':'var(--dim)';
    btn.style.border=active?'none':'1px solid var(--brd)';
    btn.style.cursor=active?'pointer':'not-allowed';
    btn.style.boxShadow=active?'0 4px 16px rgba(245,158,11,.35)':'none';
  }

  // ─── MARKDOWN → HTML ──────────────────────────────────────────────
  function mdToHtml(md){
    return md
      .replace(/^## (.+)$/gm,'<div style="font-size:.6rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--blue-l);margin:18px 0 6px;padding-bottom:5px;border-bottom:1px solid rgba(96,165,250,.2);">$1</div>')
      .replace(/^### (.+)$/gm,'<div style="font-size:.82rem;font-weight:700;color:var(--txt);margin:12px 0 3px;">$1</div>')
      .replace(/\*\*(.+?)\*\*/g,'<strong style="color:var(--amber);font-weight:700;">$1</strong>')
      .replace(/\*(.+?)\*/g,'<em style="color:var(--txt2);">$1</em>')
      .replace(/^- (.+)$/gm,'<div style="padding:3px 0 3px 10px;border-left:2px solid rgba(96,165,250,.25);color:var(--txt2);font-size:.78rem;">$1</div>')
      .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--brd);margin:12px 0;">')
      .replace(/\n/g,'<br>')
      .replace(/<br><br>/g,'<br><br>');
  }

  // ─── FETCH ────────────────────────────────────────────────────────
  function showFollowUp(){
    var fuq=document.getElementById('fu-q1');
    if(fuq)fuq.style.display='block';
    setVisible('fu-yes-opts',false);
    setVisible('fu-no-opts',false);
    setVisible('fu-chat-area',false);
    setVisible('fu-mod-area',false);
    setVisible('fu-altro-area',false);
    var cn=document.getElementById('crea-new');
    if(cn)cn.style.display='inline-flex';
  }

  async function doFetch(prompt){
    var resp=document.getElementById('crea-response');
    var body=document.getElementById('crea-body');
    var err=document.getElementById('crea-error');
    setVisible('crea-step-input',false);
    setVisible('crea-step-signature',false);
    if(err)err.style.display='none';
    // Nascondi tutto il follow-up e torna-ai-comandi durante il fetch
    ['fu-q1','fu-yes-opts','fu-no-opts','fu-mod-area','fu-altro-area','fu-chat-area','crea-new'].forEach(function(id){
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
          max_tokens:1000,
          system:'Sei un barman creativo di fama internazionale. Parli sempre in italiano. Tono diretto e professionale, da collega a collega. Non citare mai database o fonti esterne. Rispondi SEMPRE con questa struttura esatta: ## NOME DRINK (una riga di concept). ## RICETTA (lista ingredienti con - dose Ingrediente). **Tecnica:** su riga separata. **Bicchiere:** su riga separata. **Garnish:** su riga separata. ## PREPARAZIONI (solo se servono sciroppi artigianali, infusi o wash - ogni voce: **Nome prep:** istruzioni 1 riga - altrimenti ometti la sezione). ## PERSONALIZZAZIONE (consiglio bilanciamento, sempre presente). Usa ## per titoli, **grassetto** per label come Tecnica/Bicchiere/Garnish e nomi preparazioni, - per ingredienti. Nessuna sezione extra fuori da questa struttura.',
          messages:[{role:'user',content:prompt}]
        })
      });
      var data=await res.json();
      var text=data&&data.content&&data.content[0]?data.content[0].text:'';
      if(!text)throw new Error((data&&data.error&&data.error.message)||'Risposta vuota');
      if(body)body.innerHTML=mdToHtml(text);
      incUsage(); renderUsage();
      // mostra follow-up
      showFollowUp();
    }catch(e){
      if(resp)resp.style.display='none';
      if(err){err.style.display='block';err.textContent='⚠️ '+(e.message||'Errore. Riprova.');}
      // ripristina il pannello precedente
      if(currentCmd==='signature'){
        setVisible('crea-step-signature',true);
        var sigBtn=document.getElementById('sig-btn');
        if(sigBtn){sigBtn.disabled=false;sigBtn.textContent='✦ Chiedi al Barman';}
      } else {
        setVisible('crea-step-input',true);
        var btn=document.getElementById('crea-btn');
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
    await doFetch(buildSignaturePrompt(val));
    if(sigBtn)sigBtn.textContent='✦ Chiedi al Barman';
  }

  async function askBarman(){
    if(getUsage()>=MAX){showExhausted();return;}
    var inp=document.getElementById('crea-input');
    var cfg=PROMPTS[currentCmd];
    var val=cfg.usePills ? selectedPill : (inp?inp.value.trim():'');
    if(!val||!currentCmd)return;
    var btn=document.getElementById('crea-btn');
    if(btn){btn.disabled=true;btn.textContent='...';}
    await doFetch(cfg.build(val));
    if(btn)btn.textContent='✦ Chiedi al Barman';
  }

  // ─── INIT ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded',function(){
    renderUsage();

    // Bottoni comando principali
    document.querySelectorAll('.crea-cmd-btn').forEach(function(b){
      b.addEventListener('click',function(){ selectCmd(this.dataset.cmd); });
      b.addEventListener('mouseenter',function(){ this.style.borderColor='rgba(37,99,235,.4)'; this.style.background='rgba(37,99,235,.06)'; });
      b.addEventListener('mouseleave',function(){ this.style.borderColor='var(--brd)'; this.style.background='var(--bg)'; });
    });

    // Pill signature (multi-step)
    document.querySelectorAll('.sig-pill').forEach(function(p){
      p.addEventListener('click',function(){ onSigPill(this); });
    });

    // Pill giorno (altri comandi)
    document.querySelectorAll('.crea-pill').forEach(function(p){
      p.addEventListener('click',function(){
        selectedPill=this.dataset.val;
        document.querySelectorAll('.crea-pill').forEach(function(x){ x.classList.remove('sel'); });
        this.classList.add('sel');
        updateBtn();
      });
    });

    // Textarea altri comandi
    var inp=document.getElementById('crea-input');
    if(inp)inp.addEventListener('input',updateBtn);

    // Textarea signature
    var sigInp=document.getElementById('sig-input');
    if(sigInp)sigInp.addEventListener('input',updateSigBtn);

    // Bottoni invio
    var btn=document.getElementById('crea-btn');
    if(btn)btn.addEventListener('click',askBarman);
    var sigBtn=document.getElementById('sig-btn');
    if(sigBtn)sigBtn.addEventListener('click',askSignature);

    // Bottoni back (tutti quelli con .crea-back-btn)
    document.querySelectorAll('.crea-back-btn').forEach(function(b){
      b.addEventListener('click',function(){
        var target=this.dataset.target;
        if(target==='cmds') showCmds();
      });
    });

    // Torna ai comandi
    var newBtn=document.getElementById('crea-new');
    if(newBtn)newBtn.addEventListener('click',showCmds);

    // ── FOLLOW-UP ──────────────────────────────────────────────
    // Variabile che tiene l'ultimo prompt inviato (per contesto)
    // e l'ultima risposta (per modifiche)
    
    function resetFollowUp(){
      var fuq=document.getElementById('fu-q1');
      if(fuq)fuq.style.display='block';
      ['fu-yes-opts','fu-no-opts','fu-chat-area','fu-mod-area','fu-altro-area'].forEach(function(id){
        var el=document.getElementById(id);if(el)el.style.display='none';
      });
      var ci=document.getElementById('fu-chat-inp');if(ci)ci.value='';
      var mi=document.getElementById('fu-mod-inp');if(mi)mi.value='';
      var ai=document.getElementById('fu-altro-inp');if(ai)ai.value='';
      // reset bottoni invio follow-up
      ['fu-chat-send','fu-mod-send'].forEach(function(id){
        var b=document.getElementById(id);
        if(b){b.disabled=true;b.textContent='✦ Invia';
          b.style.background='var(--surf)';b.style.color='var(--dim)';
          b.style.border='1px solid var(--brd)';b.style.boxShadow='none';}
      });
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
        doFetch(prompt).then(function(){ resetFollowUp(); });
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

    // Torna ai comandi dal sì
    var fuCmds=document.getElementById('fu-cmds');
    if(fuCmds)fuCmds.addEventListener('click',showCmds);

    // Modifichiamo questo
    var fuMod=document.getElementById('fu-modifica');
    if(fuMod)fuMod.addEventListener('click',function(){
      setVisible('fu-no-opts',false);
      var area=document.getElementById('fu-mod-area');
      if(area)area.style.display='block';
      var i=document.getElementById('fu-mod-inp');if(i)setTimeout(function(){i.focus();},80);
    });

    // Modifica send — costruisce prompt con contesto
    makeSendBtn('fu-mod-send','fu-mod-inp',function(v){
      var body=document.getElementById('crea-body');
      var prev=body?body.innerText.substring(0,400):'';
      return 'Sulla base di questa proposta:\n"""\n'+prev+'\n"""\n\nVorrei questa modifica: '+v+'\n\nRifai la ricetta con la modifica richiesta, mantenendo lo stesso formato.';
    });

    // Proponi qualcos'altro
    var fuAltro=document.getElementById('fu-altro');
    if(fuAltro)fuAltro.addEventListener('click',function(){
      setVisible('fu-no-opts',false);
      var area=document.getElementById('fu-altro-area');
      if(area)area.style.display='block';
      var i=document.getElementById('fu-altro-inp');
      if(i)setTimeout(function(){i.focus();},80);
    });

    // Proponi altro send
    var fuAltroSend=document.getElementById('fu-altro-send');
    if(fuAltroSend)fuAltroSend.addEventListener('click',function(){
      var inp=document.getElementById('fu-altro-inp');
      var val=inp?inp.value.trim():'';
      var sigInp=document.getElementById('sig-input');
      var sigVal=sigInp?sigInp.value.trim():'';
      var base=val?val:(sigVal||'stessi ingredienti di prima');
      var prompt=buildSignaturePrompt(base)+' Proponi un drink completamente diverso dalla risposta precedente.';
      fuAltroSend.disabled=true;fuAltroSend.textContent='...';
      doFetch(prompt).then(function(){
        fuAltroSend.textContent='✦ Proponi';
        resetFollowUp();
      });
    });

  });
})();