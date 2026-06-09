#!/usr/bin/env python3
"""Enrich manifest.json and photo_catalog.json with detailed engineering descriptions and live simulator links."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RANGES_FILE = ROOT / "photo_ranges.json"
OUT_MANIFEST = ROOT / "manifest.json"
OUT_MANIFEST_2D = ROOT / "2d" / "manifest.json"
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

# Rich engineering details for the 31 unique components
COMPONENT_DETAILS = {
    "400 kV switchyard & transmission lines": {
        "what_is_this": "A 400 kV high-voltage outdoor electrical switchyard consisting of busbars, circuit breakers, disconnect switches, current transformers (CTs), potential transformers (PTs), and lightning arrestors.",
        "what_it_does": "Steps up the generator terminal voltage (~21 kV) to 400 kV via the Generator Transformer (GT) to export bulk electrical power into the national grid with minimum transmission lines losses ($I^2R$). It also protects the plant against grid faults.",
        "engineering_insight": "Transmission losses are inversely proportional to the square of voltage. Stater output of ~500 MW at 21 kV is ~13.7 kA. Stepping up to 400 kV reduces line current to ~720 A, lowering $I^2R$ copper losses by a factor of 360. Circuit breakers use Sulfur Hexafluoride ($SF_6$) gas for arc quenching.",
        "live_variables": {"Net Export": "netMW", "Frequency": "freq"}
    },
    "Boiler basics reference (200 MW vs 500 MW diagram)": {
        "what_is_this": "Technical comparison layout and process schematic contrasting a subcritical 200 MW Drum Boiler with a 500 MW Drum Boiler system.",
        "what_it_does": "Illustrates natural vs. controlled circulation, flue gas paths, superheater (SH), reheater (RH), and economiser (Eco) surface area distributions required for scale.",
        "engineering_insight": "A 200 MW boiler operates typically at 130-150 kg/cm² steam pressure. A 500 MW drum boiler operates at subcritical ~170 kg/cm² drum pressure and uses assisted/controlled circulation pump loops to maintain proper circulation ratio and avoid Departure from Nucleate Boiling (DNB) in the waterwall tubes.",
        "live_variables": {"Main Steam Temp": "msT", "Main Steam Flow": "steamTh"}
    },
    "Boiler draught & mill notes (PA/FD/ID/APH)": {
        "what_is_this": "Operational blueprints and engineering sketches describing the air and flue gas paths (Balanced Draught System) and the coal mill air supplies.",
        "what_it_does": "Explains how the Primary Air (PA) fan transports coal dust, the Forced Draft (FD) fan supplies combustion air, and the Induced Draft (ID) fan extracts flue gas, maintaining a slightly negative pressure in the furnace.",
        "engineering_insight": "Balanced draught operates with a furnace pressure setpoint of -5 to -10 mm of Water Column (WC) to prevent hot gas leakage. Air Preheaters (APH) transfer waste heat from flue gases to incoming PA and FD streams, saving ~1% fuel consumption for every 20°C flue gas temp drop.",
        "live_variables": {"Flue Gas Temp": "flueT", "Boiler Efficiency": "boilerEff"}
    },
    "Boiler house exterior & pipe rack": {
        "what_is_this": "The structural steel framework housing the boiler boiler columns, main steam line hangers, feed-water piping, and interconnecting pipe racks.",
        "what_it_does": "Provides structural support for the suspended boiler drum, waterwalls, and heavy superheater assemblies, allowing for downward thermal expansion of up to 150-200 mm when heating from ambient to 540°C.",
        "engineering_insight": "High-temperature steam piping is suspended from Constant Load Hangers. Steam lines are made of alloy steel (e.g., SA335 P22 or P91 containing Chromium and Molybdenum) to resist mechanical creep and high-temperature oxidation at 540°C.",
        "live_variables": {"Main Steam Temp": "msT", "Steam Flow": "steamTh"}
    },
    "Boiler house walkways & furnace area": {
        "what_is_this": "Walkways and platforms around the furnace walls, burner zones, sootblowers, and inspection ports (peep-holes).",
        "what_it_does": "Provides access for physical monitoring of burner flames, operations of wall sootblowers (using steam to clean ash deposits), and maintenance of instrumentation fittings.",
        "engineering_insight": "Waterwall tubes form the furnace enclosure and absorb radiant heat from the combustion fireball. Wall soot blowing is critical to prevent slagging; ash build-up acts as an insulator, reducing heat transfer, raising flue gas temperature, and decreasing boiler efficiency.",
        "live_variables": {"Furnace Flame Temp": "furnaceTemp", "Boiler Efficiency": "boilerEff"}
    },
    "CW intake forebay, travelling screens & gantry crane": {
        "what_is_this": "The Circulating Water (CW) intake channel forebay equipped with trash racks, automated travelling water screens, and a gantry crane.",
        "what_it_does": "Filters raw water drawn from the reservoir (e.g., Rihand reservoir) to remove debris, algae, and fish, preventing clogging of condenser tubes and cooling water pumps.",
        "engineering_insight": "The cooling water flow rate for a 500 MW unit is approx. 50,000 to 60,000 m³/h. Any blockage in the intake screens drops pump suction head, causing cavitation and high vibration in the massive vertical CW pumps.",
        "live_variables": {"CW Flow": "cwM3h", "CW Inlet Temp": "cwInlet"}
    },
    "Chimney base, ESP hoppers & cable galleries": {
        "what_is_this": "The foundation base of the concrete chimney, Electrostatic Precipitator (ESP) ash collection hoppers, and underground electrical cable galleries.",
        "what_it_does": "Supports structural loads of the stack, collects ash removed from flue gases by the ESP, and houses control/power cables supplying auxiliary systems.",
        "engineering_insight": "ESP hoppers must be kept heated (using hopper heaters) to prevent ash from moisture-clumping, which blocks the pneumatic fly ash handling system. The chimney base houses the steel flues which discharge gas at high velocity (~20-25 m/s) to ensure dispersion.",
        "live_variables": {"Ash Collection Rate": "ashTh", "ESP Pressure Drop": "espDp"}
    },
    "Chimney, ESP ducting & DM storage tank overview": {
        "what_is_this": "Visual layout of the 275-meter high multi-flue chimney, Electrostatic Precipitator (ESP) casing, flue gas ducting, and Demineralised (DM) water storage tanks.",
        "what_it_does": "Disperses cleaned flue gas high into the atmosphere, routes flue gas from the air preheater to the ESP, and stores ultra-pure water needed to make up steam cycle losses.",
        "engineering_insight": "Stack height is determined by environmental regulations to disperse $SO_2$ and $NO_x$ pollutants. DM tanks store water with conductivity < 0.1 micro-Siemens/cm. Any contamination in DM water leads to scale deposition inside the boiler tubes, causing overheating and rupture.",
        "live_variables": {"Flue Gas Flow": "flueNm3h", "Net Unit Output": "netMW"}
    },
    "Chlorinator units & CW chemical dosing": {
        "what_is_this": "Electrochlorination plant consisting of electrolysis cells, brine mixing systems, and sodium hypochlorite ($NaOCl$) dosing pumps.",
        "what_it_does": "Generates chlorine on-site from salt water and injects it into the cooling water system to prevent microbiological growth (algae and bio-slime) inside condenser tubes.",
        "engineering_insight": "A bio-film of just 0.1 mm thickness on the inside of condenser tubes reduces heat transfer coefficient by 30-40%. This impairs condenser vacuum, raising turbine exhaust backpressure and increasing unit heat rate (burning more coal per kWh).",
        "live_variables": {"CW Flow": "cwM3h", "Condenser Vacuum": "vacuumKgcm2g"}
    },
    "Coal bunker bay & boiler house approach": {
        "what_is_this": "The elevated structural bay housing the coal bunkers and gravity chutes, located adjacent to the boiler house.",
        "what_it_does": "Stores raw crushed coal (typically 12 to 24 hours of storage capacity) to ensure continuous fuel supply to the coal pulverizers (mills) regardless of stockyard conveyor operations.",
        "engineering_insight": "Coal flows from bunkers via gravity through raw coal feeders. Feeders use load cells to measure and control the mass flow rate of coal (t/h) entering the mills based on combustion demand from the DCS.",
        "live_variables": {"Coal Feed Rate": "coalTh", "Unit Load": "load"}
    },
    "Coal bunkers & tripper floor": {
        "what_is_this": "The top-most level of the bunker house (tripper floor) equipped with a travelling conveyor tripper assembly and raw coal storage bunkers.",
        "what_it_does": "Distributes incoming crushed coal from the stockyard conveyors into individual bunkers above the mills.",
        "engineering_insight": "Coal dust accumulation on the tripper floor represents a severe dust explosion hazard. Continuous dust extraction systems and explosion vent panels on the bunkers are installed to mitigate this risk. Coal level is monitored via ultrasonic level sensors.",
        "live_variables": {"Coal Flow": "coalTh", "Unit Load": "load"}
    },
    "Coal conveyor gallery (CHP)": {
        "what_is_this": "The elevated steel truss structure enclosing belt conveyors, dust suppression sprays, and emergency pull-chord switches.",
        "what_it_does": "Transports crushed coal from the Coal Handling Plant (CHP) crushers up to the bunker house at rates of 1000-1500 tons per hour.",
        "engineering_insight": "Conveyors run at speeds of 2.5 to 4.0 m/s. They are equipped with magnetic separators to remove tramp iron, and metal detectors. Interlocks stop upstream conveyors if a downstream belt trips to prevent massive spillage.",
        "live_variables": {"Coal Feed Rate": "coalTh"}
    },
    "Coal pulverizer (mill) bay & PF piping": {
        "what_is_this": "The ground-level bay housing coal pulverizers (mills) and the Pulverised Fuel (PF) piping routed to the furnace corners.",
        "what_it_does": "Grinds coal to a fine powder (70% passing through a 200-mesh sieve) and transports it using hot primary air through PF pipes to the burners.",
        "engineering_insight": "PF pipes are lined with basalt or ceramic to resist the severe abrasive wear of moving coal dust. Equal flow distribution in all PF pipes is critical to prevent localized reducing atmospheres in the furnace, which causes waterwall corrosion.",
        "live_variables": {"Coal Flow": "coalTh", "Primary Air Flow": "airKgh"}
    },
    "Coal stockyard, stacker-reclaimer & conveyors": {
        "what_is_this": "The raw coal yard equipped with bucket-wheel stacker-reclaimers and longitudinal yard conveyors.",
        "what_it_does": "Receives raw coal from coal mines (via Merry-Go-Round rail system), stacks it in piles, and reclaims it to feed the CHP crushers when rail supply is idle.",
        "engineering_insight": "Coal yards must manage spontaneous combustion in low-GCV high-moisture Indian coal. Water sprinklers are run to keep coal temperature below 60°C. Stacker-reclaimers use slewing and luffing mechanisms to automate stacking and reclaiming.",
        "live_variables": {"GCV Input": "gcv", "Coal Flow": "coalTh"}
    },
    "Condensate extraction pumps (CEP) & green CW piping": {
        "what_is_this": "Condensate Extraction Pumps (vertical multistage centrifugal design) located in the turbine basement, alongside the large green Circulating Water (CW) pipelines.",
        "what_it_does": "Pumps condensed water from the condenser hotwell through Low Pressure (LP) heaters to the deaerator, overcoming the deep condenser vacuum.",
        "engineering_insight": "Because CEPs draw water under vacuum, they operate close to Net Positive Suction Head Required ($NPSH_R$). To prevent cavitation, they are installed inside suction cans (barrels) sunk into the basement floor, increasing static head.",
        "live_variables": {"Condenser Duty": "condDuty", "CW Flow": "cwM3h"}
    },
    "ESP Pass-A & flue gas ducting": {
        "what_is_this": "An Electrostatic Precipitator (ESP) pass casing containing discharge electrodes, collecting plates, and mechanical rapping hammers.",
        "what_it_does": "Removes fly ash particles from the flue gas by applying a high-voltage DC charge (typically 50-70 kV) to the dust, pulling it onto collecting plates.",
        "engineering_insight": "ESP collection efficiency is >99.9%. Clean air laws require outlet dust concentration < 30 mg/Nm³. Proper rapping frequency is critical; rapping too often causes ash re-entrainment in the gas stream, while rapping too infrequently causes ash build-up and electrical corona quenching.",
        "live_variables": {"PM Outlet": "pmOutMg", "Flue Gas Flow": "flueNm3h"}
    },
    "FGD DCS screens (wet ball mill, gypsum bleed)": {
        "what_is_this": "Flue Gas Desulphurisation (FGD) operator workstation screens showing flow diagrams of the limestone wet ball mill grinding circuit and the gypsum dewatering system.",
        "what_it_does": "Controls the preparation of limestone slurry (absorbent) and monitoring the filtration of gypsum slurry (by-product) using vacuum belt filters.",
        "engineering_insight": "Limestone slurry density is maintained at ~1160-1200 kg/m³. If the slurry is too diluted, scrubbing efficiency drops. If too dense, piping blockages occur. Gypsum moisture must be kept under 10% for commercial utilization.",
        "live_variables": {"SO2 Out": "so2OutMg", "Gypsum Produced": "gypsumTh"}
    },
    "FGD absorber tower & gypsum vacuum belt filter": {
        "what_is_this": "The FGD spray tower (absorber) and the gypsum dewatering vacuum belt filter unit.",
        "what_it_does": "Sprays limestone slurry into the flue gas to absorb sulfur dioxide ($SO_2$), converting it to calcium sulfite, which is oxidized to gypsum ($CaSO_4 \cdot 2H_2O$) and filtered to remove water.",
        "engineering_insight": "Reaction equation: $CaCO_3 (aq) + SO_2 (g) + 0.5O_2 (g) + 2H_2O (l) \rightarrow CaSO_4 \cdot 2H_2O (s) + CO_2 (g)$. A liquid-to-gas (L/G) ratio of 10-15 L/m³ is maintained. The resulting gypsum is sold to cement and drywall manufacturers.",
        "live_variables": {"SO2 In": "so2RawMg", "SO2 Out": "so2OutMg", "Gypsum Flow": "gypsumTh"}
    },
    "FGD limestone handling MCC (415 V)": {
        "what_is_this": "A 415 V Motor Control Center (MCC) panel housing switchgear, contactors, thermal overloads, and protection relays.",
        "what_it_does": "Distributes electrical power to low-voltage auxiliary motors in the FGD plant, such as limestone slurry pumps, agitators, and conveyor drives.",
        "engineering_insight": "Low-voltage motors (typically < 160 kW) are fed from 415 V MCCs. High-power auxiliaries (like BFP and ID fans) are fed directly from Medium Voltage (6.6 kV or 11 kV) switchgear. Thermal protection protects motor windings against overload overheating.",
        "live_variables": {"Aux Power": "auxMW", "Unit Load": "load"}
    },
    "FGD process notes (handwritten)": {
        "what_is_this": "Engineering notes and process flow design parameters detailing wet limestone FGD chemical reactions, water balances, and stoichiometry calculations.",
        "what_it_does": "Provides operators and engineers with a quick reference for pH setpoints (typically 5.6 to 6.2) and liquid-to-gas ratio calculations.",
        "engineering_insight": "Absorber slurry pH must be strictly controlled. A low pH (<5.0) enhances limestone dissolution but reduces $SO_2$ absorption efficiency. A high pH (>6.2) increases absorption but causes scaling of calcium sulfite, clogging the spray nozzles.",
        "live_variables": {"SO2 In": "so2RawMg", "SO2 Out": "so2OutMg"}
    },
    "Field instruments & ILMS switchgear": {
        "what_is_this": "Field transmitters (pressure, temperature, flow), junction boxes, and Interlocking Logic Control Switchgear.",
        "what_it_does": "Measures physical process values in the field and transmits 4-20mA signals to the DCS. The switchgear executes safety interlocks to trip equipment in unsafe conditions.",
        "engineering_insight": "Transmitters utilize the 4-20 mA DC current loop standard, which is highly immune to electrical noise from high-voltage motors. Safety systems use 2-out-of-3 (2oo3) voting logic for critical trip parameters (e.g., very low drum level) to prevent false trips.",
        "live_variables": {"Unit Load": "load", "Main Steam Pressure": "msP"}
    },
    "Induced Draft (ID) fan & flue gas duct": {
        "what_is_this": "A large radial Induced Draft (ID) fan driven by a high-voltage motor, located between the ESP outlet and the stack inlet.",
        "what_it_does": "Sucks the flue gas out of the boiler furnace through the ESP and FGD, overcoming the pressure drops of the heat exchangers and gas scrubbers, maintaining negative draft in the furnace.",
        "engineering_insight": "The ID fan handles massive volumes of hot gas. Its power consumption increases with flue gas volume (load). Variable Frequency Drives (VFDs) or inlet guide vanes are used to regulate fan flow efficiently, saving huge auxiliary energy.",
        "live_variables": {"Flue Gas Flow": "flueNm3h", "Aux Power": "auxMW"}
    },
    "Instrument/service air compressors": {
        "what_is_this": "Reciprocating or screw-type air compressors, air dryers, and air receiver tanks.",
        "what_it_does": "Supplies clean, dry, oil-free compressed air at ~7 kg/cm² for pneumatic control valves, sootblowers, and general plant cleaning.",
        "engineering_insight": "Instrument air must be dried to a dewpoint of -40°C using adsorption desiccant dryers. Moisture in control air will corrode pneumatic actuator cylinders and freeze up positioners, leading to loss of plant control.",
        "live_variables": {"Aux Power": "auxMW", "Unit Load": "load"}
    },
    "Main entrance gate & plant skyline": {
        "what_is_this": "Wide view showing the main entrance gate of NTPC Singrauli, cooling towers, stacks, and coal conveyor galleries.",
        "what_it_does": "Acts as the physical security perimeter and entry checkpoint for the plant personnel and materials.",
        "engineering_insight": "Singrauli Super Thermal Power Station is NTPC's first power plant, commissioned in 1982. Stage-II consists of two 500 MW units which utilize subcritical drum boilers and steam turbines generating electricity at 50 Hz.",
        "live_variables": {"Net Export": "netMW", "Plant Load Factor": "plf"}
    },
    "Radiation source storage (level gauges)": {
        "what_is_this": "A concrete radiation source storage room containing heavily-shielded, lead-jacketed source containers (collimators) housing industrial-grade radioactive isotopes (principally Cesium-137 or Cobalt-60). These sources are temporarily kept here before being deployed to their operational mounting brackets in the field.",
        "what_it_does": "Provides safe, shielded storage for nucleonic level and density transmitters. In coal-fired stations, extremely harsh conditions (severe abrasion, dust, heat, and high vibration) inside coal bunkers, fly ash hoppers, and limestone slurry pipes quickly destroy contact-type sensor probes. Nucleonic gauges project a collimated beam of gamma rays from the source container through the vessel walls to a detector on the opposite side, enabling continuous, non-contact measurement.",
        "engineering_insight": "Nuclear parameters: Cesium-137 has a half-life of 30.17 years and decays via beta emission to Barium-137m, emitting 662 keV gamma rays. Cobalt-60 has a half-life of 5.27 years and emits two prompt gamma rays (1.17 MeV and 1.33 MeV). Gamma attenuation follows the Beer-Lambert law: $I = I_0 e^{-\\mu x}$ where $\\mu$ is the material linear attenuation coefficient and $x$ is the lead shield thickness. Shielding is designed to limit external dose rates to < 0.2 mR/h (2 micro-Sieverts/h). Facilities must comply strictly with AERB (Atomic Energy Regulatory Board) safety regulations, maintaining dual-lock supervision, warning signage, and regular area survey logs.",
        "live_variables": {"Aux Power": "auxMW"}
    },
    "Stage-II DMTP control room": {
        "what_is_this": "The control room and DCS consoles for the Stage-II Demineralised Water Treatment Plant (DMTP).",
        "what_it_does": "Monitors ion exchange beds (cation, anion, mixed bed), acid/alkali regeneration cycles, and pure water pumps.",
        "engineering_insight": "DM plant uses ion exchange resins to remove dissolved salts. Cation resins replace metal ions with $H^+$ ions, and anion resins replace anions with $OH^-$ ions, which combine to form pure $H_2O$. Resin beds must be regularly backwashed and regenerated with Hydrochloric Acid ($HCl$) and Sodium Hydroxide ($NaOH$).",
        "live_variables": {"Make-up Flow": "cwM3h", "Net Efficiency": "effNet"}
    },
    "Surface condenser notes (two-pass, hotwell, TTD)": {
        "what_is_this": "Technical design calculations and operational logs for the surface condenser, explaining cold-end performance variables.",
        "what_it_does": "Logs parameters such as Terminal Temperature Difference (TTD) and Sub-cooling, which indicate cooling efficiency and vacuum health.",
        "engineering_insight": "TTD = Saturation Temp of steam - CW Outlet Temp. A typical design TTD is 3°C to 5°C. A rising TTD indicates scaling or fouling of condenser tubes, reducing cooling capacity, dropping vacuum, and raising coal consumption.",
        "live_variables": {"Condenser Vacuum": "vacuumKgcm2g", "CW Delta T": "cwDeltaT", "Condenser Duty": "condDuty"}
    },
    "Turbine hall (insulated HP/IP) & instrument air receiver": {
        "what_is_this": "High-pressure (HP) and Intermediate-pressure (IP) steam turbine casings covered in thick thermal insulation, located in the main turbine hall alongside the instrument air receiver.",
        "what_it_does": "Converts thermal energy of high-temperature high-pressure steam into rotary kinetic energy. It spins the generator rotor at 3000 rpm.",
        "engineering_insight": "Steam enters the HP turbine at ~170 kg/cm² and 537°C. After expanding in the HP turbine, it is sent back to the boiler reheater to raise temperature back to 537°C before entering the IP turbine, which improves cycle efficiency by ~4-5%. Turbines are heavily insulated to prevent thermal stress and heat loss.",
        "live_variables": {"Shaft Power": "mechMW", "Turbine Speed": "rpm", "Cycle Efficiency": "cycleEff"}
    },
    "Unclassified — review photo_ranges.json": {
        "what_is_this": "General plant structures, storage areas, or interconnecting facilities.",
        "what_it_does": "Supports general plant operations and utilities.",
        "engineering_insight": "Unclassified areas include drainage sumps, fire water stations, auxiliary steam headers, and mechanical stores which support the main generation block.",
        "live_variables": {"Unit Load": "load"}
    },
    "Workshop & stores (valves, turbine spares, motor overhaul)": {
        "what_is_this": "Central mechanical workshop housing lathes, welding bays, valve test benches, and spare parts store (turbine blades, motor windings).",
        "what_it_does": "Allows on-site repair and overhauling of critical plant equipment to minimize unit downtime during planned or forced outages.",
        "engineering_insight": "Valves undergo hydrostatic testing on benches to verify seat tightness before installation. Overhauled motor windings are dried in ovens and checked for insulation resistance (megger test) to ensure winding safety.",
        "live_variables": {"Aux Power": "auxMW"}
    },
    "XRP/BBD bowl mills & raw coal feeders": {
        "what_is_this": "The medium-speed vertical bowl mills (XRP type) and volumetric raw coal feeders located below the bunker floor.",
        "what_it_does": "Grinds raw lump coal into fine dust between a rotating bowl and stationary grinding rollers, drying it with hot primary air and feeding it to the furnace.",
        "engineering_insight": "Bowl mills operate with a grinding pressure exerted by heavy spring or hydraulic assemblies. Primary air sweeps the mill; classifier vanes reject coarse particles back to the bowl, ensuring only fine pulverised coal enters the furnace to prevent unburnt carbon losses.",
        "live_variables": {"Coal Flow": "coalTh", "Primary Air Flow": "airKgh"}
    }
}

def main():
    # Load ranges
    if not RANGES_FILE.exists():
        print(f"Ranges file not found at {RANGES_FILE}")
        return
        
    with open(RANGES_FILE) as f:
        range_data = json.load(f)
        
    ranges = range_data["ranges"]
    overrides = range_data.get("overrides", {})
    
    # We will list files in public/photos to find the files actually available
    photos_dir = ROOT / "public" / "photos"
    if not photos_dir.exists():
        print(f"Optimized photos directory not found at {photos_dir}. Running fallback on old manifest list...")
        # If the compress script is still running, let's load filenames from the old manifest
        with open(ROOT / "photo_catalog.json") as f:
            old_catalog = json.load(f)
            files = sorted(list(set(item["file"] for item in old_catalog)))
    else:
        files = sorted(
            f.name for f in photos_dir.iterdir()
            if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov")
        )
        
    print(f"Found {len(files)} compressed image files in public/photos")
    
    def in_range(fname, start, end):
        return start <= fname <= end

    def assign_photo(fname):
        if fname in overrides:
            o = overrides[fname]
            return o["zone"], o.get("component", "")
        for r in ranges:
            if in_range(fname, r["start"], r["end"]):
                return r["zone"], r.get("component", "")
        return "auxiliary", "Unclassified — review photo_ranges.json"
        
    catalog = []
    zone_photos = {z: [] for z in ZONES}
    seen = {z: set() for z in ZONES}
    
    for f in files:
        zone, component = assign_photo(f)
        
        # Look up engineering details
        details = COMPONENT_DETAILS.get(component, {
            "what_is_this": "General plant component details.",
            "what_it_does": "Part of the power plant thermal cycle operations.",
            "engineering_insight": "Provides support to the 500 MW subcritical generation system.",
            "live_variables": {"Unit Load": "load"}
        })
        
        entry = {
            "file": f,
            "zone": zone,
            "component": component,
            "what_is_this": details["what_is_this"],
            "what_it_does": details["what_it_does"],
            "engineering_insight": details["engineering_insight"],
            "live_variables": details["live_variables"]
        }
        catalog.append(entry)
        
        if zone not in zone_photos:
            zone = "auxiliary"
            
        if f not in seen[zone]:
            zone_photos[zone].append({
                "file": f,
                "component": component,
                "what_is_this": details["what_is_this"],
                "what_it_does": details["what_it_does"],
                "engineering_insight": details["engineering_insight"],
                "live_variables": details["live_variables"]
            })
            seen[zone].add(f)
            
    # Set up heroes
    heroes = {}
    for z in ZONES:
        if zone_photos[z]:
            heroes[z] = zone_photos[z][0]["file"]
        else:
            heroes[z] = None
            
    manifest = {
        "total": len(files),
        "zones": ZONES,
        "heroes": heroes,
        "photos": zone_photos,
        "catalog": catalog,
    }
    
    # Write files
    with open(OUT_MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2)
        
    with open(OUT_MANIFEST_2D, "w") as f:
        json.dump(manifest, f, indent=2)
        
    with open(OUT_CATALOG, "w") as f:
        json.dump(catalog, f, indent=2)
        
    print(f"Successfully wrote {OUT_MANIFEST} with {len(files)} enriched photos.")
    for z in ZONES:
        print(f"  {z}: {len(zone_photos[z])} photos")

if __name__ == "__main__":
    main()
