// ── mdToHtml globale (usata anche nei salvati) ──────────────────
function mdToHtml(md){
  var SEZIONI = ['RICETTA','PREPARAZIONI','PERSONALIZZAZIONE','MODIFICHE APPORTATE','INGREDIENTE PROTAGONISTA','INGREDIENTE STAGIONALE'];
  var lines = md.split('\n');
  var out = lines.map(function(line){
    if(/^## .+/.test(line)){
      var title = line.replace(/^## /, '');
      var isSezione = SEZIONI.indexOf(title.trim().toUpperCase()) !== -1;
      if(isSezione){
        return '<div style="font-size:.6rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--blue-l);margin:18px 0 6px;padding-bottom:5px;border-bottom:1px solid rgba(96,165,250,.2);">'+title+'</div>';
      } else {
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
// ────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// GESTIONE LINK DI VERIFICA EMAIL (da URL action Firebase)
// ═══════════════════════════════════════════════════════════════
(function() {
  var params = new URLSearchParams(window.location.search);
  var mode = params.get('mode');
  var oobCode = params.get('oobCode');

  if (mode === 'verifyEmail' && oobCode) {
    // Pulisci URL subito
    window.history.replaceState({}, document.title, window.location.pathname);

    // Aspetta Firebase e completa la verifica
    function doVerify() {
      var auth = window._fbAuth;
      var fn = window._fbFunctions;
      if (!auth || !fn || !fn.applyActionCode) { setTimeout(doVerify, 300); return; }

      fn.applyActionCode(auth, oobCode)
        .then(function() {
          window._emailVerified = true;
          if (auth.currentUser) auth.currentUser.reload();
        })
        .catch(function(e) {
          console.warn('verifyEmail error:', e.code);
          window._emailVerifyError = true;
        });
    }
    setTimeout(doVerify, 500);
  }

  if (mode === 'resetPassword' && oobCode) {
    window._resetOobCode = oobCode;
    window.history.replaceState({}, document.title, window.location.pathname);
    // switchAuthTab viene chiamato dopo DOMContentLoaded, garantito
    // L'HTML nasconde overlay/form in un altro listener DOMContentLoaded
    // Usiamo setTimeout 0 per essere sicuri di eseguire DOPO tutti i DOMContentLoaded
    function doShowResetForm() {
      if (typeof switchAuthTab === 'function') {
        switchAuthTab('reset-confirm');
      } else {
        setTimeout(doShowResetForm, 100);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(doShowResetForm, 0);
      });
    } else {
      setTimeout(doShowResetForm, 0);
    }
  }
})();

// ═══════════════════════════════════
// LOGIN FIREBASE — email + password
// ═══════════════════════════════════
(function() {
  var overlay = document.getElementById("login-overlay");
  var emailIn = document.getElementById("login-email");
  var pwdIn   = document.getElementById("login-pwd");

  // Reset scroll e header dopo login
  function postLoginReset() {
    window.scrollTo(0, 0);
    if (typeof _cachedHdrH !== 'undefined') {
      var hdr = document.querySelector('.hdr');
      if (hdr) _cachedHdrH = hdr.offsetHeight;
    }
    if (typeof _applyBarsTop === 'function') {
      _applyBarsTop(typeof _cachedHdrH !== 'undefined' ? _cachedHdrH : 73);
    }
  }

  // Precompila email da parametro URL (es. dopo reset password)
  (function() {
    var urlP = new URLSearchParams(window.location.search);
    var prefillEmail = urlP.get('email');
    if (prefillEmail && emailIn) {
      emailIn.value = prefillEmail;
      // Rimuovi param dall'URL senza ricaricare
      urlP.delete('email');
      var cleanUrl = window.location.pathname + (urlP.toString() ? '?' + urlP.toString() : '') + window.location.hash;
      history.replaceState(null, '', cleanUrl);
    }
  })();
  var btn     = document.getElementById("login-btn");
  var err     = document.getElementById("login-err");
  var eye     = document.getElementById("login-eye");
  var resetLnk= document.getElementById("login-reset");

  // Mostra messaggio verifica email se arrivato dal link
  setTimeout(function() {
    if (window._emailVerified) {
      err.style.color = '#4ade80';
      err.innerHTML = '✓ Email verificata! Ora puoi accedere.';
      window._emailVerified = false;
    } else if (window._emailVerifyError) {
      err.style.color = '#f87171';
      err.innerHTML = 'Link non valido o scaduto. Prova a registrarti di nuovo.';
      window._emailVerifyError = false;
    }
  }, 800);

  // Se l'utente era già loggato, nascondi overlay subito senza aspettare Firebase
  if (localStorage.getItem('cl_logged') === '1') {
    overlay.style.display = "none";
    document.body.style.overflow = "";
    postLoginReset();
  } else {
    document.body.style.overflow = "hidden";
  }

  // Attendi che Firebase sia pronto
  window.addEventListener('fb-auth-ready', function(e) {
    // Blocca tutto durante registrazione
    if (window._isRegistering) return;
    if (e.detail.user) {
      // Blocca se email non verificata — fai signout silenzioso
      if (!e.detail.user.emailVerified) {
        var _so = window._fbFunctions && window._fbFunctions.signOut;
        if (_so) _so(window._fbAuth);
        return;
      }
      localStorage.setItem('cl_logged', '1');
      overlay.style.transition = "opacity .35s";
      overlay.style.opacity = "0";
      setTimeout(function() {
        overlay.style.display = "none";
        document.body.style.overflow = "";
        postLoginReset();
      }, 350);
    } else {
      // Firebase conferma: nessuna sessione valida
      if (localStorage.getItem('cl_logged') === '1') {
        // Token scaduto — aspetta 1.5s per sicurezza poi forza login
        setTimeout(function() {
          if (!window._currentUser) {
            localStorage.removeItem('cl_logged');
            var o = document.getElementById('login-overlay');
            if (o) { o.style.display = ''; o.style.opacity = '1'; }
            document.body.style.overflow = 'hidden';
          }
        }, 1500);
      } else {
        localStorage.removeItem('cl_logged');
        overlay.style.display = '';
        document.body.style.overflow = 'hidden';
      }
    }
  }, { once: false });

  function showErr(msg) {
    err.textContent = msg;
    pwdIn.style.borderColor = "#f87171";
    setTimeout(function() { pwdIn.style.borderColor = ""; }, 1500);
  }

  function tryLogin() {
    var email = emailIn.value.trim();
    var pwd   = pwdIn.value;
    if (!email || !pwd) { showErr("Inserisci email e password."); return; }
    btn.disabled = true;
    btn.textContent = "Accesso...";
    err.textContent = "";

    var auth = window._fbAuth;
    var signIn = window._fbFunctions.signInWithEmailAndPassword;
    if (!auth || !signIn) { showErr("Errore di connessione. Riprova."); btn.disabled=false; btn.textContent="Accedi →"; return; }

    signIn(auth, email, pwd)
      .then(function(cred) {
        var user = cred.user;
        if (!user.emailVerified) {
          // Email non verificata — logout e mostra messaggio
          var signOutFn = window._fbFunctions.signOut;
          signOutFn(auth).then(function() {
            btn.disabled = false;
            btn.textContent = 'Accedi →';
            err.style.color = '#f59e0b';
            err.innerHTML = 'Verifica prima la tua email.<br><small style="color:var(--dim)">Controlla anche la cartella spam.</small>';
          });
          return;
        }
        localStorage.setItem('cl_logged', '1');
        overlay.style.transition = "opacity .35s";
        overlay.style.opacity = "0";
        setTimeout(function() {
          overlay.style.display = "none";
          document.body.style.overflow = "";
          postLoginReset();
        }, 350);
      })
      .catch(function(e) {
        btn.disabled = false;
        btn.textContent = "Accedi →";
        if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found") {
          showErr("Email o password non corretti.");
        } else if (e.code === "auth/too-many-requests") {
          showErr("Troppi tentativi. Aspetta qualche minuto.");
        } else {
          showErr("Errore: " + e.message);
        }
      });
  }

  btn.addEventListener("click", tryLogin);
  pwdIn.addEventListener("keydown", function(e) { if (e.key === "Enter") tryLogin(); });
  emailIn.addEventListener("keydown", function(e) { if (e.key === "Enter") pwdIn.focus(); });

  // Mostra/nascondi password
  var _eyeOn = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var _eyeOff = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  eye.addEventListener("click", function() {
    if (pwdIn.type === "password") {
      pwdIn.type = "text";
      eye.innerHTML = _eyeOff;
    } else {
      pwdIn.type = "password";
      eye.innerHTML = _eyeOn;
    }
  });

  // Password dimenticata — apre modal
  if (resetLnk) {
    resetLnk.addEventListener('click', function(e) {
      e.preventDefault();
      var emailGiaInserita = emailIn ? emailIn.value.trim() : '';
      openResetPasswordModal(emailGiaInserita);
    });
  }
})();

// ═══════════════════════════════════
// AUTH TAB SWITCHER
// ═══════════════════════════════════
function switchAuthTab(tab) {
  var formLogin         = document.getElementById('form-login');
  var formRegister      = document.getElementById('form-register');
  var formVerify        = document.getElementById('form-verify');
  var formResetConfirm  = document.getElementById('form-reset-confirm');
  var tabLogin          = document.getElementById('tab-login');
  var tabRegister       = document.getElementById('tab-register');
  var tabs              = document.querySelector('.auth-tabs');

  if (formLogin)    formLogin.style.display    = 'none';
  if (formRegister) formRegister.style.display = 'none';
  if (formVerify)   formVerify.style.display   = 'none';
  if (formResetConfirm) formResetConfirm.style.display = 'none';
  if (tabLogin)    tabLogin.classList.remove('active');
  if (tabRegister) tabRegister.classList.remove('active');

  var overlay = document.getElementById('login-overlay');

  if (tab === 'login') {
    if (formLogin)  formLogin.style.display = '';
    if (tabLogin)   tabLogin.classList.add('active');
    if (tabs)       tabs.style.display = '';
    if (overlay)    overlay.style.opacity = '1';
  } else if (tab === 'register') {
    if (formRegister)  formRegister.style.display = '';
    if (tabRegister)   tabRegister.classList.add('active');
    if (tabs)          tabs.style.display = '';
    if (overlay)       overlay.style.opacity = '1';
    // Ripristina bottone e flag — utente torna indietro dalla schermata verify
    var regBtnEl = document.getElementById('reg-btn');
    if (regBtnEl) { regBtnEl.disabled = false; regBtnEl.textContent = 'Crea account →'; }
    window._isRegistering = false;
    var regErrEl = document.getElementById('reg-err');
    if (regErrEl) regErrEl.textContent = '';
  } else if (tab === 'verify') {
    if (formVerify) formVerify.style.display = '';
    if (tabs)       tabs.style.display = 'none';
    if (overlay)    overlay.style.opacity = '1';
  } else if (tab === 'reset-confirm') {
    if (formResetConfirm) formResetConfirm.style.display = '';
    if (tabs)       tabs.style.display = 'none';
    if (overlay)    overlay.style.opacity = '1';
  }
}

// Flag globale: blocca onAuthStateChanged durante la registrazione
window._isRegistering = false;

// ═══════════════════════════════════
// REGISTRAZIONE
// ═══════════════════════════════════
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var regBtn  = document.getElementById('reg-btn');
    var regErr  = document.getElementById('reg-err');
    var regEye  = document.getElementById('reg-eye');
    var regPwd  = document.getElementById('reg-pwd');
    var regPwd2 = document.getElementById('reg-pwd2');

    if (!regBtn) return;

    // ── Enter → focus campo successivo ──────────────────────────
    var regFields = ['reg-nome','reg-cognome','reg-email','reg-tel','reg-via','reg-civico','reg-cap'];
    regFields.forEach(function(id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var nextId = regFields[i + 1];
          var next = nextId ? document.getElementById(nextId) : null;
          if (next) next.focus();
          else el.blur();
        }
      });
    });
    // Login: email → password, password → submit
    var loginEmail = document.getElementById('login-email');
    var loginPwd = document.getElementById('login-pwd');
    var loginBtn = document.getElementById('login-btn');
    if (loginEmail) loginEmail.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); if (loginPwd) loginPwd.focus(); } });
    if (loginPwd) loginPwd.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); if (loginBtn) loginBtn.click(); } });

    // ── CAP: solo numeri ─────────────────────────────────────────
    var capInput = document.getElementById('reg-cap');
    if (capInput) {
      capInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 5);
      });
      capInput.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
      });
    }
    // ── TEL: solo numeri ─────────────────────────────────────────
    var telInput = document.getElementById('reg-tel');
    if (telInput) {
      telInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
      });
      telInput.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
      });
    }

    // Mostra/nascondi password (toggle unico per entrambi i campi)
    var _rEyeOn = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var _rEyeOff = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    if (regEye && regPwd) {
      regEye.addEventListener('click', function() {
        var show = regPwd.type === 'password';
        regPwd.type = show ? 'text' : 'password';
        if (regPwd2) regPwd2.type = show ? 'text' : 'password';
        regEye.innerHTML = show ? _rEyeOff : _rEyeOn;
      });
    }

    function showRegErr(msg) {
      regErr.textContent = msg;
    }

    regBtn.addEventListener('click', function() {
      var nome      = (document.getElementById('reg-nome').value || '').trim();
      var cognome   = (document.getElementById('reg-cognome').value || '').trim();
      var email     = (document.getElementById('reg-email').value || '').trim();
      var prefix    = document.getElementById('reg-prefix') ? document.getElementById('reg-prefix').value : '+39';
      var telRaw    = (document.getElementById('reg-tel').value || '').trim();
      var tel       = telRaw ? prefix + ' ' + telRaw : '';
      var via       = (document.getElementById('reg-via').value || '').trim();
      var civico    = (document.getElementById('reg-civico').value || '').trim();
      var cap       = (document.getElementById('reg-cap').value || '').trim();
      var provincia = (document.getElementById('reg-provincia').value || '').trim();
      var paese     = (document.getElementById('reg-paese').value || '').trim();
      var ruolo     = (document.getElementById('reg-ruolo').value || '').trim();
      var pwd       = regPwd ? regPwd.value : '';
      var pwd2      = regPwd2 ? regPwd2.value : '';
      var tcAccepted   = document.getElementById('reg-tc') ? document.getElementById('reg-tc').checked : false;
      var marketing    = document.getElementById('reg-marketing') ? document.getElementById('reg-marketing').checked : false;

      // Validazioni
      if (!nome || !cognome)        { showRegErr('Inserisci nome e cognome.'); return; }
      if (!email)                   { showRegErr('Inserisci la tua email.'); return; }
      if (!ruolo)                   { showRegErr('Seleziona il tuo ruolo nel settore.'); var rw = document.getElementById('reg-ruolo-wrap'); if(rw){ rw.style.borderColor='#f87171'; setTimeout(function(){ rw.style.borderColor=''; }, 2000); } return; }
      if (!pwd || pwd.length < 6)   { showRegErr('La password deve avere almeno 6 caratteri.'); return; }
      if (/\s/.test(pwd))               { showRegErr('La password non può contenere spazi.'); return; }
      if (pwd !== pwd2)             { showRegErr('Le password non coincidono.'); return; }
      if (!tcAccepted) {
        showRegErr('Devi accettare i Termini e Condizioni per continuare.');
        var wrap = document.getElementById('reg-check-tc-wrap');
        if (wrap) { wrap.classList.add('error'); setTimeout(function(){ wrap.classList.remove('error'); }, 2000); }
        return;
      }

      regBtn.disabled = true;
      regBtn.textContent = 'Creazione account...';
      regErr.textContent = '';
      window._isRegistering = true;

      var auth    = window._fbAuth;
      var db      = window._fbDb;
      var fns     = window._fbFunctions;

      if (!auth || !fns || !fns.createUserWithEmailAndPassword) {
        showRegErr('Errore di connessione. Riprova.');
        regBtn.disabled = false;
        regBtn.textContent = 'Crea account →';
        return;
      }

      fns.createUserWithEmailAndPassword(auth, email, pwd)
        .then(function(cred) {
          var user = cred.user;
          // Salva nome+cognome su Firebase Auth
          fns.updateProfile(user, { displayName: nome + ' ' + cognome });
          // Salva dati utente in Firestore
          var userDoc = fns.doc(db, 'users', user.uid);
          var _nowStr = new Date().toISOString().split('T')[0];
          return fns.setDoc(userDoc, {
            nome:        nome,
            cognome:     cognome,
            email:       email,
            tel:         tel,
            via:         via,
            civico:      civico,
            cap:         cap,
            provincia:   provincia,
            paese:       paese,
            ruolo:       ruolo,
            plan:        'free',
            tc_accepted: true,
            tc_date:     new Date().toISOString(),
            marketing:   marketing,
            createdAt:   new Date().toISOString(),
            aiUsage:     { monthlyCount: 0, extraCredits: 0, periodStart: _nowStr }
          }).then(function() {
            // Invia email di verifica
            return fns.sendEmailVerification(user);
          }).then(function() {
            // Logout immediato — non deve entrare finché non verifica email
            return fns.signOut(window._fbAuth);
          }).then(function() {
            window._isRegistering = false;
            localStorage.removeItem('cl_logged');
            // Mostra schermata conferma con nota spam
            var verifyEmailSpan = document.getElementById('verify-email');
            if (verifyEmailSpan) verifyEmailSpan.textContent = email;
            switchAuthTab('verify');
          });
        })
        .catch(function(e) {
          window._isRegistering = false;
          regBtn.disabled = false;
          regBtn.textContent = 'Crea account →';
          if (e.code === 'auth/email-already-in-use') {
            regErr.innerHTML = 'Email già registrata. <a href="#" onclick="switchAuthTab(\u0027login\u0027);return false;" style="color:var(--blue-l);font-weight:700;text-decoration:underline;">Accedi →</a>';
          } else if (e.code === 'auth/invalid-email') {
            showRegErr('Email non valida.');
          } else if (e.code === 'auth/weak-password') {
            showRegErr('Password troppo debole (min. 6 caratteri).');
          } else {
            showRegErr('Errore: ' + e.message);
          }
        });
    });
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
var AF = {cat:[], dis:[], abv:[], frz:[], bic:[], iba:[]};
var Q = "";
var RES = [];
var USE_OZ = false;
var LAST_IDX = 0;
var AO = {"Analcolico":0,"Basso":1,"Medio basso":2,"Medio":3,"Medio alto":4,"Alto":5,"Molto alto":6};
var FMAP = {cat:"categoria", dis:"distillato", abv:"abv", iba:"iba"};
var LABELS = {cat:"Categoria", dis:"Ingredienti", abv:"Tenore ABV", frz:"Frizzante", bic:"Bicchiere", iba:"IBA"};

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

    var clearBtn = document.getElementById('srch-clear');

    function updateClearBtn(){
      if(clearBtn) clearBtn.style.display = inp.value.length > 0 ? 'flex' : 'none';
    }

    inp.addEventListener('input', function(){
      Q = this.value;
      lastQ = Q;
      activeIdx = -1;
      showSuggestions(Q);
      render();
      updateClearBtn();
    });

    if(clearBtn){
      clearBtn.addEventListener('pointerdown', function(e){
        e.preventDefault(); // evita che l'input perda il focus prima del click
        inp.value = '';
        Q = '';
        lastQ = '';
        closeSuggestions();
        render();
        updateClearBtn();
        inp.focus();
      });
    }

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
      if(inp.value === '') {
        // Ha cliccato la X → cancella ma tieni focus e tastiera aperta
        Q = '';
        closeSuggestions();
        render();
        inp.focus();
      } else {
        // Ha premuto Invio/Cerca → chiudi tastiera normalmente
        closeSuggestions();
        inp.blur();
        render();
      }
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
    inp.blur();
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


// ═══════════ PREFERITI (Firestore) ═══════════
var FAV_ONLY = false;
var HEART_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
var HEART_ON  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

// Cache locale per performance (sincronizzata con Firestore)
var _favsCache = null;

function _getUserDoc() {
  var user = window._currentUser;
  var db = window._fbDb;
  var docFn = window._fbFunctions ? window._fbFunctions.doc : null;
  if (!user || !db || !docFn) return null;
  return docFn(db, 'users', user.uid);
}

function loadFavs() {
  return _favsCache || [];
}

function saveFavs(arr) {
  _favsCache = arr;
  var userDoc = _getUserDoc();
  if (!userDoc) return;
  var setDoc = window._fbFunctions.setDoc;
  setDoc(userDoc, { favs: arr }, { merge: true }).catch(function(e){ console.warn('saveFavs err', e); });
}

function isFav(name) {
  return loadFavs().indexOf(name) !== -1;
}

function toggleFav(name) {
  var f = loadFavs().slice();
  var i = f.indexOf(name);
  if (i === -1) f.push(name); else f.splice(i, 1);
  saveFavs(f);
  return i === -1;
}

// Carica preferiti da Firestore quando utente è pronto
window.addEventListener('fb-auth-ready', function(e) {
  if (!e.detail.user) return;
  var userDoc = _getUserDoc();
  if (!userDoc) return;
  var getDoc = window._fbFunctions.getDoc;
  getDoc(userDoc).then(function(snap) {
    if (snap.exists()) {
      var data = snap.data();
      _favsCache = data.favs || [];
    } else {
      _favsCache = [];
    }
    refreshAllHearts();
  }).catch(function(e){ console.warn('loadFavs err', e); _favsCache = []; });
});

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
      for(var j=0;j<c.ingredienti.length;j++)s[c.ingredienti[j][1]]=1;
    }
    else if(key==="frz"){s[c.frizzante?"Si":"No"]=1;}
    else if(key==="iba"){if(c.iba===true)s["Sì"]=1;}
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
      for (var j = 0; j < c.ingredienti.length; j++) s[c.ingredienti[j][1]] = 1;
    }
    else if (key === "frz") { s[c.frizzante ? "Si" : "No"] = 1; }
    else if (key === "iba") { if(c.iba===true) s["Sì"]=1; }
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
  if(key==="iba") return base.filter(function(c){return c.iba===true;}).length;
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
  ["cat","dis","abv","frz","bic","iba"].forEach(function(k){ _resSets[k] = uniqFromRes(k); });
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

// ── SCROLL HIDE/SHOW HEADER ─────────────────────────
// Strategia: pills-bar e filter-bar seguono l'header pixel per pixel via rAF loop.
// Nessuna CSS transition separata per il movimento scroll — zero gap garantito.
// hdr usa CSS transition transform. pills/filter-bar leggono hdr.getBoundingClientRect().bottom
// ad ogni frame durante l'animazione e impostano top direttamente.

var _lastScrollY = 0;
var _hdrHidden = false;
var _cachedHdrH = 73;
var _cachedFbH = 0;
var _syncRafId = null;

// Calcola altezza header reale (include safe-area in standalone)
(function() {
  function updateHdrH() {
    var hdr = document.querySelector('.hdr');
    if (hdr) _cachedHdrH = hdr.offsetHeight;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateHdrH);
  } else {
    updateHdrH();
  }
  window.addEventListener('resize', updateHdrH);
})();

// Loop rAF che sincronizza pills e filter-bar all'header frame per frame
function _startSyncLoop() {
  if (_syncRafId) return; // già in corso
  function loop() {
    var hdr = document.querySelector('.hdr');
    if (!hdr) { _syncRafId = null; return; }
    var bottom = hdr.getBoundingClientRect().bottom;
    // Applica bottom come top di pills e filter-bar
    _applyBarsTop(bottom);
    // Continua finché l'header non è fermo (non hidden e bottom == _cachedHdrH, o hidden e bottom == 0)
    var target = _hdrHidden ? 0 : _cachedHdrH;
    if (Math.abs(bottom - target) > 0.5) {
      _syncRafId = requestAnimationFrame(loop);
    } else {
      _applyBarsTop(target);
      _syncRafId = null;
    }
  }
  _syncRafId = requestAnimationFrame(loop);
}

function _applyBarsTop(hdrBottom) {
  var pills = document.getElementById('pills-bar');
  var pillsH = pills ? pills.offsetHeight : 40;
  // pills-bar e filter-bar posizione gestita da CSS transform — non impostare top via JS
  // Aggiorna main padding-top in sincronia
  var main = document.querySelector('.main');
  if (main) main.style.paddingTop = (hdrBottom + pillsH + _cachedFbH + 22) + 'px';
  // Aggiorna variabili CSS per altri elementi che le usano
  document.documentElement.style.setProperty('--hdr-offset', hdrBottom + 'px');
  document.documentElement.style.setProperty('--pills-bottom', (hdrBottom + pillsH) + 'px');
  document.documentElement.style.setProperty('--pills-h-px', pillsH + 'px');
}

function updateHeaderVisibility() {
  var hdr = document.querySelector('.hdr');
  if (!hdr) return;
  var currentY = window.scrollY || window.pageYOffset;

  if (currentY > _lastScrollY && currentY > _cachedHdrH && !_hdrHidden) {
    _hdrHidden = true;
    hdr.classList.add('hdr--hidden');
    _startSyncLoop();
  } else if (currentY < _lastScrollY && _hdrHidden) {
    _hdrHidden = false;
    hdr.classList.remove('hdr--hidden');
    _startSyncLoop();
  }
  _lastScrollY = currentY;
}

window.addEventListener('scroll', function(){ updateHeaderVisibility(); }, {passive: true});

function updateFbH(){
  var fb = document.getElementById('filter-bar');
  if (!fb) return;
  void fb.offsetHeight;
  _cachedFbH = fb.classList.contains('hidden') ? 0 : fb.offsetHeight;
  document.documentElement.style.setProperty('--fb-h', _cachedFbH + 'px');
  // Ricalcola top bars con posizione corrente hdr
  var hdr = document.querySelector('.hdr');
  var hdrBottom = hdr ? hdr.getBoundingClientRect().bottom : _cachedHdrH;
  _applyBarsTop(hdrBottom);
}

function _updatePillsVars() {
  var pillsBar = document.getElementById('pills-bar');
  var pillsH = pillsBar ? pillsBar.offsetHeight : 40;
  document.documentElement.style.setProperty('--pills-h-px', pillsH + 'px');
  document.documentElement.style.setProperty('--pills-h', pillsH + 'px');
}

// updateRbarTop mantenuto per compatibilità
function updateRbarTop(){
  _updatePillsVars();
  var hdr = document.querySelector('.hdr');
  var hdrBottom = hdr ? hdr.getBoundingClientRect().bottom : _cachedHdrH;
  _applyBarsTop(hdrBottom);
}

document.addEventListener('DOMContentLoaded', function(){
  var fb = document.getElementById('filter-bar');
  if (fb) {
    fb.addEventListener('transitionend', function(e){
      if (e.propertyName === 'max-height') updateFbH();
    });
  }
  _cachedHdrH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 73;
  _updatePillsVars();
  updateFbH();
});

updateFbH();
window.addEventListener('resize', function(){
  _cachedHdrH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 73;
  _updatePillsVars();
  updateFbH();
});
window.addEventListener('load', function(){
  _cachedHdrH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 73;
  _updatePillsVars();
  updateFbH();
  setTimeout(updateFbH, 100);
  setTimeout(updateFbH, 300);
  setTimeout(updateFbH, 600);
});
var _fpObs = new MutationObserver(updateFbH);
document.addEventListener('DOMContentLoaded', function(){
  var fp = document.getElementById('filter-panel');
  if (fp) _fpObs.observe(fp, {attributes:true, attributeFilter:['class']});
});


// ═══ PILLS FILTER SYSTEM ═══════════════════════════
var PILL_LABELS = {
  cat: 'Categoria',
  dis: 'Ingredienti',
  abv: 'ABV',
  bic: 'Bicchiere',
  frz: 'Frizzante',
  iba: 'IBA'
};

var ABV_OPTS = ['Analcolico','Basso','Medio basso','Medio','Medio alto','Alto','Molto alto'];
var FRZ_OPTS = ['Si','No'];
var IBA_OPTS = ['Sì'];

var _fsheetKey = null; // chiave filtro attivo nel bottom sheet

function getOptsForKey(key) {
  // Restituisce le opzioni disponibili CONTESTUALMENTE (solo quelle con count > 0 o selezionate)
  var opts = [];
  if (key === 'abv') opts = ABV_OPTS;
  else if (key === 'frz') opts = FRZ_OPTS;
  else if (key === 'iba') opts = IBA_OPTS;
  else if (key === 'cat') {
    var s = {};
    DATA.forEach(function(c){ s[c.categoria] = 1; });
    opts = Object.keys(s).sort(function(a,b){ return a.localeCompare(b,'it'); });
  } else if (key === 'dis') {
    var s = {};
    DATA.forEach(function(c){ c.ingredienti.forEach(function(i){ s[i[1]] = 1; }); });
    opts = Object.keys(s).sort(function(a,b){ return a.localeCompare(b,'it'); });
  } else if (key === 'bic') {
    var s = {};
    DATA.forEach(function(c){ s[c.bicchiere] = 1; });
    opts = Object.keys(s).sort(function(a,b){ return a.localeCompare(b,'it'); });
  }
  return opts;
}

function openFsheet(key) {
  _fsheetKey = key;
  var fsheet  = document.getElementById('fsheet');
  var overlay = document.getElementById('fsheet-overlay');
  var title   = document.getElementById('fsheet-title');
  var body    = document.getElementById('fsheet-body');
  if (!fsheet || !body) return;

  title.textContent = PILL_LABELS[key] || key;
  body.innerHTML = '';

  var opts = getOptsForKey(key);
  opts.forEach(function(val) {
    var cnt = countFor(key, val);
    var isOn = AF[key] && AF[key].indexOf(val) !== -1;
    // Nascondi opzioni con 0 risultati che non sono selezionate
    if (cnt === 0 && !isOn) return;

    var div = document.createElement('div');
    div.className = 'ci' + (isOn ? ' on' : '') + (cnt === 0 ? ' ci-disabled' : '');
    div.dataset.key = key;
    div.dataset.val = val;
    div.style.opacity = cnt === 0 ? '0.4' : '';
    div.innerHTML =
      '<div class="cb' + (isOn ? ' on' : '') + '">' +
        '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">' +
          '<polyline points="20 6 9 17 4 12"/>' +
        '</svg>' +
      '</div>' +
      '<span class="ci-lbl">' + val + '</span>' +
      '<span class="ci-n">' + cnt + '</span>';

    div.addEventListener('click', function() {
      if (this.classList.contains('ci-disabled')) return;
      var k = this.dataset.key, v = this.dataset.val;
      var arr = AF[k], idx = arr.indexOf(v);
      var cb = this.querySelector('.cb');
      if (idx === -1) {
        arr.push(v);
        cb.classList.add('on');
        this.classList.add('on');
      } else {
        arr.splice(idx, 1);
        cb.classList.remove('on');
        this.classList.remove('on');
      }
      updateBadges();
      render();
      // Ricalcola conteggi e aggiorna le opzioni nel sheet
      refreshFsheetCounts(key);
      updatePills();
    });
    body.appendChild(div);
  });

  overlay.classList.add('open');
  fsheet.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFsheet() {
  var fsheet  = document.getElementById('fsheet');
  var overlay = document.getElementById('fsheet-overlay');
  if (fsheet)  fsheet.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  _fsheetKey = null;
}

function refreshFsheetCounts(key) {
  // Aggiorna i conteggi nelle opzioni già visibili nel sheet
  var body = document.getElementById('fsheet-body');
  if (!body) return;
  body.querySelectorAll('.ci').forEach(function(div) {
    var k = div.dataset.key, v = div.dataset.val;
    var cnt = countFor(k, v);
    var el = div.querySelector('.ci-n');
    if (el) el.textContent = cnt;
    var isOn = AF[k] && AF[k].indexOf(v) !== -1;
    if (cnt === 0 && !isOn) {
      div.style.opacity = '0.4';
      div.classList.add('ci-disabled');
    } else {
      div.style.opacity = '';
      div.classList.remove('ci-disabled');
    }
  });
}

function updatePills() {
  // Aggiorna stato visivo pill (attive/inattive) e mostra pill reset
  var anyActive = false;
  Object.keys(PILL_LABELS).forEach(function(key) {
    var pill = document.getElementById('fpill-' + key);
    if (!pill) return;
    var count = AF[key] ? AF[key].length : 0;
    var isActive = count > 0;
    if (isActive) anyActive = true;
    pill.classList.toggle('active', isActive);
    // Aggiorna testo pill con contatore se attiva
    var badge = pill.querySelector('.fpill-cnt');
    if (isActive) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'fpill-cnt';
        pill.appendChild(badge);
      }
      badge.textContent = count;
    } else {
      if (badge) badge.remove();
    }
  });
  // fpill-reset nascosto sempre dalla pills bar — il reset appare vicino al contatore
  var resetPill = document.getElementById('fpill-reset');
  if (resetPill) resetPill.classList.add('hidden');
  // Riordina: pill attive prima
  reorderPills();
}

function reorderPills() {
  var scroll = document.getElementById('pills-scroll');
  if (!scroll) return;
  var pills = Array.from(scroll.querySelectorAll('.fpill[data-key]'));
  var resetPill = document.getElementById('fpill-reset');
  // Separa attive e inattive
  var active = pills.filter(function(p){ return p.classList.contains('active'); });
  var inactive = pills.filter(function(p){ return !p.classList.contains('active'); });
  // Riposiziona: attive → inattive → reset
  active.forEach(function(p){ scroll.appendChild(p); });
  inactive.forEach(function(p){ scroll.appendChild(p); });
  if (resetPill) scroll.appendChild(resetPill);
}

function initF() {
  // Listener pills
  document.querySelectorAll('.fpill[data-key]').forEach(function(pill) {
    pill.addEventListener('click', function() {
      openFsheet(this.dataset.key);
    });
  });

  // Pill reset
  var resetPill = document.getElementById('fpill-reset');
  if (resetPill) {
    resetPill.addEventListener('click', function() {
      // Reset tutti i filtri
      AF = {cat:[], dis:[], abv:[], frz:[], bic:[], iba:[]};
      updateBadges();
      render();
      updatePills();
    });
  }

  // Fsheet: done button, overlay, footer (fascia handle)
  var fsheetDone   = document.getElementById('fsheet-done');
  var fsheetOvl    = document.getElementById('fsheet-overlay');
  var fsheetFooter = document.getElementById('fsheet-footer');
  if (fsheetDone) {

    function _fsheetDoneFlash() {
      fsheetDone.classList.remove('btn-flash');
      void fsheetDone.offsetWidth;
      fsheetDone.classList.add('btn-flash');
      setTimeout(function(){ fsheetDone.classList.remove('btn-flash'); fsheetDone.blur(); }, 300);
    }

    function _fsheetDoneAction() {
      _fsheetDoneFlash();
      closeFsheet();
      updateBadges();
      render();
      if (typeof updatePills === 'function') updatePills();
    }

    // ── Pointer Events API: il metodo più affidabile cross-platform ──
    // Funziona su: iOS Safari 13+, Android Chrome, Samsung Browser, PWA
    // Un solo evento coerente invece di gestire touch + mouse separatamente
    if (window.PointerEvent) {
      fsheetDone.addEventListener('pointerdown', function(e) {
        // Flash visivo immediato al tocco
        _fsheetDoneFlash();
      });
      fsheetDone.addEventListener('pointerup', function(e) {
        // Esegui azione solo se il pointer è ancora sopra il bottone
        _fsheetDoneAction();
      });
      // Previeni double-fire con click su dispositivi che generano entrambi
      fsheetDone.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    } else {
      // Fallback per browser senza PointerEvent (Safari < 13)
      var _fsheetDoneTouched = false;
      fsheetDone.addEventListener('touchstart', function(e) {
        _fsheetDoneTouched = true;
        _fsheetDoneFlash();
      }, {passive: true});
      fsheetDone.addEventListener('touchend', function(e) {
        e.preventDefault();
        if (_fsheetDoneTouched) {
          _fsheetDoneTouched = false;
          _fsheetDoneAction();
        }
      });
      fsheetDone.addEventListener('click', function(e) {
        if (_fsheetDoneTouched) { _fsheetDoneTouched = false; return; }
        _fsheetDoneAction();
      });
    }
  }
  if (fsheetOvl)  fsheetOvl.addEventListener('click', closeFsheet);
  // Tap + swipe up solo dal footer (fascia del trattino)
  if (fsheetFooter) {
    var _fsY = 0;
    fsheetFooter.addEventListener('click', closeFsheet);
    fsheetFooter.addEventListener('touchstart', function(e){
      _fsY = e.touches[0].clientY;
    }, {passive:true});
    fsheetFooter.addEventListener('touchend', function(e){
      var dy = _fsY - e.changedTouches[0].clientY;
      if (dy > 30) closeFsheet(); // swipe up
    }, {passive:true});
  }

  updatePills();
}


// ═══ RESET COMPLETO (filtri + ricerca) ═══
document.addEventListener('DOMContentLoaded', function(){
  var resetBtn = document.getElementById('btn-reset');
  if(resetBtn) resetBtn.addEventListener('click', function(){
    var self = this;
    AF = {cat:[], dis:[], abv:[], frz:[], bic:[], iba:[]};
    Q = '';
    var srch = document.getElementById('srch');
    if(srch) srch.value = '';
    // Reset sort ad A→Z
    var srtEl = document.getElementById('srt');
    if (srtEl) { srtEl.value = 'az'; }
    updateBadges();
    render();
    if (typeof updatePills === 'function') updatePills();
    // Micro-animazione conferma reset
    self.classList.remove('did-reset');
    void self.offsetWidth;
    self.classList.add('did-reset');
    setTimeout(function(){ self.classList.remove('did-reset'); }, 400);
  });
});

function updateBadges() {
  var tagsEl = document.getElementById("active-tags");
  tagsEl.innerHTML = "";
  var allKeys = ["cat","dis","abv","frz","bic","iba"];
  var totalActive = 0;
  for(var ki=0;ki<allKeys.length;ki++){
    var k=allKeys[ki];
    totalActive += AF[k].length;
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
        updateBadges();
        render();
        if (typeof updatePills === 'function') updatePills();
      });
      tagsEl.appendChild(tag);
    }
  }
  // Bottone Reset inline — appare solo se filtri attivi >= 2
  if (totalActive >= 2) {
    var resetBtn = document.createElement("button");
    resetBtn.className = "active-tag-reset";
    resetBtn.innerHTML = '&#x2715; Reset';
    resetBtn.addEventListener("click", function(){
      AF = {cat:[], dis:[], abv:[], frz:[], bic:[], iba:[]};
      updateBadges();
      render();
      if (typeof updatePills === 'function') updatePills();
    });
    tagsEl.appendChild(resetBtn);
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
  if(AF.iba.length){res=res.filter(function(c){return c.iba===true||c.iba==="true";});}
  if(FAV_ONLY){var favs=loadFavs();res=res.filter(function(c){return favs.indexOf(c.name)!==-1;});}
  var _srtEl=document.getElementById("srt"); var s=_srtEl?_srtEl.value:"az";
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
  // Aggiorna contatore risultati
  var rcntEl = document.getElementById("result-count");
  if(rcntEl) rcntEl.textContent = RES.length + ' cocktail';
  g.innerHTML="";
  if(!RES.length){
    var em=document.createElement("div");em.className="empty";
    if(FAV_ONLY){
      if(typeof isPremium === 'function' && !isPremium()){
        em.innerHTML='<div class="ico" style="font-size:2.5rem;">🔒</div><h3 style="margin:.5rem 0 .3rem;">Funzione Premium</h3><p>I preferiti sono disponibili con il piano Premium.<br>Passa a Premium per salvare i tuoi cocktail preferiti.</p><button onclick="showPremiumModal()" style="margin-top:1rem;padding:.6rem 1.4rem;background:#f59e0b;color:#0f172a;border:none;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit;">Scopri Premium →</button>';
      } else {
        em.innerHTML='<div class="ico">❤️</div><h3>Lista preferiti vuota</h3><p>Tocca il cuore su un cocktail per aggiungerlo ai tuoi preferiti</p>';
      }
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
      (c.iba?'<div class="card-iba-badge">IBA</div>':'')+
      '<div class="sap-strip">'+sapHtml+'</div></div>'+
      '<div class="card-body">'+
      '<div class="card-top"><div class="card-name">'+c.name+'</div></div>'+
      '<div class="card-meta">'+
      '<div class="mrow">🥃&nbsp;'+(Array.isArray(c.distillato)&&c.distillato.length?c.distillato.join(', '):(c.distillato||'Analcolico'))+'</div>'+
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
    (c.iba?'<span class="m-iba-badge">✦ IBA OFFICIAL COCKTAIL</span>':'');
  document.getElementById("m-grid").innerHTML=
    '<div class="mi"><div class="mi-lbl">Bicchiere</div><div class="mi-val">'+(c.bicchiere||'-')+'</div></div>'+
    '<div class="mi"><div class="mi-lbl">Garnish</div><div class="mi-val">'+c.garnish+'</div></div>'+
    '<div class="mi"><div class="mi-lbl">Categoria</div><div class="mi-val">'+c.categoria+'</div></div>'+
    '<div class="mi"><div class="mi-lbl">Tenore ABV</div><div class="mi-val '+aclass(c.abv)+'">'+c.abv+'</div></div>';
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
}

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
  // Blocca sezione preferiti per utenti free
  if(typeof isPremium === 'function' && !isPremium()){
    requirePremium('Preferiti');
    return;
  }
  FAV_ONLY=!FAV_ONLY;
  this.classList.toggle("active",FAV_ONLY);
  if(!FAV_ONLY){
    this.blur();
    var btn=this;
    btn.classList.add('fav-resetting');
    requestAnimationFrame(function(){ btn.classList.remove('fav-resetting'); });
  }
  render();
  updateAllCounts();
});
// ═══════════ AUTOCOMPLETE RICERCA ═══════════
(function(){
  var WORKER_URL = 'https://cocktail-legend-ai.daniel-sportelli.workers.dev';
  var MAX = 30;
  var _usageCache = null; // cache locale {monthlyCount, extraCredits, periodStart}
  var currentCmd = null;
  var selectedPill = null;
  var lastRawText = '';
  var lastUserInput = '';
  var giornoTipo = null; // 'alcolico' o 'analcolico'

  // Stato multi-step signature
  var sig = { tipo: null, momento: null, gusto: null, tenore: null, bicchiere: null };

  // ─── PROMPTS per i 5 comandi semplici ───────────────────────────
  var PROMPTS = {
    twist: {
      maxTokens: 1500,
      label: 'Scrivi un drink classico e ti propongo 3 varianti',
      placeholder: 'es. Negroni, Old Fashioned, Margarita...',
      usePills: false,
      fuType: 'tre',
      build: function(v){
        // Cerca nel database se il cocktail è presente
        var cocktailRef = '';
        if(typeof DATA !== 'undefined' && DATA.length){
          var nome = v.trim().toLowerCase();
          var found = DATA.find(function(c){ return c.name.toLowerCase() === nome || c.name.toLowerCase().indexOf(nome) !== -1; });
          if(found){
            var ing = found.ingredienti.map(function(i){ return i[0] + ' ' + i[1]; }).join(', ');
            cocktailRef = '\n\nRICETTA ORIGINALE DI RIFERIMENTO (rispettala come base di partenza):\n' + found.name + ': ' + ing + '. Tecnica: ' + (found.tecnica||'') + '. Bicchiere: ' + (found.bicchiere||'') + '.';
          }
        }
        return 'Voglio fare un twist creativo su: ' + v + '.' + cocktailRef + '\n\nREGOLA FONDAMENTALE: un twist non è un signature. Ogni reinterpretazione deve rimanere RICONOSCIBILE come variante del classico — stessa logica strutturale di base, stesso profilo di appartenenza. Chi lo beve deve percepire il classico di partenza reinterpretato, non un drink completamente nuovo. Se cambi tutto (base alcolica, struttura, profilo gusto, tecnica) non è più un twist — è un signature. Mantieni almeno 2-3 elementi chiave del classico originale in ogni variante.\n\nREGOLA DOSI: mantieni proporzioni coerenti con il classico di partenza. Se sostituisci un ingrediente (es. Vermouth con Porto, Campari con altro bitter) la dose di partenza è la stessa — poi ragiona su zuccherino, alcolicità e balance e segnala dove intervenire. Ogni proposta è un punto di partenza tecnico da assaggiare e bilanciare sul momento prima del servizio.\n\nProponmi esattamente 3 reinterpretazioni originali e distinte tra loro, separate da ---.\nLe 3 varianti devono esplorare direzioni diverse restando nell\'orbita del classico: una più elegante/stagionale, una con tecnica avanzata o ingrediente homemade, una contemporanea con un twist inaspettato ma coerente.\n\nPer ognuna usa questa struttura esatta:\n## NOME TWIST\n(scrivi direttamente una riga che descrive cosa cambia rispetto al classico e perché rimane un twist — NON scrivere "Concept in 1 riga" o altre istruzioni)\n## RICETTA\n- dose ml Ingrediente (lista completa con dosi in ml)\n**Tecnica:** descrizione precisa\n**Bicchiere:** specificare\n**Garnish:** specificare con tecnica di preparazione se non standard\n## PREPARAZIONI\n(solo se serve uno sciroppo, infuso, tintura, bitter, oleo saccharum, cordiale o altra prep homemade — **Nome prep:** procedimento sintetico ma completo. Ometti la sezione se non necessario.)\n## PERSONALIZZAZIONE\nConsiglio tecnico di bilanciamento — dove intervenire su dolcezza, acidità, diluizione o alcolicità rispetto al classico di partenza. Ricorda che è sempre un punto di partenza da assaggiare.\n\nNessuna sezione extra. Tre drink completi e professionali.\n\n* Ogni proposta è un punto di partenza: gli ingredienti reali variano (un vermouth può essere più dolce di un altro, le fragole precoci non sono tutte uguali, due gin possono avere sentori diversi). Assaggia sempre e bilancia a tuo piacere prima del servizio.';
      }
    },
    pairing: {
      maxTokens: 2000,
      label: 'Descrivi il piatto e ti propongo 3 drink',
      placeholder: 'es. Tartare di tonno con avocado e sesamo...',
      usePills: false,
      fuType: 'tre',
      build: function(v){
        var classici50 = 'Negroni|30 ml Gin, 30 ml Vermouth rosso, 30 ml Bitter rosso|Old fashioned|Zest di arancia\nAmericano|30 ml Bitter rosso, 30 ml Vermouth rosso, 30 ml Soda|Old fashioned|Zest di limone + fetta di arancia\nSpritz|90 ml Prosecco, 60 ml Aperol, 30 ml Soda|Highball|Fetta di arancia\nMartini Dry|60 ml Gin, 15 ml Vermouth dry|Coppetta|Olive verdi\nManhattan|50 ml Rye whiskey, 22,5 ml Vermouth rosso, 2 dash Angostura bitters|Coppetta|Ciliegia\nBoulevardier|30 ml Bourbon whiskey, 30 ml Bitter rosso, 30 ml Vermouth rosso|Old fashioned|Zest di arancia\nHanky Panky|45 ml Gin, 45 ml Vermouth rosso, 1 bspoon Fernet|Coppetta|Zest di arancia\nNew York Sour|50 ml Bourbon whiskey, 22,5 ml Succo di limone, 15 ml Sciroppo di zucchero, q.b. Albume d\'uovo o foamer, 15 ml Vino rosso|Tumbler basso|Zest di limone + amarena\nDaiquiri|50 ml Rum, 22,5 ml Succo di lime, 15 ml Sciroppo di zucchero|Coppetta|Rondella di lime\nMojito|50 ml Rum, 22,5 ml Succo di lime, 15 ml Sciroppo di zucchero, 8 Foglie di menta, Top Soda|Highball|Ciuffo di menta + lime\nMargarita|50 ml Tequila, 22,5 ml Triple sec, 15 ml Succo di lime, q.b. Crusta di sale|Coppetta|Rondella di lime\nPaloma|50 ml Tequila, 15 ml Succo di lime, 120 ml Soda al pompelmo rosa, q.b. Pizzico di sale|Highball|Fetta di pompelmo rosa\nGin Tonic|50 ml Gin, 150 ml Acqua tonica|Highball|Zest di limone\nGin Basil Smash|60 ml Gin, 22,5 ml Succo di limone, 15 ml Sciroppo di zucchero, 6/8 Foglie di basilico|Tumbler basso|Ciuffo di basilico\nBramble|50 ml Gin, 22,5 ml Succo di limone, 15 ml Sciroppo di zucchero, 15 ml Liquore alle more|Tumbler basso|More\nBloody Mary|45 ml Vodka, 90 ml Succo di pomodoro, 15 ml Succo di limone, 2 dash Worcestershire, 2 dash Tabasco, q.b. Sale e pepe|Highball|Sedano + fetta di limone\nMoscow Mule|50 ml Vodka, 15 ml Succo di lime, 120 ml Ginger beer|Mug di rame|Ciuffo di menta + lime\nCaipirinha|60 ml Cachaça, 2 bspoon Zucchero bianco, 1/2 Lime fresco|Tumbler basso|Spicchio di lime\nNaked & Famous|22,5 ml Mezcal, 22,5 ml Aperol, 22,5 ml Chartreuse gialla, 22,5 ml Succo di lime|Coppetta|Zest di arancia\nWhite Negroni|30 ml Gin, 30 ml Amaro alla genziana, 30 ml Aperitivo bianco|Old fashioned|Zest di limone';

        return 'Devo abbinare cocktail a questo piatto: ' + v + '\n\nPrima di proporre: analizza il profilo del piatto — grassi, acidità, sapidità, dolcezza, amaro, spezie, texture — e considera la temperatura di servizio (un piatto caldo si abbina diversamente da un crudo o un freddo).\n\nProponmi esattamente 3 drink con logiche distinte, separati da ---:\n\n1. CLASSICO: scegli il classico più adatto tra questi 20 — formato: Nome|ingredienti|Bicchiere|Garnish. Usa ESATTAMENTE le dosi e gli ingredienti indicati, senza modifiche. Il drink deve essere accessibile e immediato:\n' + classici50 + '\n\n2. AFFINITÀ: un drink che amplifica e rispecchia i sapori principali del piatto — può essere più elaborato, con ingredienti homemade o tecnica avanzata.\n3. CREATIVO/INASPETTATO: un abbinamento sorprendente, quasi un signature pensato per quel piatto specifico — si può osare con tecnica e ingredienti insoliti.\n\nPer ognuno usa questa struttura esatta:\n## NOME DRINK\n(scrivi direttamente perché funziona con questo piatto — NON scrivere "Logica di abbinamento in 1 riga" o altre istruzioni)\n## RICETTA\n- dose ml Ingrediente (lista completa con dosi in ml)\n**Tecnica:** descrizione precisa\n**Bicchiere:** specificare\n**Garnish:** specificare\n## PREPARAZIONI\n(solo se serve una prep homemade — **Nome prep:** procedimento sintetico. Ometti se non necessario. Per il classico ometti sempre.)\n## PERSONALIZZAZIONE\nConsiglio su timing del servizio rispetto al piatto — prima, durante o dopo — e aggiustamento fine del bilanciamento.\n\nNessuna sezione extra. Tre drink completi e professionali.\n\n* Ogni proposta è un punto di partenza: gli ingredienti reali variano (un vermouth può essere più dolce di un altro, le fragole precoci non sono tutte uguali, due gin possono avere sentori diversi). Assaggia sempre e bilancia a tuo piacere prima del servizio.';
      }
    },
    giorno: {
      maxTokens: 700,
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

        // Lista ampliata a 30 ingredienti per mese — frutta, verdura, erbe, fiori edibili, spezie, radici
        var ingredientiStagione = {
          'gennaio':['limone','arancia amara','pompelmo rosa','kumquat','bergamotto','cedro','vaniglia','radice di zenzero','barbabietola','mela cotogna','melograno','finocchio','timo fresco','rosmarino','radice di rafano','anice stellato','cannella in stecca','pepe nero','chiodi di garofano','noce moscata','aglio nero fermentato','the nero affumicato','radice di curcuma','fiori di camomilla secchi','mela verde','pera kaiser','cachi secchi','dattero medjool','scorza di agrumi candita','fava tonka'],
          'febbraio':['pompelmo','bergamotto','arancia rossa','limone','kumquat','finocchio','carciofo','vaniglia','zenzero','miele di castagno','timo','lavanda secca','radice di liquirizia','scorza di pompelmo','arance tarocco','mandarino tardivo','pepe lungo','cardamomo verde','petali di rosa essiccati','ibisco secco','radice di angelica','the pu-erh','fava tonka','rabarbaro secco','sambuco secco','mirtillo rosso americano','melograno','acqua di rose','fiori di mimosa','cannella'],
          'marzo':['fragole precoci','rabarbaro','menta fresca','piselli freschi','asparagi verdi','limone','pompelmo','timo limone','fiori di violetta','miele millefiori','ginger fresco','tarassaco','borragine','acetosella selvatica','aglio orsino','fiori di primula','erba cipollina','fiori di ciliegio','pimpinella','spinacio baby','crescione','melissa fresca','prezzemolo fresco','scorza di limone','fiori di arancio','the verde matcha','radice di bardana','fiori di campo','aneto fresco','germogli di abete'],
          'aprile':['fragole','rabarbaro','fiori di sambuco','ciliegie precoci','menta piperita','basilico fresco','asparagi','limone','piselli','miele acacia','timo','fiori di lavanda','acetosella','fiori di biancospino','aglio orsino','fiori di glicine edibili','crescione','erba cedrina','borragine','ortica giovane','fiori di nasturzio','fiori di viola','rucola selvatica','aneto fresco','maggiorana fresca','fiori di camomilla freschi','kiwi','fragolina di bosco','miele di tiglio','fiori di sambuco precoci'],
          'maggio':['fragole mature','ciliegie','fiori di sambuco','basilico genovese','menta','limone','albicocche precoci','rosa canina','cedro','kumquat','erba cedrina','verbena','melissa','fiori di acacia','lamponi precoci','ribes rosso','fiori di lavanda freschi','dragoncello','fiori di nasturzio','maggiorana','fiori di borragine','timo limonato','gelsomino edibile','fiori di salvia','rabarbaro maturo','aneto','finocchietto selvatico','origano fresco','pisello mangiatutto','fiori di rosa'],
          'giugno':['fragole','ciliegie','albicocche','pesche precoci','fiori di sambuco','basilico','menta','lamponi','ribes rosso','lavanda','limone','melone cantalupo','pomodorini','cetriolo','fiori di zucca','mirto','fiori di nasturzio','timo','salvia fresca','menta romana','fiori di ibisco freschi','anguria precoci','fiori di camomilla','ribes nero','prugne gialle','fiori di tiglio','melissa','dragoncello','fiori di malva','origano in fiore'],
          'luglio':['pesche','albicocche','anguria','melone retato','lamponi','mirtilli','more precoci','basilico','menta','lavanda','fico d\u0027india','susine','cetriolo','pomodoro','fiori di nasturzio','fiori di zucca','erba cipollina in fiore','timo selvatico','fiori di calendula','camomilla fresca','basilico greco','menta acquatica','finocchietto','pomodoro verde','melone bianco','prugne rosse','fiori di ibisco','coriandolo fresco','peperoncino fresco','origano selvatico'],
          'agosto':['pesche noci','fichi freschi','anguria','melone','more','lamponi','mirtilli','pomodoro','basilico','lavanda','fico','uva fragola','prugne','zucchina','melanzana','peperone','basilico viola','maggiorana','fiori di cappero','uva acerba','corbezzolo','fico d\u0027india maturo','pesca tabacchiera','amarena','sedano rapa','pomodoro camone','origano secco appena essiccato','alloro fresco','finocchio selvatico','fiori di aglio selvatico'],
          'settembre':['fichi','uva nera','uva bianca','pere williams','mele golden','mirtilli','more','rosmarino','salvia','miele di fiori','melograno','marroni','zucca','nocciole fresche','uva moscato','prugne selvatiche','cotogna','mela annurca','fico secco','corbezzolo maturo','amarena sotto spirito','mirtillo rosso','noci verdi','bacche di ginepro fresche','sorbe','the nero di qualita','sapa d\u0027uva','vino cotto','fiori di erica','rabarbaro tardivo'],
          'ottobre':['mele renette','pere','melograno','fichi secchi','uva fragola','zucca','marroni','rosmarino','timo','salvia','cachi','noci fresche','mele cotogne','chiodi di garofano','topinambur','finocchio selvatico secco','alloro','bacche di sambuco','castagna fresca','radice di zenzero essiccata','melissa secca','camomilla secca','bacche di rosa canina','biancospino','radice di cicoria','aglio nero','pepe della jamaica','anice verde','fiori di lavanda secca','cardamomo'],
          'novembre':['melograno','cachi','mele cotogne','marroni','arance','mandarini','cannella','vaniglia','chiodi di garofano','noce moscata','rosmarino','miele di castagno','zenzero','clementine','bergamotto','tartufo nero','topinambur','radice di rafano','fava tonka','anice stellato','cardamomo','pepe szechuan','the affumicato lapsang','radice di liquirizia','prugna secca','fico secco','datteri','noci tostate','scorza di agrumi candita','cachi fuyu'],
          'dicembre':['arancia','mandarino','clementine','melograno','cannella','chiodi di garofano','anice stellato','vaniglia','castagne','cachi','cedro','bergamotto','noce moscata','kumquat','arancia amara','scorza di limone candita','mele cotogne','dattero','fico secco','prugna secca','cardamomo nero','pepe lungo','radice di zenzero candita','fiori di arancio essiccati','the chai','miele di abete','pinoli tostati','vin brule spezie','scorza di arancia','fava tonka']
        };

        var lista = ingredientiStagione[mese] || ['ingredienti freschi di stagione'];
        // Selezione RANDOM dalla lista
        var ingScelto = lista[Math.floor(Math.random() * lista.length)];

        var tipoStr = giornoTipo==='analcolico' ? 'ANALCOLICO (zero alcol)' : 'ALCOLICO, stile '+v;
        var stileNote = giornoTipo==='analcolico' ? '' : '\nStile: '+v+'.';

        return 'Oggi è il ' + now.getDate() + ' ' + mese + ', siamo in ' + stagione + '.\n\nCrea il cocktail del giorno '+tipoStr+'.\n\nINGREDIENTE PROTAGONISTA (obbligatorio): '+ingScelto+'.\nDeve essere il cuore del drink — non un semplice garnish o tocco finale. Costruisci tutta la struttura aromatica e tecnica intorno a lui. Se l\'ingrediente lo permette, considera una preparazione homemade (sciroppo, oleo saccharum, infuso, cordiale, shrub, tintura) per esaltarlo al massimo.\n\nREGOLA STRUTTURA: il drink deve avere una struttura originale e stagionalmente coerente. Scegli base alcolica, profilo gusto, tecnica e bicchiere in modo che il risultato racconti questo momento preciso dell\'anno e dimostri padronanza tecnica reale.'+stileNote+'\n\nRispondi SOLO con questa struttura:\n## NOME DRINK\n(scrivi direttamente una riga che racconta il concept del drink e perché è perfetto per oggi — NON scrivere "Concept in 1 riga" o altre istruzioni)\n## RICETTA\n- dose ml Ingrediente (lista completa con dosi in ml)\n**Tecnica:** descrizione precisa\n**Bicchiere:** specificare\n**Garnish:** specificare con tecnica se non standard\n## PREPARAZIONI\n(solo se usi sciroppi, infusi, oleo saccharum, cordiali o altre prep — **Nome prep:** procedimento sintetico ma completo. Ometti se non necessario.)\n## INGREDIENTE PROTAGONISTA\nPerché '+ingScelto+' è perfetto in questo momento della stagione, come si esprime nel drink e quale tecnica lo valorizza meglio.\n## PERSONALIZZAZIONE\nConsiglio tecnico di bilanciamento — dove agire se il drink risulta troppo dolce, acido, alcolico o piatto.\n\n* Ogni proposta è un punto di partenza: gli ingredienti reali variano (le fragole precoci non sono tutte uguali, un distillato può avere sentori diversi da un altro della stessa categoria). Assaggia sempre e bilancia a tuo piacere prima del servizio.';
      }
    }
  };

  // ─── BUILD PROMPT SIGNATURE ──────────────────────────────────────
  function buildSignaturePrompt(ingredienti){
    var tipo = sig.tipo;
    var lines = [];
    if(tipo === 'alcolico'){
      lines.push('Crea un signature drink ALCOLICO originale con queste caratteristiche:');
      lines.push('- Momento di servizio: ' + sig.momento);
      lines.push('- Tenore alcolico: ' + sig.tenore);
      if(sig.bicchiere) lines.push('- Bicchiere: ' + sig.bicchiere);
    } else {
      lines.push('Crea un signature drink ANALCOLICO (zero alcol assoluto) con queste caratteristiche:');
      lines.push('- Profilo gusto: ' + sig.gusto);
    }
    lines.push('- Ingredienti disponibili: ' + ingredienti);
    lines.push('');
    lines.push('REGOLA CONCEPT: un signature non è un classico rielaborato — è un drink con una identità propria e irripetibile. Il concept deve raccontare qualcosa di specifico: un territorio, una stagione vissuta, un\'emozione precisa, un ingrediente che diventa protagonista assoluto. NON accettare concept generici come "fresco ed estivo" o "caldo e avvolgente" — deve esserci una storia dietro.');
    lines.push('');
    lines.push('REGOLA PREP HOMEMADE: un signature deve avere almeno una preparazione homemade (sciroppo artigianale, infuso, oleo saccharum, cordiale, shrub, tintura, bitter, fat wash, fermentato) che lo renda unico e non replicabile al banco di un altro bar. È questa prep che fa la differenza tra un drink qualsiasi e un signature.');
    lines.push('');
    lines.push('Rispondi SOLO con questa struttura esatta:');
    lines.push('## NOME DRINK');
    lines.push('(scrivi direttamente una riga con la storia o l\'emozione specifica che racconta — NON scrivere "Concept in 1 riga" o altre istruzioni)');
    lines.push('## RICETTA');
    lines.push('- dose ml Ingrediente (lista completa con dosi in ml)');
    lines.push('**Tecnica:** descrizione precisa');
    lines.push('**Bicchiere:** specificare');
    lines.push('**Garnish:** specificare con tecnica se non standard');
    lines.push('## PREPARAZIONI');
    lines.push('**Nome prep:** procedimento completo ma sintetico — ingredienti, dosi, tempi, metodo. Questa sezione è quasi sempre obbligatoria in un signature.');
    lines.push('## PERSONALIZZAZIONE');
    lines.push('Consiglio tecnico su come bilanciare il drink sul momento — dove agire su dolcezza, acidità, diluizione, temperatura. Ricorda che è sempre un punto di partenza da assaggiare prima del servizio.');
    lines.push('');
    lines.push('* Ogni proposta è un punto di partenza: gli ingredienti reali variano (un vermouth può essere più dolce di un altro, le fragole precoci non sono tutte uguali, due gin possono avere sentori diversi). Assaggia sempre e bilancia a tuo piacere prima del servizio.');
    return lines.join('\n');
  }

  // ─── USAGE ───────────────────────────────────────────────────────
  // ─── LOGICA DOPPIO CONTATORE ─────────────────────────────────────
  // Primo i crediti mensili (30, si ricaricano ogni 30gg dalla registrazione)
  // Poi i crediti extra (acquistati, non scadono mai)

  function _isPeriodExpired(periodStart){
    if(!periodStart) return true;
    var start = new Date(periodStart);
    var now = new Date();
    var diff = (now - start) / (1000 * 60 * 60 * 24);
    return diff >= 30;
  }

  function getMonthlyUsed(){ return _usageCache ? (_usageCache.monthlyCount || 0) : 0; }
  function getExtraCredits(){ return _usageCache ? (_usageCache.extraCredits || 0) : 0; }
  function getMonthlyRemaining(){ return Math.max(0, MAX - getMonthlyUsed()); }
  function getTotalRemaining(){ return getMonthlyRemaining() + getExtraCredits(); }

  function getUsage(){
    // Compatibilità con chiamate esistenti — restituisce crediti totali usati questo periodo
    return getMonthlyUsed();
  }

  function incUsage(){
    if(!_usageCache) return 0;
    var user = window._currentUser;
    var db = window._fbDb;
    var docFn = window._fbFunctions ? window._fbFunctions.doc : null;
    var setDoc = window._fbFunctions ? window._fbFunctions.setDoc : null;
    if(!user || !db || !docFn || !setDoc) return getTotalRemaining();

    // Scala prima dai mensili, poi dagli extra
    if(_usageCache.monthlyCount < MAX){
      _usageCache.monthlyCount++;
    } else if(_usageCache.extraCredits > 0){
      _usageCache.extraCredits--;
    }

    var userDoc = docFn(db, 'users', user.uid);
    setDoc(userDoc, { aiUsage: {
      monthlyCount: _usageCache.monthlyCount,
      extraCredits: _usageCache.extraCredits,
      periodStart: _usageCache.periodStart
    }}, { merge: true }).catch(function(e){ console.warn('incUsage err', e); });

    return getTotalRemaining();
  }

  // Carica usage da Firestore all'avvio
  window.addEventListener('fb-auth-ready', function(e){
    if(!e.detail.user) return;
    var user = e.detail.user;
    var db = window._fbDb;
    var docFn = window._fbFunctions ? window._fbFunctions.doc : null;
    var getDoc = window._fbFunctions ? window._fbFunctions.getDoc : null;
    var setDoc = window._fbFunctions ? window._fbFunctions.setDoc : null;
    var onSnapshot = window._fbFunctions ? window._fbFunctions.onSnapshot : null;
    if(!db || !docFn || !getDoc) return;
    var userDoc = docFn(db, 'users', user.uid);

    function processSnap(snap) {
      var now = new Date();
      var nowStr = now.toISOString().split('T')[0];
      if(snap.exists()){
        var data = snap.data();
        // ── Salva piano utente globalmente ──
        window._userPlan = data.plan || 'free';
        // Se premium, aggiunge classe al body — CSS nasconde tutti i badge lock
        if (window._userPlan === 'premium') {
          document.body.classList.add('user-premium');
        } else {
          document.body.classList.remove('user-premium');
        }

        // ── Controlla se ha già fatto il quiz oggi ──
        window._quizDoneToday = (data.last_played === _todayKeyLocal());
        updateQuizBadge();

        // ── Se premium e aiUsage non esiste → crea automaticamente ──
        if (window._userPlan === 'premium' && !data.aiUsage) {
          var newUsage = { monthlyCount: 0, extraCredits: 0, periodStart: nowStr };
          setDoc(userDoc, { aiUsage: newUsage }, { merge: true })
            .catch(function(e){ console.warn('auto-create aiUsage err', e); });
          _usageCache = newUsage;
          renderUsage();
          renderAccountTab();
          window._renderAccountTab = renderAccountTab;
          return;
        }

        var ai = data.aiUsage || {};
        var periodStart = ai.periodStart || data.createdAt || nowStr;
        // Controlla se il periodo di 30gg è scaduto
        if(_isPeriodExpired(periodStart)){
          var start = new Date(periodStart);
          while(_isPeriodExpired(start.toISOString().split('T')[0])){
            start.setDate(start.getDate() + 30);
          }
          var newPeriodStart = start.toISOString().split('T')[0];
          _usageCache = {
            monthlyCount: 0,
            extraCredits: ai.extraCredits || 0,
            periodStart: newPeriodStart
          };
          setDoc(userDoc, { aiUsage: _usageCache }, { merge: true })
            .catch(function(e){ console.warn('reset period err', e); });
        } else {
          _usageCache = {
            monthlyCount: ai.monthlyCount || 0,
            extraCredits: ai.extraCredits || 0,
            periodStart: periodStart
          };
        }
      } else {
        // Nuovo utente — crea documento
        _usageCache = { monthlyCount: 0, extraCredits: 0, periodStart: nowStr };
        setDoc(userDoc, {
          createdAt: nowStr,
          email: user.email,
          aiUsage: _usageCache
        }).catch(function(e){ console.warn('createUser err', e); });
      }
      renderUsage();
      renderAccountTab();
      window._renderAccountTab = renderAccountTab;
    }

    // Usa onSnapshot se disponibile (aggiornamento real-time), altrimenti getDoc
    if(onSnapshot) {
      onSnapshot(userDoc, processSnap, function(e){ console.warn('onSnapshot err', e); });
    } else {
      getDoc(userDoc).then(processSnap).catch(function(e){
        console.warn('loadUsage err', e);
        _usageCache = { monthlyCount: 0, extraCredits: 0, periodStart: new Date().toISOString().split('T')[0] };
      });
    }
  });
  function renderUsage(){
    var monthly = getMonthlyUsed();
    var extra = getExtraCredits();
    var pct = Math.min(100,(monthly/MAX)*100);
    var fill = document.getElementById('ai-usage-fill');
    if(fill){fill.style.width=pct+'%';fill.style.background=pct>=80?'#ef4444':'var(--amber)';}
    var txt = document.getElementById('ai-usage-txt');
    if(txt){
      if(extra > 0){
        txt.textContent = monthly+'/'+MAX+' + '+extra+' extra';
      } else {
        txt.textContent = monthly+'/'+MAX;
      }
    }
    if(getTotalRemaining()<=0) showExhausted();
  }

  // ─── SALVATI AI ──────────────────────────────────────────────────
  function renderSavedCard(){
    var user = window._currentUser;
    var db = window._fbDb;
    var docFn = window._fbFunctions ? window._fbFunctions.doc : null;
    var getDoc = window._fbFunctions ? window._fbFunctions.getDoc : null;
    if(!user || !db || !docFn || !getDoc) return;
    var userDoc = docFn(db, 'users', user.uid);
    getDoc(userDoc).then(function(snap){
      var saved = [];
      if(snap.exists() && snap.data().savedAI) saved = snap.data().savedAI;
      var el = document.getElementById('ai-saved-card');
      if(!el) return;
      if(!saved.length){ el.style.display='none'; return; }
      el.style.display='block';

      var groups = {};
      var ORDER = ['signature','twist','pairing','giorno'];
      saved.forEach(function(item){
        if(!groups[item.cat]) groups[item.cat]=[];
        groups[item.cat].push(item);
      });
      var CAT_ICONS = {
        signature:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 22v-7"/><path d="M3 3l7 9h4l7-9z"/></svg>',
        twist:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
        pairing:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>',
        giorno:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
      };

      var CHEVRON = '<svg class="saved-chv" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';

      // Conta totale salvati
      var totalCount = saved.length;

      // Header card — chiuso di default
      var cardOpen = el.dataset.open === '1';
      var headerHtml =
        '<div id="saved-card-header" style="display:flex;align-items:center;gap:.5rem;cursor:pointer;user-select:none;">'+
          '<div style="width:26px;height:26px;background:rgba(37,99,235,.2);border-radius:7px;display:grid;place-items:center;flex-shrink:0;">'+
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'+
          '</div>'+
          '<div style="flex:1;">'+
            '<div style="font-size:.72rem;font-weight:700;color:#60a5fa;">Le tue ricerche salvate</div>'+
            '<div style="font-size:.58rem;color:var(--dim);">'+totalCount+' '+(totalCount===1?'elemento':'elementi')+' salvati</div>'+
          '</div>'+
          '<span style="color:var(--dim);transition:transform .2s;display:block;transform:rotate('+(cardOpen?'180':'0')+'deg);">'+CHEVRON+'</span>'+
        '</div>';

      // Categorie accordion
      var catsHtml = '';
      ORDER.forEach(function(cat){
        if(!groups[cat]) return;
        var items = groups[cat];
        var label = items[0].catLabel;
        var icon = CAT_ICONS[cat] || '';
        var catOpen = el.dataset['cat_'+cat] === '1';
        var itemsHtml = '';
        items.forEach(function(item){
          var d = new Date(item.savedAt);
          var dateStr = d.toLocaleDateString('it-IT',{day:'numeric',month:'short'});
          itemsHtml +=
            '<div class="saved-ai-item" data-id="'+item.id+'" data-cat="'+item.cat+'" style="display:flex;justify-content:space-between;align-items:center;padding:.4rem .5rem;border-radius:7px;background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.12);margin-bottom:.25rem;cursor:pointer;">'+
              '<div style="font-size:.7rem;color:var(--txt2);font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:.5rem;">'+item.title+'</div>'+
              '<div style="display:flex;align-items:center;gap:.4rem;flex-shrink:0;">'+
                '<span style="font-size:.58rem;color:var(--dim);">'+dateStr+'</span>'+
                '<button class="saved-del-btn" data-id="'+item.id+'" style="background:none;border:none;color:var(--dim);cursor:pointer;padding:0;line-height:1;font-size:.8rem;" title="Elimina">×</button>'+
              '</div>'+
            '</div>';
        });
        catsHtml +=
          '<div class="saved-cat-block" data-cat="'+cat+'" style="margin-bottom:.4rem;">'+
            '<div class="saved-cat-header" data-cat="'+cat+'" style="display:flex;align-items:center;gap:.35rem;padding:.35rem .4rem;border-radius:7px;cursor:pointer;background:rgba(37,99,235,.04);">'+
              '<span style="color:#60a5fa;">'+icon+'</span>'+
              '<span style="font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#60a5fa;flex:1;">'+label+'</span>'+
              '<span style="font-size:.58rem;color:var(--dim);margin-right:.3rem;">'+items.length+'</span>'+
              '<span style="color:var(--dim);transition:transform .2s;display:block;transform:rotate('+(catOpen?'180':'0')+'deg);">'+CHEVRON+'</span>'+
            '</div>'+
            '<div class="saved-cat-items" data-cat="'+cat+'" style="display:'+(catOpen?'block':'none')+';padding-top:.25rem;">'+
              itemsHtml+
            '</div>'+
          '</div>';
      });

      var listHtml = '<div id="saved-list" style="margin-top:.7rem;display:'+(cardOpen?'block':'none')+';">'+catsHtml+'</div>';

      el.querySelector('#saved-list').outerHTML = '<div id="saved-list-wrap"></div>';
      el.innerHTML =
        '<div id="saved-list-wrap">'+
          headerHtml+
          '<div id="saved-list" style="margin-top:.7rem;display:'+(cardOpen?'block':'none')+';">'+catsHtml+'</div>'+
        '</div>';

      // Toggle card principale
      el.querySelector('#saved-card-header').addEventListener('click', function(){
        var isOpen = el.dataset.open === '1';
        el.dataset.open = isOpen ? '0' : '1';
        var list = el.querySelector('#saved-list');
        var chv = this.querySelector('.saved-chv');
        if(list) list.style.display = isOpen ? 'none' : 'block';
        if(chv) chv.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });

      // Toggle categorie
      el.querySelectorAll('.saved-cat-header').forEach(function(hdr){
        hdr.addEventListener('click', function(){
          var cat = this.dataset.cat;
          var isOpen = el.dataset['cat_'+cat] === '1';
          el.dataset['cat_'+cat] = isOpen ? '0' : '1';
          var itemsEl = el.querySelector('.saved-cat-items[data-cat="'+cat+'"]');
          var chv = this.querySelector('.saved-chv');
          if(itemsEl) itemsEl.style.display = isOpen ? 'none' : 'block';
          if(chv) chv.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        });
      });

      // Click su item
      el.querySelectorAll('.saved-ai-item').forEach(function(row){
        row.addEventListener('click', function(e){
          if(e.target.classList.contains('saved-del-btn')) return;
          var id = this.dataset.id;
          var found = saved.find(function(s){ return s.id===id; });
          if(found) openSavedItem(found);
        });
      });

      // Click elimina
      el.querySelectorAll('.saved-del-btn').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          var id = this.dataset.id;
          deleteSavedItem(id, saved);
        });
      });
    });
  }

  function openSavedItem(item){
    var panel = document.getElementById('saved-detail-panel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'saved-detail-panel';
      panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg);z-index:9999;display:flex;flex-direction:column;overflow:hidden;';
      document.body.appendChild(panel);
    }
    panel.innerHTML =
      '<div style="flex-shrink:0;background:var(--bg);display:flex;align-items:center;gap:.6rem;padding:.85rem 1rem;border-bottom:1px solid var(--brd);">'+
        '<button id="saved-detail-back" style="background:none;border:none;color:var(--amber);cursor:pointer;font-size:.75rem;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:.3rem;">'+
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Torna'+
        '</button>'+
        '<span style="font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:#60a5fa;">'+item.catLabel+'</span>'+
      '</div>'+
      '<div id="saved-detail-body" style="flex:1;overflow-y:auto;padding:1rem 1rem 2rem;font-size:.78rem;line-height:1.8;color:var(--txt);scrollbar-width:none;-ms-overflow-style:none;">'+
        mdToHtml(item.text)+
      '</div>';
    panel.style.display='flex';
    document.getElementById('saved-detail-back').addEventListener('click', function(){
      panel.style.display='none';
    });
  }

  function deleteSavedItem(id, saved){
    var user = window._currentUser;
    var db = window._fbDb;
    var docFn = window._fbFunctions ? window._fbFunctions.doc : null;
    var setDoc = window._fbFunctions ? window._fbFunctions.setDoc : null;
    if(!user || !db || !docFn || !setDoc) return;
    var newSaved = saved.filter(function(s){ return s.id !== id; });
    var userDoc = docFn(db, 'users', user.uid);
    setDoc(userDoc, { savedAI: newSaved }, { merge: true })
      .then(function(){ renderSavedCard(); })
      .catch(function(e){ console.warn('deleteAI err', e); });
  }

  // Carica salvati quando utente è pronto
  window.addEventListener('fb-auth-ready', function(e){
    if(e.detail.user) setTimeout(renderSavedCard, 800);
  });

  function renderAccountTab(){
    var el = document.getElementById('acc-content');
    if(!el) return;
    var user = window._currentUser;
    if(!user || !_usageCache) return;
    var monthly = getMonthlyUsed();
    var extra = getExtraCredits();
    var monthlyRem = getMonthlyRemaining();
    var pct = Math.min(100,(monthly/MAX)*100);
    var periodStart = _usageCache.periodStart || '';
    var nextReset = '';
    if(periodStart){
      var d = new Date(periodStart);
      d.setDate(d.getDate()+30);
      nextReset = d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
    }

    // Sezione nickname (asincrona) — inserisce placeholder e poi popola
    var nickPlaceholder =
      '<div id="nick-acc-section" style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">' +
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.6rem;">Nickname</div>' +
        '<div style="font-size:.72rem;color:var(--dim);">Caricamento…</div>' +
      '</div>';

    el.innerHTML =
      nickPlaceholder +
      '<div style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">'+
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.35rem;">Accesso effettuato con</div>'+
        '<div style="font-size:.8rem;color:var(--txt2);font-weight:600;">'+user.email+'</div>'+
      '</div>'+
      '<div style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">'+
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.6rem;">Piano attuale</div>'+
        (window._userPlan === 'premium'
          ? '<div style="display:inline-flex;align-items:center;gap:.5rem;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.05));border:1px solid rgba(245,158,11,.35);border-radius:10px;padding:.5rem .9rem;">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
              '<span style="font-size:.82rem;font-weight:800;color:#f59e0b;">Premium</span>' +
            '</div>'
          : '<div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;">' +
              '<div style="display:inline-flex;align-items:center;gap:.5rem;background:rgba(100,116,139,.12);border:1px solid rgba(100,116,139,.25);border-radius:10px;padding:.5rem .9rem;">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                '<span style="font-size:.82rem;font-weight:700;color:#94a3b8;">Free</span>' +
              '</div>' +
              '<button onclick="showPremiumModal()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;border:none;border-radius:10px;padding:.5rem .9rem;font-size:.78rem;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap;">Passa a Premium →</button>' +
            '</div>'
        )+
      '</div>'+
      // Badge "Installa app" — visibile solo su mobile e se non in PWA
      (!(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        ? '<div id="acc-install-badge" style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">'+
            '<button id="acc-install-btn" style="width:100%;display:flex;align-items:center;gap:.65rem;background:var(--bg);border:1px solid var(--brd);border-radius:12px;padding:.75rem .9rem;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:border-color .2s;">'+
              '<div style="width:32px;height:32px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10m0 0l-3-3m3 3l3-3"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>'+
              '</div>'+
              '<div style="display:flex;flex-direction:column;flex:1;min-width:0;">'+
                '<span style="font-size:.82rem;font-weight:700;color:var(--txt);">Come installare l\'app</span>'+
                '<span style="font-size:.68rem;color:var(--dim);font-weight:500;margin-top:.15rem;">Gratis — accedi in un tap, come una vera app.</span>'+
              '</div>'+
              '<svg style="flex-shrink:0;margin-left:auto;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'+
            '</button>'+
          '</div>'
        : ''
      )+
      '<div style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">'+
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.7rem;">Crediti mensili</div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">'+
          '<span style="font-size:.75rem;color:var(--txt2);">'+monthly+' / '+MAX+' usati</span>'+
          '<span style="font-size:.7rem;color:var(--dim);">Reset: '+nextReset+'</span>'+
        '</div>'+
        '<div style="height:5px;background:var(--brd);border-radius:99px;overflow:hidden;">'+
          '<div style="height:100%;width:'+pct+'%;background:'+(pct>=80?'#ef4444':'var(--amber)')+';border-radius:99px;transition:width .4s;"></div>'+
        '</div>'+
        '<div style="font-size:.65rem;color:var(--dim);margin-top:.35rem;">'+monthlyRem+' crediti mensili rimanenti</div>'+
      '</div>'+
      '<div style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">'+
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.5rem;">Crediti extra disponibili</div>'+
        '<div style="font-size:1.4rem;font-weight:800;color:var(--amber);margin-bottom:.2rem;">'+extra+'</div>'+
        '<div style="font-size:.65rem;color:var(--dim);">I crediti extra non hanno scadenza e vengono utilizzati solo dopo aver esaurito i crediti mensili.</div>'+
      '</div>'+
      '<div style="margin-bottom:1rem;">'+
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.7rem;">Acquista crediti extra per le funzioni AI</div>'+
        '<div style="display:flex;flex-direction:column;gap:.5rem;">'+
          '<a href="#" class="acc-pkg-btn" data-pkg="50" style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid var(--brd);border-radius:10px;padding:.65rem .85rem;text-decoration:none;transition:border-color .2s;">'+
            '<div><div style="font-size:.75rem;font-weight:700;color:var(--txt);">50 crediti extra</div><div style="font-size:.62rem;color:var(--dim);">0,039€/credito</div></div>'+
            '<div style="font-size:.85rem;font-weight:800;color:var(--amber);">1,99 €</div>'+
          '</a>'+
          '<a href="#" class="acc-pkg-btn" data-pkg="200" style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid var(--brd);border-radius:10px;padding:.65rem .85rem;text-decoration:none;transition:border-color .2s;">'+
            '<div><div style="font-size:.75rem;font-weight:700;color:var(--txt);">200 crediti extra</div><div style="font-size:.62rem;color:var(--dim);">0,024€/credito</div></div>'+
            '<div style="font-size:.85rem;font-weight:800;color:var(--amber);">4,99 €</div>'+
          '</a>'+
          '<a href="#" class="acc-pkg-btn" data-pkg="1000" style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid rgba(245,158,11,.4);border-radius:10px;padding:.65rem .85rem;text-decoration:none;transition:border-color .2s;">'+
            '<div><div style="font-size:.75rem;font-weight:700;color:var(--txt);">1000 crediti extra <span style="font-size:.58rem;background:var(--amber);color:#000;border-radius:4px;padding:1px 5px;margin-left:4px;">PIÙ VANTAGGIOSO</span></div><div style="font-size:.62rem;color:var(--dim);">0,019€/credito</div></div>'+
            '<div style="font-size:.85rem;font-weight:800;color:var(--amber);">19,99 €</div>'+
          '</a>'+
        '</div>'+
      '</div>'+
      '<div style="border-top:1px solid var(--brd);padding-top:1.5rem;margin-top:.8rem;text-align:center;">'+
        '<button id="acc-logout-btn" style="display:inline-flex;align-items:center;background:transparent;border:1px solid var(--dim);color:var(--dim);font-size:.62rem;font-weight:600;font-family:inherit;cursor:pointer;padding:.35rem .65rem;border-radius:6px;letter-spacing:.05em;text-transform:uppercase;transition:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;">LOGOUT</button>'+
      '</div>';

    // Popola sezione nickname in modo asincrono
    if (window._buildNicknameSection) {
      window._buildNicknameSection(user.uid).then(function(html) {
        var nickEl = document.getElementById('nick-acc-section');
        if (nickEl) {
          nickEl.outerHTML = html;
          if (window._initNicknameAccSection) {
            window._initNicknameAccSection(user.uid);
          }
        }
      });
    }

    // Logout
    var logoutBtn = document.getElementById('acc-logout-btn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', function(){
        if(!confirm('Vuoi disconnetterti?')) return;
        var auth = window._fbAuth;
        var signOutFn = window._fbFunctions ? window._fbFunctions.signOut : null;
        if(auth && signOutFn){
          signOutFn(auth).then(function(){
            localStorage.removeItem('cl_logged');
            location.reload();
          });
        }
      });
    }

    // Install app badge → apre bottom sheet PWA
    var installBtn = document.getElementById('acc-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', function() {
        showInstallPWAModal();
      });
    }
  }
  function showExhausted(){
    var b=document.getElementById('ai-exhausted');
    var btn=document.getElementById('ai-btn');
    var sigBtn=document.getElementById('sig-btn');
    if(b)b.style.display='block';
    if(btn)btn.disabled=true;
    if(sigBtn)sigBtn.disabled=true;
    var d=document.getElementById('ai-reset-date');
    if(d){
      var periodStart = _usageCache ? _usageCache.periodStart : null;
      if(periodStart){
        var next = new Date(periodStart);
        next.setDate(next.getDate()+30);
        d.textContent='Crediti mensili: si ricaricano il '+next.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})+'. Oppure acquista crediti extra nella tab Account.';
      } else {
        d.textContent='Acquista crediti extra nella tab Account.';
      }
    }
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
    if(getTotalRemaining()<=0){showExhausted();return;}
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
    var active=hasText&&getTotalRemaining()>0;
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
    var active=hasVal&&getTotalRemaining()>0;
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
    if(body)body.innerHTML='<div class="ai-thinking"><span class="ai-think-star s1">✦</span><span class="ai-think-star s2">✦</span><span class="ai-think-star s3">✦</span></div>';
    try{
      var res=await fetch(WORKER_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:maxTokensOverride||(currentCmd&&PROMPTS[currentCmd]&&PROMPTS[currentCmd].maxTokens?PROMPTS[currentCmd].maxTokens:1000),
          system:'Sei il Barman AI di Cocktail Legend, un mixologist italiano di livello internazionale con esperienza in bar di ricerca, cocktail competition e alta miscelazione. Parli sempre in italiano. Tono diretto, tecnico e professionale — da collega esperto a collega. Non citare mai database, fonti esterne o tool interni. Le tue risposte sono precise, creative e ancorate alla tecnica reale del bartending moderno.\n\nREGOLA LINGUA: tutto in italiano senza eccezioni — ingredienti, termini tecnici, bicchieri, garnish, note. Esempi corretti: "succo di lime" (non lime juice), "soluzione salina" (non saline solution), "spray di assenzio" (non absinthe rinse), "doppia filtrazione" (non double strain nel testo — puoi usare il termine tecnico nella sezione Tecnica). Nomi di distillati e liquori commerciali restano in lingua originale (es. Campari, Chartreuse, Cointreau).\n\nREGOLA BICCHIERI: usa solo questi bicchieri: Calice, Cocotte, Collins, Coppetta, Flûte, Highball, Hurricane, Irish coffee, Julep cup, Mug di rame, Old fashioned, Shot, Sling, Tumbler basso. Nessun altro bicchiere.\n\nREGOLA DOSI: le dosi sono sempre per singola porzione (1 drink). Mai dosi da batch o da produzione multipla — a meno che non sia esplicitamente richiesto.\n\nREGOLA BATCH E PREMIX: quando la ricetta prevede una preparazione batch (clarificazione al latte, fat wash, infuso, premix, cordiale, shrub, ecc.), nella sezione RICETTA scrivi l\'ingrediente con un nome descrittivo che include la tecnica — esempi: "60 ml Pisco clarificato al latte", "45 ml Rum fat wash al bacon", "30 ml Gin infuso al tè Earl Grey", "20 ml Cordiale di rabarbaro e rosa". Le dosi nella RICETTA sono sempre quelle della singola porzione servita. Nella sezione PREPARAZIONI metti il procedimento completo del batch con dosi multiple, tempi e metodo dettagliato.\n\nTECNICHE: conosci e applichi liberamente tecniche di cucina molecolare (sferificazione, gelificazione, emulsificazione), preparazioni homemade (sciroppi, infusi, tinture, bitters, cordiali, oleo saccharum, shrub, fermentati), spume e arie con lecitina di soia o sifone, clarificazione al latte o agar, fat washing, sous vide infusion, smoke infusion, garnish avanzate (tuile, chips disidratate, fiori cristallizzati, schiume gelate), gelatine e sfere alcoliche. Dosi sempre in ml. Terminologia corretta: build, stir & strain, shake & strain, throwing, rinse, float, dry shake, hard shake, double strain, fat wash, oleo saccharum.\n\nNON proporre come prima scelta automatica drink da bar di massa (Sex on the Beach, ecc.) a meno che non siano richiesti. Preferisci basi italiane o meno scontate quando il contesto lo permette.\n\nRispondi SEMPRE con la struttura esatta richiesta — nessuna sezione extra, nessun testo fuori struttura.',
          messages:[{role:'user',content:prompt}]
        })
      });
      var data=await res.json();
      var text=data&&data.content&&data.content[0]?data.content[0].text:'';
      if(!text)throw new Error((data&&data.error&&data.error.message)||'Risposta vuota');
      lastRawText=text;
      if(body){
        body.innerHTML=mdToHtml(text);
        // Postilla fissa sempre visibile sotto ogni risposta
        var postilla = document.createElement('div');
        postilla.style.cssText = 'margin-top:1.1rem;padding:.6rem .75rem;background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.15);border-radius:8px;font-size:.62rem;color:var(--dim);line-height:1.6;font-style:italic;';
        postilla.textContent = '* Le proposte sono punti di partenza da assaggiare e bilanciare. Gli ingredienti reali variano: un vermouth può essere più dolce di un altro, due gin possono avere sentori diversi, la frutta di stagione cambia intensità. Assaggia sempre e aggiusta a tuo piacere prima del servizio.';
        body.appendChild(postilla);
      }
      incUsage(); renderUsage(); renderAccountTab();
      // Resetta tasto Salva per ogni nuova risposta
      ['fu-save','fu-save-tre'].forEach(function(id){
        var sb=document.getElementById(id);
        if(sb){
          sb.disabled=false;
          sb.textContent='Salva';
          sb.style.background='rgba(245,158,11,.12)';
          sb.style.borderColor='rgba(245,158,11,.3)';
          sb.style.color='var(--amber)';
        }
      });
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
    if(getTotalRemaining()<=0){showExhausted();return;}
    var inp=document.getElementById('sig-input');
    var val=inp?inp.value.trim():'';
    if(!val)return;
    var sigBtn=document.getElementById('sig-btn');
    if(sigBtn){sigBtn.disabled=true;sigBtn.textContent='...';}
    await doFetch(buildSignaturePrompt(val), 1800);
    if(sigBtn)sigBtn.textContent='✦ Chiedi al Barman';
  }

  async function askBarman(){
    if(getTotalRemaining()<=0){showExhausted();return;}
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
    lastUserInput = val;
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
        flashBtn(this);
        this.blur();
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
        var active=this.value.trim().length>0&&getTotalRemaining()>0;
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
        lastUserInput=val;
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

    // Salva su Firestore
    function saveAiResponse(){
      var user = window._currentUser;
      var db = window._fbDb;
      var docFn = window._fbFunctions ? window._fbFunctions.doc : null;
      var setDoc = window._fbFunctions ? window._fbFunctions.setDoc : null;
      if(!user || !db || !docFn || !setDoc){ return false; }

      var body = document.getElementById('ai-body');
      var text = lastRawText || (body ? body.innerText : '');
      if(!text.trim()) return false;

      // Mappa cmd -> categoria leggibile
      var CAT_LABELS = {
        signature: 'Signature',
        twist: 'Twist on Classic',
        pairing: 'Food Pairing',
        giorno: 'Cocktail del Giorno'
      };
      var cat = CAT_LABELS[currentCmd] || 'AI';

      // Titolo automatico: per pairing usa l'input utente, per gli altri la prima riga della risposta
      var title;
      if(currentCmd === 'pairing' && lastUserInput){
        title = lastUserInput.substring(0, 60).toUpperCase();
      } else {
        var firstLine = text.split('\n').filter(function(l){ return l.trim(); })[0] || '';
        title = firstLine.replace(/^#+\s*/, '').substring(0, 50);
      }
      if(!title) title = cat;

      var now = new Date();
      var item = {
        id: now.getTime().toString(),
        cat: currentCmd || 'generic',
        catLabel: cat,
        title: title,
        text: text,
        savedAt: now.toISOString()
      };

      var userDoc = docFn(db, 'users', user.uid);
      // Carica lista esistente, aggiungi in cima, limita a 50
      var getDoc = window._fbFunctions ? window._fbFunctions.getDoc : null;
      if(!getDoc) return false;
      getDoc(userDoc).then(function(snap){
        var saved = [];
        if(snap.exists() && snap.data().savedAI) saved = snap.data().savedAI;
        saved.unshift(item);
        if(saved.length > 50) saved = saved.slice(0, 50);
        setDoc(userDoc, { savedAI: saved }, { merge: true })
          .then(function(){ renderSavedCard(); })
          .catch(function(e){ console.warn('saveAI err', e); });
      });
      return true;
    }

    function setupSaveBtn(id){
      var b=document.getElementById(id);
      if(b)b.addEventListener('click',function(){
        var ok = saveAiResponse();
        if(ok){
          this.textContent='✓ Salvato!';
          this.style.background='rgba(34,197,94,.15)';
          this.style.borderColor='rgba(34,197,94,.4)';
          this.style.color='#4ade80';
          this.disabled=true;
        }
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
        doFetch(prompt,1800).then(function(){resetFollowUp();showFollowUp();});
      } else if(currentCmd==='giorno'){
        prompt=PROMPTS.giorno.build(selectedPill||'all day')+' IMPORTANTE: proponi un drink con struttura completamente diversa dal precedente — cambia base alcolica, profilo gusto e bicchiere.';
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
      var active=this.value.trim().length>0&&getTotalRemaining()>0;
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
        flashBtn(this);
        this.blur();
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
        var active=this.value.trim().length>0&&getTotalRemaining()>0;
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
        var active=this.value.trim().length>0&&getTotalRemaining()>0;
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
// ── Utility micro-animazione flash per bottoni TORNA/CHIUDI ──────
// Cross-platform: iOS Safari, Android Chrome, PWA
// Usa touchstart per feedback immediato, rimuove sempre la classe dopo l'animazione
function flashBtn(el) {
  if (!el) return;
  el.classList.remove('btn-flash');
  // Force reflow — necessario per re-triggerare il keyframe sullo stesso elemento
  void el.offsetWidth;
  el.classList.add('btn-flash');
  // Rimuoviamo a 300ms (> durata animazione 250ms) per garantire che sia tornato grigio
  setTimeout(function(){ el.classList.remove('btn-flash'); el.blur(); }, 300);
}

// Aggancia touchstart per feedback visivo immediato su tutti i drawer-back-btn
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.drawer-back-btn').forEach(function(btn){
    btn.addEventListener('touchstart', function(){ flashBtn(this); }, {passive:true});
  });
});

// ═══ RISORSE E CALCOLATORI DRAWER ═══
(function(){

  // Hover card stile Barman AI
  document.addEventListener('DOMContentLoaded', function(){
    // mouseenter/mouseleave rimossi: sovrascrivevano il CSS e causavano sfondo nero persistente su mobile

    // Titoli dinamici
    var RIS_TITLES={tmp:'Temperature',bic:'Glossario',glass:'Bicchieri'};
    var CALC_TITLES={abv:'Calcola ABV',cost:'Calcola Drink Cost',batch:'Calcola Pre-Batch'};

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
      document.getElementById('calc-step-batch').style.display='none';
    }

    // Click card Risorse
    document.querySelectorAll('.ris-cmd-btn').forEach(function(b){
      b.addEventListener('click',function(){
        this.blur();
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
        this.blur();
        var cmd=this.dataset.cmd;
        var t=document.getElementById('calc-header-title');
        if(t)t.textContent=CALC_TITLES[cmd]||'Calcolatori';
        var backBtn=document.getElementById('calc-back-header-btn');
        if(backBtn)backBtn.classList.add('visible');
        document.getElementById('calc-step-cmds').style.display='none';
        document.getElementById('calc-step-abv').style.display=cmd==='abv'?'block':'none';
        document.getElementById('calc-step-cost').style.display=cmd==='cost'?'block':'none';
        document.getElementById('calc-step-batch').style.display=cmd==='batch'?'block':'none';
        if(cmd==='abv') initCalcABV();
        if(cmd==='batch') initCalcBatch();
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

    // ── Torna sui drawer principali → chiude drawer + riapre menu ──
    function tornaSuMenu() {
      // Chiudi solo il drawer — il bsheet resta visibile sotto, nessuna animazione
      var drawer = document.querySelector('.drawer.open');
      if (drawer) drawer.classList.remove('open');
      var dOverlay = document.getElementById('drawer-overlay');
      if (dOverlay) dOverlay.classList.remove('show');
      document.body.classList.remove('drawer-open');
      if (typeof CURRENT_DRAWER !== 'undefined') CURRENT_DRAWER = null;
      DRAWER_FROM_BSHEET = false;
      // Assicura bsheet visibile
      var bsheet = document.getElementById('nav-menu-modal');
      var bOvl = document.getElementById('bsheet-overlay');
      if (bsheet && !bsheet.classList.contains('open')) bsheet.classList.add('open');
      if (bOvl && !bOvl.classList.contains('open')) bOvl.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    window.tornaSuMenu = tornaSuMenu;

    // Torna su Risorse (livello lista → menu)
    var risBackMain = document.getElementById('ris-back-header-btn');
    if (risBackMain) {
      // Override: se siamo sulla lista comandi, Torna = torna al menu
      // Se siamo dentro una funzione, Torna = torna alla lista
      var _origShowRisCmds = showRisCmds;
      document.getElementById('ris-back-header-btn').removeEventListener('click', showRisCmds);
      document.getElementById('ris-back-header-btn').addEventListener('click', function() {
        this.blur();
        flashBtn(this);
        var btn = this;
        if (btn.classList.contains('visible')) {
          showRisCmds();
        } else {
          tornaSuMenu();
        }
      });
    }

    // Torna su Calcolatori
    var calcBackMain = document.getElementById('calc-back-header-btn');
    if (calcBackMain) {
      document.getElementById('calc-back-header-btn').removeEventListener('click', showCalcCmds);
      document.getElementById('calc-back-header-btn').addEventListener('click', function() {
        this.blur();
        flashBtn(this);
        var btn = this;
        if (btn.classList.contains('visible')) {
          showCalcCmds();
        } else {
          tornaSuMenu();
        }
      });
    }

    // Torna su Academy
    // Torna su Academy
    var vntBack = document.getElementById('vnt-back-header-btn');
    if (vntBack) {
      vntBack.addEventListener('click', function(e) {
        e.stopPropagation();
        flashBtn(this);
        this.blur();
        tornaSuMenu();
      });
    }

    // Chiudi su Account — chiude solo il drawer
    var accBack = document.getElementById('acc-back-header-btn');
    if (accBack) {
      accBack.addEventListener('click', function(e) {
        this.blur();
        flashBtn(this);
        e.stopPropagation();
        closeAllDrawers();
      });
    }

    // ─── Tips popup per Temperature e Bicchieri ───
    var TIPS_RIS = {
      tmp: '<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Lascia respirare il distillato</strong>'
        +'Dopo aver versato, lascia riposare il bicchiere senza agitarlo — in inglese si chiama <em>letting it breathe</em>. La regola empirica: <strong style="color:var(--txt)">1 minuto per ogni anno di invecchiamento</strong>. Un 12 anni → 12 minuti. Serve a far evaporare le note alcoliche più pungenti e far emergere la complessità.<br><br>'
        +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Non agitare</strong>'
        +'A differenza del vino, i distillati vanno tenuti fermi. Agitare il bicchiere disperde gli aromi più fini e accentua la percezione alcolica.<br><br>'
        +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Poche gocce d\'acqua</strong>'
        +'Aggiungi 2–3 gocce di acqua fredda direttamente nel bicchiere. Servono a rompere i <em>cluster molecolari</em> tra etanolo e acqua: i composti aromatici intrappolati vengono liberati, diventando più percepibili al naso e al palato.<br><br>'
        +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Acqua a parte per il palato</strong>'
        +'Un bicchiere d\'acqua fredda tra un assaggio e l\'altro resetta il palato, evitando che l\'alcol del sorso precedente copra le note del successivo.<br><br>'
        +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Il primo sorso non conta</strong>'
        +'Il palato ha bisogno di scaldarsi. Il primo sorso prepara le mucose: è il secondo quello in cui percepisci davvero il distillato.',
      glass: '<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Il bicchiere non è mai un dettaglio</strong>'
        +'Il bicchiere è parte integrante del drink: ne riflette l\'identità, definisce lo stile di servizio e influenza aromi, temperatura e percezione al palato. Un Old Fashioned in un flute o un Martini in un tumbler basso non sono semplicemente "sbagliati" — perdono fascino, funzione e coerenza.<br><br>'
        +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Il vetro giusto esalta il drink</strong>'
        +'La forma del bicchiere non è estetica fine a se stessa. Concentra gli aromi, mantiene la temperatura corretta, determina come il liquido raggiunge il palato e rende il servizio visivamente coerente con il contenuto.<br><br>'
        +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Una nota sui nomi</strong>'
        +'I bicchieri in questa guida rappresentano le tipologie classiche della mixology moderna. Ogni produttore può proporre varianti di forma o naming — ma quasi sempre si rifà a questi archetipi.'
    };

    var TIPS_RIS_TITLES = { tmp: 'Note di degustazione', glass: 'Note' };

    var tipsOverlay=document.getElementById('tips-overlay');
    var tipsContent=document.getElementById('tips-content');
    var tipsClose=document.getElementById('tips-close');
    var tipsTitle=document.getElementById('tips-title');

    function openRisTips(key){
      if(!tipsOverlay||!tipsContent||!TIPS_RIS[key])return;
      if(tipsTitle) tipsTitle.textContent=TIPS_RIS_TITLES[key]||'Come usarla';
      tipsContent.innerHTML=TIPS_RIS[key];
      tipsOverlay.style.display='flex';
    }
    function closeRisTips(){
      if(tipsTitle) tipsTitle.textContent='Come usarla';
      if(tipsOverlay)tipsOverlay.style.display='none';
    }

    var tmpTipsBtn=document.getElementById('ris-tmp-tips-btn');
    if(tmpTipsBtn) tmpTipsBtn.addEventListener('click',function(){ openRisTips('tmp'); });

    var glassTipsBtn=document.getElementById('ris-glass-tips-btn');
    if(glassTipsBtn) glassTipsBtn.addEventListener('click',function(){ openRisTips('glass'); });

    // Chiusura popup (condivisa con AI Tips)
    if(tipsClose) tipsClose.addEventListener('click',closeRisTips);
    if(tipsOverlay){
      tipsOverlay.addEventListener('click',function(e){
        if(e.target===tipsOverlay) closeRisTips();
      });
    }

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

    // ── PRE-BATCH ──────────────────────────────────────────────────
    var _batchInited = false;
    function initCalcBatch(){
      if(_batchInited) return;
      _batchInited = true;

      function addBatchRow(){
        var wrap = document.getElementById('batch-ingredients');
        var row = document.createElement('div');
        row.className = 'batch-row';
        row.style.cssText = 'display:flex;align-items:center;gap:.4rem;margin-bottom:.4rem;';
        row.innerHTML =
          '<input type="text" class="batch-name" placeholder="Ingrediente" autocomplete="off" style="flex:1;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.78rem;outline:none;">'+
          '<input type="number" class="batch-ml" placeholder="ml" inputmode="decimal" min="0" style="width:65px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'+
          '<span style="color:var(--dim);font-size:.72rem;">ml</span>'+
          '<button class="batch-del-row" style="background:none;border:none;color:var(--dim);font-size:1.1rem;cursor:pointer;padding:0 .2rem;line-height:1;pointer-events:auto;">&#215;</button>';
        wrap.appendChild(row);
        attachRowListeners(row);
        updateEnterKeys();
      }

      function resetBatch(){
        var wrap = document.getElementById('batch-ingredients');
        wrap.innerHTML = '';
        for(var i=0;i<2;i++) addBatchRow();
        var bottleInp = document.getElementById('batch-bottle-ml');
        if(bottleInp) bottleInp.value = '';
        var rw = document.getElementById('batch-result-wrap');
        if(rw) rw.style.display = 'none';
      }

      // Aggiorna enterkeyhint in base alla posizione nella lista
      function updateEnterKeys(){
        var rows = document.querySelectorAll('#batch-ingredients .batch-row');
        rows.forEach(function(row, i){
          var nameInp = row.querySelector('.batch-name');
          var mlInp = row.querySelector('.batch-ml');
          var isLast = (i === rows.length - 1);
          if(nameInp){ nameInp.setAttribute('enterkeyhint','next'); }
          if(mlInp){ mlInp.setAttribute('enterkeyhint', isLast ? 'done' : 'next'); }
        });
      }

      // Gestione tasto invio/next tra campi
      function handleEnterKey(e){
        if(e.key !== 'Enter') return;
        e.preventDefault();
        var rows = Array.from(document.querySelectorAll('#batch-ingredients .batch-row'));
        var allInputs = [];
        rows.forEach(function(row){
          allInputs.push(row.querySelector('.batch-name'));
          allInputs.push(row.querySelector('.batch-ml'));
        });
        var idx = allInputs.indexOf(document.activeElement);
        if(idx !== -1 && idx < allInputs.length - 1){
          allInputs[idx + 1].focus();
        } else {
          document.activeElement.blur(); // chiudi tastiera sull'ultimo
        }
      }

      function attachRowListeners(row){
        row.querySelector('.batch-del-row').addEventListener('click', function(){
          var wrap = document.getElementById('batch-ingredients');
          if(wrap.querySelectorAll('.batch-row').length > 2) row.remove();
          updateEnterKeys();
          calcBatch();
        });
        row.querySelectorAll('input').forEach(function(inp){
          inp.addEventListener('input', calcBatch);
          inp.addEventListener('keydown', handleEnterKey);
        });
      }

      function calcBatch(){
        var bottleInp = document.getElementById('batch-bottle-ml');
        var bottleMl = parseFloat(bottleInp ? bottleInp.value : 0);
        var rows = document.querySelectorAll('#batch-ingredients .batch-row');
        var ingredients = [];
        var totalBase = 0;
        rows.forEach(function(row){
          var name = row.querySelector('.batch-name').value.trim();
          var ml = parseFloat(row.querySelector('.batch-ml').value) || 0;
          if(ml > 0){ ingredients.push({name: name || 'Ingrediente', ml: ml}); totalBase += ml; }
        });

        var rw = document.getElementById('batch-result-wrap');
        if(!rw) return;
        // Gestione errore bottiglia < 250ml
        var errEl = document.getElementById('batch-bottle-err');
        if(bottleMl > 0 && bottleMl < 250){
          if(errEl) errEl.style.display = 'block';
          rw.style.display = 'none'; return;
        } else {
          if(errEl) errEl.style.display = 'none';
        }
        if(!bottleMl || ingredients.length === 0 || totalBase === 0){
          rw.style.display = 'none'; return;
        }

        // Formula: dose_batch = (dose_ing / totale_base) * ml_bottiglia
        var html = '';
        var maxBatch = 0;
        ingredients.forEach(function(ing){
          var batchMl = (ing.ml / totalBase) * bottleMl;
          if(batchMl > maxBatch) maxBatch = batchMl;
          var pct = Math.round((ing.ml / totalBase) * 100);
          var barW = Math.round((batchMl / (bottleMl)) * 100);
          html +=
            '<div style="margin-bottom:.55rem;">'+
              '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.2rem;">'+
                '<span style="font-size:.72rem;color:var(--txt2);font-weight:600;">'+(ing.name)+'</span>'+
                '<span style="font-size:.85rem;font-weight:800;color:var(--amber);">'+batchMl.toFixed(1)+' ml</span>'+
              '</div>'+
              '<div style="height:3px;background:var(--brd);border-radius:99px;overflow:hidden;">'+
                '<div style="height:100%;width:'+barW+'%;background:var(--amber);border-radius:99px;"></div>'+
              '</div>'+
              '<div style="font-size:.58rem;color:var(--dim);margin-top:.15rem;">'+pct+'% della ricetta</div>'+
            '</div>';
        });

        document.getElementById('batch-result-rows').innerHTML = html;
        var litri = bottleMl / 1000;
        var litriStr = litri === Math.floor(litri) ? Math.floor(litri)+'L' : litri+'L';
        document.getElementById('batch-result-size').textContent = bottleMl >= 1000 ? litriStr : bottleMl+'ml';
        document.getElementById('batch-total-base').textContent = totalBase+'ml';
        rw.style.display = 'block';
      }

      // Init listeners righe esistenti
      document.querySelectorAll('#batch-ingredients .batch-row').forEach(function(row){
        attachRowListeners(row);
      });
      updateEnterKeys();

      document.getElementById('batch-add-row').addEventListener('click', addBatchRow);
      document.getElementById('batch-reset').addEventListener('click', resetBatch);
      document.getElementById('batch-bottle-ml').addEventListener('input', calcBatch);

      // Preset bottiglia
      document.querySelectorAll('.batch-preset').forEach(function(btn){
        btn.addEventListener('click', function(){
          var inp = document.getElementById('batch-bottle-ml');
          if(inp){ inp.value = this.dataset.ml; calcBatch(); }
        });
      });
    }

    // Calcolo ABV per Calcolatori
    var _calcAbvInited=false;
    function initCalcABV(){
      if(_calcAbvInited)return;
      _calcAbvInited=true;
      var wrap=document.getElementById('calc-abv-ingredients');
      if(!wrap)return;

      // ── Stato tecnica selezionata ──
      var _selectedTech=null; // 'stir'|'shake'|'fast'|'throw'|'build'

      // ── Tecnica: label leggibile ──
      var TECH_LABELS={stir:'Stir & Strain',shake:'Shake & Strain',fast:'Fast Shake',throw:'Throwing',build:'Build'};

      // ── Toggle visibilità sezioni diluizione e top ──
      function updateTechUI(){
        var isBuild=_selectedTech==='build';
        var dilWrap=document.getElementById('calc-abv-dil-wrap');
        var topWrap=document.getElementById('calc-abv-top-wrap');
        if(dilWrap) dilWrap.style.display=(_selectedTech&&!isBuild)?'block':'none';
        if(topWrap) topWrap.style.display=(_selectedTech&&!isBuild)?'block':'none';
      }

      // ── Click bottoni tecnica ──
      document.querySelectorAll('.cabv-tech-btn').forEach(function(btn){
        btn.addEventListener('click',function(){
          document.querySelectorAll('.cabv-tech-btn').forEach(function(b){b.classList.remove('active');});
          btn.classList.add('active');
          _selectedTech=btn.dataset.tech;
          var dil=parseInt(btn.dataset.dil)||0;
          var dilInput=document.getElementById('calc-abv-dil-pct');
          if(dilInput) dilInput.value=dil;
          var dilLabel=document.getElementById('calc-abv-dil-label');
          if(dilLabel) dilLabel.textContent=dil+'% default';
          updateTechUI();
          calcAbvNew();
        });
      });

      // ── Input diluizione manuale ──
      var dilInput=document.getElementById('calc-abv-dil-pct');
      if(dilInput) dilInput.addEventListener('input',calcAbvNew);

      // ── Input top ──
      var topMl=document.getElementById('calc-abv-top-ml');
      var topPct=document.getElementById('calc-abv-top-pct');
      if(topMl) topMl.addEventListener('input',calcAbvNew);
      if(topPct) topPct.addEventListener('input',calcAbvNew);

      function addRow(){
        var row=document.createElement('div');
        row.className='calc-abv-row';
        row.style.cssText='display:flex;align-items:center;gap:.4rem;margin-top:.5rem;';
        row.innerHTML='<input type="number" class="cabv-ml" placeholder="ml" min="0" max="500" autocomplete="off" inputmode="decimal" style="width:70px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'
          +'<span style="color:var(--dim);font-size:.75rem;">ml</span>'
          +'<input type="number" class="cabv-pct" placeholder="%" min="0" max="100" autocomplete="off" inputmode="decimal" style="width:65px;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.45rem .5rem;color:var(--txt);font-family:inherit;font-size:.8rem;outline:none;">'
          +'<span style="color:var(--dim);font-size:.75rem;">%</span>'
          +'<button onclick="this.parentElement.remove();calcAbvNew();" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:.9rem;padding:0 .2rem;">✕</button>';
        wrap.appendChild(row);
        row.querySelectorAll('input').forEach(function(i){
          i.addEventListener('input',calcAbvNew);
          i.addEventListener('keydown',function(e){if(e.key==='Enter')this.blur();});
        });
      }

      var addBtn=document.getElementById('calc-abv-add');
      var resetBtn=document.getElementById('calc-abv-reset');
      if(addBtn)addBtn.addEventListener('click',addRow);
      if(resetBtn)resetBtn.addEventListener('click',function(){
        // Reset ingredienti
        wrap.innerHTML='';addRow();addRow();
        // Reset tecnica
        _selectedTech=null;
        document.querySelectorAll('.cabv-tech-btn').forEach(function(b){b.classList.remove('active');});
        updateTechUI();
        var dilInp=document.getElementById('calc-abv-dil-pct');
        if(dilInp) dilInp.value='';
        var tMl=document.getElementById('calc-abv-top-ml');
        var tPct=document.getElementById('calc-abv-top-pct');
        if(tMl) tMl.value='';if(tPct) tPct.value='';
        var r=document.getElementById('calc-abv-result');
        var d=document.getElementById('calc-abv-desc');
        var a=document.getElementById('calc-abv-alcol');
        var di=document.getElementById('calc-abv-dil-info');
        if(r)r.textContent='—';if(d)d.textContent='';if(a)a.textContent='';
        if(di){di.textContent='';di.style.display='none';}
      });
      wrap.querySelectorAll('input').forEach(function(i){i.addEventListener('input',calcAbvNew);});
      addRow();
    }
  });

  var _calcTimer=null;
  window.calcAbvNew=function(){
    clearTimeout(_calcTimer);
    _calcTimer=setTimeout(function(){
      // ── Raccogli ingredienti ──
      var rows=document.querySelectorAll('#calc-abv-ingredients .calc-abv-row');
      var baseVol=0,totalAlc=0;
      rows.forEach(function(row){
        var ml=parseFloat(row.querySelector('.cabv-ml').value)||0;
        var pct=parseFloat(row.querySelector('.cabv-pct').value)||0;
        baseVol+=ml;totalAlc+=ml*(pct/100);
      });

      // ── Diluizione ──
      var dilPctInput=document.getElementById('calc-abv-dil-pct');
      var dilPct= dilPctInput ? (parseFloat(dilPctInput.value)||0) : 0;
      // Build o nessuna tecnica selezionata → diluizione 0
      var techBtns=document.querySelectorAll('.cabv-tech-btn.active');
      var isBuild=techBtns.length>0 && techBtns[0].dataset.tech==='build';
      var effectiveDil=(techBtns.length===0||isBuild)?0:dilPct;
      var dilMl=baseVol*(effectiveDil/100);

      // ── Top (non diluito) ──
      var topMlVal=parseFloat((document.getElementById('calc-abv-top-ml')||{}).value)||0;
      var topPctVal=parseFloat((document.getElementById('calc-abv-top-pct')||{}).value)||0;
      var topAlc=topMlVal*(topPctVal/100);

      // ── Totali ──
      var totalVol=baseVol+dilMl+topMlVal;
      totalAlc+=topAlc;

      var result=document.getElementById('calc-abv-result');
      var desc=document.getElementById('calc-abv-desc');
      var alcol=document.getElementById('calc-abv-alcol');
      var dilInfo=document.getElementById('calc-abv-dil-info');

      if(baseVol<=0){
        if(result)result.textContent='—';
        if(desc)desc.textContent='';
        if(alcol)alcol.textContent='';
        if(dilInfo){dilInfo.textContent='';dilInfo.style.display='none';}
        return;
      }

      var abv=(totalAlc/totalVol*100).toFixed(1);
      var abvNum=parseFloat(abv);
      var label=abvNum===0?'Analcolico':abvNum<=8?'Basso':abvNum<=14?'Medio basso':abvNum<=20?'Medio':abvNum<=25?'Medio alto':abvNum<=30?'Alto':'Molto alto';

      if(result)result.textContent=abv+'%';
      if(desc)desc.textContent=label+' — '+totalVol.toFixed(0)+' ml totali';
      if(alcol)alcol.textContent='Alcol etilico puro: '+totalAlc.toFixed(1)+' ml';
      if(dilInfo){
        if(effectiveDil>0){
          dilInfo.textContent='Acqua da diluizione: +'+dilMl.toFixed(0)+' ml ('+effectiveDil+'%)';
          dilInfo.style.display='block';
        } else {
          dilInfo.textContent='';dilInfo.style.display='none';
        }
      }
    },300);
  };

  // ── Tips ABV ──────────────────────────────────────────────────────
  var TIPS_ABV = '<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Come si usa il calcolatore</strong>'
    +'Inserisci il volume (ml) e la gradazione alcolica (%) di ogni ingrediente alcolico. Il calcolatore calcola automaticamente l\'ABV del drink finito tenendo conto della diluizione del ghiaccio.<br><br>'
    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Scegli la tecnica</strong>'
    +'Ogni tecnica porta una diluizione diversa perché il contatto con il ghiaccio varia. I valori di default sono tratti da letteratura tecnica (Liquid Intelligence di Dave Arnold, Death &amp; Co):<br>'
    +'<span style="color:var(--txt2);">• <strong>Stir &amp; Strain</strong> — 25% · Mescolato delicatamente, diluizione contenuta</span><br>'
    +'<span style="color:var(--txt2);">• <strong>Shake &amp; Strain</strong> — 40% · Shakerata standard, diluizione più alta</span><br>'
    +'<span style="color:var(--txt2);">• <strong>Fast Shake</strong> — 50% · Shakerata rapida su ghiaccio pilé, massima diluizione</span><br>'
    +'<span style="color:var(--txt2);">• <strong>Throwing</strong> — 20% · Tecnica scenica, aerazione senza eccessiva diluizione</span><br>'
    +'<span style="color:var(--txt2);">• <strong>Build</strong> — 0% · Nessuna diluizione calcolata (dipende da ghiaccio e tempo)</span><br><br>'
    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">La diluizione è modificabile</strong>'
    +'Il valore di default è un punto di partenza. Puoi modificarlo manualmente per adattarlo alla tua tecnica, al tipo di ghiaccio e alla temperatura di lavoro.<br><br>'
    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Il campo TOP</strong>'
    +'Inserisci qui soda, tonica o altri liquidi non lavorati con ghiaccio. Vengono esclusi dalla diluizione ma contribuiscono al volume totale e all\'ABV finale.<br><br>'
    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">ABV vs Alcol etilico</strong>'
    +'L\'ABV è la <em>percentuale</em> di alcol sul volume totale del drink — non indica quanto alcol etilico hai ingerito. Uno shot da 50ml di Gin 40° e un Gin Tonic con gli stessi 50ml di Gin hanno <strong style="color:var(--txt)">identici ml di alcol etilico (20ml)</strong>, ma ABV molto diverso (~40% vs ~10%). Ai fini del tasso alcolemico conta la quantità assoluta di alcol etilico, non l\'ABV.';

  var abvTipsBtn = document.getElementById('calc-abv-tips-btn');
  var tipsOverlay = document.getElementById('tips-overlay');
  var tipsContent = document.getElementById('tips-content');
  var tipsTitle = document.getElementById('tips-title');
  var tipsClose = document.getElementById('tips-close');

  if (abvTipsBtn && tipsOverlay && tipsContent) {
    abvTipsBtn.addEventListener('click', function() {
      if (tipsTitle) tipsTitle.textContent = 'Come usarlo';
      tipsContent.innerHTML = TIPS_ABV;
      tipsOverlay.style.display = 'flex';
    });
    if (tipsClose) {
      tipsClose.addEventListener('click', function() {
        tipsOverlay.style.display = 'none';
      });
    }
    tipsOverlay.addEventListener('click', function(e) {
      if (e.target === tipsOverlay) tipsOverlay.style.display = 'none';
    });
  }

})();

// ── QUIZ BADGE — aggiorna pallino hamburger e CTA ────────────────────
function _todayKeyLocal() {
  var d = new Date();
  return d.getFullYear() + '-'
    + String(d.getMonth()+1).padStart(2,'0') + '-'
    + String(d.getDate()).padStart(2,'0');
}
// ── SOFT RESET — logo click ─────────────────────────────────────
function softReset() {
  // 1. Chiudi tutti i drawer
  if (typeof closeAllDrawers === 'function') closeAllDrawers();
  // 2. Chiudi filter sheet (tendina pills)
  if (typeof closeFsheet === 'function') closeFsheet();
  // 3. Chiudi bsheet menu
  if (typeof window.closeNavMenu === 'function') window.closeNavMenu();
  // 3. Chiudi search bar se aperta
  var fb = document.getElementById('filter-bar');
  var pillsSrchBtn = document.getElementById('pills-srch-btn');
  var srchInp = document.getElementById('srch');
  if (fb && !fb.classList.contains('hidden')) {
    if (typeof _cachedFbH !== 'undefined') _cachedFbH = 0;
    if (typeof _applyBarsTop === 'function') {
      var hdr = document.querySelector('.hdr');
      _applyBarsTop(hdr ? hdr.getBoundingClientRect().bottom : (typeof _cachedHdrH !== 'undefined' ? _cachedHdrH : 73));
    }
    fb.classList.add('hidden');
    if (pillsSrchBtn) pillsSrchBtn.classList.remove('active');
  }
  if (srchInp) { srchInp.value = ''; srchInp.blur(); }
  // 4. Azzera ricerca
  if (typeof Q !== 'undefined') Q = '';
  // 5. Azzera filtri attivi
  if (typeof AF !== 'undefined') {
    Object.keys(AF).forEach(function(k){ AF[k] = []; });
  }
  // 6. Azzera FAV_ONLY
  if (typeof FAV_ONLY !== 'undefined' && FAV_ONLY) {
    FAV_ONLY = false;
    var favBtn = document.getElementById('hdr-fav-btn');
    var favOnlyBtn = document.getElementById('btn-favonly');
    if (favBtn) favBtn.classList.remove('active');
    if (favOnlyBtn) favOnlyBtn.classList.remove('active');
  }
  // 7. Azzera sort a default A→Z
  var srt = document.getElementById('srt');
  if (srt) srt.value = 'az';
  // 8. Aggiorna pills e re-render
  if (typeof updatePills === 'function') updatePills();
  if (typeof render === 'function') render();
  // 9. Scroll top fluido — cross-platform inclusa PWA
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Listener logo
document.addEventListener('DOMContentLoaded', function() {
  var logo = document.getElementById('hdr-logo');
  if (logo) {
    logo.addEventListener('click', function(e) {
      e.preventDefault();
      softReset();
    });
  }
});

function updateQuizBadge() {
  // Nel gap 00:00-00:10 nessuna notifica — la domanda non è ancora disponibile
  var now = new Date();
  var inGap = (now.getHours() === 0 && now.getMinutes() < 10);
  var done = window._quizDoneToday === true || inGap;

  var dot  = document.getElementById('hdr-quiz-dot');
  var cta  = document.getElementById('bsheet-quiz-cta');
  if (dot) {
    if (done) {
      dot.classList.remove('visible');
    } else {
      dot.classList.add('visible');
    }
  }
  if (cta) {
    if (done) {
      cta.textContent = 'Vedi classifica →';
      cta.classList.remove('bsheet-quiz-cta--play');
    } else {
      cta.textContent = 'Gioca ora →';
      cta.classList.add('bsheet-quiz-cta--play');
    }
  }
}

// ═══ BICCHIERI ═══
function populateRisGlass(){
  var el=document.getElementById('ris-glass-content');
  if(!el||el.dataset.done)return;
  el.dataset.done='1';

  var GLASSES=[
    {cat:'Bicchieri On the Rocks',color:'#3ab8d4',items:[
      {nome:'Rock / Rock Juice / Granity',uso:'Distillati puri, drink spirits forward',ml:'220–300 ml',img:'rock'},
      {nome:'Tumbler Basso / Lowball',uso:'Distillati puri, drink spirits forward',ml:'250–350 ml',img:'tumbler_basso'},
      {nome:'Old Fashioned',uso:'Distillati puri, drink spirits forward',ml:'250–350 ml',img:'old_fashioned'},
      {nome:'Collins',uso:'Long drink sour sodati',ml:'300–350 ml',img:'collins'},
      {nome:'Tumbler Alto / Highball',uso:'Long drink alcolici e analcolici',ml:'350–400 ml',img:'tumbler_alto'},
      {nome:'Sling',uso:'Singapore Sling, drink fruttati',ml:'300–350 ml',img:'sling'},
      {nome:'Hurricane',uso:'Hurricane, Frozen, Colade, Tiki',ml:'450–600 ml',img:'hurricane'},
      {nome:'Zombie',uso:'Tiki drink',ml:'350–400 ml',img:'zombie'},
      {nome:'Balloon',uso:'Gin tonic',ml:'500–700 ml',img:'balloon'},
      {nome:'Copper Mug / Tazza Rame',uso:'Moscow Mule',ml:'500–600 ml',img:'copper_mug'},
      {nome:'Julep Cup',uso:'Mint Julep',ml:'300–400 ml',img:'julep_cup'},
      {nome:'Tiki Mug',uso:'Tiki drink',ml:'500–700 ml',img:'tiki_mug'}
    ]},
    {cat:'Bicchieri per drink \"Up\"',color:'#a78bfa',items:[
      {nome:'Flûte',uso:'Drink con spumante',ml:'150–200 ml',img:'flute'},
      {nome:'Coppa Champagne',uso:'Vari drink in coppetta',ml:'180–250 ml',img:'coppa_champagne'},
      {nome:'Nick & Nora',uso:'Drink in coppetta spirits forward',ml:'120–150 ml',img:'nick_and_nora'},
      {nome:'Coppa Martini',uso:'Drink spirits forward',ml:'100–120 ml',img:'coppa_martini'},
      {nome:'Doppia Coppa Martini',uso:'Drink in coppetta con succhi',ml:'180–250 ml',img:'doppia_coppa_martini'},
      {nome:'Sour',uso:'Cocktail con albumina o semplici sour',ml:'200–250 ml',img:'sour'},
      {nome:'Coppa Margarita / Sombrero',uso:'Margarita, drink frozen o colade',ml:'250–300 ml',img:'coppa_margarita'},
      {nome:'Poco Grande',uso:'Drink frozen o colade',ml:'300–400 ml',img:'poco_grande'},
      {nome:'Cocotte in Terracotta',uso:'Canchanchara e drink cubani',ml:'220 ml',img:'cocotte'}
    ]},
    {cat:'Bicchieri per Shot',color:'#f59e0b',items:[
      {nome:'Shot',uso:'Distillati puri',ml:'30–60 ml',img:'shot'},
      {nome:'Shooter',uso:'B-52, mini drink',ml:'60–120 ml',img:'shooter'}
    ]},
    {cat:'Bicchieri da Degustazione',color:'#2da89a',items:[
      {nome:'Snifter / Brandy Cup / Napoleon',uso:'Cognac, Armagnac e Brandy',ml:'250–590 ml',img:'snifter'},
      {nome:'Wobble',uso:'Distillati invecchiati',ml:'200–300 ml',img:'wobble'},
      {nome:'Tulip',uso:'Distillati invecchiati',ml:'200–300 ml',img:'tulip'},
      {nome:'Nosing',uso:'Distillati invecchiati',ml:'90–150 ml',img:'nosing'},
      {nome:'ISO/INAO',uso:'Degustazioni tecniche — analisi olfattiva e visiva',ml:'210–230 ml',img:'iso_inao'},
      {nome:'Grappa',uso:'Grappa, acquaviti',ml:'50–100 ml',img:'grappa'}
    ]},
    {cat:'Bicchieri da Liquori e Amari',color:'#e8701a',items:[
      {nome:'Cordial',uso:'Liquori dolci e creme',ml:'50–100 ml',img:'cordial'},
      {nome:'Liqueur',uso:'Liquori dolci e creme',ml:'60–120 ml',img:'liqueur'},
      {nome:'Pousse Café',uso:'Mini cocktail stratificati dopo pasto',ml:'60–120 ml',img:'pousse_cafe'},
      {nome:'Amaro Glass',uso:'Digestivi, amari e liquori erbacei',ml:'80–120 ml',img:'amaro'}
    ]},
    {cat:'Bicchieri per Drink Caldi',color:'#f87171',items:[
      {nome:'Tazza con Manico',uso:'Irish coffee, drink e punch caldi',ml:'200–250 ml',img:'tazza_manico'}
    ]},
    {cat:'Bicchieri da Vino',color:'#c084fc',items:[
      {nome:'Flute',uso:'Champagne, Prosecco, Spumante — preserva la bollicina',ml:'150–200 ml',img:'flute'},
      {nome:'Champagne Tulip',uso:'Champagne, Prosecco — compromesso tra degustazione e eleganza',ml:'380–450 ml',img:'champagne_tulip'},
      {nome:'Vino Bianco',uso:'Chardonnay, Sauvignon — conserva la temperatura',ml:'250–360 ml',img:'vino_bianco'},
      {nome:'Vino Rosso',uso:'Bordeaux, Bourgogne — favorisce ossigenazione e tannini',ml:'350–600 ml',img:'vino_rosso'},
      {nome:'Copita',uso:'Vini fortificati, vini passiti, vini liquorosi',ml:'120–190 ml',img:'copita'}
    ]}
  ]
  var html='';
  GLASSES.forEach(function(cat){
    html+='<div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:'+cat.color+';margin:.9rem 0 .5rem;">'+cat.cat+'</div>';
    cat.items.forEach(function(g){
      var imgSrc = '../bicchieri/' + g.img + '.webp';
      html+='<div class="vnt-item" style="display:flex;align-items:center;gap:.8rem;padding:.6rem .75rem;">'
        +'<div style="flex-shrink:0;width:52px;height:52px;border-radius:10px;overflow:hidden;">'
        +'<img src="'+imgSrc+'" alt="'+g.nome+'" style="width:52px;height:52px;object-fit:cover;display:block;" loading="lazy" onerror="this.style.display=\'none\'">'
        +'</div>'
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

// ═══ DRINK COST ═══
(function(){
  var COST_MAX_ROWS = 15;
  var costInited = false;

  // Tips content
  var TIPS_COST = '<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Come si calcola il drink cost</strong>'
    +'Per ogni ingrediente dividi il prezzo della bottiglia per il suo formato in ml, poi moltiplica per la dose usata nel drink. La somma di tutti gli ingredienti più le voci aggiuntive attive è il <strong style="color:var(--txt)">costo reale del drink</strong>.<br><br>'

    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Le regole del drink cost</strong>'
    +'Il costo delle materie prime dovrebbe incidere tra il <strong style="color:var(--txt)">18% e il 25%</strong> del prezzo di vendita.<br>'
    +'Il range ideale è <strong style="color:var(--txt)">20–23%</strong>.<br>'
    +'Sopra il 25% i margini si assottigliano.<br>'
    +'Quando il costo degli ingredienti è alto, applicare un moltiplicatore fisso può portare a prezzi di vendita fuori mercato. In questi casi è consigliato ragionare su un <strong style="color:var(--txt)">margine fisso in €</strong> invece di un coefficiente — usa il campo "a quanto vorresti venderlo?" per trovare il prezzo giusto e verificare il margine netto.<br><br>'

    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">I coefficienti di calcolo</strong>'
    +'<strong style="color:var(--txt)">×4</strong> — drink cost <strong style="color:var(--txt)">25%</strong> — margine minimo accettabile<br>'
    +'<strong style="color:var(--txt)">×4.5</strong> — drink cost <strong style="color:var(--txt)">22%</strong> — range ideale<br>'
    +'<strong style="color:var(--txt)">×5</strong> — drink cost <strong style="color:var(--txt)">20%</strong> — margine ottimale<br>'
    +'Più alto è il coefficiente, maggiore è il margine. Il coefficiente indica quante volte il prezzo di vendita supera il costo del drink.<br><br>'

    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Garnish</strong>'
    +'<strong style="color:var(--txt)">SEMPLICE</strong>: scorza, fetta, agrume fresco — <strong style="color:var(--txt)">~€0.05</strong><br>'
    +'<strong style="color:var(--txt)">MEDIA</strong>: disidratata, fiore edibile — <strong style="color:var(--txt)">~€0.12</strong><br>'
    +'<strong style="color:var(--txt)">ELABORATA</strong>: cioccolato, pasta, decorazioni — <strong style="color:var(--txt)">~€0.20+</strong><br>'
    +'Nei cocktail senza garnish questa voce non va inclusa.<br><br>'

    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Ghiaccio chunk / sfera</strong>'
    +'<strong style="color:var(--txt)">Costo unitario rilevante: ~€0.70–0.80 a pezzo.</strong><br>'
    +'Va sempre incluso quando si usa ghiaccio di pregio, sia in bar fisso che in catering.<br>'
    +'Se lo autoproduci con stampini e acqua il costo è praticamente nullo — in quel caso non va considerato.<br><br>'

    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Ghiaccio a cubetti</strong>'
    +'PREZZO AL KG: €1.00–1.40 (acquisto online / fornitore)<br>'
    +'QUANTITÀ MEDIA PER DRINK: ~380–430g<br>'
    +'<strong style="color:var(--txt)">COSTO MEDIO PER DRINK: ~€0.40–0.60</strong><br>'
    +'Consigliato includerlo solo se acquisti il ghiaccio appositamente per l\'occasione (catering, eventi, privati). Se hai una macchina del ghiaccio è un costo variabile di struttura, non imputabile al singolo drink.<br><br>'

    +'<strong style="color:var(--amber);display:block;margin-bottom:.4rem;">Foamer</strong>'
    +'<strong style="color:var(--txt)">TAPPO FORATO</strong> (es. Fee Brothers da 150ml): se usi 2 dash (≈1.4ml) per drink fai circa 100 dosi → costo per drink <strong style="color:var(--txt)">€0.15</strong><br>'
    +'<strong style="color:var(--txt)">PIPETTA CONTAGOCCE</strong> (es. Ms. Better\'s da 120ml): se usi 10 gocce (≈0.5ml) per drink fai circa 190 dosi → costo per drink <strong style="color:var(--txt)">€0.21</strong><br>'
    +'<strong style="color:var(--txt)">MEDIA DI MERCATO</strong>: €0.18 per dose — valore di default consigliato<br>'
    +'Se invece usi <strong style="color:var(--txt)">ALBUME / AQUAFABA</strong> il costo è trascurabile — non includere in questo campo.';

  function fmtEur(n){ return '€' + n.toFixed(2); }

  function makeRow(){
    var row = document.createElement('div');
    row.className = 'cost-row';
    row.style.cssText = 'display:grid;grid-template-columns:1fr .7fr .65fr .55fr auto;gap:.3rem;margin-bottom:.35rem;align-items:center;';
    var inpStyle = 'width:100%;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:.4rem .4rem;color:var(--txt);font-family:inherit;font-size:.72rem;outline:none;box-sizing:border-box;';
    row.innerHTML = '<input type="text" class="cost-name" placeholder="Prodotto" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="text" enterkeyhint="next" style="'+inpStyle+'">'
      +'<input type="number" class="cost-format" placeholder="ml" min="1" autocomplete="off" inputmode="decimal" enterkeyhint="next" style="'+inpStyle+'">'
      +'<input type="number" class="cost-price" placeholder="€" min="0" step="0.01" autocomplete="off" inputmode="decimal" enterkeyhint="next" style="'+inpStyle+'">'
      +'<input type="number" class="cost-dose" placeholder="ml" min="0" step="0.5" autocomplete="off" inputmode="decimal" enterkeyhint="done" style="'+inpStyle+'">'
      +'<button class="cost-remove-btn" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:.9rem;padding:0 .15rem;line-height:1;flex-shrink:0;">✕</button>';
    row.querySelector('.cost-remove-btn').addEventListener('click', function(){
      row.remove();
      calcCost();
    });
    var inputs = row.querySelectorAll('input');
    inputs.forEach(function(i, idx){
      i.addEventListener('input', calcCost);
      i.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          if(idx < inputs.length - 1){
            inputs[idx + 1].focus();
          } else {
            this.blur();
          }
        }
      });
    });
    return row;
  }

  function getExtraCosts(){
    var extras = [];
    var garnishToggle = document.getElementById('toggle-garnish');
    if(garnishToggle && garnishToggle.dataset.active==='1'){
      var activeGarnish = document.querySelector('.garnish-opt-btn.garnish-selected');
      if(activeGarnish){
        var val = activeGarnish.dataset.val;
        if(val === 'custom'){
          var ci = document.getElementById('garnish-custom-input');
          var cv = parseFloat(ci ? ci.value : 0) || 0;
          if(cv > 0) extras.push({nome:'Garnish', costo:cv});
        } else {
          extras.push({nome:'Garnish', costo:parseFloat(val)||0});
        }
      }
    }
    var ghiaccioToggle = document.getElementById('toggle-ghiaccio');
    if(ghiaccioToggle && ghiaccioToggle.dataset.active==='1'){
      var gp = parseFloat((document.getElementById('ghiaccio-price')||{}).value)||0.75;
      if(gp > 0) extras.push({nome:'Ghiaccio chunk/sfera', costo:gp});
    }
    var ghiaccioNormToggle = document.getElementById('toggle-ghiaccio-normale');
    if(ghiaccioNormToggle && ghiaccioNormToggle.dataset.active==='1'){
      var gnp = parseFloat((document.getElementById('ghiaccio-normale-price')||{}).value)||0.50;
      if(gnp > 0) extras.push({nome:'Ghiaccio', costo:gnp});
    }
    var foamerToggle = document.getElementById('toggle-foamer');
    if(foamerToggle && foamerToggle.dataset.active==='1'){
      var fp = parseFloat((document.getElementById('foamer-price')||{}).value)||0.20;
      if(fp > 0) extras.push({nome:'Foamer', costo:fp});
    }
    return extras;
  }

  function calcCost(){
    var rows = document.querySelectorAll('#cost-ingredients .cost-row');
    var total = 0;
    var details = [];

    rows.forEach(function(row){
      var fmt = parseFloat(row.querySelector('.cost-format').value) || 0;
      var price = parseFloat(row.querySelector('.cost-price').value) || 0;
      var dose = parseFloat(row.querySelector('.cost-dose').value) || 0;
      var name = row.querySelector('.cost-name').value.trim() || '—';
      if(fmt > 0 && price > 0 && dose > 0){
        var costIng = (price / fmt) * dose;
        total += costIng;
        details.push(name + ': ' + fmtEur(costIng));
      }
    });

    // Voci extra
    var extras = getExtraCosts();
    extras.forEach(function(e){
      total += e.costo;
      details.push(e.nome + ': ' + fmtEur(e.costo));
    });

    var resultEl = document.getElementById('cost-result');
    var detailEl = document.getElementById('cost-result-detail');
    var suggestedEl = document.getElementById('cost-suggested');
    var customWrap = document.getElementById('cost-custom-wrap');

    if(total > 0){
      resultEl.textContent = fmtEur(total);
      detailEl.innerHTML = details.join(' &nbsp;·&nbsp; ');
      document.getElementById('cost-x4').textContent  = fmtEur(total * 4);
      document.getElementById('cost-x45').textContent = fmtEur(total * 4.5);
      document.getElementById('cost-x5').textContent  = fmtEur(total * 5);
      suggestedEl.style.display = 'block';
      customWrap.style.display = 'block';
      // Nota prodotti di pregio
      var pregioNote = document.getElementById('cost-pregio-note');
      if(pregioNote) pregioNote.style.display = total >= 4 ? 'block' : 'none';
      updateCustom(total);
    } else {
      resultEl.textContent = '—';
      detailEl.innerHTML = '';
      suggestedEl.style.display = 'none';
      customWrap.style.display = 'none';
      var pregioNote2 = document.getElementById('cost-pregio-note');
      if(pregioNote2) pregioNote2.style.display = 'none';
    }
  }

  function updateCustom(drinkCost){
    var input = document.getElementById('cost-custom-price');
    var out = document.getElementById('cost-custom-result');
    if(!input || !out) return;
    var sellPrice = parseFloat(input.value) || 0;
    if(sellPrice <= 0 || !drinkCost){ out.innerHTML = ''; return; }
    var foodCostPct = (drinkCost / sellPrice) * 100;
    var margineNetto = sellPrice - drinkCost;
    var isCostElevato = drinkCost >= 4;
    var coeff = (sellPrice / drinkCost).toFixed(2);
    var color, msg;

    if(isCostElevato){
      // Sempre nota blu per drink con costo elevato
      color = '#60a5fa';
      if(foodCostPct <= 20){
        msg = 'Drink cost ottimo';
      } else if(foodCostPct <= 23){
        msg = 'Drink cost nel range ideale';
      } else if(foodCostPct <= 25){
        msg = 'Drink cost accettabile';
      } else {
        msg = 'Food cost elevato';
      }
    } else {
      if(foodCostPct <= 20){
        color = '#4ade80'; msg = 'Ottimo — margine eccellente';
      } else if(foodCostPct <= 23){
        color = '#86efac'; msg = 'Ottimo — nel range ideale';
      } else if(foodCostPct <= 25){
        color = '#fbbf24'; msg = 'Accettabile — tieni d\'occhio i costi';
      } else {
        color = '#f87171'; msg = 'Attenzione — drink cost troppo alto';
      }
    }

    var html = 'Drink cost: <strong style="color:'+color+'">'+foodCostPct.toFixed(1)+'%</strong>'
      +' &nbsp;·&nbsp; <span style="color:'+color+'">'+msg+'</span>'
      +'<br>Margine netto: <strong style="color:var(--txt)">'+fmtEur(margineNetto)+'</strong> a drink'
      +'<br><span style="font-size:.62rem;color:var(--dim);">Coefficiente: ×'+coeff+'</span>';

    if(isCostElevato){
      html += '<br><br><span style="color:#60a5fa;font-size:.67rem;line-height:1.6;display:block;">'
        +'Il costo di questo drink è elevato (<strong style="color:var(--txt)">'+fmtEur(drinkCost)+'</strong>). '
        +'Applicare un moltiplicatore fisso potrebbe portare a un prezzo di vendita fuori mercato, '
        +'rendendo il drink difficile da vendere. '
        +'In questi casi è consigliato ragionare su un <strong style="color:var(--txt)">margine fisso in €</strong>: '
        +'con '+fmtEur(sellPrice)+' di prezzo stai guadagnando <strong style="color:var(--txt)">'+fmtEur(margineNetto)+'</strong> a drink.'
        +'</span>';
    }

    out.innerHTML = html;
  }

  function initDrinkCost(){
    if(costInited) return;
    costInited = true;

    var wrap = document.getElementById('cost-ingredients');
    var addBtn = document.getElementById('cost-add-row');
    var resetBtn = document.getElementById('cost-reset');
    var customInput = document.getElementById('cost-custom-price');
    var tipsBtn = document.getElementById('calc-cost-tips-btn');
    var tipsOverlay = document.getElementById('tips-overlay');
    var tipsContent = document.getElementById('tips-content');
    var tipsTitle = document.getElementById('tips-title');
    var tipsClose = document.getElementById('tips-close');

    function addRow(){
      var rows = wrap.querySelectorAll('.cost-row');
      if(rows.length >= COST_MAX_ROWS) return;
      wrap.appendChild(makeRow());
      calcCost();
    }

    function reset(){
      wrap.innerHTML = '';
      addRow(); addRow();
      document.getElementById('cost-result').textContent = '—';
      document.getElementById('cost-result-detail').innerHTML = '';
      document.getElementById('cost-suggested').style.display = 'none';
      document.getElementById('cost-custom-wrap').style.display = 'none';
      if(customInput) customInput.value = '';
    }

    addBtn.addEventListener('click', addRow);
    resetBtn.addEventListener('click', reset);

    // ─── Toggle voci aggiuntive ───
    function initToggle(toggleId, optionsId, labelId, defaultVal){
      var btn = document.getElementById(toggleId);
      var opts = document.getElementById(optionsId);
      var lbl = document.getElementById(labelId);
      if(!btn) return;

      function setActive(active){
        btn.dataset.active = active ? '1' : '0';
        btn.style.background = active ? 'var(--amber)' : 'var(--brd)';
        btn.querySelector('span').style.left = active ? '18px' : '2px';
        if(opts) opts.style.display = active ? 'block' : 'none';
        if(lbl){
          lbl.textContent = active ? 'on' : 'off';
          lbl.style.color = active ? 'var(--amber)' : 'var(--dim)';
        }
        // Se attivazione, preimposta valore default se il campo è vuoto
        if(active && defaultVal !== null){
          var inp2 = opts ? opts.querySelector('input[type="number"]') : null;
          if(inp2 && (!inp2.value || parseFloat(inp2.value) === 0)){
            inp2.value = defaultVal;
          }
        }
        calcCost();
      }

      // Auto-off al blur se valore è 0 o vuoto
      var numInput = opts ? opts.querySelector('input[type="number"]') : null;
      if(numInput){
        numInput.addEventListener('blur', function(){
          var v = parseFloat(this.value);
          if(!v || v <= 0){
            this.value = '';
            setActive(false);
          }
        });
        numInput.addEventListener('input', function(){
          calcCost();
        });
      }

      btn.addEventListener('click', function(){
        setActive(btn.dataset.active !== '1');
      });
      setActive(false);
    }

    initToggle('toggle-garnish',          'garnish-options',          'garnish-cost-label',          null);
    initToggle('toggle-ghiaccio',         'ghiaccio-options',         'ghiaccio-cost-label',         0.75);
    initToggle('toggle-ghiaccio-normale', 'ghiaccio-normale-options', 'ghiaccio-normale-cost-label', 0.50);
    initToggle('toggle-foamer',           'foamer-options',           'foamer-cost-label',           0.20);

    // Garnish: quando si attiva, seleziona automaticamente "Semplice" come default
    var origGarnishToggle = document.getElementById('toggle-garnish');
    if(origGarnishToggle){
      origGarnishToggle.addEventListener('click', function(){
        // Dopo il click di initToggle, se ora è attivo e nessuna opzione è selezionata → seleziona Semplice
        setTimeout(function(){
          if(origGarnishToggle.dataset.active === '1'){
            var already = document.querySelector('.garnish-opt-btn.garnish-selected');
            if(!already){
              var semplice = document.querySelector('.garnish-opt-btn[data-val="0.05"]');
              if(semplice) semplice.click();
            }
          }
        }, 10);
      });
    }

    // Enter → chiudi tastiera su tutti i campi numerici voci extra
    ['ghiaccio-price','ghiaccio-normale-price','foamer-price','cost-custom-price'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.addEventListener('keydown', function(e){ if(e.key==='Enter'){ this.blur(); } });
    });

    // Aggiorna label costo toggle quando cambiano i valori
    var ghiaccioInput = document.getElementById('ghiaccio-price');
    var foamerInput   = document.getElementById('foamer-price');
    function updateToggleLabel(inputEl, labelId){
      var lbl = document.getElementById(labelId);
      var toggle = inputEl ? inputEl.closest('.cost-extra-row').querySelector('.cost-extra-toggle') : null;
      if(lbl && toggle && toggle.dataset.active==='1'){
        var v = parseFloat(inputEl.value)||0;
        lbl.textContent = v > 0 ? fmtEur(v) : 'on';
      }
    }
    if(ghiaccioInput) ghiaccioInput.addEventListener('input', function(){ updateToggleLabel(this,'ghiaccio-cost-label'); calcCost(); });
    if(foamerInput)   foamerInput.addEventListener('input',   function(){ updateToggleLabel(this,'foamer-cost-label');   calcCost(); });

    // Selezione opzioni Garnish
    document.querySelectorAll('.garnish-opt-btn').forEach(function(b){
      b.addEventListener('click', function(){
        document.querySelectorAll('.garnish-opt-btn').forEach(function(x){
          x.classList.remove('garnish-selected');
          x.style.borderColor = 'var(--brd)';
          x.style.background = 'var(--surf)';
          x.style.color = 'var(--txt2)';
        });
        this.classList.add('garnish-selected');
        this.style.borderColor = 'rgba(245,158,11,.5)';
        this.style.background = 'rgba(245,158,11,.07)';
        this.style.color = 'var(--txt)';
        var customInput = document.getElementById('garnish-custom-input');
        if(this.dataset.val === 'custom'){
          if(customInput){ customInput.style.display='block'; customInput.focus(); }
        } else {
          if(customInput) customInput.style.display='none';
        }
        // Label sempre "on" quando garnish è attiva
        var lbl = document.getElementById('garnish-cost-label');
        if(lbl){ lbl.textContent = 'on'; lbl.style.color = 'var(--amber)'; }
        calcCost();
      });
    });
    var garnishCustom = document.getElementById('garnish-custom-input');
    if(garnishCustom){
      garnishCustom.addEventListener('input', function(){
        var lbl = document.getElementById('garnish-cost-label');
        if(lbl){ lbl.textContent = 'on'; lbl.style.color = 'var(--amber)'; }
        calcCost();
      });
      // Enter → chiudi tastiera
      garnishCustom.addEventListener('keydown', function(e){
        if(e.key === 'Enter') this.blur();
      });
      // Blur senza valore → spegni toggle se custom è selezionato
      garnishCustom.addEventListener('blur', function(){
        var v = parseFloat(this.value)||0;
        var customBtn = document.querySelector('.garnish-opt-btn[data-val="custom"]');
        var isCustomSelected = customBtn && customBtn.classList.contains('garnish-selected');
        if(isCustomSelected && v <= 0){
          // Spegni il toggle garnish
          var toggleBtn = document.getElementById('toggle-garnish');
          if(toggleBtn){
            toggleBtn.dataset.active = '0';
            toggleBtn.style.background = 'var(--brd)';
            toggleBtn.querySelector('span').style.left = '2px';
            var opts = document.getElementById('garnish-options');
            if(opts) opts.style.display = 'none';
            var lbl = document.getElementById('garnish-cost-label');
            if(lbl){ lbl.textContent = 'off'; lbl.style.color = 'var(--dim)'; }
            // Deseleziona custom
            document.querySelectorAll('.garnish-opt-btn').forEach(function(x){
              x.classList.remove('garnish-selected');
              x.style.borderColor = 'var(--brd)';
              x.style.background = 'var(--surf)';
              x.style.color = 'var(--txt2)';
            });
            this.style.display = 'none';
            this.value = '';
            calcCost();
          }
        }
      });
    }
    if(customInput){
      customInput.addEventListener('input', function(){
        var rows = document.querySelectorAll('#cost-ingredients .cost-row');
        var total = 0;
        rows.forEach(function(row){
          var fmt = parseFloat(row.querySelector('.cost-format').value)||0;
          var price = parseFloat(row.querySelector('.cost-price').value)||0;
          var dose = parseFloat(row.querySelector('.cost-dose').value)||0;
          if(fmt>0&&price>0&&dose>0) total += (price/fmt)*dose;
        });
        getExtraCosts().forEach(function(e){ total += e.costo; });
        updateCustom(total);
      });
    }

    // Tips popup
    if(tipsBtn){
      tipsBtn.addEventListener('click', function(){
        if(tipsTitle) tipsTitle.textContent = 'Drink Cost';
        if(tipsContent) tipsContent.innerHTML = TIPS_COST;
        if(tipsOverlay) tipsOverlay.style.display = 'flex';
      });
    }
    if(tipsClose){
      tipsClose.addEventListener('click', function(){
        if(tipsTitle) tipsTitle.textContent = 'Come usarla';
        if(tipsOverlay) tipsOverlay.style.display = 'none';
      });
    }
    if(tipsOverlay){
      tipsOverlay.addEventListener('click', function(e){
        if(e.target === tipsOverlay){
          if(tipsTitle) tipsTitle.textContent = 'Come usarla';
          tipsOverlay.style.display = 'none';
        }
      });
    }

    // Popola di default
    reset();
  }

  // Aggancia initDrinkCost al click sulla card Drink Cost
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.calc-cmd-btn').forEach(function(b){
      if(b.dataset.cmd === 'cost'){
        b.addEventListener('click', function(){
          setTimeout(initDrinkCost, 50);
        });
      }
    });
  });
})();

// ═══════════════════════════════════════════════════════════════
// NICKNAME SYSTEM
// — Modale primo accesso
// — Sezione modifica nel drawer Account
// — Verifica unicità in tempo reale su Firestore
// ═══════════════════════════════════════════════════════════════
(function() {

  // ── UTILS ─────────────────────────────────────────────────────
  function sanitizeNick(val) {
    // Rimuove spazi, caratteri speciali — solo lettere, numeri, underscore, punto
    return val.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase().slice(0, 24);
  }

  function isValidNick(val) {
    return val.length >= 3 && val.length <= 24 && /^[a-zA-Z0-9_.]+$/.test(val);
  }

  var _nickCheckTimer = null;

  // Controlla unicità nickname su Firestore
  async function checkNicknameAvailable(nick, currentUid) {
    var db = window._fbDb;
    var fn = window._fbFunctions;
    if (!db || !fn) return true; // se non disponibile Firebase, lascia passare
    try {
      var q = fn.query(
        fn.collection(db, 'users'),
        fn.where('nickname', '==', nick)
      );
      var snap = await fn.getDocs(q);
      if (snap.empty) return true; // nessuno ha questo nickname → disponibile
      // Controlla che non sia l'utente stesso
      var takenByOther = false;
      snap.forEach(function(d) {
        if (d.id !== currentUid) takenByOther = true;
      });
      return !takenByOther; // true = disponibile (lo ha solo lui stesso)
    } catch(e) {
      // Errore query (es. indice mancante) → consideriamo disponibile
      // L'unicità è garantita anche al salvataggio
      console.warn('checkNickname query error (indice Firestore mancante?):', e.message);
      return true;
    }
  }

  // Salva nickname su Firestore
  async function saveNickname(uid, nick) {
    var db = window._fbDb;
    var fn = window._fbFunctions;
    if (!db || !fn) return false;
    try {
      await fn.setDoc(fn.doc(db, 'users', uid), { nickname: nick }, { merge: true });
      window._currentNickname = nick;
      return true;
    } catch(e) {
      console.error('saveNickname:', e);
      return false;
    }
  }

  // ── MODALE PRIMO ACCESSO ───────────────────────────────────────
  function createNicknameModal() {
    if (document.getElementById('nickname-modal')) return;

    var modal = document.createElement('div');
    modal.id = 'nickname-modal';
    modal.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:rgba(0,0,0,.7)',
      'display:flex;align-items:center;justify-content:center',
      'padding:1.5rem',
      'animation:fadeIn .25s ease'
    ].join(';');

    modal.innerHTML =
      '<div style="background:#1e293b;border:1px solid rgba(255,255,255,.08);border-radius:20px;' +
      'width:100%;max-width:340px;padding:1.75rem 1.5rem;position:relative;">' +

        // Icona
        '<div style="width:48px;height:48px;background:linear-gradient(135deg,rgba(37,99,235,.2),rgba(245,158,11,.15));' +
        'border:1px solid rgba(245,158,11,.25);border-radius:13px;display:flex;align-items:center;justify-content:center;margin:0 auto .9rem;">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
          '</svg>' +
        '</div>' +

        // Titolo + sub
        '<div style="text-align:center;margin-bottom:1.2rem;">' +
          '<div style="font-size:1rem;font-weight:800;letter-spacing:-.02em;color:#f1f5f9;margin-bottom:.3rem;">Scegli il tuo nickname</div>' +
          '<div style="font-size:.78rem;color:#94a3b8;line-height:1.5;">Sarà il tuo nome in classifica.<br>Unico, come su Instagram.</div>' +
        '</div>' +

        // Input
        '<div style="position:relative;margin-bottom:.4rem;">' +
          '<span style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);font-size:.85rem;color:#64748b;font-weight:600;pointer-events:none;">@</span>' +
          '<input id="nick-modal-input" type="text" maxlength="24" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
          'placeholder="il_tuo_nickname" ' +
          'style="text-transform:lowercase;width:100%;background:#0a0f1e;border:1.5px solid rgba(255,255,255,.1);border-radius:10px;' +
          'padding:.62rem .75rem .62rem 1.75rem;font-size:.88rem;font-family:Inter,sans-serif;color:#f1f5f9;outline:none;' +
          'transition:border-color .2s;-webkit-user-select:text;user-select:text;box-sizing:border-box;">' +
        '</div>' +

        // Feedback disponibilità
        '<div id="nick-modal-feedback" style="font-size:.72rem;min-height:1.1rem;margin-bottom:.65rem;padding:0 .15rem;"></div>' +

        // Regole
        '<div style="font-size:.63rem;color:#64748b;margin-bottom:1rem;line-height:1.6;text-align:center;">' +
          '3–24 caratteri · lettere, numeri, punto, underscore' +
        '</div>' +

        // Bottone
        '<button id="nick-modal-btn" disabled ' +
        'style="display:block;width:100%;padding:.72rem 1rem;border-radius:10px;border:none;' +
        'font-family:Inter,sans-serif;font-size:.85rem;font-weight:700;letter-spacing:.01em;' +
        'text-align:center;cursor:not-allowed;' +
        'background:rgba(255,255,255,.06);color:#64748b;transition:all .25s;">' +
          'Conferma' +
        '</button>' +

      '</div>';

    document.body.appendChild(modal);

    var input = document.getElementById('nick-modal-input');
    var btn = document.getElementById('nick-modal-btn');
    var feedback = document.getElementById('nick-modal-feedback');

    // Focus input
    setTimeout(function() { input && input.focus(); }, 300);

    // Stato bottone e feedback
    var _lastValid = false;

    function setFeedback(msg, color) {
      feedback.textContent = msg;
      feedback.style.color = color;
    }

    function setBtnEnabled(ok) {
      _lastValid = ok;
      btn.disabled = !ok;
      btn.style.background = ok
        ? 'linear-gradient(135deg,#f59e0b,#d97706)'
        : 'rgba(255,255,255,.06)';
      btn.style.color = ok ? '#0a0f1e' : '#64748b';
      btn.style.cursor = ok ? 'pointer' : 'not-allowed';
      btn.style.boxShadow = ok ? '0 4px 14px rgba(245,158,11,.4)' : 'none';
    }

    input.addEventListener('input', function() {
      var raw = this.value;
      var clean = sanitizeNick(raw);
      if (clean !== raw) this.value = clean;

      setBtnEnabled(false);
      clearTimeout(_nickCheckTimer);

      if (!isValidNick(clean)) {
        if (clean.length > 0 && clean.length < 3) {
          setFeedback('Minimo 3 caratteri', '#f87171');
        } else {
          setFeedback('', '');
        }
        return;
      }

      setFeedback('Controllo disponibilità…', '#60a5fa');

      var uid = window._currentUser ? window._currentUser.uid : '';
      _nickCheckTimer = setTimeout(async function() {
        var available = await checkNicknameAvailable(clean, uid);
        if (available) {
          setFeedback('✓ @' + clean + ' è disponibile', '#22c55e');
          setBtnEnabled(true);
        } else {
          setFeedback('✗ @' + clean + ' non è disponibile', '#f87171');
          setBtnEnabled(false);
        }
      }, 600);
    });

    btn.addEventListener('click', async function() {
      if (!_lastValid) return;
      var nick = input.value.trim();
      var uid = window._currentUser ? window._currentUser.uid : '';
      if (!uid) return;

      btn.disabled = true;
      btn.textContent = 'Salvataggio…';

      var ok = await saveNickname(uid, nick);
      if (ok) {
        // Rimuovi modale nickname
        modal.style.opacity = '0';
        modal.style.transition = 'opacity .25s';
        setTimeout(function() {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
          // Aggiorna drawer account se aperto
          if (typeof renderAccountTab === 'function') renderAccountTab();
          else if (window._renderAccountTab) window._renderAccountTab();
          // Mostra popup installa PWA (solo se non già in standalone)
          var alreadyPWA = window.matchMedia('(display-mode: standalone)').matches
                        || window.navigator.standalone === true;
          if (!alreadyPWA) {
            setTimeout(function() { showInstallPWAModal(); }, 400);
          }
        }, 250);
      } else {
        btn.disabled = false;
        btn.textContent = 'Continua';
        setFeedback('Errore nel salvataggio. Riprova.', '#f87171');
      }
    });
  }

  // ── CONTROLLA SE MOSTRARE IL MODALE AL LOGIN ───────────────────
  async function checkNicknameOnLogin(user) {
    var db = window._fbDb;
    var fn = window._fbFunctions;
    if (!db || !fn || !user) return;
    try {
      var snap = await fn.getDoc(fn.doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().nickname) {
        // Nessun nickname → mostra modale (solo se non stiamo registrando)
        // 3 condizioni obbligatorie per aprire il popup nickname:
        // 1. utente loggato (user esiste)
        // 2. email verificata
        // 3. nickname non presente
        if (user && user.emailVerified && !window._isRegistering) {
          setTimeout(createNicknameModal, 800);
        }
      } else {
        window._currentNickname = snap.data().nickname;
      }
    } catch(e) {
      console.error('checkNicknameOnLogin:', e);
    }
  }

  // Agganciato all'evento fb-auth-ready
  window.addEventListener('fb-auth-ready', function(e) {
    if (e.detail && e.detail.user) {
      checkNicknameOnLogin(e.detail.user);
    }
  });

  // ── SEZIONE NICKNAME NEL DRAWER ACCOUNT ───────────────────────
  // Questa funzione viene chiamata da renderAccountTab() dopo aver
  // costruito il contenuto base — aggiunge la sezione nickname in cima
  window._buildNicknameSection = async function(uid) {
    var db = window._fbDb;
    var fn = window._fbFunctions;
    if (!db || !fn) return '';

    var nickname = '';
    try {
      var snap = await fn.getDoc(fn.doc(db, 'users', uid));
      if (snap.exists() && snap.data().nickname) {
        nickname = snap.data().nickname;
        window._currentNickname = nickname;
      }
    } catch(e) { console.error(e); }

    return (
      '<div id="nick-acc-section" style="margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid var(--brd);">' +
        '<div style="font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:.6rem;">Nickname</div>' +

        // Visualizzazione nickname attuale
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;">' +
          '<div style="font-size:.88rem;font-weight:700;color:var(--txt);">@' + (nickname || '—') + '</div>' +
          '<button id="nick-edit-btn" style="background:transparent;border:1px solid var(--brd);border-radius:7px;' +
          'color:var(--dim);font-size:.62rem;font-weight:700;font-family:inherit;cursor:pointer;' +
          'padding:.2rem .55rem;letter-spacing:.05em;text-transform:uppercase;transition:all .2s;">' +
            'Modifica' +
          '</button>' +
        '</div>' +

        // Form modifica (nascosto di default)
        '<div id="nick-edit-form" style="display:none;margin-top:.75rem;">' +
          '<div style="position:relative;margin-bottom:.4rem;">' +
            '<span style="position:absolute;left:.6rem;top:50%;transform:translateY(-50%);font-size:.8rem;color:var(--dim);font-weight:600;">@</span>' +
            '<input id="nick-acc-input" type="text" maxlength="24" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' +
            'value="' + nickname + '"' +
            'style="width:100%;background:var(--bg);border:1.5px solid var(--brd);border-radius:9px;' +
            'padding:.55rem .65rem .55rem 1.6rem;font-size:.82rem;font-family:inherit;color:var(--txt);' +
            'outline:none;transition:border-color .2s;-webkit-user-select:text;user-select:text;">' +
          '</div>' +
          '<div id="nick-acc-feedback" style="font-size:.7rem;min-height:1rem;margin-bottom:.6rem;"></div>' +
          '<div style="display:flex;gap:.5rem;">' +
            '<button id="nick-acc-cancel" style="flex:1;padding:.52rem;border-radius:8px;border:1px solid var(--brd);' +
            'background:transparent;color:var(--dim);font-family:inherit;font-size:.75rem;font-weight:600;cursor:pointer;">Annulla</button>' +
            '<button id="nick-acc-save" disabled style="flex:2;padding:.52rem;border-radius:8px;border:none;' +
            'background:rgba(255,255,255,.06);color:var(--dim);font-family:inherit;font-size:.75rem;font-weight:700;' +
            'cursor:not-allowed;transition:all .2s;">Salva</button>' +
          '</div>' +
        '</div>' +

      '</div>'
    );
  };

  // Aggancia eventi alla sezione nickname dopo che è stata inserita nel DOM
  window._initNicknameAccSection = function(uid) {
    var editBtn   = document.getElementById('nick-edit-btn');
    var editForm  = document.getElementById('nick-edit-form');
    var input     = document.getElementById('nick-acc-input');
    var feedback  = document.getElementById('nick-acc-feedback');
    var saveBtn   = document.getElementById('nick-acc-save');
    var cancelBtn = document.getElementById('nick-acc-cancel');

    if (!editBtn || !editForm || !input || !saveBtn || !cancelBtn) return;

    var _lastValid = false;
    var _originalNick = input.value;

    function setFb(msg, color) { feedback.textContent = msg; feedback.style.color = color; }
    function setSave(ok) {
      _lastValid = ok;
      saveBtn.disabled = !ok;
      saveBtn.style.background = ok ? 'linear-gradient(135deg,#2563eb,#1e40af)' : 'rgba(255,255,255,.06)';
      saveBtn.style.color = ok ? '#fff' : 'var(--dim)';
      saveBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
    }

    // Apri form
    editBtn.addEventListener('click', function() {
      editForm.style.display = 'block';
      editBtn.style.display = 'none';
      input.focus();
      input.select();
    });

    // Annulla
    cancelBtn.addEventListener('click', function() {
      editForm.style.display = 'none';
      editBtn.style.display = '';
      input.value = _originalNick;
      setFb('', '');
      setSave(false);
    });

    // Input con debounce check unicità
    input.addEventListener('input', function() {
      var raw = this.value;
      var clean = sanitizeNick(raw);
      if (clean !== raw) this.value = clean;

      setSave(false);
      clearTimeout(_nickCheckTimer);
      setFb('', '');

      if (clean === _originalNick) {
        setFb('', '');
        return;
      }
      if (!isValidNick(clean)) {
        if (clean.length > 0 && clean.length < 3) setFb('Minimo 3 caratteri', '#f87171');
        return;
      }

      setFb('Controllo…', '#60a5fa');
      _nickCheckTimer = setTimeout(async function() {
        var available = await checkNicknameAvailable(clean, uid);
        if (available) {
          setFb('✓ @' + clean + ' è disponibile', '#22c55e');
          setSave(true);
        } else {
          setFb('✗ @' + clean + ' è già preso', '#f87171');
          setSave(false);
        }
      }, 600);
    });

    // Salva
    saveBtn.addEventListener('click', async function() {
      if (!_lastValid) return;
      var nick = input.value.trim();
      if (!uid) return;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvataggio…';
      var ok = await saveNickname(uid, nick);
      if (ok) {
        _originalNick = nick;
        editForm.style.display = 'none';
        editBtn.style.display = '';
        editBtn.style.display = '';
        // Aggiorna testo @nickname
        var display = document.querySelector('#nick-acc-section .nick-display-val');
        if (display) display.textContent = '@' + nick;
        // Aggiorna tutto il drawer
        if (window._renderAccountTab) window._renderAccountTab();
        setFb('', '');
      } else {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salva';
        setFb('Errore. Riprova.', '#f87171');
      }
    });
  };

})();

// ═══════════════════════════════════════════════════════════
// MODAL RESET PASSWORD
// ═══════════════════════════════════════════════════════════
function openResetPasswordModal(prefillEmail) {
  var modal   = document.getElementById('resetPasswordModal');
  var input   = document.getElementById('resetEmailInput');
  var feedback = document.getElementById('resetFeedback');
  var btn     = document.getElementById('resetSendBtn');
  if (!modal) return;

  // Reset stato
  input.value = prefillEmail || '';
  feedback.style.display = 'none';
  feedback.textContent = '';
  btn.disabled = false;
  btn.textContent = 'Invia link di reset →';
  btn.style.background = '#f59e0b';
  btn.style.color = '#0f172a';

  modal.style.display = 'flex';
  if (!prefillEmail) setTimeout(function() { input.focus(); }, 120);
}

function closeResetPasswordModal() {
  var modal = document.getElementById('resetPasswordModal');
  if (modal) modal.style.display = 'none';
}

(function initResetModal() {
  var modal   = document.getElementById('resetPasswordModal');
  var closeBtn = document.getElementById('resetModalClose');
  var input   = document.getElementById('resetEmailInput');
  var sendBtn = document.getElementById('resetSendBtn');
  var feedback = document.getElementById('resetFeedback');
  if (!modal) return;

  // Chiudi cliccando fuori dal panel
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeResetPasswordModal();
  });

  // Chiudi con pulsante ×
  if (closeBtn) closeBtn.addEventListener('click', closeResetPasswordModal);

  // Chiudi con Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeResetPasswordModal();
  });

  // Invio con Enter dall'input
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doSendReset();
    });
  }

  // Click sul bottone
  if (sendBtn) sendBtn.addEventListener('click', doSendReset);

  function setFeedback(msg, isSuccess) {
    if (!feedback) return;
    feedback.style.display = 'block';
    if (isSuccess) {
      feedback.style.background = 'rgba(34,197,94,0.12)';
      feedback.style.border = '1px solid rgba(34,197,94,0.25)';
      feedback.style.color = '#86efac';
    } else {
      feedback.style.background = 'rgba(239,68,68,0.12)';
      feedback.style.border = '1px solid rgba(239,68,68,0.25)';
      feedback.style.color = '#fca5a5';
    }
    feedback.textContent = msg;
  }

  function doSendReset() {
    var email = input ? input.value.trim() : '';
    var auth  = window._fbAuth;
    var resetFn = window._fbFunctions && window._fbFunctions.sendPasswordResetEmail;

    if (!email) {
      setFeedback('Inserisci la tua email prima di continuare.', false);
      input && input.focus();
      return;
    }
    if (!auth || !resetFn) {
      setFeedback('Servizio non disponibile. Riprova tra qualche secondo.', false);
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Invio in corso…';

    resetFn(auth, email)
      .then(function() {
        setFeedback('✓ Email inviata! Controlla la casella di posta (anche spam/junk). Riceverai un link per reimpostare la password.', true);
        sendBtn.textContent = 'Email inviata ✓';
        sendBtn.style.background = '#1e293b';
        sendBtn.style.color = '#64748b';
        sendBtn.style.border = '1px solid rgba(255,255,255,0.08)';
      })
      .catch(function(error) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Invia link di reset →';
        sendBtn.style.background = '#f59e0b';
        sendBtn.style.color = '#0f172a';
        var msg = 'Qualcosa è andato storto. Riprova.';
        if (error.code === 'auth/user-not-found')   msg = 'Nessun account trovato con questa email.';
        if (error.code === 'auth/invalid-email')     msg = 'Email non valida. Controllala e riprova.';
        if (error.code === 'auth/too-many-requests') msg = 'Troppi tentativi. Aspetta qualche minuto e riprova.';
        setFeedback(msg, false);
      });
  }
})();

// ═══════════════════════════════════════════════════════════
// FORM CONFERMA NUOVA PASSWORD (da link email reset)
// ═══════════════════════════════════════════════════════════
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var pwdNew     = document.getElementById('reset-pwd-new');
    var pwdConfirm = document.getElementById('reset-pwd-confirm');
    var eyeNew     = document.getElementById('reset-eye-new');
    var btn        = document.getElementById('reset-confirm-btn');
    var errEl      = document.getElementById('reset-confirm-err');

    if (!btn) return;

    // Toggle mostra/nascondi password (unico toggle per entrambi i campi)
    var _rsEyeOn = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var _rsEyeOff = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    if (eyeNew) {
      eyeNew.addEventListener('click', function() {
        var show = pwdNew.type === 'password';
        pwdNew.type = show ? 'text' : 'password';
        if (pwdConfirm) pwdConfirm.type = show ? 'text' : 'password';
        eyeNew.innerHTML = show ? _rsEyeOff : _rsEyeOn;
      });
    }

    function showErr(msg, isSuccess) {
      errEl.style.color = isSuccess ? '#4ade80' : '#f87171';
      errEl.textContent = msg;
    }

    function clearErr() { errEl.textContent = ''; }

    // Enter su entrambi i campi
    [pwdNew, pwdConfirm].forEach(function(el) {
      if (el) el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doConfirmReset();
      });
    });

    btn.addEventListener('click', doConfirmReset);

    function doConfirmReset() {
      clearErr();
      var pwd1 = pwdNew ? pwdNew.value : '';
      var pwd2 = pwdConfirm ? pwdConfirm.value : '';
      var oobCode = window._resetOobCode;

      if (!oobCode) {
        showErr('Sessione scaduta. Richiedi un nuovo link di reset.');
        return;
      }
      if (!pwd1 || pwd1.length < 6) {
        showErr('La password deve avere almeno 6 caratteri.');
        pwdNew && pwdNew.focus();
        return;
      }
      if (/\s/.test(pwd1)) {
        showErr('La password non può contenere spazi.');
        pwdNew && pwdNew.focus();
        return;
      }
      if (pwd1 !== pwd2) {
        showErr('Le password non coincidono.');
        pwdConfirm && pwdConfirm.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Salvataggio…';

      function doReset() {
        var auth = window._fbAuth;
        var fn   = window._fbFunctions;
        if (!auth || !fn || !fn.confirmPasswordReset) {
          setTimeout(doReset, 300);
          return;
        }

        fn.confirmPasswordReset(auth, oobCode, pwd1)
          .then(function() {
            window._resetOobCode = null;
            var resetForm = document.getElementById('form-reset-confirm');
            if (!resetForm) return;

            // Legge il parametro aggiunto da auth-action.html
            // pwreset=pwa → link aperto dalla PWA installata → vai al login
            // assente     → link aperto da WebView/browser → chiudi e riapri
            var urlParams  = new URLSearchParams(window.location.search);
            var fromPWA    = urlParams.get('pwreset') === 'pwa';
            var WEBAPP_URL = 'https://danielsportelli.github.io/cocktail-legend/webapp/cocktail-legend.html';

            var iconHtml =
              '<div style="width:56px;height:56px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
              '</div>' +
              '<div style="font-size:1.1rem;font-weight:800;color:#f1f5f9;margin-bottom:.5rem;">Password aggiornata!</div>';

            if (fromPWA) {
              // Siamo nella PWA — mostra conferma e vai al login
              resetForm.innerHTML =
                '<div style="text-align:center;padding:1.5rem 0;">' +
                  iconHtml +
                  '<p style="font-size:.82rem;color:#94a3b8;line-height:1.6;margin-bottom:1.25rem;">Perfetto! Ora puoi accedere<br>con la tua nuova password.</p>' +
                '</div>';
              setTimeout(function() {
                if (typeof switchAuthTab === 'function') switchAuthTab('login');
                var loginErr = document.getElementById('login-err');
                if (loginErr) {
                  loginErr.style.color = '#4ade80';
                  loginErr.textContent = '✓ Password aggiornata! Accedi con la nuova password.';
                  setTimeout(function() { loginErr.style.color = ''; loginErr.textContent = ''; }, 5000);
                }
              }, 2000);

            } else {
              // WebView o browser normale — chiudi e riapri manualmente
              resetForm.innerHTML =
                '<div style="text-align:center;padding:1.5rem 0;">' +
                  iconHtml +
                  '<p style="font-size:.82rem;color:#94a3b8;line-height:1.6;margin-bottom:1.25rem;">Chiudi questa schermata e torna su<br><strong style=\"color:#f1f5f9\">Cocktail Legend</strong> per accedere<br>con la tua nuova password.</p>' +
                  '<div style="display:inline-flex;align-items:center;gap:.4rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:.55rem 1rem;font-size:.75rem;color:#64748b;">' +
                    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                    ' Puoi chiudere questa schermata' +
                  '</div>' +
                '</div>';
            }
          })
          .catch(function(e) {
            btn.disabled = false;
            btn.textContent = 'Salva nuova password →';
            var msg = 'Qualcosa è andato storto. Riprova.';
            if (e.code === 'auth/expired-action-code') msg = 'Link scaduto. Richiedi un nuovo reset dalla schermata di login.';
            if (e.code === 'auth/invalid-action-code') msg = 'Link non valido o già usato. Richiedine uno nuovo.';
            if (e.code === 'auth/weak-password')       msg = 'Password troppo debole. Usa almeno 6 caratteri.';
            showErr(msg);
          });
      }

      doReset();
    }
  });
})();

// ═══════════════════════════════════════════════════════════
// SISTEMA PREMIUM — Modal + Toast + Lock
// ═══════════════════════════════════════════════════════════

// Traccia se modal già mostrato in questa sessione (per toast)
window._premiumModalShownThisSession = false;

function isPremium() {
  return window._userPlan === 'premium';
}

// ── MODAL PREMIUM COMPLETO ───────────────────────────────
function showPremiumModal() {
  if (document.getElementById('premium-modal')) {
    document.getElementById('premium-modal').style.display = 'flex';
    window._premiumModalShownThisSession = true;
    return;
  }

  var modal = document.createElement('div');
  modal.id = 'premium-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;';

  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(245,158,11,0.3);border-radius:24px;padding:1.4rem 1.5rem;width:100%;max-width:420px;max-height:88vh;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;position:relative;box-shadow:0 30px 80px rgba(0,0,0,0.6);">

      <!-- Chiudi -->
      <button id="premium-modal-close" style="position:absolute;top:1rem;right:1.1rem;background:none;border:none;color:#64748b;font-size:1.5rem;cursor:pointer;line-height:1;transition:color .2s;" onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#64748b'">×</button>

      <!-- Header -->
      <div style="text-align:center;margin-bottom:1rem;">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto .6rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <h2 style="font-size:1.25rem;font-weight:900;color:#f1f5f9;margin:0 0 .2rem;letter-spacing:-.02em;">Passa a Premium</h2>
        <p style="font-size:.82rem;color:#94a3b8;margin:0;">Sblocca tutte le funzioni di Cocktail Legend</p>
      </div>

      <!-- Prezzo -->
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04));border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:.75rem 1rem;margin-bottom:1rem;text-align:center;">
        <div style="font-size:1.7rem;font-weight:900;color:#f59e0b;letter-spacing:-.03em;">19,99€<span style="font-size:.9rem;font-weight:500;color:#94a3b8;"> / primo anno</span></div>
        <div style="font-size:.72rem;color:#64748b;margin-top:.25rem;line-height:1.5;">Dal secondo anno in poi 9,99€/anno</div>
      </div>

      <!-- Lista benefici -->
      <div style="margin-bottom:1rem;">
        <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f59e0b;margin-bottom:.55rem;">Cosa sblocchi</div>

        <!-- Spirit Genesis -->
        <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="width:20px;height:20px;background:rgba(34,197,94,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.1rem;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:#f1f5f9;">Spirit Genesis</div>
            <div style="font-size:.72rem;color:#64748b;margin-top:.1rem;">Corso avanzato di merceologia</div>
          </div>
        </div>

        <!-- AI -->
        <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="width:20px;height:20px;background:rgba(34,197,94,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.1rem;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:#f1f5f9;">Barman AI (4 funzioni)</div>
            <div style="font-size:.72rem;color:#64748b;margin-top:.1rem;">Cocktail del Giorno · Crea Signature · Twist on Classic · Food Pairing</div>
          </div>
        </div>

        <!-- Calcolatori -->
        <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="width:20px;height:20px;background:rgba(34,197,94,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.1rem;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:#f1f5f9;">Calcolatori avanzati</div>
            <div style="font-size:.72rem;color:#64748b;margin-top:.1rem;">Calcolatore ABV · Calcolatore Pre-Batch</div>
          </div>
        </div>

        <!-- Preferiti -->
        <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="width:20px;height:20px;background:rgba(34,197,94,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.1rem;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:#f1f5f9;">Preferiti</div>
            <div style="font-size:.72rem;color:#64748b;margin-top:.1rem;">Vedi tutti i cocktail salvati come preferiti</div>
          </div>
        </div>

        <!-- Classifica mensile -->
        <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="width:20px;height:20px;background:rgba(34,197,94,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.1rem;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:#f1f5f9;">Premi Quiz Mensili</div>
            <div style="font-size:.72rem;color:#64748b;margin-top:.1rem;">1° → 1000 crediti · 2° → 200 crediti · 3° → 50 crediti</div>
          </div>
        </div>

        <!-- Crediti -->
        <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.45rem 0;">
          <div style="width:20px;height:20px;background:rgba(34,197,94,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.1rem;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:#f1f5f9;">30 crediti AI / mese</div>
            <div style="font-size:.72rem;color:#64748b;margin-top:.1rem;">Inclusi ogni mese, si rinnovano automaticamente</div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <button id="premium-cta-btn" style="width:100%;padding:.8rem;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:800;font-size:.92rem;border:none;border-radius:12px;cursor:pointer;transition:all .2s;letter-spacing:.01em;font-family:inherit;">
        Acquista Premium →
      </button>
      <p style="text-align:center;font-size:.7rem;color:#475569;margin-top:.5rem;">Rinnovo automatico · Disdici quando vuoi</p>
    </div>
  `;

  document.body.appendChild(modal);
  window._premiumModalShownThisSession = true;

  // Chiudi con ×
  document.getElementById('premium-modal-close').addEventListener('click', function() {
    modal.style.display = 'none';
  });

  // Chiudi cliccando fuori
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.style.display = 'none';
  });

  // Chiudi con Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display !== 'none') modal.style.display = 'none';
  });

  // CTA — per ora placeholder
  document.getElementById('premium-cta-btn').addEventListener('click', function() {
    // TODO: collegare Stripe
    alert('Pagamento in arrivo! Stripe verrà collegato a breve.');
  });
}

// ── TOAST PREMIUM (volte successive) ────────────────────
function showPremiumToast(msg) {
  msg = msg || '🔒 Solo Piano Premium — Upgrade →';
  var existing = document.getElementById('premium-toast');
  if (existing) { existing.remove(); }

  var toast = document.createElement('div');
  toast.id = 'premium-toast';
  toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:#0f172a;border:1px solid rgba(245,158,11,0.6);border-radius:16px;padding:.9rem 1.4rem;display:flex;align-items:center;gap:.7rem;box-shadow:0 0 0 1px rgba(245,158,11,0.15),0 20px 60px rgba(0,0,0,0.8);animation:toastIn .25s ease;white-space:nowrap;';
  toast.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    <span style="font-size:.82rem;font-weight:600;color:#f1f5f9;">${msg}</span>
    <span style="font-size:.75rem;color:#f59e0b;font-weight:700;cursor:pointer;margin-left:.3rem;" id="toast-upgrade-link">Upgrade →</span>
  `;
  document.body.appendChild(toast);

  document.getElementById('toast-upgrade-link').addEventListener('click', function() {
    toast.remove();
    showPremiumModal();
  });

  setTimeout(function() {
    if (toast.parentNode) toast.style.opacity = '0';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
  }, 3000);
}

// ── FUNZIONE PRINCIPALE: gestisce click su feature premium ──
function requirePremium(featureName) {
  if (isPremium()) return true; // utente premium, passa
  if (!window._premiumModalShownThisSession) {
    showPremiumModal();
  } else {
    showPremiumToast('Solo Piano Premium');
  }
  return false;
}

// Aggiungi stile animazione toast
(function() {
  var s = document.createElement('style');
  s.textContent = '@keyframes toastIn{from{opacity:0;transform:translate(-50%,-50%) scale(.92)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}';
  document.head.appendChild(s);
})();

// ═══════════════════════════════════════════════════════════
// INTERCETTAZIONE CLICK FUNZIONI PREMIUM
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {

  // ── AI buttons (tutti e 4 bloccati) ──────────────────────
  var aiPremiumBtns = [
    { id: 'ai-btn-signature', nome: 'Crea un Signature' },
    { id: 'ai-btn-twist',     nome: 'Twist on Classic'  },
    { id: 'ai-btn-pairing',   nome: 'Food Pairing'      },
    { id: 'ai-btn-giorno',    nome: 'Cocktail del Giorno'},
  ];
  aiPremiumBtns.forEach(function(item) {
    var btn = document.getElementById(item.id);
    if (!btn) return;
    btn.addEventListener('click', function(e) {
      if (!isPremium()) {
        e.preventDefault();
        e.stopPropagation();
        requirePremium(item.nome);
      }
    });
  });

  // ── Calcolatori ABV e Pre-Batch ───────────────────────────
  var calcPremiumBtns = [
    { id: 'calc-btn-abv',   nome: 'Calcolatore ABV'      },
    { id: 'calc-btn-batch', nome: 'Calcolatore Pre-Batch' },
  ];
  calcPremiumBtns.forEach(function(item) {
    var btn = document.getElementById(item.id);
    if (!btn) return;
    btn.addEventListener('click', function(e) {
      if (!isPremium()) {
        e.preventDefault();
        e.stopPropagation();
        requirePremium(item.nome);
      }
    });
  });

  // ── Spirit Genesis PDF ────────────────────────────────────
  var sgLink = document.getElementById('sg-pdf-link');
  if (sgLink) {
    sgLink.addEventListener('click', function(e) {
      if (!isPremium()) {
        e.preventDefault();
        e.stopPropagation();
        requirePremium('Spirit Genesis');
      }
    });
    // Aggiungi badge lock visivo vicino al link
    var lockSg = document.createElement('span');
    lockSg.style.cssText = 'display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;font-weight:700;color:#f59e0b;margin-left:auto;';
    lockSg.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    sgLink.style.position = 'relative';
    sgLink.appendChild(lockSg);
  }

  // Cuoricini liberi per tutti — il blocco è solo sulla sezione preferiti raggruppati

});

// ── BACK TO TOP ───────────────────────────────────────────────────
// Appare dopo 5000px di scroll — stile Spirit Genesis
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    // Mostra/nascondi al scroll
    window.addEventListener('scroll', function(){
      btn.classList.toggle('visible', (window.scrollY || window.pageYOffset) > 5000);
    }, { passive: true });

    // Utility: bagliore blu istantaneo, non persistente
    function bttFlash() {
      btn.classList.remove('btt-flash');
      void btn.offsetWidth; // force reflow
      btn.classList.add('btt-flash');
      setTimeout(function(){ btn.classList.remove('btt-flash'); btn.blur(); }, 380);
    }

    // Touch: flash immediato al touchstart, scroll al touchend
    var _bttTouched = false;
    btn.addEventListener('touchstart', function(){
      _bttTouched = true;
      bttFlash();
    }, { passive: true });
    btn.addEventListener('touchend', function(e){
      e.preventDefault();
      _bttTouched = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // Click (mouse desktop)
    btn.addEventListener('click', function(){
      if (_bttTouched) { _bttTouched = false; return; }
      bttFlash();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();

// ═══════════════════════════════════════════════════════════
// POPUP INSTALLA PWA — mostrato dopo conferma nickname
// ═══════════════════════════════════════════════════════════
function showInstallPWAModal() {
  if (document.getElementById('pwa-install-modal')) return;

  var ua      = navigator.userAgent || '';
  var isIOS   = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  if (!isIOS && !isAndroid) return;

  var stepsIOSSafari = [
    'Tocca l\'icona <strong>Condividi</strong> (□↑) in basso al centro',
    'Scorri e tocca <strong>Aggiungi a schermata Home</strong>',
    'Tocca <strong>Aggiungi</strong> in alto a destra'
  ];
  var stepsIOSChrome = [
    'Tocca l\'icona <strong>Condividi</strong> (□↑) in alto a destra',
    'Scorri e tocca <strong>Aggiungi alla schermata Home</strong>',
    'Tocca <strong>Aggiungi</strong> per confermare'
  ];
  var stepsAndroid = [
    'Apri <strong>Chrome</strong> — se sei in un altro browser, copia il link e incollalo in Chrome',
    'Tocca il menu <strong>⋮</strong> in alto a destra',
    'Tocca <strong>Aggiungi a schermata Home</strong> oppure <strong>Installa app</strong>',
    'Tocca <strong>Installa</strong> o <strong>Aggiungi</strong> per far apparire l\'icona Cocktail Legend sul tuo smartphone assieme alle altre app'
  ];

  function buildStepsHtml(steps) {
    return steps.map(function(s, i) {
      return '<div style="display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.65rem;">'
        + '<div style="flex-shrink:0;width:22px;height:22px;background:rgba(37,99,235,.18);border:1px solid rgba(37,99,235,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:800;color:#60a5fa;margin-top:.1rem;">' + (i+1) + '</div>'
        + '<div style="font-size:.8rem;color:#cbd5e1;line-height:1.55;">' + s + '</div>'
        + '</div>';
    }).join('');
  }

  var stepsContent = '';
  if (isIOS) {
    // Toggle Safari/Chrome + pannelli
    stepsContent =
      '<div id="pwa-os-toggle" style="display:flex;background:#0a0f1e;border-radius:10px;padding:3px;margin-bottom:1.25rem;gap:3px;">'
        + '<button id="pwa-btn-safari" style="flex:1;padding:.48rem .5rem;border:none;border-radius:8px;font-family:inherit;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s;background:#334155;color:#f1f5f9;display:flex;align-items:center;justify-content:center;gap:.35rem;-webkit-tap-highlight-color:transparent;">Safari</button>'
        + '<button id="pwa-btn-chrome" style="flex:1;padding:.48rem .5rem;border:none;border-radius:8px;font-family:inherit;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s;background:transparent;color:#64748b;display:flex;align-items:center;justify-content:center;gap:.35rem;-webkit-tap-highlight-color:transparent;">Chrome</button>'
      + '</div>'
      + '<div id="pwa-panel-safari">' + buildStepsHtml(stepsIOSSafari) + '</div>'
      + '<div id="pwa-panel-chrome" style="display:none;">' + buildStepsHtml(stepsIOSChrome) + '</div>';
  } else {
    stepsContent = buildStepsHtml(stepsAndroid);
  }

  var modal = document.createElement('div');
  modal.id = 'pwa-install-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99997;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0 .75rem .75rem;animation:fadeIn .25s ease;';

  modal.innerHTML =
    '<div style="background:#1e293b;border:1px solid rgba(255,255,255,.08);border-radius:20px;width:100%;max-width:420px;padding:1.5rem 1.4rem 1.75rem;position:relative;">'
      + '<div style="width:36px;height:4px;background:rgba(255,255,255,.18);border-radius:2px;margin:0 auto .9rem;"></div>'
      + '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem;">'
        + '<div style="width:36px;height:36px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
          + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10m0 0l-3-3m3 3l3-3"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>'
        + '</div>'
        + '<div style="font-size:1rem;font-weight:800;color:#f1f5f9;letter-spacing:-.01em;">Salva l\'app sul telefono</div>'
      + '</div>'
      + '<div style="font-size:.78rem;color:#64748b;margin-bottom:1.25rem;">Accedi più velocemente senza aprire il browser.</div>'
      + stepsContent
      + '<div style="display:flex;gap:.6rem;margin-top:1.1rem;">'
        + '<button id="pwa-install-ok" style="width:100%;padding:.72rem;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;border-radius:10px;color:#0a0f1e;font-family:inherit;font-size:.85rem;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent;">Ho capito!</button>'
      + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  // Toggle Safari/Chrome su iOS
  if (isIOS) {
    var btnSafari = document.getElementById('pwa-btn-safari');
    var btnChrome = document.getElementById('pwa-btn-chrome');
    var panelSafari = document.getElementById('pwa-panel-safari');
    var panelChrome = document.getElementById('pwa-panel-chrome');
    function switchPwa(which) {
      var isSafari = which === 'safari';
      btnSafari.style.background = isSafari ? '#334155' : 'transparent';
      btnSafari.style.color = isSafari ? '#f1f5f9' : '#64748b';
      btnChrome.style.background = isSafari ? 'transparent' : '#334155';
      btnChrome.style.color = isSafari ? '#64748b' : '#f1f5f9';
      panelSafari.style.display = isSafari ? 'block' : 'none';
      panelChrome.style.display = isSafari ? 'none' : 'block';
    }
    btnSafari.addEventListener('click', function() { switchPwa('safari'); });
    btnChrome.addEventListener('click', function() { switchPwa('chrome'); });
  }

  function closeModal() {
    modal.style.opacity = '0';
    modal.style.transition = 'opacity .2s';
    setTimeout(function() { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
  }

  document.getElementById('pwa-install-ok').addEventListener('click', closeModal);
  // Chiudi toccando fuori
  modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
}
