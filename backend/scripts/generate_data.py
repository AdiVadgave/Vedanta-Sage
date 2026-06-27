"""Synthetic data generator for the Sage Safety Agents demo.

Produces realistic, Vedanta-style safety content under backend/data/:
  - sops/*.md            : Standard Operating Procedures (knowledge corpus)
  - risk_assessments/*.md: Job Safety Analyses
  - critical_controls.json
  - standards.json       : standards registry (drives "Standards Watch")
  - incidents.csv        : ~120 incidents with seeded recurring clusters
  - near_misses.csv      : ~80 near misses
  - inspections.csv      : equipment time-series for predictive maintenance

Deterministic: fixed RNG seed so every run yields identical data.
Run:  python scripts/generate_data.py
"""
from __future__ import annotations

import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 42
random.seed(SEED)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SOP_DIR = DATA_DIR / "sops"
RA_DIR = DATA_DIR / "risk_assessments"

SITES = [
    "Jharsuguda Smelter",
    "Lanjigarh Refinery",
    "BALCO Korba",
    "Chanderiya Zinc",
    "Rampura Agucha Mine",
    "Debari Zinc",
]
AREAS = [
    "Pot Room",
    "Cast House",
    "Alumina Refinery",
    "Power Plant",
    "Crusher Plant",
    "Hydrometallurgy",
    "Material Handling",
    "Maintenance Workshop",
]

# ─────────────────────────────────────────────────────────────────────────────
# Standards registry  (some SOP-referenced versions are intentionally stale)
# ─────────────────────────────────────────────────────────────────────────────
STANDARDS = [
    {"code": "OSHA 1910.147", "title": "The Control of Hazardous Energy (Lockout/Tagout)", "current_version": "2023", "authority": "OSHA"},
    {"code": "IS 3764", "title": "Code of Safety for Excavation & Confined Space Work", "current_version": "2024", "authority": "BIS"},
    {"code": "ANSI Z359", "title": "Fall Protection Code", "current_version": "2023", "authority": "ANSI"},
    {"code": "IS 13367", "title": "Safe Use of Cranes - Code of Practice", "current_version": "2024", "authority": "BIS"},
    {"code": "IS 5216", "title": "Recommendations on Safety Procedures - Electrical Work", "current_version": "2023", "authority": "BIS"},
    {"code": "ICMM CCM", "title": "Critical Control Management - Good Practice Guide", "current_version": "2024", "authority": "ICMM"},
    {"code": "IS 4081", "title": "Safety Code for Blasting & Related Drilling Operations", "current_version": "2022", "authority": "BIS"},
]

# ─────────────────────────────────────────────────────────────────────────────
# SOP definitions  (referenced_version may lag current_version => "stale")
# ─────────────────────────────────────────────────────────────────────────────
SOPS = [
    {
        "id": "SOP-LOTO-001",
        "title": "Lockout-Tagout (Control of Hazardous Energy)",
        "standard": "OSHA 1910.147",
        "referenced_version": "2019",  # STALE (current 2023)
        "owner": "Electrical & Maintenance HSE",
        "hazard": "Unexpected energisation or release of stored energy during servicing.",
        "controls": [
            "Identify all energy sources (electrical, hydraulic, pneumatic, thermal, gravity).",
            "Notify affected personnel before isolation.",
            "Shut down equipment using normal stopping procedure.",
            "Isolate every energy source at the disconnect point.",
            "Apply individual locks and durable tags; each worker applies their own lock.",
            "Release / restrain all stored energy (bleed pressure, block elevated parts).",
            "Verify zero-energy state by attempting a start (try-out) before work begins.",
        ],
        "steps": [
            "Obtain a work permit and review the equipment-specific isolation plan.",
            "Announce shutdown to all affected personnel.",
            "De-energise via the normal stop sequence.",
            "Lock and tag each isolation point individually.",
            "Dissipate residual / stored energy.",
            "Test for zero energy (try-to-start, gauge readings at zero).",
            "Perform the maintenance task.",
            "Remove locks only after confirming all personnel are clear; restore energy.",
        ],
        "ppe": ["Insulated gloves", "Arc-flash suit (electrical)", "Safety helmet", "Safety footwear"],
    },
    {
        "id": "SOP-CSE-002",
        "title": "Confined Space Entry",
        "standard": "IS 3764",
        "referenced_version": "2024",  # current
        "owner": "Operations HSE",
        "hazard": "Oxygen deficiency, toxic/flammable atmosphere, engulfment, entrapment.",
        "controls": [
            "Valid confined space entry permit before every entry.",
            "Continuous atmospheric monitoring (O2, LEL, H2S, CO).",
            "Mechanical/forced ventilation maintained throughout entry.",
            "Trained standby attendant stationed at entry point at all times.",
            "Rescue plan and retrieval equipment available before entry.",
            "Isolation and blanking of all connected lines (LOTO applied).",
        ],
        "steps": [
            "Issue confined space entry permit and verify isolations (LOTO).",
            "Test atmosphere from outside; record O2 19.5-23.5%, LEL <10%.",
            "Start and confirm continuous ventilation.",
            "Station standby attendant; establish communication.",
            "Entrants log in; maintain continuous gas monitoring.",
            "Evacuate immediately on any alarm; do not attempt unplanned rescue.",
            "Log out all entrants and close the permit on completion.",
        ],
        "ppe": ["Full-body harness", "SCBA / airline respirator", "Gas detector", "Intrinsically-safe lighting"],
    },
    {
        "id": "SOP-WAH-003",
        "title": "Working at Height",
        "standard": "ANSI Z359",
        "referenced_version": "2020",  # STALE (current 2023)
        "owner": "Operations HSE",
        "hazard": "Fall from height, falling objects, structural collapse.",
        "controls": [
            "Work-at-height permit for any task above 1.8 m.",
            "100% tie-off using full-body harness and double lanyard.",
            "Certified anchor points rated for fall arrest.",
            "Edge protection / guardrails and toe boards in place.",
            "Exclusion zone barricaded below the work area.",
            "Inspection of harness and lanyard before each use.",
        ],
        "steps": [
            "Obtain work-at-height permit; verify scaffold/ladder inspection tag is valid.",
            "Inspect harness, lanyard, and anchor points.",
            "Barricade the area below and post warning signage.",
            "Anchor at or above shoulder height; maintain 100% tie-off.",
            "Use tool lanyards to prevent dropped objects.",
            "Stop work in adverse weather (wind > 40 km/h, lightning).",
        ],
        "ppe": ["Full-body harness", "Double lanyard with shock absorber", "Helmet with chin strap", "Non-slip footwear"],
    },
    {
        "id": "SOP-HMM-004",
        "title": "Hot Work & Molten Metal Handling",
        "standard": "ICMM CCM",
        "referenced_version": "2024",  # current
        "owner": "Smelter HSE",
        "hazard": "Burns, molten metal splash, fire, explosion from water contact.",
        "controls": [
            "Hot work permit and fire watch for all hot work.",
            "Strictly no moisture on tools, moulds, or launders contacting molten metal.",
            "Aluminised proximity suit and face shield in molten metal zones.",
            "Pre-heated tools only; verify tool dryness before contact.",
            "Fire extinguishers / Class D media available at the workface.",
            "Exclusion of non-essential personnel from the casting bay.",
        ],
        "steps": [
            "Issue hot work permit; assign trained fire watch.",
            "Inspect and pre-heat all tools contacting molten metal.",
            "Verify no water/moisture ingress paths near molten metal.",
            "Don aluminised proximity suit and face shield.",
            "Maintain exclusion zone during tapping/casting.",
            "Keep fire watch 30 minutes after hot work completion.",
        ],
        "ppe": ["Aluminised proximity suit", "Face shield + safety goggles", "Heat-resistant gloves", "Spats / leggings"],
    },
    {
        "id": "SOP-CRN-005",
        "title": "Crane & Lifting Operations",
        "standard": "IS 13367",
        "referenced_version": "2021",  # STALE (current 2024)
        "owner": "Material Handling HSE",
        "hazard": "Load drop, crane tip-over, struck-by, pinch points.",
        "controls": [
            "Lifting plan approved for all non-routine / critical lifts.",
            "Valid third-party test certificate for crane and tackle.",
            "Licensed crane operator and trained rigger/signaller.",
            "SWL never exceeded; load chart available in cab.",
            "Barricaded lift zone; no personnel under suspended load.",
            "Pre-use inspection of slings, shackles, and hooks.",
        ],
        "steps": [
            "Prepare and approve the lifting plan.",
            "Inspect crane, slings, shackles; verify SWL and test certs.",
            "Barricade the lift zone and brief the team.",
            "Use a single designated signaller.",
            "Lift smoothly; keep all personnel clear of the load path.",
            "Land and secure the load; stand down only when stable.",
        ],
        "ppe": ["Helmet", "Hi-vis vest", "Safety footwear", "Cut-resistant gloves"],
    },
    {
        "id": "SOP-ELE-006",
        "title": "Electrical Isolation & Live Work",
        "standard": "IS 5216",
        "referenced_version": "2023",  # current
        "owner": "Electrical HSE",
        "hazard": "Electric shock, arc flash, arc blast.",
        "controls": [
            "Permit-to-work and proven isolation before any electrical work.",
            "Test-before-touch with a proven voltage detector.",
            "Apply earthing/grounding after isolation.",
            "Arc-flash boundary established; appropriate PPE category worn.",
            "Only authorised, competent electrical persons perform the work.",
            "Live work prohibited except under a specific approved live-work permit.",
        ],
        "steps": [
            "Raise electrical permit-to-work; identify isolation points.",
            "Isolate, lock, and tag; discharge capacitive energy.",
            "Prove the voltage detector, test for dead, re-prove the detector.",
            "Apply earths where required.",
            "Establish arc-flash boundary; don PPE category per study.",
            "Carry out work; restore only after verifying clearance.",
        ],
        "ppe": ["Arc-flash suit (rated cal/cm2)", "Insulated gloves + protectors", "Face shield / hood", "Dielectric footwear"],
    },
    {
        "id": "SOP-MOB-007",
        "title": "Mobile Equipment & Vehicle Interaction",
        "standard": "ICMM CCM",
        "referenced_version": "2022",  # STALE (current 2024)
        "owner": "Mining HSE",
        "hazard": "Collision, run-over, struck-by mobile equipment.",
        "controls": [
            "Enforced pedestrian / vehicle segregation and walkways.",
            "Positive communication before approaching mobile equipment.",
            "Proximity detection / cameras fitted and functional.",
            "Seatbelt use and pre-start inspection for all mobile equipment.",
            "Speed limits and traffic management plan in force.",
            "Operator fatigue management and validity of operator license.",
        ],
        "steps": [
            "Complete pre-start inspection; report defects.",
            "Confirm pedestrian segregation and traffic plan.",
            "Establish positive communication before approach.",
            "Obey speed limits and right-of-way rules.",
            "Park safely, apply park brake, chock wheels on grade.",
        ],
        "ppe": ["Hi-vis clothing", "Helmet", "Safety footwear", "Hearing protection"],
    },
]


def _std_version(code: str) -> str:
    for s in STANDARDS:
        if s["code"] == code:
            return s["current_version"]
    return "?"


def write_sops() -> None:
    SOP_DIR.mkdir(parents=True, exist_ok=True)
    for sop in SOPS:
        controls = "\n".join(f"- {c}" for c in sop["controls"])
        steps = "\n".join(f"{i}. {s}" for i, s in enumerate(sop["steps"], 1))
        ppe = "\n".join(f"- {p}" for p in sop["ppe"])
        body = f"""# {sop['id']}: {sop['title']}

**Document Owner:** {sop['owner']}
**Referenced Standard:** {sop['standard']} (version {sop['referenced_version']})
**Classification:** Critical Safety Procedure

## 1. Purpose
This Standard Operating Procedure defines the mandatory controls for **{sop['title']}**
to protect personnel and assets across Vedanta operations.

## 2. Key Hazard
{sop['hazard']}

## 3. Critical Controls
{controls}

## 4. Procedure
{steps}

## 5. Personal Protective Equipment (PPE)
{ppe}

## 6. Emergency Response
In the event of an incident, stop work immediately, raise the alarm, and follow the
site Emergency Response Plan. Notify the Area HSE Officer and Shift In-charge.
"""
        (SOP_DIR / f"{sop['id']}.md").write_text(body, encoding="utf-8")
    print(f"  wrote {len(SOPS)} SOPs -> {SOP_DIR}")


def write_risk_assessments() -> None:
    RA_DIR.mkdir(parents=True, exist_ok=True)
    for sop in SOPS:
        rows = []
        for i, ctrl in enumerate(sop["controls"], 1):
            likelihood = random.choice(["Low", "Medium", "High"])
            severity = random.choice(["Major", "Critical", "Catastrophic"])
            rows.append(f"| {i} | {sop['hazard'][:40]}... | {likelihood} | {severity} | {ctrl} |")
        table = "\n".join(rows)
        body = f"""# JSA for {sop['title']} ({sop['id']})

**Linked SOP:** {sop['id']}
**Standard:** {sop['standard']}

| # | Hazard | Likelihood | Severity | Control Measure |
|---|--------|-----------|----------|-----------------|
{table}

**Residual Risk after controls:** Low (controls must be verified before task start).
"""
        (RA_DIR / f"JSA-{sop['id']}.md").write_text(body, encoding="utf-8")
    print(f"  wrote {len(SOPS)} risk assessments -> {RA_DIR}")


def write_critical_controls() -> None:
    cc = []
    for sop in SOPS:
        for ctrl in sop["controls"][:4]:
            cc.append(
                {
                    "control": ctrl,
                    "linked_sop": sop["id"],
                    "hazard": sop["hazard"],
                    "verification": random.choice(
                        [
                            "Permit audit",
                            "Field verification by supervisor",
                            "Pre-task checklist sign-off",
                            "Monthly critical-control assurance check",
                        ]
                    ),
                    "frequency": random.choice(["Per task", "Daily", "Per shift"]),
                }
            )
    (DATA_DIR / "critical_controls.json").write_text(
        json.dumps(cc, indent=2), encoding="utf-8"
    )
    print(f"  wrote {len(cc)} critical controls")


def write_standards() -> None:
    registry = []
    for s in STANDARDS:
        referencing = [
            {"sop": sop["id"], "title": sop["title"], "referenced_version": sop["referenced_version"]}
            for sop in SOPS
            if sop["standard"] == s["code"]
        ]
        registry.append({**s, "referencing_sops": referencing})
    (DATA_DIR / "standards.json").write_text(json.dumps(registry, indent=2), encoding="utf-8")
    print(f"  wrote standards registry ({len(registry)} standards)")


# ─────────────────────────────────────────────────────────────────────────────
# Incidents & near misses
# ─────────────────────────────────────────────────────────────────────────────
INCIDENT_TYPES = {
    "LOTO Bypass / Hazardous Energy": {
        "sop": "SOP-LOTO-001",
        "root_causes": ["Isolation not verified", "Lock not applied", "Stored energy not released"],
        "narratives": [
            "Technician began belt maintenance before confirming isolation; conveyor jogged unexpectedly.",
            "Lockout omitted on a second energy source; hydraulic ram drifted during service.",
            "Try-out step skipped; equipment energised while guard was open.",
        ],
    },
    "Fall from Height": {
        "sop": "SOP-WAH-003",
        "root_causes": ["Harness not anchored", "No edge protection", "Invalid scaffold tag"],
        "narratives": [
            "Worker un-clipped lanyard to reposition and lost balance near an open edge.",
            "Anchor point below shoulder height failed to arrest a short fall.",
            "Scaffold platform plank shifted; worker was not tied off.",
        ],
    },
    "Confined Space Exposure": {
        "sop": "SOP-CSE-002",
        "root_causes": ["Atmosphere not tested", "Ventilation stopped", "No standby attendant"],
        "narratives": [
            "Entrant felt dizzy; gas monitor showed low O2 after ventilation tripped.",
            "Entry made on an expired permit without re-testing atmosphere.",
        ],
    },
    "Molten Metal Burn": {
        "sop": "SOP-HMM-004",
        "root_causes": ["Moisture on tool", "Inadequate PPE", "Exclusion zone breached"],
        "narratives": [
            "Damp skimmer caused molten metal spatter during tapping.",
            "Operator entered casting bay without face shield during a pour.",
        ],
    },
    "Crane / Lifting Failure": {
        "sop": "SOP-CRN-005",
        "root_causes": ["SWL exceeded", "Defective sling", "Personnel under load"],
        "narratives": [
            "Frayed sling parted mid-lift; load dropped within barricaded zone.",
            "Rigger stood under a suspended load while guiding it by hand.",
        ],
    },
    "Electrical Shock / Arc Flash": {
        "sop": "SOP-ELE-006",
        "root_causes": ["Live work without permit", "No test-before-touch", "Earthing not applied"],
        "narratives": [
            "Panel assumed dead; arc flash occurred when test-before-touch was skipped.",
            "Capacitive energy not discharged; technician received a shock.",
        ],
    },
    "Vehicle / Mobile Equipment": {
        "sop": "SOP-MOB-007",
        "root_causes": ["No pedestrian segregation", "Blind spot", "Speeding"],
        "narratives": [
            "Pedestrian crossed a haul road outside the walkway near a reversing dumper.",
            "Forklift reversed without a spotter in a congested store.",
        ],
    },
    "Slip / Trip / Fall (same level)": {
        "sop": None,
        "root_causes": ["Housekeeping", "Oil spill", "Poor lighting"],
        "narratives": [
            "Worker slipped on an unmarked oil patch near a pump.",
            "Trip over cabling left across a walkway.",
        ],
    },
}

SEVERITIES = ["Near Miss", "First Aid", "Minor", "Serious", "High Potential"]


def _random_date(days_back: int = 540) -> date:
    start = date.today() - timedelta(days=days_back)
    return start + timedelta(days=random.randint(0, days_back))


def write_incidents() -> None:
    rows = []
    type_names = list(INCIDENT_TYPES.keys())

    # Seed deliberate recurring clusters so the Intelligence agent finds patterns.
    seeded = (
        [("LOTO Bypass / Hazardous Energy", "Pot Room", "Isolation not verified")] * 14
        + [("Fall from Height", "Maintenance Workshop", "Harness not anchored")] * 10
        + [("Molten Metal Burn", "Cast House", "Moisture on tool")] * 8
    )

    idx = 1
    for itype, area, rc in seeded:
        spec = INCIDENT_TYPES[itype]
        rows.append(
            {
                "incident_id": f"INC-{idx:04d}",
                "date": _random_date().isoformat(),
                "site": random.choice(SITES),
                "area": area,
                "type": itype,
                "severity": random.choices(SEVERITIES, weights=[1, 2, 3, 3, 2])[0],
                "equipment": random.choice(["Conveyor", "Crane", "Furnace", "Pump", "Panel", "Ladder", "Forklift"]),
                "root_cause": rc,
                "linked_sop": spec["sop"] or "",
                "narrative": random.choice(spec["narratives"]),
            }
        )
        idx += 1

    # Fill the rest with random spread.
    while idx <= 120:
        itype = random.choice(type_names)
        spec = INCIDENT_TYPES[itype]
        rows.append(
            {
                "incident_id": f"INC-{idx:04d}",
                "date": _random_date().isoformat(),
                "site": random.choice(SITES),
                "area": random.choice(AREAS),
                "type": itype,
                "severity": random.choices(SEVERITIES, weights=[3, 3, 3, 2, 1])[0],
                "equipment": random.choice(["Conveyor", "Crane", "Furnace", "Pump", "Panel", "Ladder", "Forklift", "Dumper"]),
                "root_cause": random.choice(spec["root_causes"]),
                "linked_sop": spec["sop"] or "",
                "narrative": random.choice(spec["narratives"]),
            }
        )
        idx += 1

    random.shuffle(rows)
    _write_csv(DATA_DIR / "incidents.csv", rows)
    print(f"  wrote {len(rows)} incidents")


def write_near_misses() -> None:
    rows = []
    type_names = list(INCIDENT_TYPES.keys())
    for i in range(1, 81):
        itype = random.choice(type_names)
        spec = INCIDENT_TYPES[itype]
        rows.append(
            {
                "nearmiss_id": f"NM-{i:04d}",
                "date": _random_date(365).isoformat(),
                "site": random.choice(SITES),
                "area": random.choice(AREAS),
                "type": itype,
                "potential_severity": random.choices(SEVERITIES, weights=[1, 1, 2, 3, 3])[0],
                "root_cause": random.choice(spec["root_causes"]),
                "linked_sop": spec["sop"] or "",
                "observation": random.choice(spec["narratives"]),
            }
        )
    _write_csv(DATA_DIR / "near_misses.csv", rows)
    print(f"  wrote {len(rows)} near misses")


# ─────────────────────────────────────────────────────────────────────────────
# Equipment inspections (predictive maintenance time-series)
# ─────────────────────────────────────────────────────────────────────────────
EQUIPMENT = [
    ("EQ-CRN-01", "Overhead Crane #1", "Cast House", "Jharsuguda Smelter"),
    ("EQ-CRN-02", "EOT Crane #2", "Material Handling", "BALCO Korba"),
    ("EQ-CNV-01", "Bauxite Conveyor BC-1", "Crusher Plant", "Lanjigarh Refinery"),
    ("EQ-CNV-02", "Coke Conveyor BC-7", "Material Handling", "Jharsuguda Smelter"),
    ("EQ-PMP-01", "Slurry Pump P-12", "Hydrometallurgy", "Chanderiya Zinc"),
    ("EQ-PMP-02", "Cooling Water Pump P-3", "Power Plant", "BALCO Korba"),
    ("EQ-RCT-01", "Rectifier Transformer R-4", "Pot Room", "Jharsuguda Smelter"),
    ("EQ-FAN-01", "ID Fan F-2", "Power Plant", "Lanjigarh Refinery"),
    ("EQ-MTR-01", "Ball Mill Motor M-9", "Crusher Plant", "Rampura Agucha Mine"),
    ("EQ-CMP-01", "Air Compressor C-5", "Maintenance Workshop", "Debari Zinc"),
    ("EQ-DMP-01", "Haul Dumper HD-21", "Crusher Plant", "Rampura Agucha Mine"),
    ("EQ-FUR-01", "Holding Furnace HF-3", "Cast House", "BALCO Korba"),
    ("EQ-CNV-03", "Limestone Conveyor BC-9", "Material Handling", "Chanderiya Zinc"),
    ("EQ-PMP-03", "Acid Transfer Pump P-22", "Hydrometallurgy", "Debari Zinc"),
    ("EQ-CRN-03", "Gantry Crane #5", "Material Handling", "Lanjigarh Refinery"),
]


def write_inspections() -> None:
    """Per-equipment 90-day series. Degrading units develop a failure; rows in the
    21 days before failure are labelled will_fail=1 to give the model a signal."""
    rows = []
    days = 90
    today = date.today()

    # Assign a health profile to each unit. ~1/3 are degrading.
    for eq_id, name, area, site in EQUIPMENT:
        degrading = random.random() < 0.4
        decay = random.uniform(0.05, 0.12) if degrading else random.uniform(-0.01, 0.015)
        # baseline healthy readings
        base_vib = random.uniform(1.8, 2.8)      # mm/s
        base_temp = random.uniform(45, 60)        # deg C
        base_press = random.uniform(4.5, 6.0)     # bar
        hours = random.randint(200, 1500)

        failure_day = None
        if degrading:
            failure_day = random.randint(70, 89)

        for d in range(days):
            day_date = today - timedelta(days=(days - 1 - d))
            t = d / days
            noise = random.uniform(-0.15, 0.15)
            vib = round(base_vib + decay * d + noise, 2)
            temp = round(base_temp + decay * d * 8 + random.uniform(-1.5, 1.5), 1)
            press = round(base_press - decay * d * 0.4 + random.uniform(-0.1, 0.1), 2)
            hours += random.randint(6, 14)
            # defects flagged on pre-use checklist increase as health degrades
            defect_prob = min(0.6, 0.02 + (decay * d * 0.5 if degrading else 0.02))
            defects = sum(1 for _ in range(3) if random.random() < defect_prob)

            will_fail = 0
            if failure_day is not None and 0 <= (failure_day - d) <= 21:
                will_fail = 1

            rows.append(
                {
                    "date": day_date.isoformat(),
                    "equipment_id": eq_id,
                    "equipment_name": name,
                    "site": site,
                    "area": area,
                    "vibration_mm_s": vib,
                    "bearing_temp_c": temp,
                    "oil_pressure_bar": press,
                    "hours_since_service": hours,
                    "defects_flagged": defects,
                    "will_fail": will_fail,
                }
            )

    _write_csv(DATA_DIR / "inspections.csv", rows)
    n_fail = sum(r["will_fail"] for r in rows)
    print(f"  wrote {len(rows)} inspection rows ({n_fail} pre-failure labels)")


def _write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating Sage demo data -> {DATA_DIR}")
    write_sops()
    write_risk_assessments()
    write_critical_controls()
    write_standards()
    write_incidents()
    write_near_misses()
    write_inspections()
    print("Done.")


if __name__ == "__main__":
    main()
