const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

// Restituisce la data corrente nel timezone di Roma (YYYY-MM-DD)
// Usa Intl.DateTimeFormat per evitare il bug UTC dei cambi ora (marzo/settembre)
function oggi_roma() {
  const parts = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).split("/");
  // "06/04/2026" → "2026-04-06"
  return parts[2] + "-" + parts[1] + "-" + parts[0];
}

// ═══════════════════════════════════════════════════
// DOMANDA DEL GIORNO — ogni notte alle 00:10 (Roma)
// ═══════════════════════════════════════════════════
exports.aggiornaDomandaDelGiorno = onSchedule(
  {
    schedule: "10 0 * * *",
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

      const dati = snapshot.docs[0].data();
      const domandaOggiId = snapshot.docs[0].id;

      let prossima_categoria = null;
      let prossima_difficolta = null;
      if (snapshot.docs.length >= 2) {
        const prossimaDati = snapshot.docs[1].data();
        prossima_categoria = prossimaDati.categoria || null;
        prossima_difficolta = prossimaDati.difficolta || null;
      }

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
// RESET MENSILE + PREMI — ogni 1° del mese alle 00:00 (Roma)
// Gira nel gap 00:00-00:10, invisibile all'utente
// ═══════════════════════════════════════════════════
exports.resetMensile = onSchedule(
  {
    schedule: "0 0 1 * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    const db = getFirestore();

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

// ═══════════════════════════════════════════════════
// PULIZIA UTENTI NON VERIFICATI — ogni notte alle 02:00 (Roma)
// Elimina da Auth + Firestore gli utenti con email non verificata
// creati da più di 48 ore
// ═══════════════════════════════════════════════════
exports.cleanUnverifiedUsers = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    const auth = getAuth();
    const db   = getFirestore();

    const QUARANTOTTO_ORE_MS = 48 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - QUARANTOTTO_ORE_MS);

    let deleted = 0;
    let pageToken = undefined;

    do {
      const result = await auth.listUsers(1000, pageToken);

      for (const user of result.users) {
        if (user.emailVerified) continue;

        const createdAt = new Date(user.metadata.creationTime);
        if (createdAt > cutoff) continue;

        try {
          const docRef = db.collection("users").doc(user.uid);
          const snap   = await docRef.get();
          if (snap.exists) await docRef.delete();
          await auth.deleteUser(user.uid);
          deleted++;
          console.log(`Eliminato: ${user.email} (uid: ${user.uid})`);
        } catch (err) {
          console.error(`Errore su ${user.uid}:`, err.message);
        }
      }

      pageToken = result.pageToken;
    } while (pageToken);

    console.log(`cleanUnverifiedUsers — eliminati: ${deleted} utenti`);
  }
);
