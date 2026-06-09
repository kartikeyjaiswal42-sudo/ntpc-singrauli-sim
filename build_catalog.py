#!/usr/bin/env python3
"""
build_catalog.py — Single source of truth for the NTPC Singrauli photo simulation.

Every photo in public/photos/ is identified from a genuine per-photo AI vision
walk-through of the site (Jun 2026). Photos taken seconds apart are the same
component from different angles, so they are grouped; each GROUP carries rich
engineering content + clickable "hotspots" (labelled callouts shown on the photo).

EXTENSIBLE: drop new photos into public/photos/ and re-run this script.
Any file that falls outside every group range is auto-assigned to the
"unclassified" zone with a prompt to analyse it — nothing breaks, it just shows
up in the sim flagged for review.

    python3 build_catalog.py        # rebuilds manifest.json + 2d/manifest.json

Hotspot coords (x,y) are fractions 0..1 of the displayed image (0,0 = top-left).
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
PHOTO_DIR = ROOT / "public" / "photos"
OUT = ROOT / "manifest.json"
OUT_2D = ROOT / "2d" / "manifest.json"
OUT_CATALOG = ROOT / "photo_catalog.json"

# ── Plant zones (camera groups) ──────────────────────────────────────────────
ZONES = {
    "overview":     {"title": "Plant Overview",        "desc": "Entrance, skyline, aerial layout, water source.", "cam": "01"},
    "coal":         {"title": "Coal Handling",          "desc": "Stockyard, stacker-reclaimer, conveyors, bunkers, bowl mills, feeders.", "cam": "02"},
    "boiler":       {"title": "Boiler Island",          "desc": "Furnace, pressure parts, ID/FD/PA fans, air pre-heaters, draught.", "cam": "03"},
    "chimney_fgd":  {"title": "ESP, Chimney & FGD",     "desc": "Electrostatic precipitators, stack, FGD absorber, oxidation blowers, gypsum.", "cam": "04"},
    "turbine":      {"title": "Turbine & Generator",    "desc": "HP/IP/LP steam turbine, generator, turbine hall.", "cam": "05"},
    "condenser":    {"title": "Condenser & Vacuum",     "desc": "Surface condenser, hotwell, LP exhaust, vacuum.", "cam": "06"},
    "feedwater":    {"title": "Feed-water Cycle",       "desc": "CEP, LP/HP heaters, deaerator, boiler feed pumps.", "cam": "07"},
    "pumphouse":    {"title": "CW Pump House",          "desc": "Intake forebay, travelling screens, vertical CW pumps.", "cam": "08"},
    "chlorination": {"title": "Chlorination Plant",     "desc": "Electrochlorinators, hypochlorite dosing, CW biofouling control.", "cam": "09"},
    "dm_water":     {"title": "DM Water Plant",         "desc": "Demineralisation, make-up water, storage.", "cam": "10"},
    "electrical":   {"title": "Electrical & Switchyard","desc": "MCC, switchgear, transformers, 400 kV yard.", "cam": "11"},
    "control":      {"title": "Control / DCS & Notes",  "desc": "DCS mimics, P&IDs, layout maps, engineering notes.", "cam": "12"},
    "auxiliary":    {"title": "Auxiliaries & Stores",   "desc": "Air compressors, stores, machine shop, radiation store.", "cam": "13"},
    "unclassified": {"title": "Awaiting Analysis",      "desc": "Newly uploaded photos not yet identified. Re-run build_catalog.py after tagging.", "cam": "00"},
}

# ── Component groups (rich content from per-photo vision analysis) ────────────
# Each group: contiguous filename range [start, end] inclusive (sorted order).
# fields: zone, component, what, does, insight, live (label->engine key), hot (per-file hotspots)
GROUPS = [
 {"start":"IMG_20260529_123605.jpg","end":"IMG_20260529_123614.jpg","zone":"overview",
  "component":"Plant internal road & boiler-house approach",
  "what":"The main internal plant road running between the administrative block and the power block, with the boiler house, chimney and structures rising ahead.",
  "does":"Carries the daily movement of operations and maintenance crews, mobile cranes and material between the switchyard, boiler island, turbine hall and stores. The skyline tells you the unit layout at a glance.",
  "insight":"A coal unit is laid out along the 'fuel-to-flue' line: coal yard → bunkers → boiler → ESP → ID fans → chimney on one axis, and steam → turbine → condenser → CW pump house on the cross axis. Reading the skyline lets an engineer orient instantly.",
  "live":{"Unit load":"load","Net to grid":"netMW"}},

 {"start":"IMG_20260530_111940.jpg","end":"IMG_20260530_111941.jpg","zone":"control",
  "component":"Boiler reference diagram — 200 MW vs 500 MW",
  "what":"A training-room screen comparing a 200 MW two-pass drum boiler with a 500 MW boiler, showing furnace, superheaters (SH), reheater (RH), economiser and air pre-heater paths.",
  "does":"Explains how feed-water becomes superheated steam: water walls evaporate in the furnace, the drum separates steam, superheaters raise it to ~540 °C, the reheater re-energises steam returning from the HP turbine.",
  "insight":"Singrauli's 500 MW units are sub-critical drum boilers with natural/assisted circulation. Bigger furnaces lower heat flux and NOx; the reheat cycle adds ~4-5 % to cycle efficiency by re-superheating cold-reheat steam.",
  "live":{"Main-steam temp":"msT","Main-steam press":"msP"}},

 {"start":"IMG_20260530_131105.jpg","end":"IMG_20260530_131107.jpg","zone":"overview",
  "component":"Main entrance gate & plant skyline",
  "what":"The NTPC Singrauli main entrance gate with the iconic dome, the chimney and cooling-related structures forming the skyline behind.",
  "does":"Controls site access and marks the plant boundary. NTPC Singrauli (Shaktinagar, UP) was NTPC's first power project — a pithead station fed by the nearby coalfields and Rihand reservoir water.",
  "insight":"Pithead stations are sited next to the mine to avoid long coal freight: coal arrives by a Merry-Go-Round (MGR) rail loop. This cuts fuel cost but means coal quality is fixed by the local seam (high-ash Indian coal, ~3600 kcal/kg GCV).",
  "live":{"Unit load":"load","Plant load factor":"plf"},
  "hot":{"IMG_20260530_131105.jpg":[
     {"x":0.78,"y":0.32,"label":"Chimney (stack)","detail":"275 m multi-flue stack — disperses scrubbed flue gas high enough to meet ground-level SO₂ limits."},
     {"x":0.30,"y":0.55,"label":"Entrance dome","detail":"Main gate of NTPC's first station, commissioned 1982."}]}},

 {"start":"IMG_20260601_101033.jpg","end":"IMG_20260601_101317.jpg","zone":"boiler",
  "component":"Boiler house & chimney (exterior)",
  "what":"The full-height boiler house — a steel-clad tower enclosing the furnace and pressure parts — beside the red-and-white banded reinforced-concrete chimney.",
  "does":"Inside this structure pulverised coal burns at ~1300-1500 °C; the heat boils feed-water in the membrane water-walls and superheats steam that drives the turbine. Flue gas leaves via ESP, ID fans and the chimney.",
  "insight":"The boiler is hung from the top steelwork and grows downward as it heats (thermal expansion ~150-300 mm), so all connections use expansion joints and spring hangers. The chimney banding is aviation marking.",
  "live":{"Coal firing":"coalTh","Furnace temp":"furnaceTemp","Main-steam temp":"msT"},
  "hot":{"IMG_20260601_101033.jpg":[
     {"x":0.80,"y":0.30,"label":"Chimney / stack","detail":"Carries cleaned flue gas to atmosphere; height set so ground-level pollutant concentration stays within limits."},
     {"x":0.42,"y":0.45,"label":"Boiler house","detail":"Steel-clad tower housing furnace, superheaters, reheater, economiser and air pre-heaters."},
     {"x":0.30,"y":0.80,"label":"Pipe rack / ducting","detail":"Flue-gas and air ducts plus steam/water piping routed at grade between boiler and chimney."}]}},

 {"start":"IMG_20260601_102125.jpg","end":"IMG_20260601_102143.jpg","zone":"boiler",
  "component":"ID-fan house & flue-gas duct steelwork",
  "what":"Heavy structural steel A-frames and concrete supports carrying the large flue-gas ducts between the air pre-heater, ESP and induced-draught (ID) fans, with the chimney behind.",
  "does":"Supports the rectangular flue-gas ducts (several metres across) and the ID-fan house. ID fans pull combustion gas through the boiler and ESP and push it up the stack, holding the furnace at a slight negative pressure (balanced draught).",
  "insight":"Draught system = FD fans (force air in) + ID fans (pull gas out). ID fans handle hot, dirty, high-volume gas, so they are the largest auxiliary drives (several MW each) and a major part of the unit's ~7-8 % auxiliary power.",
  "live":{"Aux power":"auxMW","Flue-gas temp":"flueT","ESP ΔP":"espDp"}},

 {"start":"IMG_20260601_102648.jpg","end":"IMG_20260601_102713.jpg","zone":"coal",
  "component":"Coal stockyard & stacker-reclaimer",
  "what":"The open coal stockyard — long black coal piles — with a rail-mounted bucket-wheel stacker-reclaimer and a wheel-loader working the heap.",
  "does":"Buffers fuel between mine receipt and the boiler. The stacker builds the pile when coal arrives; the bucket-wheel reclaimer scrapes it back onto conveyors feeding the crusher house and bunkers, giving days of fuel security.",
  "insight":"A 500 MW unit burns roughly 250-330 t/h of Indian coal at full load. The yard is sized for ~15-30 days' stock. Piles are compacted and sometimes sprayed to prevent spontaneous combustion of the high-volatile coal.",
  "live":{"Coal firing":"coalTh","Ash produced":"ashTh"},
  "hot":{"IMG_20260601_102648.jpg":[
     {"x":0.50,"y":0.62,"label":"Coal stockpile","detail":"Live + dead storage of crushed coal — days of fuel buffer."},
     {"x":0.18,"y":0.40,"label":"Stacker-reclaimer","detail":"Bucket-wheel machine that stacks incoming coal and reclaims it onto the boiler conveyors."}]}},

 {"start":"IMG_20260601_102926.jpg","end":"IMG_20260601_102926.jpg","zone":"coal",
  "component":"Raw coal sample",
  "what":"A hand holding lumps of raw run-of-mine coal as received at the stockyard.",
  "does":"Sampling checks fuel quality — size, moisture, ash and gross calorific value (GCV). GCV directly sets how many tonnes/hour must be fired for a given megawatt output.",
  "insight":"Indian thermal coal is high-ash (35-45 %) and low-GCV (~3300-3800 kcal/kg). Lower GCV ⇒ more coal fired ⇒ more mill running, more ash, more ID-fan load. The sim's GCV slider shows this coupling live.",
  "live":{"Coal GCV":"gcv","Coal firing":"coalTh"}},

 {"start":"IMG_20260601_103113.jpg","end":"IMG_20260601_104219.jpg","zone":"control",
  "component":"FGD DCS control screens",
  "what":"Distributed Control System (DCS) graphic mimics of the Flue-Gas Desulphurisation plant — absorber, recycle pumps, wet ball mill (limestone grinding) and gypsum bleed.",
  "does":"Operators run the whole FGD island from these screens: limestone slurry preparation, absorber spray pumps, oxidation air, gypsum dewatering — controlling SO₂ removal and slurry pH (~5.5).",
  "insight":"A DCS replaces thousands of hard-wired instruments with networked controllers. Each green/red symbol is a live valve, pump or interlock; the operator clicks to start/stop and the controller enforces safe sequencing.",
  "live":{"Raw SO₂":"so2RawMg","Stack SO₂":"so2OutMg","Gypsum":"gypsumTh"}},

 {"start":"IMG_20260601_104400.jpg","end":"IMG_20260601_104406.jpg","zone":"overview",
  "component":"Plant 3D layout & FGD area maps",
  "what":"Framed isometric 3D renders and area plot-plans of the units, FGD absorber, AAT tank, booster fan and pipe racks, displayed in the plant office.",
  "does":"Give a bird's-eye of how every block connects — useful for planning isolations, cable/pipe routing and emergency access. The FGD retrofit (absorber + ducting) is shown tied into the existing boiler-to-chimney path.",
  "insight":"FGD was retrofitted on older Indian units to meet 2015 emission norms. Retrofitting means threading a new absorber and booster fan into a congested existing layout — hence the detailed 3D models before construction.",
  "live":{"Stack SO₂":"so2OutMg"}},

 {"start":"IMG_20260601_104421.jpg","end":"IMG_20260601_104421.jpg","zone":"control",
  "component":"FGD process-flow diagram (P&ID)",
  "what":"A printed Process & Instrumentation Diagram for the Flue-Gas Desulphurisation package — flue-gas path, absorber, slurry loops and instrument tags.",
  "does":"The master reference that defines every line, valve, pump and instrument in the FGD system and how they interlock. Commissioning, operation and fault-finding all trace back to the P&ID.",
  "insight":"P&IDs use a standard symbol language (ISA). Reading one, an engineer can trace flue gas from the ID-fan outlet, through the booster fan, into the absorber spray zone, and the cleaned gas back to the stack.",
  "live":{"Raw SO₂":"so2RawMg","Stack SO₂":"so2OutMg"}},

 {"start":"IMG_20260601_104549.jpg","end":"IMG_20260601_104550.jpg","zone":"control",
  "component":"Control-building corridor & notice boards",
  "what":"An internal corridor of the control/electrical building with safety and information notice boards.",
  "does":"Connects control room, electrical switchgear and engineers' offices in a clean, air-conditioned environment isolated from boiler-house dust and heat. Notice boards carry permits, safety stats and shift information.",
  "insight":"Keeping electronics and operators in a sealed building protects the DCS and switchgear from coal dust and vibration, and gives a safe muster/route during a boiler trip or tube-leak.",
  "live":{}},

 {"start":"IMG_20260601_104755.jpg","end":"IMG_20260601_104844.jpg","zone":"chimney_fgd",
  "component":"Elevated view — chimney, ESP & boiler roofscape",
  "what":"A rooftop/elevated walkway view across the flue-gas train: chimney, the grey electrostatic-precipitator (ESP) casings and the boiler-house roof with ducting.",
  "does":"Shows the gas path after combustion: boiler → air pre-heater → ESP (removes fly ash) → ID fans → chimney. From here you can see how the ducts snake between the large box-like ESP fields.",
  "insight":"ESPs are huge because gas must slow down to ~1 m/s so charged ash particles have time to migrate to the collecting plates. A 500 MW ESP removes >99.9 % of fly ash; rapping hammers knock collected ash into hoppers below.",
  "live":{"PM at stack":"pmOutMg","Ash produced":"ashTh","ESP ΔP":"espDp"},
  "hot":{"IMG_20260601_104812.jpg":[
     {"x":0.75,"y":0.28,"label":"Chimney","detail":"Final release point for cleaned flue gas."},
     {"x":0.40,"y":0.55,"label":"ESP casings","detail":"Electrostatic precipitator fields — charge and collect fly ash before the stack."},
     {"x":0.15,"y":0.62,"label":"Flue-gas ducts","detail":"Large rectangular ducts carrying gas between boiler, ESP and ID fans."}]}},

 {"start":"IMG_20260601_105101.jpg","end":"IMG_20260601_105111.jpg","zone":"electrical",
  "component":"FGD electrical MCC / switchgear room",
  "what":"A long aisle of blue Motor Control Centre (MCC) cubicles and a local control panel feeding the FGD plant motors.",
  "does":"Distributes 415 V power and houses the contactors, breakers and protection for every FGD pump, fan and agitator motor. Each cubicle starts/stops and protects one drive.",
  "insight":"Auxiliary loads cascade by voltage: 11 kV for large drives (ID/FD/BFP), 3.3 kV mid-size, 415 V MCCs for the rest. Protective relays trip a motor on overload/earth-fault before it burns out.",
  "live":{"Aux power":"auxMW"}},

 {"start":"IMG_20260601_105235.jpg","end":"IMG_20260601_105252.jpg","zone":"control",
  "component":"Booster-fan / inlet-damper local panel",
  "what":"A field local-control panel with gauges and labels — 'BOOSTER FAN', 'INLET DAMPER FAN-A', stack & flue-gas temperatures — and a maintenance lock-out (DANGER) tag fitted.",
  "does":"Lets field operators monitor and locally control the FGD booster fan and its inlet dampers. The booster fan overcomes the extra pressure drop the absorber adds to the gas path.",
  "insight":"The yellow DANGER lock-out/tag-out tag is a safety interlock: the drive is electrically isolated and tagged so it cannot be started while someone works on it. LOTO discipline prevents the worst maintenance accidents.",
  "live":{"Flue-gas temp":"flueT","Aux power":"auxMW"}},

 {"start":"IMG_20260601_105423.jpg","end":"IMG_20260601_105533.jpg","zone":"chimney_fgd",
  "component":"FGD absorber tower (exterior structure)",
  "what":"The tall concrete/steel FGD absorber tower and its supporting structure, with flue-gas ducting tying in at the base.",
  "does":"This is where SO₂ is scrubbed: dirty flue gas enters low, rises through banks of limestone-slurry sprays, and SO₂ reacts to form calcium sulphite, then sulphate (gypsum). Cleaned, cooled gas leaves the top to the stack.",
  "insight":"Wet limestone FGD removes ~95-98 % of SO₂. The reaction: SO₂ + CaCO₃ + ½O₂ + 2H₂O → CaSO₄·2H₂O (gypsum). It trades a small efficiency penalty (fan power + reheat) for a large cut in acid-rain emissions.",
  "live":{"Raw SO₂":"so2RawMg","Stack SO₂":"so2OutMg","Gypsum":"gypsumTh"}},

 {"start":"IMG_20260601_110514.jpg","end":"IMG_20260601_110540.jpg","zone":"chimney_fgd",
  "component":"FGD absorber tower & ground level",
  "what":"The FGD absorber tower seen with its inlet flue-gas ducting and the ground-level area (site office, workers) around the absorber base.",
  "does":"The absorber is the reaction vessel of the FGD: booster-fan gas enters at the bottom, rises through limestone-slurry sprays that scrub out SO₂, and leaves the top cleaned and cooled toward the stack.",
  "insight":"Gas spends only a couple of seconds in the spray zone, so multiple spray levels and a high liquid-to-gas ratio are needed for 95 %+ removal. The sump below doubles as the oxidation/reaction tank where gypsum forms.",
  "live":{"Raw SO₂":"so2RawMg","Stack SO₂":"so2OutMg","Gypsum":"gypsumTh"},
  "hot":{"IMG_20260601_110514.jpg":[
     {"x":0.55,"y":0.40,"label":"Absorber tower","detail":"Slurry sprays scrub SO₂ from rising flue gas."},
     {"x":0.25,"y":0.70,"label":"Inlet flue-gas duct","detail":"Brings booster-fan gas into the bottom of the absorber."}]}},

 {"start":"IMG_20260601_105651.jpg","end":"IMG_20260601_105654.jpg","zone":"chimney_fgd",
  "component":"FGD oxidation air blowers",
  "what":"A row of large blue centrifugal blowers (marked 'OXIDATION BLOWER-A') with their drive motors, in the FGD plant.",
  "does":"Force air into the absorber's bottom slurry pool to oxidise calcium sulphite (CaSO₃) fully into saleable gypsum (CaSO₄·2H₂O). Without forced oxidation, the by-product is a hard-to-handle sludge.",
  "insight":"'Forced-oxidation' FGD makes wallboard-grade gypsum, turning a waste into a product. The blowers must run continuously whenever the absorber is in service — another steady auxiliary load.",
  "live":{"Gypsum":"gypsumTh","Aux power":"auxMW"},
  "hot":{"IMG_20260601_105651.jpg":[
     {"x":0.40,"y":0.45,"label":"Oxidation blower","detail":"Pumps oxidation air into the absorber sump to convert sulphite to gypsum."},
     {"x":0.72,"y":0.55,"label":"Drive motor","detail":"Electric motor sized for continuous duty."}]}},

 {"start":"IMG_20260601_105659.jpg","end":"IMG_20260601_105846.jpg","zone":"chimney_fgd",
  "component":"FGD recirculation pumps, slurry piping & instruments",
  "what":"Large absorber recirculation pumps with heavy slurry piping and a field flow/level transmitter, in the FGD plant.",
  "does":"Recycle pumps continuously lift limestone slurry from the absorber sump up to the spray headers — the liquid-to-gas ratio they maintain sets SO₂ removal. The transmitter feeds level/flow back to the DCS.",
  "insight":"Slurry is abrasive and corrosive, so pumps use rubber-lined casings and hard impellers, and piping is rubber-lined or FRP. Several recycle pumps run in parallel; staging them with SO₂ load saves power.",
  "live":{"Stack SO₂":"so2OutMg","Aux power":"auxMW"}},

 {"start":"IMG_20260601_112828.jpg","end":"IMG_20260601_113006.jpg","zone":"chimney_fgd",
  "component":"Gypsum vacuum belt filter (dewatering)",
  "what":"A horizontal vacuum belt filter with brown dewatered gypsum cake on the moving belt, in the gypsum dewatering area.",
  "does":"Takes gypsum-rich slurry bled from the absorber and sucks the water out through the belt, leaving a ~10 % moisture gypsum cake that is conveyed away for sale to cement/board makers.",
  "insight":"Dewatering closes the FGD water loop: filtrate returns to slurry preparation, solids leave as product. Belt speed and vacuum are tuned to cake moisture — too wet won't sell, too dry wastes vacuum power.",
  "live":{"Gypsum":"gypsumTh"}},

 {"start":"IMG_20260601_113357.jpg","end":"IMG_20260601_113358.jpg","zone":"coal",
  "component":"Conveyor / pipe gallery (CHP)",
  "what":"The underside of an enclosed conveyor and pipe gallery — long green structural troughs carrying belts and services between coal-handling transfer points.",
  "does":"Belt conveyors in these galleries move crushed coal from the stockyard/crusher house up to the boiler bunkers, often hundreds of metres at a slope, enclosed against dust and rain.",
  "insight":"Coal Handling Plant (CHP) belts are interlocked in sequence: the belt feeding the bunker must start before the one feeding it, and stop last, so coal never piles up at a stopped transfer chute.",
  "live":{"Coal firing":"coalTh"}},

 {"start":"IMG_20260601_113408.jpg","end":"IMG_20260601_113433.jpg","zone":"coal",
  "component":"Coal stockyard & stacker-reclaimer (yard view)",
  "what":"A wider view of the coal stockyard with the bucket-wheel stacker-reclaimer working the heap, hills in the distance.",
  "does":"Same stockyard function — buffering and blending coal. The reclaimer's bucket wheel digs into the pile face and the boom slews to load the yard conveyor at a controlled rate.",
  "insight":"Blending across the pile evens out coal quality (GCV, ash) before it reaches the mills, keeping combustion and steam temperature steady. Reclaim rate is matched to total mill demand across both units.",
  "live":{"Coal firing":"coalTh","Ash produced":"ashTh"}},

 {"start":"IMG_20260601_113527.jpg","end":"IMG_20260601_113538.jpg","zone":"chimney_fgd",
  "component":"Elevated view — chimney & boiler roofscape (II)",
  "what":"A high vantage over the boiler-house roof and the chimney, with large grey ducting/fan housings and the ESP train visible.",
  "does":"Reinforces the gas path overview — flue gas leaves the boiler, is cleaned in the ESP and pushed up the stack by the ID fans visible as large grey volutes on the roofline.",
  "insight":"Seeing the train from above makes the pressure profile intuitive: the boiler runs slightly below atmospheric, draught loss accumulates through ESP and ducts, and the ID fan restores enough head to clear the tall stack.",
  "live":{"Flue-gas temp":"flueT","ESP ΔP":"espDp"}},

 {"start":"IMG_20260601_191803.jpg","end":"IMG_20260601_191809.jpg","zone":"control",
  "component":"FGD process notes (handwritten)",
  "what":"Engineer's handwritten notebook pages sketching the FGD absorber, slurry loop and key parameters.",
  "does":"Working notes capturing how the absorber, recycle pumps and oxidation air fit together and the numbers that matter (pH, L/G ratio, removal %). The kind of distilled understanding behind operating the plant.",
  "insight":"Good operators keep a 'why it works' notebook — the design intent behind each setpoint. It's how tacit plant knowledge survives shift handovers and staff changes.",
  "live":{"Stack SO₂":"so2OutMg"}},

 {"start":"IMG_20260602_102410.jpg","end":"IMG_20260602_102410.jpg","zone":"control",
  "component":"Boiler draught & mill notes (PA/FD/ID/APH)",
  "what":"A handwritten note with a small sketch covering the boiler air/gas system: Primary-Air (PA), Forced-Draught (FD), Induced-Draught (ID) fans and the Air Pre-Heater (APH).",
  "does":"Summarises how air and gas move: FD fans supply combustion air through the APH; PA fans carry pulverised coal from mills to burners; ID fans pull flue gas out through ESP to the stack.",
  "insight":"The APH recovers heat from outgoing flue gas (~350 °C) into incoming combustion air, raising boiler efficiency by ~5-10 %. PA is hotter/higher-pressure than secondary air because it must dry and transport coal.",
  "live":{"Aux power":"auxMW","Flue-gas temp":"flueT"}},

 {"start":"IMG_20260602_110909.jpg","end":"IMG_20260602_111342.jpg","zone":"coal",
  "component":"Pulverizer (mill) bay & coal silos",
  "what":"The mill-floor structure: heavy supports, coal-laden silos/hoppers and pulverised-fuel piping in the dusty mill bay below the bunkers.",
  "does":"Houses the coal pulverizers (bowl mills) directly under the bunkers. Coal drops from a bunker through a feeder into a mill, is ground to talcum-fine powder, and hot primary air blows it to the burners.",
  "insight":"Coal must be pulverised so fine (~70 % through 200 mesh) that it burns almost like a gas in the few seconds it's airborne in the furnace. A 500 MW unit has ~6-8 mills; a couple are spare for maintenance/turndown.",
  "live":{"Coal firing":"coalTh","Furnace temp":"furnaceTemp"}},

 {"start":"IMG_20260602_112121.jpg","end":"IMG_20260602_112815.jpg","zone":"coal",
  "component":"XRP/bowl mills (pulverizers)",
  "what":"A coal pulverizer (bowl mill) — the heavy cast mill body with its gearbox and drive motor and the conical classifier on top, with pulverised-fuel (PF) pipes leaving it.",
  "does":"Grinds raw coal between rotating grinding rolls and a bowl. Hot primary air sweeps the powder up through the classifier; coarse particles fall back to be re-ground, fine PF goes to the burners.",
  "insight":"Mill outlet temperature (~75-90 °C) is controlled by mixing hot and tempering air — too hot risks a mill fire, too cold leaves coal wet. Mill loading, fineness and air-flow together set how cleanly the furnace burns.",
  "live":{"Coal firing":"coalTh","Furnace temp":"furnaceTemp"},
  "hot":{"IMG_20260602_112127.jpg":[
     {"x":0.45,"y":0.45,"label":"Mill body","detail":"Grinding bowl and rolls pulverise coal to powder."},
     {"x":0.20,"y":0.62,"label":"Gearbox & motor","detail":"Drives the bowl; one of the unit's larger auxiliary loads."},
     {"x":0.72,"y":0.30,"label":"PF outlet pipe","detail":"Carries coal-air mixture to the furnace burners."}]}},

 {"start":"IMG_20260602_112942.jpg","end":"IMG_20260602_113055.jpg","zone":"coal",
  "component":"Raw coal gravimetric feeders",
  "what":"Enclosed gravimetric coal feeders mounted between the bunker outlet and the mill inlet, with the classifier wheel visible nearby.",
  "does":"Meter the exact mass-flow of coal (t/h) into each mill. A weigh-belt on a load cell measures coal weight and adjusts belt speed so the DCS gets precisely the coal demand the combustion controls call for.",
  "insight":"Accurate coal weighing is the foundation of the boiler's fuel/air ratio and of heat-rate accounting. If a feeder under-reads, the unit silently burns more coal than it's credited with — hurting the measured efficiency.",
  "live":{"Coal firing":"coalTh"}},

 {"start":"IMG_20260602_113103.jpg","end":"IMG_20260602_113119_1.jpg","zone":"boiler",
  "component":"Air pre-heater / draught-fan housing",
  "what":"A large grey box housing with a big circular rotor/wheel and round duct openings — an air pre-heater (or large draught fan) on the boiler air/gas side.",
  "does":"A regenerative (rotary) air pre-heater slowly rotates a basket matrix between the hot outgoing flue gas and the cold incoming air, soaking heat from one into the other and lifting boiler efficiency.",
  "insight":"The APH is the last heat-recovery surface before the ESP. If its baskets foul or leak, exit-gas temperature climbs (efficiency drops) and air leaks into the gas side (extra ID-fan load) — a closely watched KPI.",
  "live":{"Flue-gas temp":"flueT","Boiler eff":"boilerEff"}},

 {"start":"IMG_20260602_113244.jpg","end":"IMG_20260602_113405.jpg","zone":"chimney_fgd",
  "component":"ESP casing exterior & ash hoppers",
  "what":"The exterior of an electrostatic-precipitator casing — large corrugated grey walls braced diagonally, with rows of pyramidal ash hoppers underneath.",
  "does":"Inside, high-voltage electrodes charge fly-ash particles in the flue gas and grounded plates collect them; rapping drops the ash into the hoppers below for the ash-handling system to remove.",
  "insight":"ESP fields are staged in series; the first field collects most of the ash, later fields polish. Hopper heaters stop ash caking. ESP performance is the difference between a clear stack and a visible plume.",
  "live":{"PM at stack":"pmOutMg","Ash produced":"ashTh","ESP ΔP":"espDp"}},

 {"start":"IMG_20260602_113427.jpg","end":"IMG_20260602_113533.jpg","zone":"boiler",
  "component":"Boiler structural steel, fan rotor & bottom-ash area",
  "what":"Boiler/ESP support steelwork and concrete columns, a spare draught-fan rotor/impeller laid on the ground, and the boiler-bottom region with blue piping.",
  "does":"The steelwork carries the suspended boiler and ducts. The fan rotor is a spare/overhaul induced- or forced-draught impeller. The boiler-bottom area collects slag (bottom ash) that falls off the furnace walls.",
  "insight":"Bottom ash (~20 % of total ash) falls into a water-filled hopper, is crushed and sluiced away; fly ash (~80 %) goes out with the gas to the ESP. Balancing both ash streams is part of keeping the furnace clean.",
  "live":{"Ash produced":"ashTh","Aux power":"auxMW"}},

 {"start":"IMG_20260602_113809.jpg","end":"IMG_20260602_113920.jpg","zone":"chimney_fgd",
  "component":"ESP casing rows & flue-gas ducting (outdoor)",
  "what":"Outdoor rows of grey ESP casings and flue-gas ducts running toward the chimney, with stacked spare pipe and structural steel.",
  "does":"This is the open-air section of the gas-cleaning train between the boiler and the stack — multiple ESP passes in parallel handle the huge flue-gas volume of a 500 MW unit.",
  "insight":"Flue-gas volume is enormous (~1.5-2 million m³/h), so the ESP and ducts are split into parallel passes. Even a small duct air-leak forces the ID fans to work harder, so duct integrity is a steady maintenance focus.",
  "live":{"Flue-gas temp":"flueT","ESP ΔP":"espDp"}},

 {"start":"IMG_20260602_114041.jpg","end":"IMG_20260602_114044_1.jpg","zone":"chimney_fgd",
  "component":"ESP casing & maintenance access",
  "what":"Close exterior of an ESP casing with access scaffolding and a service vehicle/crane at its base.",
  "does":"Maintenance access to the ESP internals — electrodes, collecting plates and rapping gear — which are cleaned and re-aligned during unit outages to restore collection efficiency.",
  "insight":"ESP collection efficiency drifts down as plates warp and electrodes foul; outage maintenance (plate alignment, rapper checks) is how the plant keeps stack particulate within the tightening Indian PM norms.",
  "live":{"PM at stack":"pmOutMg"}},

 {"start":"IMG_20260602_114212.jpg","end":"IMG_20260602_114212.jpg","zone":"auxiliary",
  "component":"Lube-oil / chemical drum store",
  "what":"A bunded store of lubricant and chemical drums (yellow/red) beside a blue field panel.",
  "does":"Stores turbine/auxiliary lube oils, greases and treatment chemicals close to where they're used, on spill-containment (bunded) flooring.",
  "insight":"Turbine lube oil cleanliness is critical — particulate or water in the oil wrecks bearings. Drums are kept sealed, labelled and FIFO-rotated, and dispensed through filtration.",
  "live":{}},

 {"start":"IMG_20260602_115505.jpg","end":"IMG_20260602_115531.jpg","zone":"overview",
  "component":"Elevated view — ash dyke & switchyard surroundings",
  "what":"A panoramic view from high on the boiler/chimney structure over the surrounding land — ash dyke area and the switchyard transmission lines in the distance.",
  "does":"Shows the plant's footprint beyond the power block: the ash disposal area (dyke/pond) and the 400 kV switchyard from which power leaves for the grid.",
  "insight":"Fly ash is increasingly sold (cement, bricks) rather than ponded; the dyke is a buffer. The switchyard is where the generator's stepped-up voltage joins the national grid through transmission lines.",
  "live":{"Net to grid":"netMW"}},

 {"start":"IMG_20260602_115547.jpg","end":"IMG_20260602_115549.jpg","zone":"boiler",
  "component":"Insulated large-bore boiler pipework",
  "what":"Large-bore insulated (lagged) pipes with flanged valves at high level on the boiler — main-steam / hot-reheat class piping.",
  "does":"Carry high-temperature, high-pressure steam between the boiler superheater/reheater outlets and the turbine. Thick insulation cuts heat loss and protects personnel from ~540 °C surfaces.",
  "insight":"Main-steam lines run at ~170 kg/cm² and 540 °C — they use thick alloy-steel pipe and are routed with loops/hangers to absorb huge thermal expansion without overstressing the turbine nozzles.",
  "live":{"Main-steam temp":"msT","Main-steam press":"msP","Steam flow":"steamTh"}},

 {"start":"IMG_20260602_120113.jpg","end":"IMG_20260602_121105.jpg","zone":"coal",
  "component":"Coal bunker / tripper floor & internal chutes",
  "what":"The bunker/tripper floor and internal galleries — conveyors, chutes and dusty walkways where coal is distributed into the boiler bunkers.",
  "does":"A tripper or shuttle conveyor travels along the bunker bay dropping coal into each bunker in turn, keeping all bunkers topped up so every mill always has fuel.",
  "insight":"Bunker level management matters: a near-empty bunker risks a mill trip (and a unit runback), while overfilling risks coal hang-ups and spontaneous heating. Operators rotate the tripper to balance levels.",
  "live":{"Coal firing":"coalTh"}},

 {"start":"IMG_20260602_121122.jpg","end":"IMG_20260602_121728.jpg","zone":"boiler",
  "component":"Boiler internals — pipework, economiser & hoppers",
  "what":"Dense internal boiler structure: water/steam pipework, economiser coils and ash hoppers in the dusty second-pass region.",
  "does":"The economiser (last water-side heat surface) preheats feed-water with flue gas before it enters the drum; the surrounding tube banks are the superheater/reheater pendants that make and re-heat steam.",
  "insight":"Heat is extracted in falling-temperature order — furnace radiant walls, then SH, RH, economiser, APH — so each surface sees the right gas temperature. Soot-blowers periodically clean ash off these tubes to keep heat transfer up.",
  "live":{"Main-steam temp":"msT","Boiler eff":"boilerEff","Steam flow":"steamTh"}},

 {"start":"IMG_20260602_122024.jpg","end":"IMG_20260602_122208.jpg","zone":"feedwater",
  "component":"HP feed-water heaters & cycle pipework",
  "what":"Large horizontal cylindrical vessels (one clearly labelled 'H.P. HEATER 6A') with insulated interconnecting pipework on the turbine-hall ground floor.",
  "does":"High-pressure feed-water heaters use steam bled from the turbine to pre-heat boiler feed-water in stages. Hotter feed-water means less fuel is needed to boil it — directly improving cycle efficiency.",
  "insight":"This is 'regenerative feed heating': a 500 MW cycle has ~3 LP + 3 HP heaters plus a deaerator, raising feed-water from ~40 °C to ~250 °C. Each heater out of service measurably worsens unit heat rate.",
  "live":{"Cycle eff":"cycleEff","Steam flow":"steamTh"},
  "hot":{"IMG_20260602_122037.jpg":[
     {"x":0.45,"y":0.45,"label":"HP Heater 6A","detail":"Shell-and-tube heater: turbine bleed steam on the shell heats feed-water in the tubes."},
     {"x":0.18,"y":0.30,"label":"Bleed-steam & feed pipework","detail":"Extraction steam in, drains out, feed-water through the tube bundle."}]}},

 {"start":"IMG_20260602_122248.jpg","end":"IMG_20260602_122733.jpg","zone":"turbine",
  "component":"Steam turbine, generator & turbine hall",
  "what":"The turbine hall: the long insulated steam-turbine casings (HP/IP/LP) coupled in line to the generator, plus auxiliary machines and overhaul work in progress.",
  "does":"Superheated steam expands through the turbine stages, spinning the shaft at 3000 rpm; the coupled generator converts that rotation into 3-phase electricity at 50 Hz. This is where heat becomes power.",
  "insight":"Steam drops from ~540 °C/170 ata at HP inlet to a near-vacuum at LP exhaust; extracting work at each stage is what the whole plant exists to do. The shaft must stay perfectly balanced and aligned — hence the careful hall environment.",
  "live":{"Gross power":"grossMW","Speed":"rpm","Frequency":"freq","Steam flow":"steamTh"},
  "hot":{"IMG_20260602_122340.jpg":[
     {"x":0.45,"y":0.50,"label":"Turbine casing (HP/IP)","detail":"Steam expands through bladed stages, spinning the shaft at 3000 rpm."},
     {"x":0.80,"y":0.45,"label":"Toward generator / LP","detail":"Shaft drives the generator; LP stages exhaust down into the condenser."}]}},

 {"start":"IMG_20260602_122734.jpg","end":"IMG_20260602_123155.jpg","zone":"auxiliary",
  "component":"Generator-rotor overhaul & heat-exchanger bundles",
  "what":"Maintenance bay work — a generator/motor rotor with copper windings on stands, and heat-exchanger (cooler) tube bundles being serviced.",
  "does":"Major rotating machines and coolers are overhauled here during outages: cleaning, re-insulation, balancing of rotors and re-tubing/cleaning of coolers before re-installation.",
  "insight":"A generator rotor is a giant electromagnet; its insulation and balance decide machine life. Coolers (oil, air, hydrogen) keep windings and bearings within temperature — fouled tubes force load limits, so they're cleaned on schedule.",
  "live":{}},

 {"start":"IMG_20260604_110029.jpg","end":"IMG_20260604_112434.jpg","zone":"auxiliary",
  "component":"Central stores & spare parts",
  "what":"Warehouse racking holding categorised spares — control-valve internals, bolts, bearings, pipe fittings, gaskets and assorted mechanical parts.",
  "does":"Keeps critical and consumable spares on hand so a failed valve, bearing or fitting can be replaced fast, minimising forced-outage time. Items are binned, labelled and inventory-tracked.",
  "insight":"Spares strategy is an availability decision: long-lead items (turbine blades, large valves) are stocked despite cost because their absence could keep a 500 MW unit down for weeks. Min/max levels trigger re-order.",
  "live":{}},

 {"start":"IMG_20260604_114006.jpg","end":"IMG_20260604_115018.jpg","zone":"auxiliary",
  "component":"Maintenance machine shop & rotor overhaul",
  "what":"The plant machine shop — green lathes and boring machines — with a large turbine/fan rotor disc under overhaul.",
  "does":"In-house machining of shafts, sleeves, bushes and fittings, and refurbishment of rotors and impellers, so the plant isn't waiting on outside vendors for routine repairs.",
  "insight":"A captive workshop is a big availability lever: skimming a journal, making a gasket or balancing a fan rotor on-site turns a multi-day vendor job into hours, keeping units running.",
  "live":{}},

 {"start":"IMG_20260605_115416.jpg","end":"IMG_20260605_115416.jpg","zone":"chimney_fgd",
  "component":"Outdoor flue-gas duct & process tank",
  "what":"An outdoor rectangular duct/tank with associated piping in the ESP/FGD area.",
  "does":"Part of the flue-gas / process-fluid handling between the ESP, ID fans and FGD — ducting and a buffer/storage tank in the gas-cleaning train.",
  "insight":"Between gas-cleaning stages there are surge and storage volumes (e.g. for slurry, wash water or ash) that absorb flow swings so the upstream and downstream equipment can run steadily.",
  "live":{"Flue-gas temp":"flueT"}},

 {"start":"IMG_20260605_115622.jpg","end":"IMG_20260605_115629.jpg","zone":"boiler",
  "component":"Induced-draught (ID) fans — ESP Pass A/B",
  "what":"Large green centrifugal induced-draught fans with bell-mouth inlets and big outlet bends, labelled by gas pass (PASS-A / PASS-B).",
  "does":"ID fans draw flue gas through the boiler, air pre-heater and ESP and discharge it to the chimney, maintaining the furnace at balanced (slightly negative) draught. One fan per gas pass runs in parallel.",
  "insight":"ID fans are among the largest auxiliary drives (multi-MW). Their inlet guide vanes / variable speed control furnace draught; on a boiler trip, draught control protects the furnace from pressure excursions (implosion/explosion).",
  "live":{"Aux power":"auxMW","Flue-gas temp":"flueT","ESP ΔP":"espDp"},
  "hot":{"IMG_20260605_115622.jpg":[
     {"x":0.40,"y":0.45,"label":"ID-fan casing","detail":"Centrifugal fan pulling flue gas to the stack."},
     {"x":0.20,"y":0.55,"label":"Inlet (from ESP pass)","detail":"Bell-mouth suction taking cleaned gas from the ESP."}]}},

 {"start":"IMG_20260605_120617.jpg","end":"IMG_20260605_120617.jpg","zone":"auxiliary",
  "component":"Lube-oil drum store (turbine side)",
  "what":"A store of orange lube-oil drums near the turbine/feed-water plant.",
  "does":"Holds turbine and pump lubricating oils close to point of use, on containment flooring.",
  "insight":"Oil is dispensed through fine filtration and tested for water and particulate — clean oil is the cheapest bearing-life insurance in the plant.",
  "live":{}},

 {"start":"IMG_20260605_120620.jpg","end":"IMG_20260605_121215.jpg","zone":"feedwater",
  "component":"Condensate extraction pumps, LP heaters & dosing skids",
  "what":"Green condensate pumps and piping, insulated LP feed-water heaters/deaerator, and blue chemical-dosing skids with control panels.",
  "does":"Condensate Extraction Pumps (CEP) pull condensate from the condenser hotwell and push it through the LP heaters and deaerator toward the boiler feed pumps. Dosing skids add chemicals to protect the cycle from corrosion.",
  "insight":"The feed-water cycle is a closed loop: condenser → CEP → LP heaters → deaerator → BFP → HP heaters → boiler. The deaerator strips dissolved O₂; dosing (ammonia/hydrazine-substitute, phosphate) holds pH and scavenges oxygen to stop tube corrosion.",
  "live":{"Cycle eff":"cycleEff","Steam flow":"steamTh"},
  "hot":{"IMG_20260605_115622.jpg":[]}},

 {"start":"IMG_20260605_122301.jpg","end":"IMG_20260605_122301.jpg","zone":"condenser",
  "component":"Surface-condenser notes (two-pass, hotwell, TTD)",
  "what":"Handwritten notes on the surface condenser — two-pass layout, hotwell, and Terminal Temperature Difference (TTD).",
  "does":"Capture how the condenser turns LP-turbine exhaust steam back into water under vacuum, and the parameters (vacuum, TTD, sub-cooling) that reveal its health.",
  "insight":"The condenser creates the vacuum that lets steam do maximum work in the LP turbine. A 1 °C rise in TTD or a small vacuum loss (e.g. from CW fouling or air ingress) measurably raises heat rate — it's the cycle's biggest single loss anyway (~latent heat to CW).",
  "live":{"Condenser vacuum":"vacuumKgcm2g","Condenser duty":"condDuty","CW ΔT":"cwDeltaT"}},

 {"start":"IMG_20260606_102201.jpg","end":"IMG_20260606_102812.jpg","zone":"auxiliary",
  "component":"Instrument & service air compressors",
  "what":"A bank of blue reciprocating air compressors with their flywheels and aftercoolers in the compressor house.",
  "does":"Supply compressed air for two duties: clean, dry Instrument Air that strokes pneumatic control valves and dampers, and Service Air for tools, soot-blowing and general plant use.",
  "insight":"Instrument air must be oil-free and dried (dew point well below ambient) — moisture or oil would seize control-valve positioners. Loss of instrument air fails control valves to their safe position and can trip the unit, so receivers and standby compressors give ride-through.",
  "live":{}},

 {"start":"IMG_20260606_110716.jpg","end":"IMG_20260606_110717.jpg","zone":"auxiliary",
  "component":"Radiation source store (nucleonic level gauges)",
  "what":"A small secured brick building with barbed wire — storage for radioactive sources used in nucleonic level/density gauges.",
  "does":"Safely stores sealed gamma sources (used for non-contact level/density measurement in bunkers, mills and ash hoppers) when removed from service, under regulatory (AERB) control.",
  "insight":"Nucleonic gauges 'see' through steel to measure coal/ash level where nothing else survives the dust and abrasion. The sources are licensed, inventoried and shielded — handling is tightly procedurised for radiation safety.",
  "live":{}},

 {"start":"IMG_20260606_112345.jpg","end":"IMG_20260606_112345.jpg","zone":"pumphouse",
  "component":"CW pump house entrance",
  "what":"The signboard / entrance to the Circulating Water (CW) pump house.",
  "does":"Marks the building that houses the large pumps circulating cooling water through the condenser — the system that rejects the cycle's waste heat.",
  "insight":"CW flow is enormous (tens of thousands of m³/h per unit). The pump house sits at the water source (reservoir/canal) so the pumps only need to overcome friction and condenser head, not lift water far.",
  "live":{"CW flow":"cwM3h"}},

 {"start":"IMG_20260606_112356.jpg","end":"IMG_20260606_112434.jpg","zone":"pumphouse",
  "component":"Vertical circulating-water (CW) pumps",
  "what":"Tall blue vertical CW pumps in the pump house — motor on top, long column reaching down into the intake water below.",
  "does":"Lift and circulate huge volumes of cooling water from the intake through the condenser tubes and back. They are the heart of the heat-rejection (cold) end of the cycle.",
  "insight":"Vertical wet-pit pumps suit large low-head, high-flow duty: the impeller sits permanently submerged so the pump is always primed. CW flow sets the condenser vacuum — more flow ⇒ deeper vacuum ⇒ better cycle efficiency, traded against pump power.",
  "live":{"CW flow":"cwM3h","CW inlet temp":"cwInlet","CW ΔT":"cwDeltaT"},
  "hot":{"IMG_20260606_112356.jpg":[
     {"x":0.42,"y":0.30,"label":"Drive motor","detail":"Top-mounted motor turning the vertical pump shaft."},
     {"x":0.42,"y":0.62,"label":"Pump column","detail":"Long column to the submerged impeller in the intake bay."}]}},

 {"start":"IMG_20260606_112823.jpg","end":"IMG_20260606_113319.jpg","zone":"pumphouse",
  "component":"CW intake forebay & approach channel",
  "what":"Open concrete forebay/approach channels of green cooling water leading to the pump-house bays, with yellow safety railings.",
  "does":"Bring raw water from the reservoir/canal to the pump suction. The forebay calms the flow and lets debris settle before the travelling screens and pumps.",
  "insight":"A well-designed forebay avoids vortices and uneven approach flow that would make the big pumps cavitate or vibrate. Water level here is watched closely — low level risks pump air-ingress and trips.",
  "live":{"CW flow":"cwM3h","CW inlet temp":"cwInlet"}},

 {"start":"IMG_20260606_113448.jpg","end":"IMG_20260606_113609.jpg","zone":"pumphouse",
  "component":"Travelling water screens & pump-house interior",
  "what":"The mechanical travelling water screens (one nameplated 'TRAVELLING SCREEN') and the pump-house interior aisle.",
  "does":"Endless mesh-panel screens rotate to lift leaves, fish, weeds and trash out of the intake water before it reaches the pumps and condenser, then a spray wash flushes the debris away.",
  "insight":"Screens protect the condenser tubes from blockage. Differential level across a screen signals clogging; the screen then runs continuously and is back-washed. A blocked intake can starve the CW pumps and force a load cut.",
  "live":{"CW flow":"cwM3h"}},

 {"start":"IMG_20260606_114217.jpg","end":"IMG_20260606_114238.jpg","zone":"chlorination",
  "component":"CW chlorination contact tanks (outdoor)",
  "what":"A row of white conical-roofed outdoor tanks with field instrument boxes, fenced, in the cooling-water treatment area.",
  "does":"Hold and dose hypochlorite/biocide into the circulating water to control biofouling — the slime and mussels that would otherwise coat condenser tubes and ruin heat transfer.",
  "insight":"Biofouling quietly destroys condenser vacuum. Intermittent or continuous low-level chlorination keeps tubes clean; dosing is controlled to a small free-residual chlorine so the cooling-water discharge stays within environmental limits.",
  "live":{"CW flow":"cwM3h","Condenser vacuum":"vacuumKgcm2g"}},

 {"start":"IMG_20260606_120008.jpg","end":"IMG_20260606_120633.jpg","zone":"chlorination",
  "component":"Electrochlorination plant — cells, dosing & control",
  "what":"The electrochlorination building: brine/electrolyser vessels, hypochlorite storage and dosing pumps, and control panels with gauges and a chlorine pressure regulator.",
  "does":"Makes sodium hypochlorite on-site by electrolysing salt water, then doses it into the CW system. On-site generation avoids storing hazardous chlorine gas while still controlling biofouling.",
  "insight":"Electrochlorination: 2NaCl + 2H₂O → NaOCl + H₂ + NaCl by passing DC through brine. The by-product hydrogen must be safely vented. Dosing is interlocked to CW flow so biocide is only added when water is circulating.",
  "live":{"CW flow":"cwM3h"}},

 {"start":"IMG_20260606_121407.jpg","end":"IMG_20260606_121407.jpg","zone":"overview",
  "component":"Raw-water reservoir & 400 kV transmission",
  "what":"The plant's raw-water source — a reservoir/canal — with a 400 kV transmission tower and lines crossing in the foreground.",
  "does":"Two lifelines in one frame: the water that cools the condenser and makes up cycle losses, and the high-voltage lines that carry the generated power away to the national grid.",
  "insight":"A thermal plant is bounded by two flows — water in (cooling + make-up) and power out. Singrauli draws from the Rihand/Govind Ballabh Pant Sagar reservoir; generator output is stepped up to 400 kV for low-loss long-distance transmission.",
  "live":{"Net to grid":"netMW","CW inlet temp":"cwInlet"}},

 # ── Videos (handled by the same range mechanism; 2d viewer plays .mp4) ──────
 {"start":"video_20260601_113027.mp4","end":"video_20260601_113041.mp4","zone":"coal",
  "component":"Coal conveyor gallery (video)",
  "what":"Walk-through video inside an enclosed coal conveyor gallery of the Coal Handling Plant.",
  "does":"Shows the moving belt carrying crushed coal between transfer points toward the bunkers — the continuous fuel supply line of the unit.",
  "insight":"Watch the belt speed and loading: CHP belts are interlocked in start/stop sequence so coal never spills at a stopped chute. Dust suppression and belt alignment are constant housekeeping tasks.",
  "live":{"Coal firing":"coalTh"}},

 {"start":"video_20260606_102502.mp4","end":"video_20260606_102502.mp4","zone":"auxiliary",
  "component":"Air compressor house (video)",
  "what":"Walk-through video of the reciprocating air compressors in the compressor house.",
  "does":"Shows the running instrument/service air compressors that supply control-valve and tool air across the plant.",
  "insight":"Listen for the load/unload cycling — compressors run to a pressure band; dryers and receivers downstream keep instrument air clean, dry and available even if one compressor stops.",
  "live":{}},
]


def assign(fname):
    for g in GROUPS:
        if g["start"] <= fname <= g["end"]:
            return g
    return None


def main():
    files = sorted(
        f.name for f in PHOTO_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".mp4")
    )

    catalog = []
    zone_photos = {z: [] for z in ZONES}
    unclassified = []

    for f in files:
        g = assign(f)
        if g is None:
            zone = "unclassified"
            entry = {
                "file": f, "zone": zone,
                "component": "Awaiting analysis",
                "what_is_this": "This photo was uploaded after the last analysis pass and has not been identified yet.",
                "what_it_does": "Add a group covering this filename in build_catalog.py (GROUPS), then re-run the script.",
                "engineering_insight": "",
                "live_variables": {},
                "hotspots": [],
            }
            unclassified.append(f)
        else:
            zone = g["zone"]
            entry = {
                "file": f, "zone": zone,
                "component": g["component"],
                "what_is_this": g["what"],
                "what_it_does": g["does"],
                "engineering_insight": g["insight"],
                "live_variables": g.get("live", {}),
                "hotspots": g.get("hot", {}).get(f, []),
            }
        catalog.append(entry)
        zone_photos[zone].append({"file": f, "component": entry["component"]})

    # heroes: first photo with hotspots in a zone, else first photo
    heroes = {}
    for z in ZONES:
        hero = None
        for p in zone_photos[z]:
            meta = next((c for c in catalog if c["file"] == p["file"]), {})
            if meta.get("hotspots"):
                hero = p["file"]; break
        heroes[z] = hero or (zone_photos[z][0]["file"] if zone_photos[z] else None)

    manifest = {
        "total": len(files),
        "totalPhotos": sum(1 for f in files if not f.lower().endswith(".mp4")),
        "totalVideos": sum(1 for f in files if f.lower().endswith(".mp4")),
        "zoneCount": sum(1 for z in ZONES if z != "unclassified" and zone_photos[z]),
        "zones": ZONES,
        "heroes": heroes,
        "photos": zone_photos,
        "catalog": catalog,
    }

    data = json.dumps(manifest, indent=2, ensure_ascii=False)
    OUT.write_text(data)
    OUT_2D.write_text(data)
    OUT_CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False))

    print(f"Wrote manifest — {len(files)} files ({manifest['totalPhotos']} photos, {manifest['totalVideos']} videos)")
    for z in ZONES:
        if zone_photos[z]:
            print(f"  {z:14s}: {len(zone_photos[z])}")
    if unclassified:
        print(f"\n⚠ {len(unclassified)} files awaiting analysis (zone=unclassified):")
        for f in unclassified:
            print(f"    {f}")
    else:
        print("\n✓ Every file is identified.")


if __name__ == "__main__":
    main()
