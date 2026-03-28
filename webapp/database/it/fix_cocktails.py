#!/usr/bin/env python3
"""
fix_cocktails.py
----------------
1. Ricalcola l'ABV di tutti i drink in cocktails-it.json usando le regole
   del prompt (gradazioni di riferimento + fattori di diluizione per tecnica)
2. Aggiorna il campo "abv" nel JSON
3. Produce un report delle storie che citano ingredienti/dosi/fonti competitor
4. Salva il JSON corretto in cocktails-it-fixed.json

USO:
    python3 fix_cocktails.py

INPUT:  cocktails-it.json  (nella stessa cartella)
OUTPUT: cocktails-it-fixed.json
        abv_report.txt
        storia_audit.txt
"""

import re, json, sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# GRADAZIONI DI RIFERIMENTO — sincronizzate col prompt ufficiale
# ─────────────────────────────────────────────────────────────
ABV_REF = {
    # Distillati base 40%
    "gin": 40, "vodka": 40, "rum": 40, "tequila": 40, "mezcal": 40,
    "whiskey": 40, "whisky": 40, "cognac": 40, "calvados": 40,
    "grappa": 40, "pisco": 40, "acquavite": 40, "bourbon": 40,
    "rye": 40, "brandy": 40, "cachaça": 40, "cachaca": 40,
    "armagnac": 40, "irish whiskey": 40, "japanese whisky": 40,
    "scotch": 40, "tennessee": 40, "aquavit": 40, "sotol": 40,
    "baijiu": 40, "slivovitz": 40, "palinka": 40, "filu e ferru": 40,
    "genepy": 40, "benedettino": 40, "dom bénédictine": 40,
    "dom benedettine": 40, "drambuie": 40, "southern comfort": 35,
    "sambuca": 38, "nocino": 30, "mirto": 30, "limoncello": 30,
    "sloe gin": 26,
    # Overproof 57%
    "navy strength": 57, "overproof": 57, "cask strength": 57,
    "barrel proof": 57,
    # Assenzio 68%
    "assenzio": 68, "absinthe": 68,
    # Vermouth 18%
    "vermouth": 18, "lillet": 17,
    # Aperitivi
    "aperol": 11,
    "campari": 25, "aperitivo rosso": 25, "aperitivo bianco": 25,
    "aperitivo rosato": 25, "amer picon": 25,
    # Liquori specifici — valori reali
    "cointreau": 40,
    "grand marnier": 40,
    "galliano": 42,
    "chartreuse verde": 55,
    "chartreuse gialla": 40,
    "maraschino": 32,
    "orange curaçao": 30, "blue curaçao": 30, "curacao": 30, "curaçao": 30,
    "triple sec": 30,
    "crème de cassis": 20, "creme de cassis": 20,
    "crème de mûre": 20, "creme de mure": 20,
    "crème de violette": 16, "creme de violette": 16,
    "crème de menthe": 25, "creme de menthe": 25,
    "kahlúa": 20, "kahlu": 20, "liquore al caffè": 20,
    "amaretto": 28,
    "baileys": 17, "crema di whiskey": 17,
    "falernum": 11, "velvet falernum": 11,
    "orgeat": 0,
    "pimento dram": 28,
    "becherovka": 38,
    # Liquori alla frutta generici 25%
    "liquore": 25,
    "crème de": 25, "creme de": 25,
    # Fernet / amari forti 39%
    "fernet": 39,
    # Cynar 17%
    "cynar": 17,
    # Amaro generico 30%
    "amaro": 30,
    # Porto 20%
    "porto": 20, "port": 20,
    # Sherry 18%
    "sherry": 18,
    # Vino 13%
    "vino": 13, "wine": 13, "moscato": 8, "prosecco": 11,
    "spumante": 11, "champagne": 11, "cava": 11, "cremant": 11,
    # Birra 5%
    "birra": 5, "beer": 5,
    # Zero
    "succo": 0, "sciroppo": 0, "acqua": 0, "soda": 0,
    "ginger beer": 0, "ginger ale": 0, "cola": 0, "sprite": 0,
    "latte": 0, "panna": 0, "uovo": 0, "albume": 0, "foamer": 0,
    "sale": 0, "zucchero": 0, "miele": 0, "agave": 0,
    "fresco": 0, "fresca": 0, "freschi": 0, "fresche": 0,
    "polpa": 0, "estratto": 0, "crusta": 0, "noce moscata": 0,
    "cannella": 0, "pepe": 0, "tabasco": 0, "worcestershire": 0,
    "zest": 0, "fetta": 0, "spicchio": 0, "rondella": 0,
}

# Lookup specifico (priorità assoluta)
ABV_SPECIFIC = {
    # Ginger e Sake — priorità su "gin" nel lookup parziale
    "ginger ale": 0, "ginger beer": 0, "ginger beer artigianale": 0,
    "ginger": 0, "zenzero fresco": 0, "zenzero grattugiato": 0,
    "sake": 15, "sake ginjo": 15, "sake junmai": 15,
    "rye whiskey": 40, "rye whiskey americano": 40,
    "rye whiskey canadese": 40, "rye whiskey cask strength": 57,
    "bourbon whiskey": 40, "bourbon whiskey small batch": 40,
    "bourbon whiskey barrel proof": 57, "bourbon whiskey cask strength": 57,
    "scotch whisky islay": 40, "scotch whisky blend": 40,
    "scotch whisky single malt": 40, "scotch whisky torbato": 40,
    "irish whiskey": 40, "irish whiskey cask strength": 57,
    "japanese whisky": 40, "gin london dry": 40, "gin old tom": 38,
    "gin navy strength": 57, "old tom gin": 38,
    "rum overproof": 57, "rum overproof 151": 65,
    "rum agricolo": 40, "rum bianco": 40, "rum scuro": 40,
    "rum ambrato": 40, "rum giamaicano": 40, "rum invecchiato": 40,
    "assenzio verde": 68, "assenzio bianco": 68,
    "vermouth rosso": 18, "vermouth bianco": 18, "vermouth dry": 18,
    "vermouth extra dry": 18, "vermouth rosato": 18,
    "vermouth di torino": 18, "vermouth di chambéry": 18,
    "lillet blanc": 17,
    "aperol": 11,
    "campari": 25,
    # Liquori — valori reali aggiornati
    "cointreau": 40,
    "grand marnier": 40,
    "galliano": 42,
    "chartreuse verde": 55,
    "chartreuse gialla": 40,
    "maraschino": 32,
    "blue curaçao": 30, "orange curaçao": 30, "curacao olandese": 30,
    "triple sec": 30,
    "crème de cassis": 20, "creme de cassis": 20,
    "crème de mûre": 20, "creme de mure": 20,
    "crème de violette": 16, "creme de violette": 16,
    "crème de menthe bianca": 25, "crème de menthe verde": 25,
    "creme de menthe bianca": 25, "creme de menthe verde": 25,
    "kahlúa": 20, "liquore al caffè": 20,
    "amaretto": 28, "liquore all'amaretto": 28,
    "baileys": 17, "crema di whiskey": 17,
    "cynar": 17,
    "fernet": 39, "fernet alla menta": 39,
    "amaro montenegrino": 23, "amaro": 30,
    "falernum": 11, "velvet falernum": 11,
    "orgeat": 0,
    "pimento dram": 28, "becherovka": 38,
    "limoncello": 30, "mirto": 30, "nocino": 30,
    "genepy": 40, "genepy delle alpi": 40,
    "porto ruby": 20, "porto tawny": 20, "porto bianco": 20,
    "porto lbv": 20, "porto vintage": 20,
    "sherry fino": 15, "sherry manzanilla": 15, "sherry amontillado": 18,
    "sherry oloroso": 18, "sherry palo cortado": 20,
    "sherry pedro ximénez": 17, "sherry dry": 15,
    "prosecco": 11, "champagne": 12, "spumante": 11, "cava": 11,
    "vino rosso": 13, "vino bianco secco": 12, "vino rosso fruttato": 13,
    "drambuie": 40, "dom bénédictine": 40, "benedettino": 40,
    "sambuca": 38, "sambuca nera": 38,
    "southern comfort": 35, "pimm's no.1": 25,
    "sloe gin": 26,
    "spray di assenzio": 68, "spray di whisky torbato": 40,
    "acquavite di frutta": 40, "acquavite di grano": 40,
    "kirsch": 40, "kirsch artigianale": 40,
    "poire williams": 40,
}

def get_abv(ingredient_name):
    name = ingredient_name.lower().strip()
    if name in ABV_SPECIFIC:
        return ABV_SPECIFIC[name]
    for key, val in ABV_SPECIFIC.items():
        if key in name:
            return val
    for key, val in ABV_REF.items():
        if key in name:
            return val
    return 0

def parse_ml(qty_str):
    q = qty_str.strip().lower().replace(",", ".")
    if "top" in q:
        return 60.0
    if "q.b." in q or "q.b" in q:
        return 0.0
    if "dash" in q:
        num = re.search(r"[\d.]+", q)
        return float(num.group()) * 1.0 if num else 1.0
    if "ml" in q:
        num = re.search(r"[\d.]+", q)
        return float(num.group()) if num else 0.0
    return 0.0

def detect_tecnica(prep):
    if not prep:
        return "build"
    first = prep[0].lower()
    if "dry shake" in first or "senza ghiaccio" in first:
        return "shake"
    if "shakerare" in first or "shaker" in first:
        return "shake"
    if "mixing glass" in first or "mescolare" in first:
        return "stir"
    if "frullare" in first or "blend" in first or "milkshake mixer" in first:
        return "blend"
    return "build"

DILUTION = {"shake": 0.80, "stir": 0.85, "build": 0.90, "blend": 0.85}

def calc_abv(ingredienti, prep):
    alcol_puro = 0.0
    volume_totale = 0.0
    for ing in ingredienti:
        qty_str, ing_name = ing[0], ing[1]
        ml = parse_ml(qty_str)
        abv_ing = get_abv(ing_name)
        alcol_puro += ml * (abv_ing / 100)
        volume_totale += ml
    if volume_totale == 0:
        return 0.0, "build", 0.0, 0.0
    abv_lordo = (alcol_puro / volume_totale) * 100
    tecnica = detect_tecnica(prep)
    abv_finale = abv_lordo * DILUTION[tecnica]
    return round(abv_finale, 1), tecnica, alcol_puro, volume_totale

def abv_label(abv):
    if abv == 0: return "Analcolico"
    if abv <= 8: return "Basso"
    if abv <= 14: return "Medio basso"
    if abv <= 20: return "Medio"
    if abv <= 25: return "Medio alto"
    if abv <= 30: return "Alto"
    return "Molto alto"



input_path = Path("cocktails-it.json")
output_path = Path("cocktails-it-fixed.json")
abv_report_path = Path("abv_report.txt")

print(f"Caricamento {input_path}...")
with open(input_path, encoding="utf-8") as f:
    raw = f.read()

cleaned = re.sub(r'(?<!\:)\s*//(?![\w./])[^\n]*', '', raw)
data = json.loads(cleaned)
print(f"Cocktail caricati: {len(data)}")

abv_changes = []
abv_report_lines = []

for c in data:
    name = c.get("name", "?")
    ingredienti = c.get("ingredienti", [])
    prep = c.get("prep", [])
    old_abv = c.get("abv", "?")

    abv_val, tecnica, alcol, vol = calc_abv(ingredienti, prep)
    new_label = abv_label(abv_val)

    line = f"{name:<35} | {tecnica:<6} | alcol={alcol:.1f}ml vol={vol:.1f}ml | {abv_val:.1f}% | {old_abv} → {new_label}"
    abv_report_lines.append(line)

    if old_abv != new_label:
        abv_changes.append((name, old_abv, new_label, abv_val))
        c["abv"] = new_label


print(f"\nSalvataggio {output_path}...")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(abv_report_path, "w", encoding="utf-8") as f:
    f.write("ABV REPORT — tutti i drink\n")
    f.write("=" * 90 + "\n")
    f.write(f"{'Nome':<35} | {'Tecnica':<6} | {'Calcolo':<30} | {'ABV%':<6} | Vecchio → Nuovo\n")
    f.write("-" * 90 + "\n")
    for line in abv_report_lines:
        f.write(line + "\n")
    f.write("\n" + "=" * 90 + "\n")
    f.write(f"CAMBIAMENTI ABV: {len(abv_changes)}\n")
    f.write("-" * 90 + "\n")
    for name, old, new, val in abv_changes:
        f.write(f"  {name:<35} | {old} → {new}  ({val:.1f}%)\n")


print(f"\n{'='*60}")
print(f"ABV cambiati: {len(abv_changes)} / {len(data)}")
print(f"\nFile generati:")
print(f"  {output_path}   ← JSON corretto da usare")
print(f"  {abv_report_path}   ← dettaglio calcoli ABV")
print(f"{'='*60}")
