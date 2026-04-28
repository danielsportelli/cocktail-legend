---
name: cocktail-legend-project
description: Documento di progetto Cocktail Legend di Daniel Sportelli. Contiene stack tecnico, struttura file, funzionalita, utenti, freemium/premium, quiz, AI, PWA, brand e roadmap. Da usare in ogni chat che riguarda Cocktail Legend.
---

# Cocktail Legend — Documento di Progetto
Versione: 28 aprile 2026 | Autore: Daniel Sportelli

## 1. Panoramica

Cocktail Legend è una Progressive Web App (PWA) per bartender professionisti italiani. Prima app italiana verticale sul mondo cocktail, con database ricette, funzioni AI, quiz giornaliero, calcolatori professionali e Academy.

- URL app: https://danielsportelli.github.io/cocktail-legend/webapp/cocktail-legend.html
- URL quiz: https://danielsportelli.github.io/cocktail-legend/webapp/quiz.html
- Sviluppatore: Daniel Sportelli (unico sviluppatore e proprietario)
- Modello: Freemium con upgrade Premium

## 2. Stack Tecnologico

- GitHub Pages: hosting statico (account: danielsportelli, repo: cocktail-legend)
- Firebase Auth: autenticazione email + password con verifica email
- Firestore: database utenti, crediti AI, preferiti, quiz, classifiche
- Firebase Cloud Functions: logica server (cartella webapp/functions/index.js)
- Anthropic Claude API: motore AI Barman AI (modello claude-sonnet)
- Cloudflare: CDN e proxy
- Systeme.io: landing page, email marketing, funnel vendita
- Analytics: GA4 (G-F7T6WNL4MY), Meta Pixel (1470192824752382), TikTok Pixel (D6LJGOJC77U4L3UM22C0)

## 3. Struttura Repository

```
cocktail-legend/                    ← root repo GitHub Pages
├── index.html                      ← landing page presentazione progetto
├── og.png                          ← Open Graph image
├── robots.txt
├── firebase.json
├── .firebaserc
├── .gitignore
├── brand-kit.html                  ← brand kit visivo
├── converti_immagini_webp.py       ← script Python conversione immagini
├── bicchieri/                      ← immagini bicchieri (.webp)
├── immagini/                       ← immagini drink (.webp)
└── webapp/
    ├── cocktail-legend.html        ← APP PRINCIPALE (~460 KB, ~9300 righe)
    ├── quiz.html                   ← Quiz del Giorno standalone (~92 KB)
    ├── barman-ai.html              ← pagina Barman AI standalone (~115 KB)
    ├── spirits-genesis.html        ← Spirit Genesis standalone (~104 KB)
    ├── auth-action.html            ← gestione link email Firebase (~18 KB)
    ├── panel-admin.html            ← pannello admin backoffice (~76 KB)
    ├── privacy-policy.html         ← privacy policy (~14 KB)
    ├── termini-condizioni.html     ← T&C (~17 KB)
    ├── manifest.json               ← PWA manifest
    ├── service-worker.js           ← SW v2 cache offline
    ├── firebase-init.js            ← init Firebase, espone window._fbAuth, window._fbDb, window._fbFunctions
    ├── icons/                      ← favicon, icon-192, icon-512, apple-touch-icon
    ├── audio/                      ← suoni quiz
    ├── sponsor/                    ← immagini sponsor (al lancio: solo sponsor quiz)
    ├── database/
    │   └── it/
    │       ├── cocktails-it.json   ← ~300 cocktail con sapori, ingredienti, categorie
    │       └── quiz/
    │           └── panel-admin-quiz.html ← pannello admin quiz
    └── functions/
        ├── index.js                ← Cloud Functions (~15 KB)
        ├── package.json
        └── node_modules/
```

## 4. File Principale: cocktail-legend.html

Tutto il JS è internalizzato (non ci sono js.js o css.css separati — tutto è inline nel file HTML).

### Tab e Funzionalità
1. **Cocktail** (home): griglia drink, filtri per categoria/famiglia/sapori, ricerca, ordinamento, modal cocktail completa
2. **Academy**: contenuti formativi, Spirit Genesis PDF (solo premium)
3. **Barman AI**: Signature, Twist on Classic, Food Pairing, Cocktail del Giorno (solo premium, crediti)
4. **Calcolatori**: Drink Cost (free), ABV e Batch (premium)
5. **I tuoi Badge**: drawer con 3 tipi di badge + tester
6. **Account**: profilo, crediti, piano, T&C, Privacy Policy

### Sistema Badge (sezione "I tuoi Badge")
Tre famiglie di badge con 6 livelli ciascuna:

**Badge Referral** (📣) — invita amici:
- Starter (5), Promoter (10), Ambassador (25), Influencer (50), Leader (75), Icon (100 iscritti)
- Colori: blu → verde → giallo → arancio → rosso → viola
- Crediti AI bonus per ogni soglia
- Trigger: al momento della registrazione del nuovo utente (in cocktail-legend.html)
- Modal: appare in cocktail-legend.html quando l'utente riapre l'app

**Badge Streak Quiz** (🔥) — giorni consecutivi al quiz:
- Spark (7), Blaze (14), Wildfire (30), Comet (90), Phoenix (180), Eternal (365 giorni)
- Colori: blu → verde → giallo → arancio → rosso → viola
- Trigger: in quiz.html dopo aver risposto, se streak supera soglia mai raggiunta
- Modal: appare in quiz.html subito dopo la risposta

**Badge Quiz Master** (⭐) — % precisione risposte:
- Curioso (≥20%), Intenditore (≥40%), Conoscitore (≥60%), Guru (≥75%), Oracolo (≥88%), Master (≥95%)
- Soglia minima: 20 risposte totali per attivare
- Colori: blu → verde → giallo → arancio → rosso → viola
- Trigger: in quiz.html dopo aver risposto, se livello pct supera il precedente storico
- Modal: appare in quiz.html (in sequenza dopo streak se entrambi scattano)

**Badge Status** (🏆) — TODO pre-lancio:
- 9 livelli progressivi a punti: Stagista → ... → Legend
- Basato sull'insieme delle attività utente
- Da implementare nella sezione badge

### Modale Badge Unlock
- Funzione: `window.showBadgeUnlockModal(family, level, extra, onClose)`
- Presente in: cocktail-legend.html (per referral) e quiz.html (per streak + master)
- Caratteristiche: pop animation, scintille, fanfare audio Web Audio API, sfondo #0a0f1e solido
- Tester da console: `window.testBadge('streak', 3)` ecc.

### Scala Emoji Badge (card drawer)
`['0.75rem','0.95rem','1.15rem','1.35rem','1.55rem','1.85rem']` — lv1→lv6

## 5. File quiz.html

Quiz del Giorno standalone, accessibile anche senza essere nell'app principale.

### Funzionalità
- Una domanda al giorno, generata da Cloud Function alle 00:00 Roma
- 30 secondi per rispondere, punteggio basato su velocità
- Classifiche: Mensile (premium) e All Time (tutti, visibile da ≥30 risposte)
- Premi mensili: 1° = 1000 crediti, 2° = 300, 3° = 50
- Badge in classifica: 📣 referral + 🔥 streak + ⭐ master (cerchio colorato con sfumatura interna)
- Streak pill in alto a destra: 🔥 N giorni
- Statistiche: % correttezza, giorni giocati, streak

### Logica Post-Risposta
Dopo ogni risposta (funzione `showResult`):
1. Salva risposta in Firestore (risposte/{uid}_{data})
2. Aggiorna profilo utente (tot_risposte, tot_corrette, pct_correttezza, streak, streak_badge, pts_*)
3. Controlla badge unlock: streak e master in sequenza
4. Aggiorna UI e classifica

### Struttura Dati Utente Firestore (users/{uid})
```
nome, cognome, email, tel, via, civico, cap, provincia, paese
nickname
plan: 'free' | 'premium'
tc_accepted, tc_date, marketing
createdAt
aiUsage: { monthlyCount, extraCredits, referralCredits, periodStart }
referral: { code, count, badge, earnedCredits }
referredBy
last_played (YYYY-MM-DD)
tot_risposte, tot_corrette
pct_correttezza (0-100)
streak (giorni consecutivi)
streak_badge (key: 's7'|'s14'|'s30'|'s90'|'s180'|'s365')
pts_total, pts_week, pts_month
```

## 6. Sistema Utenti

### Flusso Registrazione
1. Form: nome, cognome, email, tel con prefisso, via, civico, CAP, provincia, nazione, password + conferma, T&C (obbligatoria), marketing (facoltativa)
2. Firebase crea account e invia email di verifica
3. Utente sloggato — non entra senza verifica
4. Clic link email → auth-action.html gestisce mode=verifyEmail
5. Primo accesso: popup nickname (minuscole, 3-24 char, lettere/numeri/punto/underscore)

### Referral
- Ogni utente ha un codice referral = primi 8 char dello uid
- URL referral: ?ref={code}
- Al momento della registrazione con ?ref viene incrementato il contatore dell'invitante
- Se si raggiunge una soglia badge, viene aggiornato il badge su Firestore
- Il modale appare quando l'invitante riapre cocktail-legend.html

## 7. Freemium e Premium

**Piano Free:**
- Database cocktail completo
- Tab Risorse/Academy senza Spirit Genesis
- Calcolatore Drink Cost
- Quiz del Giorno, classifica All Time

**Piano Premium** (19,99€ primo anno, 9,99€/anno dal secondo):
- Tutto il Free + Preferiti
- Download Spirit Genesis
- Barman AI completa (30 crediti/mese)
- Calcolatori ABV e Batch
- Classifica Mensile Quiz con premi

**Crediti AI extra:** 50 a 1,99€ / 200 a 4,99€ / 1000 a 19,99€

## 8. Barman AI

- Claude API Anthropic, modello claude-sonnet
- 4 funzioni: Crea Signature, Twist on Classic, Food Pairing, Cocktail del Giorno
- Persona: mixologist esperto italiano, risponde in italiano
- Food Pairing: lista 20 classici hardcoded
- Costo stimato API: ~5€/anno per utente con 30 crediti/mese

## 9. Database Cocktail

- ~300 cocktail in cocktails-it.json
- Campi: name, categoria, famiglia, sapori (3 aggettivi), ingredienti, preparazione, bicchiere, immagine .webp
- Sapori disponibili (34): Acidulo, Affumicato, Agrumato, Amaro, Anisato, Aromatico, Balsamico, Bilanciato, Caffeinico, Caramellato, Complesso, Corposo, Cremoso, Deciso, Dissetante, Dolce, Erbaceo, Esotico, Floreale, Fresco, Fruttato, Goloso, Intenso, Mandorlato, Mentolato, Morbido, Piccante, Rotondo, Secco, Speziato, Strutturato, Tostato, Vanigliato, Vellutato
- Immagini: /bicchieri/*.webp e /immagini/*.webp

## 10. PWA

- Icone: any 192px e 512px (maskable rimossa per bug bordi MIUI)
- Service Worker v2 con cache offline
- Theme color: #0a0f1e
- Safe area notch: env(safe-area-inset-top) solo in standalone mode

## 11. Funnel Vendita

Social → Systeme.io Link3 hub → Landing pages (GitHub Pages) → Demo → Checkout
UTM conventions definite per GA4, Meta Pixel, TikTok Pixel.
Quando il checkout reale sarà attivo: sostituire lista-attesa URL con cocktail-legend-checkout URL in index.html e nel file demo.

## 12. Brand Identity

- **Primari:** Blu #2563eb, Blu chiaro #60a5fa, Amber #f59e0b
- **Sfondo:** #0a0f1e, Surface: #1e293b e #334155
- **Testo:** #f1f5f9 (primario), #94a3b8 (secondario), #64748b (dim)
- **Accenti badge:** blu #3b82f6, verde #22c55e, giallo #eab308, arancio #f97316, rosso #ef4444, viola #a855f7
- **Font:** Inter tutti i pesi
- **Stile:** dark mode, professional, premium

## 13. Legale

- Titolare: Daniel Sportelli, Via Circonvallazione Nord 77, 24040 Ciserano BG
- CF: SPRDNL84T23L400G, PEC: daniel.sportelli@pec.it
- privacy-policy.html e termini-condizioni.html in webapp/

## 14. Roadmap Pre-Lancio

- [ ] Badge Status (9 livelli Stagista→Legend a punti) nella sezione badge
- [ ] Lock funzioni premium nel codice leggendo plan da Firestore
- [ ] Modal Passa a Premium con benefici e prezzi
- [ ] Integrazione Stripe per pagamenti
- [ ] Sostituzione lista-attesa URL con checkout reale in index.html e demo

## 15. Preferenze di Sviluppo (Daniel)

- Implementa le modifiche da snippet precisi — Daniel le applica lui stesso
- Richiedi sempre il file aggiornato prima di fare modifiche
- Per modifiche complesse JS preferire script Python invece di str_replace
- Daniel testa sempre lui stesso dopo ogni modifica
- Comunica principalmente in italiano, spesso via voice transcription
