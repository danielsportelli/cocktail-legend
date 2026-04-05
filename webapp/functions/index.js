const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// Restituisce la data corrente nel timezone di Roma (YYYY-MM-DD)
// Usa Intl.DateTimeFormat per evitare il bug UTC dei cambi ora (marzo/settembre)
function oggi_roma() {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).split("/").reverse().join("-");
  // "06/04/2026" → ["2026","04","06"] → "2026-04-06"
}

// ═══════════════════════════════════════════════════
// DOMANDA DEL GIORNO — ogni notte alle 03:00 (Roma)
// ═══════════════════════════════════════════════════
exports.aggiornaDomandaDelGiorno = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async (event) => {
    const db = getFirestore();

    try {
      const configRef = db.collection("config").doc("quiz");
      const configSnap = await configRef.get();

      if (!configSnap.exists || configSnap.data().attivo !== true) {
        console.log("Quiz non attivo — nessuna domanda impostata.");
        return;
      }

      // Prendi le prime 2 domande non usate in una sola query
      const snapshot = await db
        .collection("domande")
        .where("usata", "==", false)
        .orderBy("id")
        .limit(2)
        .get();

      if (snapshot.empty) {
        console.log("Nessuna domanda disponibile — batch esaurito!");
        return;
      }

      const oggi = oggi_roma();

      // docs[0] = domanda di oggi, docs[1] = anteprima domani
      const dati = snapshot.docs[0].data();
      const domandaOggiId = snapshot.docs[0].id;

      let prossima_categoria = null;
      let prossima_difficolta = null;
      if (snapshot.docs.length >= 2) {
        const prossimaDati = snapshot.docs[1].data();
        prossima_categoria = prossimaDati.categoria || null;
        prossima_difficolta = prossimaDati.difficolta || null;
      }

      // Imposta la domanda del giorno
      const attualeRef = db.collection("quiz_del_giorno").doc("attuale");
      await attualeRef.set({
        domanda_id: dati.id,
        testo: dati.domanda,
        opzioni: dati.opzioni,
        risposta_corretta: dati.risposta_corretta,
        spiegazione: dati.spiegazione,
        categoria: dati.categoria,
        difficolta: dati.difficolta,
        data_impostazione: oggi,
        prossima_categoria: prossima_categoria,
        prossima_difficolta: prossima_difficolta,
      });

      // Marca subito la domanda di oggi come usata
      await db.collection("domande").doc(domandaOggiId).update({
        usata: true,
        data_utilizzo: oggi,
      });

      console.log("Nuova domanda del giorno: " + dati.id + " — " + oggi);

    } catch (error) {
      console.error("Errore:", error);
    }
  }
);

// ═══════════════════════════════════════════════════
// RESET MENSILE + PREMI — ogni 1° del mese alle 03:30 (Roma)
// ═══════════════════════════════════════════════════
exports.resetMensile = onSchedule(
  {
    schedule: "30 3 1 * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    const db = getFirestore();

    // ── 1. Trova i top 5 premium per pts_month ──────
    const premiMap = { 0: 1000, 1: 200, 2: 50, 3: 50, 4: 50 };

    try {
      const topSnap = await db.collection("users")
        .where("plan", "==", "premium")
        .orderBy("pts_month", "desc")
        .limit(5)
        .get();

      if (!topSnap.empty) {
        const premiBatch = db.batch();
        topSnap.docs.forEach((doc, i) => {
          const crediti = premiMap[i] || 0;
          const userData = doc.data();
          const aiUsage = userData.aiUsage || {};
          const extraCreditsAttuali = aiUsage.extraCredits || 0;
          premiBatch.set(doc.ref, {
            aiUsage: {
              ...aiUsage,
              extraCredits: extraCreditsAttuali + crediti,
            }
          }, { merge: true });
          console.log(`Premio ${i+1}° posto: ${doc.data().nickname} → +${crediti} crediti`);
        });
        await premiBatch.commit();
        console.log("Premi mensili distribuiti.");
      } else {
        console.log("Nessun utente premium in classifica — nessun premio.");
      }
    } catch(e) {
      console.error("Errore distribuzione premi:", e);
    }

    // ── 2. Reset pts_month per tutti ────────────────
    const snapshot = await db.collection("users").get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { pts_month: 0 });
    });
    await batch.commit();
    console.log("Reset mensile completato — " + snapshot.size + " utenti");
  }
);
