# EHC ERROR CHECKER
## Combined Rule Set and Checker Brief
### Version 1.5 — April 2026

**Certificate models:** 8468 (human consumption) and 8322 (Category 3 ABP)
**Signed by:** Official Veterinarian under APHA authority

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | April 2026 | Initial rule set compiled |
| 1.1 | April 2026 | Multiple additions from live certificate testing. BCP authority names, Z-strike calibration, seal cross-checks, OV numbering systems |
| 1.2 | April 2026 | Cat 3 addendum. Gregory North Tawton and Heathfield entries. Rotterdam NL-RTM1. I.12 library started. Ambient/WPC exception. Redaction calibration |
| 1.3 | April 2026 | Full structural reorganisation into Parts A–E. Checker Brief integrated. Cat 3 approval number library from two spreadsheets. Picklist/worksheet/dispatch doc rules. Photo evidence protocol. SP/RCVS numbering clarification. Report format updated |
| 1.4 | April 2026 | J M W Farms Ltd, Killylea, Armagh (GB NI/4111) added to Cat 3 North Tawton library. Trewithen Dairy GB CQ 502 confirmed. Feed and Food NI held as pending |
| 1.5 | April 2026 | Session calibration integrated: AFI liquid WPC tanker workflow and batch decode. 8322 production date rule corrected. Multi-batch weight presentation rule. Part II preamble rule for whey permeate on 8322. Signing page date rule finalised. Vehicle registration cross-check rule. Photo as ground truth rule. PDF editable field faint-print calibration. Nukamel Weert 001188 confirmed. Puratos Nederland NV added. J M W Farms Killylea I.25 Further Process confirmed. Feed & Food NI still pending |

---

# PART A — Universal Rules

Apply to every EHC regardless of type.

## A1. Document Overview

This rule set covers all UK dairy export health certificates signed by an Official Veterinarian under APHA authority for export to the EU. Two certificate models are in current use:

- **EHC 8468** (DAIRY-PRODUCTS-PT) for dairy products for human consumption requiring pasteurisation treatment
- **EHC 8322** for milk, milk-based products and milk-derived products not for human consumption (Category 3 ABP)

The same product may appear on either certificate depending on its designated end use. Rules in Part A and Part B apply to both certificate types. Certificate-specific rules are in Parts C (8322) and D (8468). Part E contains checker calibration notes.

Both certificates consist of an English section followed by a second language section determined by the BCP entry point country, **not** the destination country.

## A2. Template Versions and Page Count

- **8468 current template:** 5 EN pages + second language section (5 or 6 pages depending on language) = 10 or 11 pages total. Both are valid.
- **8322 current template:** 5 EN pages + 5 second language pages = 10 pages total (bilingual). English-only for Ireland, Northern Ireland, or where second language is optional: 5 pages.
- **Obsolete template (pre-2026):** flag as medium warning — "This may be the obsolete pre-2026 template. Verify correct current template was used."

Page count varies by language — **never flag page count as an error on number alone**. Page footer language code is the primary detection method.

- 8468: English pages show `8468EHC en` bottom-left. 
- 8322: English pages show `8322EHC en` bottom-left. 
- Second language pages show `8468EHC fr / da / nl` etc. 
- Ireland and Northern Ireland: English only, 5 pages.

## A3. Filename Cross-Check

The filename should contain three elements matching the certificate:

1. **Certificate reference** — digits must match I.2 on all pages
2. **Commercial document reference** — must match I.17; where I.17 has multiple references, filename match on any one = pass
3. **Date** — must match signing date on final pages

Any mismatch = **medium warning**. SIVEP uses filename discrepancies as grounds for additional scrutiny.

## A4. Certificate Reference Consistency

Extract the EHC reference from every page header and II.a box. All pages must show identical reference throughout. Pages 1 and 6 are most commonly retyped and reinserted — flag any mismatch by specific page number. A mismatching page may belong to a different certificate. **Mismatch = hard error.**

## A5. Pagination

All pages must show "X of N" where N is consistent across every page including schedule pages. Pages beyond the standard EN + second language total are schedule pages. 

Schedule pages must contain: EHC reference, date (same as signing date), OV name and qualification, SP stamp, sequential pagination.

**Inconsistent page totals = hard error.**

**Known failure mode:** superimposed pagination occurs when the original PDF already has the page total entered and a redaction/guided action tool adds its own numbering on top. Result is garbled text (e.g. "111" or "141"). This is a hard error, not a scan artefact.

## A6. Language Check

The second language is determined by the **BCP entry point country (I.16)** — NOT the destination country (I.9). Detected via the language code bottom-left of each page. 

**Mismatch between BCP country and language code = hard error.**

### Language Mapping by BCP Country

| BCP Country | Required Language | Notes |
|-------------|-------------------|-------|
| France | French (fr) | SIVEP Calais — authority is SIVEP |
| Denmark | Danish (da) | Esbjerg DKEBJ1 — Danish border authority |
| Netherlands | Dutch (nl) | Currently optional — single English also acceptable at NL-RTM1 |
| Ireland | None | Single English document — no second language required |
| Northern Ireland | None | Single English document — no second language required |
| Spain | Spanish (es) | |
| Belgium | French or Dutch | Depending on BCP location |
| Other EU | That country's language | |

## A7. Per-Page Stamp and Signature Requirement

Every page must have at least one SP circular red stamp visible. Every page must have a full signature (not initials). Initials are only used adjacent to individual deletions or added text, accompanied by a stamp. This applies regardless of deletion method including fully redacted pages.

**Stamp consistency:** SP reference number must be identical on every stamp throughout the entire document. Initials must be identical on every stamp throughout. Different SP number or different initials on any page = **hard error**. Same OV must sign and stamp entire document — two different OVs = **instant rejection**.

**Stamp colour:** all OV stamps, initials and signatures must be in any colour other than black. Ink colour cannot be reliably determined from a scanned PDF — flag only if unambiguously black on the physical document. Strikethrough lines may be any colour including black.

**Calibration note:** On a continuously signed single-document EHC by one OV using their own stamp, an apparent SP number discrepancy between pages is almost certainly a scan artefact. Only escalate if the number is clearly and unambiguously different (e.g. a completely different digit sequence). Do not hold for physical confirmation unless genuinely suspicious.

## A8. Deletion Methods and Stamp Requirements

**Three valid deletion methods:**

**Method 1 — Hand pen strikethrough:** Stamp (SP circular red) with initials required adjacent to each deletion. Z-strike acceptable for blocks of text including multiple sub-clauses. Check for edge misses at start and end of each struck block.

**Method 2 — Adobe PDF strikethrough:** Stamp with initials required adjacent to each deletion. A single page-level stamp does NOT satisfy the per-deletion requirement. Each individual deleted clause needs its own adjacent stamp and initials.

**Method 3 — Redaction (whiteout/text removal):** No stamp required adjacent to deleted text. Text is simply absent — field appears blank or white, no strikethrough line visible. Only requirement: at least one stamp per page. If any strikethrough line is visible, it is Method 2 not Method 3.

**Mixed methods:** valid. Each deletion must meet the stamp requirement of whichever method was used for that specific deletion.

**Added text** (e.g. GB-0 zone code): stamp required adjacent — except N/A added to I.21 transit box which is exempt.

## A9. Signing Page Rules

| Element | Rule |
|---------|------|
| SP stamp in Final OV Signature field | Mandatory — hard error if absent |
| Page stamp | Mandatory — hard error if absent |
| Name and qualification | Must be present as name/qualification stamp (rectangular, blue/black) OR handwritten name in capitals plus qualification |
| Date | Must be present — must be same as or earlier than I.14 departure date |
| Signature | Must be present — full signature required, not initials |
| Same OV both signing pages | SP number, initials and name must be identical on EN and second language signing pages |
| Signing page dates | EN and second language signing page dates MUST ALWAYS match each other — mismatch = hard error regardless of what date appears |
| OV/CO deletion | No stamp required regardless of deletion method |

**Calibration note:** For live dairy EHCs the signing date on both pages will almost always be today. Do not flag a date that is not today as an error in itself. Only flag if the two signing pages differ from each other, or if the date creates a logic failure (signing after departure, or before production date).

## A10. Windsor Framework / Boilerplate Notes

Windsor Framework paragraph must be present and undeleted in Notes section of both EN and second language pages. Both Windsor Framework wording AND older Protocol on Ireland/Northern Ireland wording are valid depending on template version.

## A11. Fields to Ignore Completely

- **I.2a** — never check, never flag
- **I.21 For transit** — ignore unless ticked AND destination is non-EU
- **I.23** — pre-struck by APHA on template, always blank, ignore
- **I.25** — always blank on 8468, ignore on 8468. On 8322 I.25 carries the commodity purpose tickboxes — see Part C

## A12. Severity Levels

| Severity | Description | Examples |
|----------|-------------|----------|
| **Hard error** | BCP will reject the consignment | Missing stamp or signature, wrong OV/SP on any page, wrong reference, date error, wrong species retained, missing seal, weight inconsistency, two transport condition boxes ticked, EN/second language parity mismatch, signing page dates differ |
| **Medium warning** | SIVEP/BCP may reject on a bad day — resolve before dispatch where possible | Filename mismatch, DN despatch ref mismatch, missing I.17 reference, blank I.11 with no marking, ISO code digit/letter substitution, new consignee not in library |
| **Low notice** | Valid variation worth noting — no action required | Extra stamps, I.11 N/A for Gregory Distribution, older template version, preferred text form, new destination entry for library update |

## A13. Known OVs, SP References and RCVS Numbers

OV records carry two distinct reference numbers which must not be confused:
1. **SP number** — APHA-issued OV reference, used on circular stamps
2. **RCVS number** — Royal College of Veterinary Surgeons registration

These are different systems for the same OV.

| OV Name | SP Reference | RCVS Number |
|---------|--------------|-------------|
| Hector Lopez MRCVS OV | SP 630859 | 7091037 |
| Silvia Soescu MRCVS | SP 632477 | 7280697 |
| RR Cunningham BVetMed MRCVS | SP 136830 | 0314006 |

## A14. Known BCPs

| BCP Name | Code | Country | Authority | Language |
|----------|------|---------|-----------|----------|
| Calais | FRCQF1 | France | SIVEP | French |
| Esbjerg | DKEBJ1 | Denmark | Danish border authority | Danish |
| Rosslare | IE ROS 1 | Ireland | Irish border authority | None (English only) |
| Dublin | IE DUB (TBC) | Ireland | Irish border authority | None (English only) |
| Belfast | XIBELI-DAERA | Northern Ireland | DAERA | None (English only) |
| Rotterdam | NL-RTM1 | Netherlands | Dutch border authority | Dutch (optional — single English accepted) |

**Important:** Always use the BCP-specific authority name in reports — never use "SIVEP" for a Danish, Irish, Belgian or other non-French BCP.

---

# PART B — Part I Field Rules

Apply to all EHCs.

## B1. Field-by-Field Rules

| Field | Rule |
|-------|------|
| **I.1 Consignor** | Must be populated — hard error if blank. May be the trading entity (e.g. Arla Foods Ingredients P/S) rather than the manufacturing address — acceptable where I.11 correctly identifies the dispatch establishment. |
| **I.2 Certificate ref** | Must match II.a reference throughout all pages. |
| **I.3 Central Competent Authority** | Fixed DEFRA text — pass if present. |
| **I.4 Local Competent Authority** | Fixed APHA text — pass if present. |
| **I.5 Consignee/Importer** | Must be populated. Cross-check against known consignee library. For AFI powder EHCs: I.5 is always Arla Foods Ingredients P/S / Group P/S (Viby-J, Denmark) regardless of end customer — this is standard and correct. |
| **I.6 Operator responsible** | Valid if populated OR struck through with stamp/initials OR marked N/A. Hard error only if completely blank with no marking. On 8322: commonly a logistics agent — do not flag. |
| **I.7 Country of origin** | Must be populated. Preferred: GREAT BRITAIN / GB. "United Kingdom" / "UK" acceptable — flag as low notice. Text should be CAPITALS — lower case = low notice. |
| **I.8 Region of origin** | Must show GB-0 for Great Britain exports — hard error if missing on signed EHC. Note: on 8322 template the editable field text prints faint/grey — check French section before flagging as absent. |
| **I.9 Country of destination** | Must be populated. If non-EU — raise transit notice. |
| **I.10 Region of destination** | Note if blank — not an error. |
| **I.11 Place of dispatch** | Name and address required. Approval number — see establishment lookup (Section B5). If completely blank = low notice only. Gregory Distribution at any address = approval N/A — correct. |
| **I.12 Place of destination** | Note if blank — not an error for standard import consignments. On 8322: approval number required for Cat 3 — see Section C5. On 8468: approval number N/A or blank is acceptable. |
| **I.13 Place of loading** | Must be populated. May differ from I.11 — not an error. |
| **I.14 Departure date** | Must be populated. This is the OV signing date — not the date the vehicle physically departs or boards the ferry. |
| **I.15 Means of transport** | At least one box ticked AND registration/identification present. Multiple boxes ticked = valid. For unaccompanied loads: trailer registration only — no truck/tractor registration required. |
| **I.16 Entry BCP** | Must be populated — extract country for language check. |
| **I.17 Accompanying documents** | Commercial document reference must be present — hard error if blank. Type, Code, Country sub-fields are optional. Where I.17 contains multiple references, filename match on any one = pass. |
| **I.18 Transport conditions** | Exactly ONE box must be ticked. Ambient, Chilled and Frozen are mutually exclusive — two or more ticked = hard error. Note: liquid WPC consignments on the Immingham–Esbjerg tanker route are certified as Ambient by agreement with DKEBJ1 regardless of product load temperature — do not flag. |
| **I.19 Container/Seal number** | Seal number must be present for sealed loads — hard error if blank. Multiple seal numbers acceptable. Trailer registration plate in Container No field = acceptable practice. Container N/A acceptable for bulk tanker. |
| **I.20 Certified as or for** | On 8468: "Products for human consumption" must be ticked — hard error if not. On 8322: this field is blank — do not apply the 8468 rule. |
| **I.21 For transit** | Ignore unless ticked AND destination is non-EU. |
| **I.22 For internal market** | Must be ticked for standard EU/NI consignment. |
| **I.23** | Pre-struck by APHA — always blank, ignore completely. |
| **I.24 Total number of packages** | Must be populated. Must match I.27 (8468) or I.28 (8322) number of packages. |
| **I.25** | On 8322 only: see Section C3. On 8468: always blank — do not apply 8322 rules. |
| **I.26 Net/gross weight** | Net weight must be populated. Gross weight not required for bulk tanker consignments. |

## B2. Weight Consistency

I.26 net weight (pages 1 and 6) must match I.27/I.28 net weight (pages 2 and 7). All four weight entries must be identical. **Mismatch = hard error.** Cross-check against delivery note or picklist when available.

## B3. Date Logic

The rule is: **Production date ≤ Signing date ≤ Departure date**.

- Collection/production date in I.27/I.28 must be same day or earlier than signing date — hard error if after.
- Signing date must be same day or earlier than I.14 departure date — hard error if after.
- I.14 and signing date being identical is the norm and is correct.

**Exceptions:**
- For aged cheeses (e.g. Cheddar) and aged powders (e.g. whey permeate): production date may be weeks or months before departure — this is valid. Do not flag long gaps for these products.
- AFI Taw Valley liquid WPC tanker loads: production date is typically one day before signing date — this reflects the manufacturing workflow (milk in day 1, WPC exported day 2). Production date two or more days before signing = confirm at POL (may indicate tanker unavailability delay).

**Exception detail:** Where tanker unavailability causes a delay, product may be two or more days old. If production date is more than one day before signing, flag as low notice — "confirm product age at POL" — not a hard error. This occurs occasionally e.g. when Friday loads use Wednesday/Thursday product.

## B4. Destination and Transit

EU member state ISO codes: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Northern Ireland ISO code: XI — treated as within EU for trading purposes.

**Standard consignment:** I.9 is EU country or XI, I.22 ticked, I.21 blank — no flag. If I.9 is non-EU or I.21 is ticked: raise prominent notice and verify Annex XXII route handling.

A load may enter the EU at one BCP but travel on to a different country. E.g. Spain destination via Calais FRCQF1 is entirely normal — do not flag as inconsistent. French second language is correct for FRCQF1 regardless of final EU destination.

## B5. Establishment Lookup — I.11 Approval Numbers

| Establishment | Expected Approval No | Notes |
|---------------|---------------------|-------|
| Gregory Distribution (any address — loading/logistics) | N/A | Not a manufacturing establishment |
| Gregory Distribution Ltd, North Tawton (Cat 3 powder — AFI/Arla) | U1183488/TRANS | Transport/logistics approval — Cat 3 only |
| Dairy Crest Ltd / Saputo Dairy UK, Davidstow, Camelford, Cornwall | GB CQ 501 | |
| Arla Foods Ingredients Taw Valley Limited / Taw Valley Creamery, South Weeke, North Tawton | GB DE 030 | |
| Trewithen Dairy, Cornwall | GB CQ 502 | 8468 human consumption — occasional bulk tanker cream to EU |
| Gregory's Distribution Ltd, Heathfield (loading depot for Davidstow/Saputo) | N/A | Loading/logistics only — not a manufacturing establishment |
| County Milk Products Ltd, Dean Court, 85 Adlington Road, Wilmslow, Cheshire, SK9 2BT | N/A | I.1 consignor only — I.11 will be Dairy Crest/Davidstow (GB CQ 501) |

## B6. Known Consignees and Logistics Agents

| Field | Name | Address / Notes |
|-------|------|-----------------|
| I.5 Consignee | Novades BV | Maliebaan 50B, Utrecht, 3581 CS, Netherlands |
| I.5 Consignee | Navobi | JHR.DR.C.J. Sandbergweg 7, 3852 PT, Staverden (Gem. Ermelo), Netherlands. Multiple receiving sites |
| I.5 Consignee | Uniblock | Coes Road Industrial Estate, Dundalk, A91 TD60, Ireland |
| I.5 Consignee | Nukamel Productions BV | Industriekade 32-34, 6001 SE Weert, Netherlands. Animal nutrition. 8322 Further process |
| I.5 Consignee | Nestle Bulgaria AD | Henri Nestle Str. 2, 1360 Sofia, Bulgaria. 8468 human consumption |
| I.5 Consignee | Feed & Food Trading BV | Woudenbergseweg 19 C2, NL-3707 HW. Sweet whey powder, animal feed, Calais route |
| I.5 Consignee | Milkeen Krzysztof Cyba | Eukaliptusowa 9 1, Warszawa, 02 765, Poland. Demineralized whey powder, 8468, Calais route |
| I.5 Consignee | Puratos Nederland N.V. | Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands. 8468 human consumption, Calais route |
| I.1/I.5 Arla | Arla Foods Ingredients P/S / Arla Foods Ingredients Group P/S | I.1 consignor: c/o Taw Valley Creamery, South Weeke, North Tawton, Devon EX20 2DA. I.5 consignee (internal transfers & AFI powder EHCs): Soenderhoej 1-12, DK-8260 Viby-J, Denmark |
| I.6 Logistics | Seabrook Global Logistics Ltd | Admiral House, 853 London Road, West Thurrock, Essex, RM20 3LG |
| I.6 Logistics | Kuehne + Nagel Ltd | Manchester International Airport, Building 317, World Freight Terminal, M90 5NA |
| I.6 Logistics | Maersk Logistics and Services Denmark A/S | Faergehamnsvej 31, 9900 Frederikshavn, Denmark. Logistics agent for Arla — multiple routes including Esbjerg and Calais |

## B7. I.12 Destination Library — 8468 (Human Consumption)

On 8468 certificates I.12 approval number is **not mandatory** — blank or N/A is acceptable. Where present, cross-check against this library.

| Approval No | Establishment | Address / Notes |
|-------------|---------------|-----------------|
| NL218847 | Van Kommer | Ambachtsweg 24, Barneveld, 3771 MG, Netherlands |
| 207165 | Jonker and Schut B.V. | Harselaarseweg 33, 3771 MA Barneveld, Netherlands |
| 05929 | Navobi BV | Jhr. Dr. Sandbergweg 7, 3852 PT, Staverden (gem Ermelo), Netherlands |
| IE LH 242466 | Mill Transport Ltd | Rathcor Riverstown Dundalk, Co Louth, Ireland |
| M119 | Arla Foods Ingredients Group P/S Danmark Protein | Soenderupvej 26, Nr Vium, DK-6920 Videbaek, Denmark |
| N/A | Vicorquimia S.A. | Moli de Vent 2, 08150 Parets del Valles, Spain |
| N/A | Barry Callebaut Belgium | Bouwstraat 1, 9160 Lokeren, Belgium |
| N/A | Milkeen Krzysztof Cyba | Eukaliptusowa 9 1, Warszawa, Poland |
| N/A | Nestlé Bulgaria AD | Henri Nestle Str. 2, BG-1360 Sofia, Bulgaria |
| N/A | Puratos Nederland N.V. | Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands |

## B8. Delivery Note, Dispatch Confirmation and Document Cross-Check

| Cross-check item | Rule |
|------------------|------|
| Net weight | DN/picklist total must match I.26 and I.27/I.28 weight |
| Seal number(s) | DN/dispatch doc seal must match I.19. DN may omit leading zeros — EHC format takes precedence where zeros are present on the physical seal |
| Vehicle/trailer registration | Dispatch doc vehicle/trailer must match I.15 and I.19 container field. Cross-check alphanumeric characters only — spaces, hyphens, dots and country prefixes in handwritten dispatch notes are optional formatting and never cause a mismatch. Photo is ground truth and final decision maker — if photo uploaded, it overrides all other sources. |
| Batch reference | Batch number on dispatch doc must match I.17 and I.27/I.28 batch number |
| Commercial document reference | DN despatch reference must match I.17. References may carry a "-XX" suffix appended by EHCO — where base number matches, flag suffix as low notice only |
| Loading date | Picklist date is scheduled date — may predate signing date (low notice only). Gregory's/AFI dispatch confirmation date is actual loading date. |

**RULE: PHOTO IS GROUND TRUTH** — If a photo of any plate, seal or vehicle is uploaded, it is the final and absolute decision maker. Any discrepancy between the EHC/dispatch doc and the photo is resolved in favour of the photo. The photo cannot be wrong.

## B9. Photo Evidence

Photos of tractor plate, trailer plate and seal are strongly recommended for every load. The following should be uploaded with every EHC:

1. **Tractor front plate** — confirms I.15 vehicle registration
2. **Trailer rear plate** — confirms I.19 container/trailer field
3. **Seal photographed alongside dispatch confirmation** — confirms I.19 seal number and loading date

## B10. EN / Second Language Part I Consistency

Every data field on EN pages 1 and 2 must exactly match second language pages 6 and 7. **Flag any discrepancy as hard error.** 

**Note:** I.17 Type field — order of multiple references may vary between EN and second language — flag as medium warning.

PDF template editable fields are linked and mirror automatically between EN and second language sections. If one scans faintly (due to the lighter grey font on editable fields — a universal feature of all EU EHC templates), check the opposite language section which will contain identical content. Manually added Adobe text boxes (e.g. signing page dates) are independent and must be cross-checked between both pages.

## B11. ISO Country Code Vigilance

ISO country codes must be checked carefully for digit/letter substitution errors. Known confusion pairs:
- ES (Spain) vs E5 (numeral 5 substituted for letter S)
- DK vs OK
- PT vs P1
- NL vs N1
- Known historical error: DE (Germany) used as GE

Apply to all ISO code fields throughout the certificate. **Severity: medium warning.**

## B12. Text Conventions

All typed/entered text throughout the certificate should be in CAPITALS. Mixed case or lower case entries should be noted as a **low notice**. 

Preferred: GREAT BRITAIN / GB rather than United Kingdom / UK (either is technically correct).

## B13. Species Rule

Only **Bos taurus** is valid for GB dairy exports. All other species names (Ovis aries, Capra hircus, Bubalus bubalis, Camelus dromedarius) must be fully deleted in BOTH English and second language sections. 

Check for any visible fragment of these Latin names — even a single word is a **hard error**. Focus on prose text — ignore structural markers like brackets and clause numbers. "Member States" option within animal origin clauses is always retained — never flag as an undeleted fragment.

## B14. Arla Direct Consignment Field Patterns

| Field | Expected content |
|-------|------------------|
| I.1 Consignor | Arla Foods Ingredients P/S, c/o Arla Foods Ingredients Taw Valley Limited, Taw Valley Creamery, South Weeke, North Tawton, Devon EX20 2DA. "Arla Foods Ingredients Taw Valley Limited" is also accepted as I.1 for direct manufacturing-site dispatches. |
| I.11 Place of dispatch | Arla Foods Ingredients Taw Valley Limited or Gregory Distribution Ltd North Tawton, approval GB DE 030 or N/A respectively |
| I.13 Place of loading | Gregory Distribution Ltd, North Tawton, Devon — no Gregory's Heathfield depot for Arla/Taw Valley loads |
| I.5 Consignee (internal transfers and all AFI powder EHCs) | Arla Foods Ingredients Group P/S, Soenderhoej 1-12, DK-8260 Viby-J, Denmark — regardless of end customer |
| I.6 Logistics (Esbjerg route) | Maersk Logistics and Services Denmark A/S, Faergehamnsvej 31, 9900 Frederikshavn, Denmark |

## B15. Dairy Crest / Saputo Field Patterns

For consignments from Dairy Crest Limited (trading as Saputo Dairy UK), I.1 may show the registered office address (5 The Heights, Brooklands, Weybridge, Surrey, KT13 0NY) rather than the Davidstow manufacturing address. I.11 will show Davidstow / GB CQ 501 as the dispatch establishment — this is the definitive entry. Do not flag I.1/I.11 address difference as an error for this consignor.

## B16. AFI Liquid WPC Tanker Batch Reference Decode

For AFI Taw Valley liquid WPC tanker loads to Denmark, the batch reference decodes as: **AF-YY-week-day-run**.

For example `AF26147001` = 2026, week 14, day 7 (Sunday), run 1.

The production date in I.27 will always match the day before the OV signing/departure date, reflecting the manufacturing workflow: product is made and passed to AFI on day 1, exported on day 2. The DN delivery date also refers to day 1 (when liquid whey was delivered to AFI section). The commercial document reference on pages 1 and 6 will always be identical.

---

# PART C — EHC 8322: Not for Human Consumption (Category 3 ABP)

## C1. Certificate Identification

8322 pages carry footer code `8322EHC en` (English) and `8322EHC fr / da / nl etc.` (second language). Header reads: **"Milk, milk-based products and milk-derived products not for human consumption."** 

If the header reads "Dairy products intended for human consumption" the certificate is an 8468 — apply Part D rules instead. Footer code and header mismatch = **hard error**.

## C2. Page Count — 8322

- **Standard bilingual 8322:** 5 EN pages + 5 second language pages = 10 pages. 
- **English-only** (Ireland, Northern Ireland, or where BCP language is optional and single English used): 5 pages. 
- Any other page count without schedule pages = flag for investigation.

## C3. I.25 Commodity Certified For

I.25 on the 8322 has four tickboxes. **Exactly one must be ticked.** The ticked box must reflect the actual end use of the consignment.

- **None ticked** = hard error
- **More than one ticked** = hard error
- On 8468 certificates I.25 is always blank — do not apply this rule to 8468.

### Tickbox Meanings

| Tickbox | When applicable |
|---------|----------------|
| Animal feedingstuff | Product destined for animal feed. Most common for whey/milk powder. Novades, Navobi, Van Tuijl consignments. |
| Further process | Product destined for further processing. Nukamel consignments. J M W Farms Ltd Killylea consignments. |
| Production of petfood | Product destined for pet food manufacture. |
| Technical use | Any other use — any use other than feeding farmed animals (other than fur animals) and petfood production. |

## C4. Part II Preamble — Product Type Deletion

The Part II preamble certifying statement includes "the milk (²), the milk-based products (²) and milk-derived products (²)". **Only the applicable product type(s) should be retained.**

| Product type | Preamble retention |
|--------------|---------------------|
| Sweet whey powder / milk powder | Retain "the milk-based products" only. Delete "the milk" and "and milk-derived products" |
| Whey permeate powder | All three product type options struck — this is accepted practice for this product type on the 8322 |
| Raw/liquid milk | Retain "the milk" only |
| Casein / milk-derived ingredients | Retain "and milk-derived products" as applicable |

## C5. I.12 Destination Approval Numbers — Cat 3 (8322 only)

On 8322 certificates, I.12 (Place of destination) should carry the Cat 3 receiving establishment approval number. Flag as **medium warning** if blank. 

**Exceptions:** 
- Ballywalter, Co Down, BT22 2NB (Northern Ireland AFI address) — reference 1018 is NOT a Cat 3 approval number and must be left blank on the EHC.
- Feed and Food NI (Co Armagh) — approval number status pending confirmation, leave blank until verified.

### C5a. Gregory's Heathfield (Saputo / County Milk exports)

[Establishments accessed via this depot — see library for full list.]

### C5b. Gregory's North Tawton (AFI / Arla exports)

[Establishments accessed via this depot — see library for full list.]

**Cat 3 Approval Number Library:**

| Company | Address | Country | Approval No |
|---------|---------|---------|-------------|
| Docomar | Laan der Techniek 10, 3903 AT Veenendaal | NL | 209359 |
| Jonker & Schut Nijkerk | Nijverheidsstraat 16, 3861 RJ Nijkerk | NL | 224341 |
| Jonker & Schut Barneveld | Harselaarseweg 33, 3771 MA Barneveld | NL | 207165 |
| P.C. van Tuijl Kesteren | Batterijenweg 17, 4041 DA Kesteren | NL | 19163 |
| P.C. van Tuijl Lienden | Marsdijk 13, 4033 CC Lienden | NL | 207492 |
| P.C. van Tuijl Opheusden | Tielsestraat 66a, 4043 JT Opheusden | NL | 91124 |
| Van Kommer | Ambachtsweg 24, 3771 MG Barneveld | NL | NL218847 |
| R. Boonzaijer Transport BV | Francis Baconstraat 7, 6718 XA Ede | NL | 218039 |
| Van Zutven Feed Processing | Pater van den Elsenlaan 15, 5462 GG Veghel | NL | 30329 |
| ENTC Dairy Solutions Sp.z.o.o | Dworowa 10, 14-400 Paslek | PL | PL 28041606 UE |
| Denkavit France S.A.R.L. | ZI de Meron, CS 82003, Montreuil-Bellay | FR | FR49215001 |
| Nukamel Productions BV | Industriekade 32, 6001 SE Weert | NL | 001188 |
| Nukamel / Van Zutven | Pater van den Elsenlaan 15, 5462 GG Veghel | NL | 30329 |
| R2 Agros AS | Odinsvej 25, 8722 Hedensted | DK | DK-3-oth-987248 |
| R2 Agros AS (Sole Ejendomme) | Kaervej 45, 8722 Hedenstead | DK | DK-3-oth-974735 |
| Van der Heijden Logistiek | Diamantweg 64, 5527 LC Hapert | NL | 227149 |
| Nukamel / Van der Heijden | Diamantweg 64, 5527 LC Hapert | NL | 100879 |
| Navobi BV (Van Veluw Landweer) | Van Veluw Landweer 3, 3771 LN Barneveld | NL | 219249 |
| Navobi BV (Van Veluw industrieweg) | Van Veluw industrieweg 8, 3771 MB Barneveld | NL | 227121 |
| Navobi BV (Sandbergweg) | Jhr. Dr. Sandbergweg 7, 3852 PT Staverden (gem Ermelo) | NL | 05929 |
| Ballywalter | Ballywalter, Co Down, BT22 2NB | NI | LEAVE BLANK |
| J M W Farms Ltd | 35 Tonnagh Rd, Killylea, Armagh, BT60 4PZ | NI | GB NI/4111 |
| Feed and Food | Co Armagh, NI | NI | PENDING |
| Lacto Production | ZI La Brohiniere, 35360 Montauban de Bretagne | FR | FR35184020 |
| Bech Gruppen | Ove Jensens Alle, 8700 Horsens | DK | DK-3-STP-1513648 |

## C6. Part II Clause Structure and Standard Deletion Pattern — 8322

| Clause | Standard state | Notes |
|--------|----------------|-------|
| II.1 Country/FMD | RETAIN | Fill in United Kingdom / GB-0 |
| II.2 Raw milk animal health | RETAIN | |
| II.3 (²) either [treatments in II.4] | RETAIN | |
| II.3 (²) or [whey/FMD arm] | DELETE entire arm | Including ALL sub-options. Z-strikes valid. |
| II.4 HTST header | RETAIN | |
| II.4 (²) either — second HTST | DELETE | |
| II.4 (²) or — drying process | RETAIN | Spray drying route |
| II.4 (²) or — pH reduction | DELETE | |
| II.4 (²)(⁵) or — 21 days FMD | DELETE | |
| II.4 (²)(⁵) or — voyage date | DELETE | |
| II.4 (²) or — UHT 132°C | DELETE entire arm | Including all sub-options |
| II.4 (²) or — sterilisation Fo3 | DELETE | |
| II.5 Contamination precautions | RETAIN | |
| II.6 (²) either — new containers | RETAIN | For bagged product |
| II.6 (²) or — bulk container disinfection | DELETE | For bagged product; may retain for bulk tanker |
| II.6 "and" — Cat 3 labelling | RETAIN | Containers marked Cat 3 not for human consumption |
| II.7 (²) either — no ovine/caprine | RETAIN | For pure bovine product |
| II.7 (²) or — ovine/caprine arm | DELETE entire arm | Including all sub-clauses (a)(i–v), (b), (c) |

## C7. EN / Second Language Parity — 8322

All deletions in the EN section (pages 2–4) must be mirrored exactly in the second language section (pages 7–9). A deletion present in EN but absent in second language (or vice versa) = **hard error**.

## C8. I.6 — Logistics Agents on 8322

On 8322 certificates, I.6 is commonly populated with a logistics or freight forwarding company rather than the consignee. This is valid. I.6 may also be the same entity as I.5. **Do not flag a logistics company in I.6 as an error.** I.6 blank with no marking = low notice only.

## C9. Multi-Batch Consolidation — 8322

Where I.28 contains multiple batches: 
- All batch numbers must be listed
- All corresponding production dates must be listed for the 8468 (see D5)
- On the 8322 Cat 3 dairy EHC, production dates are **NOT** required in I.28 and will never be present — do not flag their absence
- Single consolidated net weight covering all batches is correct and normal
- A schedule is only added where batch count and/or odd weights make consolidation impractical

---

# PART D — EHC 8468: Human Consumption (DAIRY-PRODUCTS-PT)

## D1. Certificate Identification

8468 pages carry footer code `8468EHC en` (English) and `8468EHC da / fr / nl etc.` (second language). Header reads: **"Dairy products intended for human consumption that are required to undergo a pasteurisation treatment."** Part II header reads: **"Certificate model DAIRY-PRODUCTS-PT."** 

I.20 "Products for human consumption" must be ticked. If header reads "not for human consumption" the certificate is an 8322 — apply Part C rules.

## D2. I.20 — Certified as or for

"Products for human consumption" must be ticked — **hard error if not ticked**. This is the 8468-specific certification purpose field.

## D3. I.27 Commodity Description Table — Structure

I.27 on the 8468 is a structured multi-row table with **5 numbered rows**. Only populate as many rows as needed. Unused rows must be struck through or redacted in their entirety — **hard error if any unused row is left with visible unstruck content**. Pure white/blank rows on digitally prepared EHCs are Method 3 redactions — not unstruck blanks.

The net weights across all populated rows must **sum to I.26 net weight** — hard error if mismatch. The number of packages across all populated rows must **sum to I.24 total packages** — hard error if mismatch.

## D4. I.27 Field Rules — Per Field

| Field | Rule |
|-------|------|
| CN Code | Must be the numeric HS code (e.g. 0404100200). Text product descriptions in the CN Code field = hard error. |
| Species | Must be the Latin species name (BOS TAURUS for bovine). Must be present in every populated row. |
| Nature of commodity | Text description of the product. Must be present in every populated row. |
| Number of packages | Packages for that specific row. SUM across all populated rows must equal I.24. |
| Type of packaging | Must be present in every populated row. |
| Batch No | Batch number(s) for product in this row. |
| Net Weight | Net weight for this row. Sum of all rows must equal I.26 net weight. |
| Treatment Type | Must describe the heat treatment applied. Must be present in every populated row. |
| Date of collection/production | Production date(s) in date format (DD.MM.YYYY). Hard error if absent. Hard error if this field contains non-date content. |
| Manufacturing plant | Must contain the establishment approval number (e.g. GB DE 030) or N/A. Must NOT contain dates, product descriptions, or other non-approval-number content — hard error if it does. |
| Cold Store | N/A if not applicable. Note if blank. |
| Final consumer | Checkbox — usually blank for wholesale/trade consignments. |

## D5. Multi-Batch Consolidation — 8468

Where I.27 contains multiple batches with different production dates in a single row:
- All batch numbers must be listed in the Batch No field
- All corresponding production dates must be listed in the Date of collection/production field
- The number of dates must match the number of batches — **medium warning if count differs**
- Cross-check each batch number against the allocation/picklist

## D6. Part II Attestation — 8468

| Clause | Standard state | Notes |
|--------|----------------|-------|
| II.1 Public health attestation (a–e) | RETAIN in full | Delete instruction: "Delete when the Union is not the final destination." For standard EU consignments: retain. Sub-clauses (a)(i–vi), (b), (c), (d), (e) all retained. |
| II.1a AMR attestation | DELETE | Not applicable until 3 September 2026. Full redaction is correct method on current template. |
| II.2 Animal health attestation | RETAIN | Delete instruction: "Delete when derived from solipeds, leporidae or wild land mammals other than ungulates." For bovine dairy: retain in full. |
| II.2.1 Annex XVII entry route | RETAIN with GB-0 zone code | Standard GB export route. |
| II.2.1 Annex XXII transit route | DELETE | Retain only for transit consignments. |
| II.2.2 Raw milk / Bos taurus | RETAIN | Zone code GB-0. Species Bos taurus retained. |
| II.2.2 Member States option | RETAIN | Always retained — never flag as undeleted fragment. |
| [Official veterinarian] / [Certifying officer] | Delete one | OV retained when II.2 animal health is retained (standard case). |
| Windsor Framework note | RETAIN | Must be present and undeleted in Notes section of both EN and second language pages. |

## D7. Groupage Consignments — 8468

A groupage consignment is a small consignment consolidated with others for shipping.

- **I.15 Identification:** "N/A GROUPAGE" acceptable — low notice only
- **I.19 Container:** "N/A GROUPAGE" acceptable
- **I.19 Seal:** pallet-level security seals must still be present — hard error if absent
- Non-contiguous seal ranges are valid — verify declared count matches actual number of seals
- Groupage movements typically dispatch direct from manufacturing site

---

# PART E — Checker Calibration Notes

Known false positive patterns.

## E1. Z-Strikes

Z-strikes may appear as undeleted text in low-resolution scans. Large diagonal Z-strikes spanning multiple sub-clauses are a valid Method 1 deletion technique. The checker must **not** raise a hard error on deletion completeness from scan appearance alone when Z-strikes are present. Request enlarged/higher-resolution image of the relevant page before raising a deletion hard error based on scan appearance.

## E2. Blank Fields

Blank/white fields are Method 3 redactions, not unstruck blanks. On digitally prepared EHCs, unused fields and unused I.27/I.28 rows are deleted by redaction (Method 3). The field appears white/blank with no text visible and no strikethrough line. 

**Do not flag blank/white unused rows or fields as unstruck.** Only flag if: 
(a) a strikethrough line is visible but incomplete (edge miss), or 
(b) a row contains partial data with no deletion marking.

## E3. Worksheets

Worksheets are working documents — judge only on the signed EHC. Worksheets (e.g. Be52, Gregory's pick sheets, AFI load sheets) may contain multiple edits, corrections, different OV references, rolled date changes, and incomplete fields. They are not the signed certificate. 

**Content on a worksheet must never trigger a hard error on the certificate** — use worksheets only for cross-checking commercial data (weights, batches). Any discrepancy between worksheet and signed EHC should prompt a low notice at most.

## E4. OV Numbering Systems

SP number and RCVS number are different systems for the same OV. OV records carry two distinct reference numbers:
1. **SP number** — APHA-issued OV reference, used on circular stamps
2. **RCVS number** — Royal College of Veterinary Surgeons registration, typically shown on the qualification stamp on the signing page

**Do not flag as a mismatch or as two different OVs.**

## E5. Scan Quality

Do not raise hard errors based on scan appearance alone for ink colour or stamp clarity. Ink colour (black vs dark blue) cannot be reliably determined from a scanned PDF. Only flag stamp or signature ink as black if it is unambiguously black on the physical document — not based on scan appearance.

## E6. Vehicle & Trailer Identification

Trailer plate in I.19 container field is acceptable practice on curtainsider road vehicle loads. Foreign plates (Lithuanian, Bulgarian, Polish, Romanian, Belgian etc.) in I.15 and I.19 are expected for international haulage. Romanian plates in particular come in various formats and lengths — never question whether a Romanian plate looks complete. If it matches the dispatch doc and photo, it passes. 

**Vehicle registration cross-check:** compare alphanumeric characters only — spaces, hyphens, dots and country prefixes in handwritten dispatch notes are optional formatting variations and never cause a mismatch.

## E7. Route & BCP Combinations

Destination country and BCP entry point may differ — this is not an error. A load may enter the EU at one BCP country but be destined for a different EU member state. E.g. Spain destination via Calais FRCQF1, or Netherlands destination via Calais, are entirely standard for road freight. 

**Language check is driven by BCP country (I.16), not destination country (I.9).**

## E8. Product-Specific Rules

**Liquid WPC on Immingham–Esbjerg tanker route: Ambient is correct.**

Liquid WPC (Whey Protein Concentrate) consignments on the Immingham–Esbjerg tanker route are certified as Ambient in I.18 by agreement with the Esbjerg BCP (DKEBJ1). Although the product loads at approximately 2–4°C, there is no active refrigeration during transit. Do not flag Ambient as incorrect for this product and route.

## E9. Tanker Seal Photos

Seal photos on Immingham–Esbjerg tanker loads are taken at the previous loading in advance. Photo date predating the EHC production/signing date is expected and normal for this route. **Never flag.**

## E10. Template Artefacts

Stray row number (e.g. "2") visible below treatment type in I.27 on DK tanker EHCs is a consistent template artefact. **Never flag.**

## E11. PDF Editable Field Faint Printing

All EU EHC templates print editable field text in a lighter/greyer font than the pre-printed text. This is a universal template characteristic — **not an error or omission**. Before flagging any field as blank or illegible from a scan, check the opposite language section (PDF-linked fields are identical) or request a photograph. The French section often scans more clearly. **Never raise a notice on field content based on scan faintness alone.**

---

# PART F — Checker Brief: System Description and Technical Specification

## F1. Purpose

The EHC Checker is a tool that systematically verifies completed UK dairy export health certificates against the rules in Parts A–E of this document, cross-references accompanying commercial documents, and produces a structured report. The goal is to catch errors before the load departs rather than at the BCP.

## F2. Inputs

| Document | Status | Notes |
|----------|--------|-------|
| Signed EHC (PDF) | Required | The authoritative document — all checks run against this |
| Delivery Note or AFI/Gregory's Dispatch Confirmation | Strongly recommended | Required for bulk tanker consignments. Enables seal, vehicle and weight cross-check |
| Picklist / allocation sheet | Recommended | Enables batch and weight cross-check. Note: dates on picklist are scheduled dates, not actual loading dates |
| Photos — tractor plate, trailer plate, seal | Recommended | Immediately and definitively resolves vehicle and seal identity queries. Photo is ground truth. |
| Invoice | Optional | Additional commercial reference cross-check |

## F3. Check Sequence

The checker runs in the following order:

1. **Identify certificate type** (8468 or 8322) from footer code and header
2. **Preliminary checks** — filename, page count, reference consistency, language
3. **Part I field-by-field check** against Part B rules and type-specific rules
4. **Weight and date logic cross-checks**
5. **Commercial document cross-check** against DN/dispatch confirmation and picklist
6. **Part II attestation check** against type-specific deletion map
7. **Stamp and signature check** — per-page and signing page
8. **EN/second language parity check**
9. **Produce report**

## F4. Report Format

**PAGE 1 — SUMMARY:**
- Header with certificate reference, filename, OV, SP reference, BCP, commodity, date checked
- Overall verdict box: PASS / HOLD
- Metric row: count of hard errors / medium warnings / low notices
- Flags in severity order: all hard errors first (red), then medium warnings (amber), then low notices (blue)
- Each flag states the field reference, page reference, and a concise description

**PAGE BREAK**

**SUBSEQUENT PAGES — FULL REPORT:**
- Detailed findings section by section
- Green pass-block for every field checked and found correct
- Photo and document cross-check section where applicable
- Rule set update recommendations table — new library entries and rule additions arising from this certificate
- Footer: rule set version, report date, certificate reference, OV SP reference

## F5. Deployment Options

**Current deployment:** Claude.ai (chat interface). Uploads accepted in the chat — EHC PDF, supporting documents, and photos. Checker applies rule set and produces a report.

**Future deployment options:**
- (a) Web application with structured upload form, automated check engine, and report generation
- (b) API integration with exporter systems for automated pre-departure checking

The rule set in Parts A–E is the source of truth for any automated implementation.

## F6. Rule Set Maintenance

The rule set is updated when:
- (a) new certificate types, BCPs, OVs or establishments are encountered
- (b) BCP feedback reveals new rejection grounds
- (c) calibration notes identify systematic false positives
- (d) policy or template changes are issued by APHA

Version history is maintained on the cover page.

---

*Rule Set v1.5 — April 2026. Original author: RR Cunningham BVetMed MRCVS (SP 136830). Adapted for structured use in the EHC Checker web application.*
