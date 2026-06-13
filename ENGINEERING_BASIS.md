# Engineering Basis

This simulation represents one 500 MW NTPC Singrauli Stage-II unit. The 3D
arrangement is schematic rather than a survey-accurate site model, but equipment
order, operating paths, unit parameters, and station-specific utilities follow
the sources below.

## Singrauli Stage-II Facts

- Configuration: Stage-II has 2 x 500 MW units.
- Coal source: Jayant and Bina mines, transported by MGR/rail.
- Water source: Rihand Reservoir.
- Cooling system: open-cycle / once-through for Stage-I and Stage-II.
- Boiler: BHEL controlled-circulation, tilting tangential firing.
- Turbine inlet: 170 kg/cm2 and 537 C.
- Main feed pumps: steam-driven TDBFPs with MDBFP support.
- Stage-II design gross heat rate: 2281 kcal/kWh.

## Modelled Operating Paths

1. Fuel: mine railway -> track hopper / CHP -> bunker -> mill -> furnace.
2. Air and flue gas: FD/PA fans -> APH -> furnace -> rear pass -> APH -> ESP
   -> ID fan -> FGD retrofit/bypass -> stack.
3. Steam and feedwater: condenser -> CEP -> LP heaters -> deaerator -> BFP ->
   HP heaters -> economizer -> drum/waterwalls -> superheater -> HP turbine ->
   reheater -> IP/LP turbine -> condenser.
4. Cooling water: Rihand intake -> CW pumps -> condenser -> hot-water discharge.
5. Electrical: generator -> isolated-phase bus -> generator transformer ->
   400 kV switchyard; the UAT branches to station auxiliaries.
6. Ash: bottom ash to slurry system and offsite dyke; ESP fly ash to silos.

The FGD is explicitly presented as a retrofit/bypass path because this model does
not assert a current commissioning status for the Stage-II retrofit.

## Sources

- NTPC Singrauli station facts:
  https://ntpc.co.in/singrauli
- CERC Singrauli O&M data and Stage-II technical parameters:
  https://cercind.gov.in/2024/draft_reg/O%26M_data/NTPC/Singrauli%20Final.pdf
- NTPC Stage-III environmental clearance, confirming Stage-I/II once-through
  cooling:
  https://ntpc.co.in/sites/default/files/inline-files/2x800-MW-Stage-III-EC-Singrauli.pdf
- NTPC technical specification describing APH -> ESP -> ID fan order:
  https://ntpctender.ntpc.co.in/uploads/tech_job_15784.html
