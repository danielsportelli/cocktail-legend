const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// ═══════════════════════════════════════════════════
// DOMANDA DEL GIORNO — ogni notte alle 00:00 (Roma)
// ═══════════════════════════════════════════════════
exports.aggiornaDomandaDelGiorno = onSchedule(
  {
    schedule: "0 0 * * *",
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
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log("Nessuna domanda disponibile — batch esaurito!");
        return;
      }

      const prossimaDomanda = snapshot.docs[0];
      const dati = prossimaDomanda.data();
      const oggi = new Date().toISOString().split("T")[0];

      const attualeRef = db.collection("quiz_del_giorno").doc("attuale");
      const attualeSnap = await attualeRef.get();

      if (attualeSnap.exists) {
        const idPrecedente = attualeSnap.data().domanda_id;
        if (idPrecedente) {
          await db.collection("domande").doc(idPrecedente).update({
            usata: true,
            data_utilizzo: oggi,
          });
        }
      }

      // Prendi anche la prossima domanda per l'anteprima
      const prossimaSnap = await db
        .collection("domande")
        .where("usata", "==", false)
        .orderBy("id")
        .limit(2)
        .get();

      let prossima_categoria = null;
      let prossima_difficolta = null;
      if (prossimaSnap.docs.length >= 2) {
        const prossimaDati = prossimaSnap.docs[1].data();
        prossima_categoria = prossimaDati.categoria || null;
        prossima_difficolta = prossimaDati.difficolta || null;
      }

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

      console.log("Nuova domanda del giorno: " + dati.id);

    } catch (error) {
      console.error("Errore:", error);
    }
  }
);

// ═══════════════════════════════════════════════════
// RESET SETTIMANALE — ogni lunedì alle 00:00 (Roma)
// ═══════════════════════════════════════════════════
exports.resetSettimanale = onSchedule(
  {
    schedule: "0 0 * * 1",
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    const db = getFirestore();
    const snapshot = await db.collection("users").get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { pts_week: 0 });
    });
    await batch.commit();
    console.log("Reset settimanale completato — " + snapshot.size + " utenti");
  }
);

// ═══════════════════════════════════════════════════
// RESET MENSILE — ogni 1° del mese alle 00:00 (Roma)
// ═══════════════════════════════════════════════════
exports.resetMensile = onSchedule(
  {
    schedule: "0 0 1 * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
  },
  async () => {
    const db = getFirestore();
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
