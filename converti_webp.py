"""
CONVERTI IMMAGINI JPG → WebP
=============================
Istruzioni:
1. Metti questo script nella cartella PRINCIPALE del progetto
   (stessa cartella dove c'è la cartella "immagini/")
2. Apri il terminale in quella cartella
3. Prima installazione (una volta sola):
       pip install Pillow
4. Poi lancia lo script:
       python converti_webp.py
"""

from PIL import Image
import os

CARTELLA = "immagini"
QUALITA = 82  # 80-85 è ottimo: qualità alta, file piccoli

def converti():
    if not os.path.exists(CARTELLA):
        print(f"❌ Cartella '{CARTELLA}' non trovata.")
        print("   Assicurati di mettere lo script nella cartella principale del progetto.")
        return

    files = [f for f in os.listdir(CARTELLA) if f.upper().endswith(".JPG") or f.upper().endswith(".JPEG")]

    if not files:
        print("❌ Nessun file JPG trovato nella cartella 'immagini/'.")
        return

    print(f"▶ Trovati {len(files)} file JPG. Inizio conversione...\n")

    convertiti = 0
    errori = 0
    peso_prima = 0
    peso_dopo = 0

    for filename in sorted(files):
        percorso_jpg = os.path.join(CARTELLA, filename)
        nome_senza_ext = os.path.splitext(filename)[0]
        percorso_webp = os.path.join(CARTELLA, nome_senza_ext + ".webp")

        try:
            dim_prima = os.path.getsize(percorso_jpg)
            peso_prima += dim_prima

            with Image.open(percorso_jpg) as img:
                # Converti in RGB se necessario (es. immagini con canale alpha)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(percorso_webp, "WEBP", quality=QUALITA, method=6)

            dim_dopo = os.path.getsize(percorso_webp)
            peso_dopo += dim_dopo
            risparmio = (1 - dim_dopo / dim_prima) * 100

            print(f"  ✓ {filename} → {nome_senza_ext}.webp  ({dim_prima//1024}KB → {dim_dopo//1024}KB, -{risparmio:.0f}%)")
            convertiti += 1

        except Exception as e:
            print(f"  ✗ Errore su {filename}: {e}")
            errori += 1

    print(f"\n{'='*55}")
    print(f"  Convertiti:  {convertiti}/{len(files)}")
    print(f"  Peso totale prima:  {peso_prima//1024//1024} MB")
    print(f"  Peso totale dopo:   {peso_dopo//1024//1024} MB")
    risparmio_tot = (1 - peso_dopo / peso_prima) * 100 if peso_prima > 0 else 0
    print(f"  Risparmio totale:   -{risparmio_tot:.0f}%")
    if errori:
        print(f"  Errori: {errori}")
    print(f"{'='*55}")
    print("\n✅ Fatto! I file WebP sono nella cartella 'immagini/'.")
    print("   I file JPG originali sono ancora lì — cancellali quando sei sicuro che tutto funziona.")

if __name__ == "__main__":
    converti()
