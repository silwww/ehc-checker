---
consignorId: dartmouth
commodity: meat-products-uk-eu
source: EHC_Checker_v4_2_5_Smaller_consignors.docx
version: 4.2
---

# EHC Checker Rule Set v4.2 · Consignor document

## Dartmouth

> This document is loaded by the application together with the Master document on every check matching this consignor. *Universal rules and calibrations live in Master / General — not duplicated here. This document holds only rules, calibrations and libraries specific to Dartmouth Foods.*

8384 cooked duck via Around Noon trade lane to Newry, Northern Ireland. The Around Noon address is fixed at 24A Rampart Road, BT34 2QU — any other address, including the easily-mistyped 25A, is a hard error. Treatment A and Treatment D both acceptable on this lane.

## Establishment

| Field | Detail |
|---|---|
| **Establishment** | Dartmouth Foods, Units 1-9 Hearder Court, Beechwood Way, Langage Business Park, Plymouth, PL7 5HH |
| **Approval number** | GB TO 060 |
| **Certificate type** | 8384 MPNT cooked poultry meat — IQF Shredded Duck (Anas platyrhynchos, POU) |
| **Treatment** | Treatment A (non-specific) or Treatment D where process meets standard |
| **Trade lane** | Around Noon Ltd, Newry — via Belfast BCP/XIBEL1-DAERA |

## Rules

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **E2 / I.8** | I.8 Region of origin must be GB-1 for poultry | **HARD** | GB-0 or any other code = hard error |
| **E2 / I.18** | Frozen for IQF product; Chilled for non-IQF cooked product | **HARD** | Two boxes ticked = hard error |
| **E2 / I.27 species** | ANAS PLATYRHYNCHOS must be present in every populated row | **HARD** | Latin name required |
| **E2 / I.27 treatment** | TREATMENT A or TREATMENT D must be present in every populated row | **HARD** | See E25 for Around Noon lane Treatment D acceptance |
| **E2 / mfg plant** | GB-1 establishment approval required — must match I.11 where named establishment appears | **HARD** | Absent or N/A = hard error |
| **E3 deletion map** | Standard deletion map — single-OV variant, all Trichinella deletes, BSE delete, no wild game | **HARD** | Member States option always retained — never flag |
| **E4 disease** | OV must check APHA HPAI interactive map before every signing | **HARD** | Failure to verify zone status is itself a certification error |

## Calibration notes

### E20 · Treatment A wording — 8384

Treatment A is a non-specific treatment — not a heat treatment code. Do not flag the absence of a temperature or time specification for Treatment A.

### E25 · Dartmouth Foods / Around Noon — Treatment type on 8384

Belfast BCP/XIBEL1-DAERA confirmed Treatment A and Treatment D both acceptable for IQF duck product on this lane. Where Treatment D is entered and manufacturing process is confirmed as meeting Treatment D standards — no flag of any kind.

### E31 · Around Noon Ltd address

Correct and confirmed address for Around Noon Ltd as I.5 consignee on all 8384 cooked duck EHCs: 24A Rampart Road, Greenbank Industrial Estate, Newry, County Down, BT34 2QU. Any other address (including 25A) = hard error requiring correction before dispatch.

## Library entries

| Field | Entity | Address / notes |
|---|---|---|
| **I.5** | Around Noon Ltd | 24A Rampart Road, Greenbank Industrial Estate, Newry, County Down, BT34 2QU. PO number must appear on all documents |
