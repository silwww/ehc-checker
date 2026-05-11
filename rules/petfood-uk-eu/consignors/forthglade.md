---
consignorId: forthglade
commodity: petfood-uk-eu
source: EHC_Checker_v4_2_4_Forthglade.docx
version: 4.2
---

# EHC Checker Rule Set v4.2 · Consignor document

## Forthglade

> This document is loaded by the application together with the Master document on every check matching this consignor. *Universal rules and calibrations live in Master / General — not duplicated here. This document holds only rules, calibrations and libraries specific to Forthglade.*

Canned petfood 8324 and cooked meat 8384. Multi-EHC groupage is routine — petfood loads are split by species category (RUM_BOV_OV, RUM_VEN, AVES_PESCA/MAM) and share a single trailer seal. Two Forthglade postcodes appear on every EHC: I.1 EX20 1GH (consignor address) and I.11 EX20 1FJ (manufacturing address). Both correct and both required.

## Establishment

| Field | Detail |
|---|---|
| **Establishment** | Forthglade Foods Limited, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ |
| **Approval number** | 10/467/8110/ABP/PTF |
| **Certificate types** | 8324 canned petfood (Glenkrag NI lane); 8384 cooked meat (Renske NL lane) |
| **Trade lanes** | Glenkrag (Carrickfergus NI) via Belfast/Warrenpoint/Larne; Renske (Nieuwleusen NL) via Calais FRCQF1, French second language |

## Rules

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **F5 / I.1** | I.1 Consignor must be Forthglade Foods Limited, Dartmoor View, Okehampton, EX20 1GH | **HARD** | Different address = hard error |
| **F5 / I.11** | I.11 Place of dispatch must be Forthglade Foods Ltd, Higher Stockley Mead, EX20 1FJ. Approval: 10/467/8110/ABP/PTF | **HARD** | Two postcodes on one EHC (1GH at I.1, 1FJ at I.11) is correct |
| **F3 schedule** | Schedule integral to 8324 — must carry EHC reference, OV signature, stamp, signing date on every page | **HARD** | Sequentially paginated; any element absent = hard error |
| **F4b RUM_BOV_OV** | II.6 "either" deleted; II.6 "or" header retained; all four sub-options deleted | **HARD** | GB has had indigenous BSE cases — inner "either" cannot be retained |
| **F4b RUM_VEN** | II.6 "either" retained; II.6 "or" and everything below deleted | **HARD** | Venison/cervid only |
| **F4b AVES/MAM** | II.6 entire section deleted | **HARD** | No ruminant material |
| **Ruminantia rule** | Any product line containing Ruminantia goes on RUM_BOV_OV certificate regardless of other species | **HARD** | Ruminantia trumps everything |

## Calibration notes

### E23 · Rabbit / Lagomorpha — 8324

Products containing rabbit (Lagomorpha): retain Rodentia/Lagomorpha "and/or" option in II.2. List "MAMMALIA" in I.28 species field. II.6 deletion is determined by ruminant content (F4b), not by presence of rabbit.

### E58 · Petfood groupage — multiple EHCs on single trailer

Petfood consignments (all routes, all consignees) are routinely split across two or three EHCs on a single trailer, divided per F3 species category rules. All EHCs in the set share the same I.19 seal number and container reference — correct and expected. Weights, package counts and schedules are per-certificate only — never cross-add totals between certificates. Each EHC checked independently against its own schedule.

## Library entries

### I.5 consignees and I.6 operators

| Field | Entity | Address / notes |
|---|---|---|
| **I.5 (8324)** | Glenkrag Limited | Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR. BCP: Belfast / Warrenpoint / Larne |
| **I.5/I.6 (8384)** | Renske Natural Food BV | Renske Naruurlijke Diervoeding-NL, Malanico, Evenboersweg 1, 7711 GX Nieuwleusen, Netherlands. I.5 and I.6 same entity = normal. Route: Calais FRCQF1, French second language |
| **Haulier** | Yomax | NL haulier. YO-prefix fleet references. Trailer chassis registration on EHC = correct. Truck registration: presence or absence both acceptable |

## Schedule conventions — Renske

Items removed from Renske schedule before submission: EORI reference, schedule production date (OV signature date retained), seal reference, VAT numbers, Renske invoice address (differs from EHC addresses — removed to avoid SIVEP confusion). Glenkrag schedules: same format but no address removal needed — addresses on schedule match EHC addresses.
