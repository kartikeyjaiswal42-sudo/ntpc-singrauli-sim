#!/usr/bin/env python3
"""Build manifest.json mapping all NTPC plant photos to simulation zones."""
import json
import re
from pathlib import Path

PHOTO_DIR = Path(__file__).parent / "photos"
OUT = Path(__file__).parent / "manifest.json"
OUT_2D = Path(__file__).parent / "2d" / "manifest.json"

ZONES = {
    "overview": {"title": "Plant Overview", "desc": "Entrance gate, aerial views, site layout — Singrauli Super Thermal Power Station."},
    "chimney_fgd": {"title": "Chimney & Flue Gas / FGD", "desc": "Stacks, ESP hoppers, flue-gas ducting, FGD absorber, limestone MCC."},
    "boiler": {"title": "Boiler Island", "desc": "Furnace structure, boiler house, draught fans, mills, firing system."},
    "coal": {"title": "Coal Handling", "desc": "Coal yard, conveyors, bunkers, mills, wagon tippler area."},
    "turbine": {"title": "Turbine & Generator", "desc": "Turbine hall, HP/IP/LP cylinders, generator stator, lube oil."},
    "condenser": {"title": "Condenser & Heat Rejection", "desc": "Condenser, vacuum system, LP exhaust, heat exchangers."},
    "pumphouse": {"title": "CW Pump House", "desc": "Circulating water pumps, intake sump, Rihand reservoir draw."},
    "feedwater": {"title": "Feed-water & BFP", "desc": "Boiler feed pumps, heaters, deaerator, condensate extraction."},
    "dm_water": {"title": "DM Water Plant", "desc": "Demineralisation — ion exchange, storage, make-up water."},
    "hydrogen": {"title": "Hydrogen Plant", "desc": "Electrolysers, H₂ storage, generator cooling gas system."},
    "chlorination": {"title": "Chlorination Plant", "desc": "Electrochlorinators, NaOCl dosing for cooling water."},
    "electrical": {"title": "Electrical & Switchyard", "desc": "400 kV switchyard, transformers, MCC, motor control centres."},
    "control": {"title": "Control & Instrumentation", "desc": "DCS panels, transmitters, control room, process notes."},
    "auxiliary": {"title": "Auxiliary Systems", "desc": "Compressed air, fuel oil, pumps, pipe racks, workshops."},
}

CURATED = {
    "IMG_20260530_131107.jpg": ["overview"],
    "IMG_20260530_131105.jpg": ["overview"],
    "IMG_20260530_111940.jpg": ["overview"],
    "IMG_20260530_111941.jpg": ["overview"],
    "IMG_20260602_115519.jpg": ["overview", "electrical"],
    "IMG_20260602_115520.jpg": ["overview"],
    "IMG_20260602_115523.jpg": ["overview"],
    "IMG_20260602_115531.jpg": ["overview"],
    "IMG_20260601_101039.jpg": ["overview", "auxiliary"],
    "IMG_20260601_104828.jpg": ["overview", "coal"],
    "IMG_20260601_104812.jpg": ["overview"],
    "IMG_20260601_104811.jpg": ["overview"],
    "IMG_20260601_104815.jpg": ["overview"],
    "IMG_20260601_104755.jpg": ["overview"],
    "IMG_20260601_104839.jpg": ["overview"],
    "IMG_20260601_104550.jpg": ["overview"],
    "IMG_20260604_110042.jpg": ["overview"],
    "IMG_20260602_113427.jpg": ["chimney_fgd", "boiler"],
    "IMG_20260602_113342.jpg": ["chimney_fgd"],
    "IMG_20260602_113346.jpg": ["chimney_fgd"],
    "IMG_20260602_113809_1.jpg": ["chimney_fgd"],
    "IMG_20260602_114212.jpg": ["chimney_fgd"],
    "IMG_20260601_105101.jpg": ["chimney_fgd", "electrical", "dm_water", "control"],
    "IMG_20260601_105102.jpg": ["chimney_fgd", "electrical"],
    "IMG_20260601_191809.jpg": ["chimney_fgd", "control"],
    "IMG_20260604_114009.jpg": ["turbine"],
    "IMG_20260605_115622.jpg": ["chimney_fgd", "condenser", "electrical"],
    "IMG_20260605_115624.jpg": ["chimney_fgd"],
    "IMG_20260605_115625.jpg": ["chimney_fgd"],
    "IMG_20260605_115626.jpg": ["chimney_fgd"],
    "IMG_20260602_110909.jpg": ["boiler"],
    "IMG_20260602_111342.jpg": ["boiler"],
    "IMG_20260602_112129.jpg": ["boiler"],
    "IMG_20260602_115509.jpg": ["boiler"],
    "IMG_20260602_120148.jpg": ["boiler"],
    "IMG_20260602_120415.jpg": ["boiler"],
    "IMG_20260602_120416.jpg": ["boiler"],
    "IMG_20260602_120417.jpg": ["boiler"],
    "IMG_20260601_102125.jpg": ["boiler"],
    "IMG_20260601_102127.jpg": ["boiler"],
    "IMG_20260601_102136.jpg": ["boiler"],
    "IMG_20260601_103415.jpg": ["boiler"],
    "IMG_20260601_104219.jpg": ["boiler"],
    "IMG_20260602_121327.jpg": ["coal"],
    "IMG_20260602_121322.jpg": ["coal"],
    "IMG_20260602_121130.jpg": ["coal"],
    "IMG_20260602_122202.jpg": ["coal"],
    "IMG_20260602_122206.jpg": ["coal"],
    "IMG_20260602_122407.jpg": ["coal", "turbine", "condenser", "dm_water"],
    "IMG_20260601_113358.jpg": ["coal", "turbine"],
    "IMG_20260601_113006.jpg": ["coal"],
    "IMG_20260601_105248.jpg": ["coal"],
    "IMG_20260601_105659.jpg": ["turbine", "control", "electrical"],
    "IMG_20260602_121727.jpg": ["turbine"],
    "IMG_20260602_120953.jpg": ["turbine"],
    "IMG_20260605_120711.jpg": ["condenser", "feedwater", "auxiliary"],
    "IMG_20260605_120714.jpg": ["condenser", "feedwater"],
    "IMG_20260605_122301.jpg": ["feedwater"],
    "IMG_20260606_112433.jpg": ["pumphouse"],
    "IMG_20260606_112430.jpg": ["pumphouse"],
    "IMG_20260606_112434.jpg": ["pumphouse"],
    "IMG_20260606_112356.jpg": ["pumphouse"],
    "IMG_20260606_112345.jpg": ["pumphouse"],
    "IMG_20260606_113303.jpg": ["pumphouse", "chlorination"],
    "IMG_20260606_113307.jpg": ["pumphouse"],
    "IMG_20260606_113316.jpg": ["pumphouse"],
    "IMG_20260606_113448.jpg": ["pumphouse"],
    "IMG_20260606_113504.jpg": ["pumphouse"],
    "IMG_20260606_102218.jpg": ["pumphouse"],
    "IMG_20260606_102550.jpg": ["pumphouse"],
    "IMG_20260606_102806.jpg": ["pumphouse", "feedwater", "hydrogen", "auxiliary"],
    "IMG_20260606_102812.jpg": ["pumphouse"],
    "IMG_20260606_120457.jpg": ["chlorination", "hydrogen"],
    "IMG_20260604_114543.jpg": ["auxiliary"],
    "IMG_20260604_110044.jpg": ["auxiliary", "turbine"],
    "IMG_20260601_105846.jpg": ["feedwater"],
}

DATE_HINTS = [
    ("20260606_11", "pumphouse"),
    ("20260606_10", "pumphouse"),
    ("20260606_12", "chlorination"),
    ("20260605_11", "chimney_fgd"),
    ("20260605_12", "feedwater"),
    ("20260604_11", "turbine"),
    ("20260602_11", "boiler"),
    ("20260602_12", "coal"),
    ("20260601_10", "overview"),
    ("20260601_11", "coal"),
    ("20260530", "overview"),
    ("20260529", "overview"),
]


def guess_zone(fname):
    if fname in CURATED:
        return CURATED[fname]
    for key, zone in DATE_HINTS:
        if key in fname:
            return [zone]
    return ["auxiliary"]


def main():
    files = sorted(
        f.name for f in PHOTO_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    )
    zone_photos = {z: [] for z in ZONES}
    all_photos = []
    seen = {z: set() for z in ZONES}

    for f in files:
        zones = guess_zone(f)
        entry = {"file": f, "zones": zones}
        all_photos.append(entry)
        for z in zones:
            if z in zone_photos and f not in seen[z]:
                zone_photos[z].append({"file": f})
                seen[z].add(f)

    heroes = {z: (zone_photos[z][0]["file"] if zone_photos[z] else None) for z in ZONES}
    manifest = {
        "total": len(files),
        "zones": ZONES,
        "heroes": heroes,
        "photos": zone_photos,
        "all": all_photos,
    }
    data = json.dumps(manifest, indent=2)
    OUT.write_text(data)
    OUT_2D.write_text(data)
    print(f"Wrote {OUT} + {OUT_2D} — {len(files)} photos")
    for z in ZONES:
        print(f"  {z}: {len(zone_photos[z])}")


if __name__ == "__main__":
    main()
