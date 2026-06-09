#!/usr/bin/env python3
"""Build manifest.json — zone + component per photo from visual site-walk ranges."""
import json
from pathlib import Path

ROOT = Path(__file__).parent
PHOTO_DIR = ROOT / "photos"
RANGES_FILE = ROOT / "photo_ranges.json"
OUT = ROOT / "manifest.json"
OUT_2D = ROOT / "2d" / "manifest.json"
OUT_CATALOG = ROOT / "photo_catalog.json"

ZONES = {
    "overview": {"title": "Plant Overview", "desc": "Entrance gate, aerial views, site layout."},
    "chimney_fgd": {"title": "Chimney, ESP & FGD", "desc": "Stacks, ESP passes, flue gas ducting, FGD absorber, gypsum plant."},
    "boiler": {"title": "Boiler Island", "desc": "Furnace, ID/FD fans, boiler house, draught & firing."},
    "coal": {"title": "Coal Handling", "desc": "Stockyard, conveyors, bunkers, bowl mills, CHP galleries."},
    "turbine": {"title": "Turbine & Generator", "desc": "Turbine hall, insulated casings, generator area."},
    "condenser": {"title": "Condenser", "desc": "Surface condenser, vacuum, LP exhaust (notes & equipment)."},
    "pumphouse": {"title": "CW Pump House", "desc": "Circulating water intake, screens, vertical CW pumps."},
    "feedwater": {"title": "Feed-water & BFP", "desc": "CEP, deaerator, boiler feed pumps, condensate system."},
    "dm_water": {"title": "DM Water Plant", "desc": "Demineralisation, DMTP control room, make-up water."},
    "hydrogen": {"title": "Hydrogen Plant", "desc": "Electrolysers, H₂ storage, generator cooling gas."},
    "chlorination": {"title": "Chlorination", "desc": "Electrochlorinators, NaOCl/ClO₂ dosing for CW."},
    "electrical": {"title": "Electrical & Switchyard", "desc": "MCC, switchgear, 400 kV yard, transformers."},
    "control": {"title": "Control & DCS", "desc": "DCS/HMI screens, field instruments, engineering notes."},
    "auxiliary": {"title": "Auxiliary & Stores", "desc": "Compressors, workshops, spare parts, radiation store."},
}


def load_ranges():
    data = json.loads(RANGES_FILE.read_text())
    return data["ranges"], data.get("overrides", {})


def in_range(fname, start, end):
    return start <= fname <= end


def assign_photo(fname, ranges, overrides):
    if fname in overrides:
        o = overrides[fname]
        return o["zone"], o.get("component", "")
    for r in ranges:
        if in_range(fname, r["start"], r["end"]):
            return r["zone"], r.get("component", "")
    return "auxiliary", "Unclassified — review photo_ranges.json"


def main():
    files = sorted(
        f.name for f in PHOTO_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    )
    ranges, overrides = load_ranges()

    catalog = []
    zone_photos = {z: [] for z in ZONES}
    seen = {z: set() for z in ZONES}
    unassigned = []

    for f in files:
        zone, component = assign_photo(f, ranges, overrides)
        entry = {"file": f, "zone": zone, "component": component}
        catalog.append(entry)
        if zone not in zone_photos:
            unassigned.append(f)
            zone = "auxiliary"
            component = "Unclassified"
            entry["zone"] = zone
        if f not in seen[zone]:
            zone_photos[zone].append({"file": f, "component": component})
            seen[zone].add(f)

    heroes = {z: (zone_photos[z][0]["file"] if zone_photos[z] else None) for z in ZONES}
    manifest = {
        "total": len(files),
        "zones": ZONES,
        "heroes": heroes,
        "photos": zone_photos,
        "catalog": catalog,
    }

    data = json.dumps(manifest, indent=2)
    OUT.write_text(data)
    OUT_2D.write_text(data)
    OUT_CATALOG.write_text(json.dumps(catalog, indent=2))

    print(f"Wrote {OUT} — {len(files)} photos")
    for z in ZONES:
        print(f"  {z}: {len(zone_photos[z])}")
    if unassigned:
        print(f"WARNING: {len(unassigned)} files fell outside ranges")


if __name__ == "__main__":
    main()
