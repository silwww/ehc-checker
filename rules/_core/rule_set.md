---
name: _core/rule_set.md
source: EHC_Checker_RULE_SET_v4_1.docx
version: 4.1.3
sections: Part 0 (0.1-0.4, 0.5, 0.6), Part A (A1, A3, A4, A5, A5.1, A7, A7.1, A7.2, A7.3, A8, A9, A10, A11), Part B (B1, B2, B3, B4, B5, B6), Part I (I1, I2, I3, I4)
description: Core layer — universal rules that apply to every EHC regardless of route or commodity. Sections A2, A2.1, A6 are in the route layer (A10 Windsor Framework removed at v4.0); A12 and A13 are in JSON libraries. v4.0 changes (editorial review and rationalisation): gross weight non-tanker = hard error; bulk tanker identified by I.27 Type of packaging; Rotterdam unaccompanied I.13/I.15 hard errors (E61); AMR date threshold universal (A11); I.15 Esbjerg/Rotterdam vessel tick = hard error; Concise Report as default mode; A5.1 schedule pages universal rule; A10 Windsor Framework deleted (Severity Levels promoted from A11 to A10). v4.1 changes: A10 amended (typographical errors in free-text fields = AMBER); B1 I.18 ambient rule rewritten (dry powder silent pass any route; bulk tanker hard error if Chilled/Frozen); B1 I.17 amended with label-only vs valid examples lists; A7 small signing-box note added for 8322; A7.1 reformatted as 4×4 matrix; A8 reformatted as bullet list; A9 signing-date-not-today row added. v4.1.3: engine §2.6 added — calibration authority is binding (silent-pass calibrations emit zero flags; severity caps cannot be escalated by the engine on the same event).
---

# PART 0 --- SESSION BRIEFING: How to Start a New Chat

## 0.1 What This Tool Does

The EHC Checker systematically verifies completed UK export health
certificates against this rule set, cross-references accompanying
commercial documents, and produces a structured report. The goal is to
catch errors before the load departs rather than at the BCP.

## 0.2 Certificate Types in Use

| **EHC** | **Title** | **Product** | **Rule Part** |
|----|----|----|----|
| 8468 (DAIRY-PRODUCTS-PT) | Dairy products for human consumption requiring pasteurisation | Dairy — human consumption | D |
| 8322 | Milk, milk-based products and milk-derived products not for human consumption | Dairy — Category 3 ABP | C |
| 8384 (MPNT) | Animal health/official certificate to the EU — meat products not required to undergo specific risk-mitigating treatment | Cooked meat products — Treatment A or D | E |
| 8324 | Canned pet food intended for dispatch to or transit through the EU and NI | Canned pet food — Fc3 heat treated | F |
| 8350EHC COMP | Animal health/official certificate to the EU — composite products | Composite food products | J |
| 8436 (HEP) | Animal health/official certificate to the EU — hatching eggs of poultry other than ratites | Hatching eggs | K |
| 8471 (EGG-PRODUCTS-PT) | Egg products intended for human consumption | Egg products — human consumption | L |

## 0.3 What to Upload Per Check

| **Document** | **Requirement** |
|----|----|
| Signed EHC (PDF) | Mandatory — authoritative document |
| Delivery Note | Mandatory for bulk tanker loads (I.27 Type of packaging = BULK TANKER). Strongly recommended on all others. |
| Picklist / Allocation sheet | Recommended — enables batch and weight cross-check |
| Seal / trailer photos | Mandatory — bulk tanker loads and DSV533031–533040 (E54). Recommended all others. Photo is ground truth. |

## 0.4 How to Report — Session Mode

On load, the engine confirms the loaded Rule Set version and asks:
"FULL REPORT or CONCISE REPORT?" The declared mode applies for the
whole session. **Default if undeclared: CONCISE REPORT** (noted in the
report header).

| **Severity** | **Label** | **Action** |
|----|----|----|
| Hard error | RED | BCP will reject — load must not depart |
| Medium warning | AMBER | HOLD — resolve before dispatch |
| Low notice | BLUE | PASS — noted for information only |

**PASS** = zero RED, zero unresolved AMBER. **HOLD** = any RED or
unresolved AMBER.

# PART 0.5 — OBSERVATION DISCIPLINE (CRITICAL)

When reporting on any certificate content — footer codes, field values, stamp
presence, signatures, deletions, batch numbers, page counts, or anything else
visible on the document — ALWAYS report what you literally see on the page,
not what the rule set or trade-lane convention would predict.

Specific cases where models commonly confuse expectation with observation:

1. **Footer codes.** The rule set describes footer conventions per certificate
   type (e.g. "8322 pages carry footer code '8322EHC en'"). Some templates
   match this convention; others do not. Real 8322 templates in current
   circulation often show only the language code ('en' / 'fr' / 'da' / 'nl')
   in the footer, without any EHC prefix. The 8468, 8384, 8350, 8436, 8471
   templates (human consumption family) typically do show '{code}EHC {lang}'.
   Never assume a footer matches the rule set description — read what is
   printed on the page and report it literally.

2. **Header text.** Templates evolve. Do not paraphrase the header to match
   what the rule set expects. Quote the exact words visible.

3. **Stamp and signature content.** If a stamp shows "SP 632477", report
   "SP 632477". Do not expand to "SP 632477 (Silvia Soescu MRCVS)" unless
   the expansion is also literally visible on the page.

4. **Reference numbers, batch numbers, seal numbers.** Transcribe
   character-by-character. If an OCR artefact or scan degradation is present,
   flag it honestly rather than silently correcting to what the rule set
   expects.

5. **Dates.** Report the date printed on the page. Do not infer a date from
   a neighbouring document (delivery note, picklist) unless the EHC date is
   actually blank.

**Cross-check protocol for reporting:** before writing any Preliminary Check
statement about document content, ask: "Am I describing what I see, or what
I expect?" If you are describing what you expect based on the rule set,
rewrite the statement to describe what you see. If what you see differs from
the rule set convention, note the divergence explicitly — that is a potential
rule set update recommendation.

This Part 0.5 supersedes any assumption of template conformity elsewhere in
the rule set. Templates vary; the rule set describes typical patterns, not
guarantees.

# PART 0.6 — ENTITY NAME MATCHING (UNIVERSAL)

When matching I.1, I.5, I.6, I.11, or I.12 entity names against library
entries (H1 establishments, H2 consignees, H3 destinations, H4 hauliers),
normalise the candidate name BEFORE declaring "not in library":

- **Case-fold** — upper-case and lower-case are equivalent.
- **Collapse internal whitespace** to single spaces.
- **Drop trailing punctuation** (`.`, `,`).
- **Treat `and` ↔ `&` as equivalent** (e.g. `Jonker and Schut B.V.` matches `JONKER & SCHUT B.V.`).
- **Treat `B.V.` ↔ `BV` ↔ `B.V` as equivalent.**
- **Treat `Ltd` ↔ `Limited` as equivalent.**
- **Treat `GmbH` ↔ `G.m.b.H.` as equivalent.**

DO NOT normalise: street numbers, approval-number digits, postcodes, or
town names — those are matched literally.

**Two-key safeguard.** A library match is accepted only when the
normalised name AND at least one of (approval number OR postcode) agrees.
Name-only matches remain a LOW notice (advise library addition). This
prevents over-normalisation from producing false matches between
similarly-named entities at different locations.

This Part 0.6 applies to every certificate type and every commodity.
The engine layer's universal "new entity = BLUE low notice" rule fires
only when entity does not match after normalisation per this section.

# PART A --- Universal Rules: Apply to Every EHC Regardless of Type

## A1. Document Overview

This rule set covers UK export health certificates signed by an Official
Veterinarian under APHA authority. Certificate types in current use:
8468, 8322, 8384, 8324, 8350EHC COMP, 8436, 8471. Rules in Parts A and B
apply to all certificate types. Certificate-specific rules are in Parts
C (8322), D (8468), E (8384), F (8324), J (8350EHC COMP), K (8436), and
L (8471). Part G contains checker calibration notes.

Both 8468 and 8322 consist of an English section followed by a second
language section determined by the BCP entry point country, not the
destination country. 8384, 8324, 8436, 8471 and COMP follow the same
principle.

## A3. Filename Cross-Check

The filename should contain three elements matching the certificate: (1)
certificate reference — digits must match I.2 on all pages; (2)
commercial document reference — must match I.17; where I.17 has
multiple references, filename match on any one = pass; (3) date — must
match signing date. Any mismatch = medium warning.

## A4. Certificate Reference Consistency

Extract the EHC reference from every page header and II.a box. All pages
must show identical reference throughout. The first page of each
language section and any page containing the commodity description table
or product weight details are the highest-risk pages for retyping and
reinsertion — flag any mismatch by specific page number. Mismatch on
any page = hard error.

## A5. Pagination

All pages must show "X of N" where N is consistent across every page
including schedule pages. Inconsistent page totals = hard error. Known
failure mode: superimposed pagination (garbled text such as "111" or
"141") = hard error, not a scan artefact. Physical page count exceeding
declared N = hard error (see E52 — duplicate/extra pages on rolled
loads).

## A5.1 Schedule Pages — Universal Rule

Where a schedule page is appended to any EHC of any type, it must carry
the certificate reference, OV signature, stamp, and date matching the
signing date — hard error if any element is absent. The declared "X of
N" pagination must include schedule pages. See type-specific sections
for when schedule pages apply (C2 for 8322 Fines/downgrade loads; F3
for 8324 petfood; J8 for 8350EHC COMP).

## A7. Per-Page Stamp and Signature Requirement

Every page must carry at least one SP circular red stamp visible and a
full signature (not initials). Initials are only used adjacent to
individual deletions or added text, accompanied by a stamp.

Stamp consistency: SP reference number must be identical on every stamp
throughout the entire document. Different SP number on any page = hard
error. Same OV must sign and stamp entire document — two different OVs
= instant rejection.

> *Apparent SP discrepancy on a continuously signed single-OV document
> is almost certainly a scan artefact — only escalate if clearly and
> unambiguously different. On certificate types with a small signing
> box (e.g. 8322), stamps may extend beyond the box boundary — pass
> provided all elements are visible within the general signing area of
> the page.*

## A7.1 Adjacent Stamping by Deletion Method

A7.1 governs adjacent stamping for deletions and added text only. The
page-level stamp and full signature required on every page are governed
by A7. A single page-level stamp does NOT satisfy the per-deletion or
per-added-text requirement under Methods 1 or 2.

| **Page content** | **Method 1 (hand strikethrough)** | **Method 2 (Adobe strikethrough)** | **Method 3 (redaction/removal)** |
|----|----|----|----|
| Deletion(s) | Stamp + initials per deletion | Stamp + initials per deletion | No stamp at deletion site |
| Added text | Stamp + initials per item | Stamp + initials per item | Stamp + initials per item |
| No deletions, no added text | Page-level stamp + signature per A7 only | Page-level stamp + signature per A7 only | Page-level stamp + signature per A7 only |

Mixed methods on the same certificate: each page is judged against the
rules for the method actually used on that page. Signing pages — all
styles: A9 rules apply unchanged regardless of deletion method.

## A7.2 Added Text in Template Blank Fields

EHC templates contain predefined blank fields the OV must complete at
certification — country name, zone code, dates, batch and
establishment references. Completion of any such field — by pen, Adobe
text insertion, or exporter pre-print adopted by the OV — is added
text under A7.1. An adjacent SP circular stamp and OV initials are
required on every such field, regardless of whether the page already
carries deletions or a page-level stamp. Absence = hard error. The
stamp must appear within the same field box, the same paragraph, or
the immediately adjacent margin. See E60. Per-certificate-type field
lists: C10 (8322), D5 (8468).

> *v4.1 note: A proposal to amend A7.2 for dual-purpose stamps
> covering both deletion and added-text completion was considered and
> **rejected**. The per-field stamp+initials requirement stands
> unchanged.*

## A7.3 Ink Colour — Universal Requirement

All stamps, initials, and signatures on every EHC must be in a colour
other than black. Blue is conventional. Any stamp, initial, or
signature in unambiguously black ink = hard error on all EHC types.
Note: ink colour cannot be reliably determined from a scanned PDF —
see E5. Only raise as a hard error where the ink is unambiguously
black on the original physical document, not from scan appearance
alone.

## A8. Deletion Methods and Stamp Requirements

- **Method 1 — hand strikethrough:** Stamp (SP circular red) with
  initials required adjacent to each deletion. Z-strike valid for
  blocks of text including multiple sub-clauses.

- **Method 2 — Adobe strikethrough:** Stamp with initials required
  adjacent to each deletion. A single page-level stamp does NOT
  satisfy the per-deletion requirement.

- **Method 3 — redaction/whiteout/text removal:** No stamp required
  adjacent to deleted text. Only requirement: at least one stamp per
  page (A7).

- **Mixed methods:** valid.

- **Added text of any kind:** see A7.1 and A7.2 — adjacent stamp and
  initials required regardless of method. **Exception:** N/A entered
  in I.21 transit box — exempt.

## A9. Signing Page Rules

| **Element** | **Rule** |
|----|----|
| SP stamp in signature field | Mandatory — satisfies the page-level stamp requirement. Hard error if absent. |
| Name and qualification | Must be present as name/qualification stamp (rectangular) OR handwritten name in capitals plus qualification |
| Date | Must be present — must be same as or earlier than I.14 departure date |
| Signature | Must be present — full signature required, not initials |
| Both signing pages (EN + second language) | SP number, initials, name must be identical on EN and second language signing pages; dates must match — mismatch = hard error |
| Positional flexibility | All signing area elements need only appear anywhere within the signing area on the page. Exact positional alignment to printed field labels is not required and must not be flagged. |
| OV/CO deletion | Stamp + initials required adjacent to deletion if Method 1 or Method 2. No stamp required if Method 3. See E40. |
| Signing date not today | Where the signing date on any page is not the current date, raise MEDIUM WARNING (AMBER) — possible rolled load with unamended pages. OV must confirm all date fields (I.14 and both signing pages) are consistent and current before dispatch. |

> *NOTE: For live EHCs the signing date on both pages will almost
> always be today. The medium warning for a date that is not today is
> raised to flag possible rolled loads. Only flag if the signing date
> is not today. Do not flag if the two signing pages differ from each
> other (that remains a hard error), or if the date creates a logic
> failure (signing after departure, or before production date).*

## A10. Severity Levels

| **Severity** | **Description** | **Examples** |
|----|----|----|
| Hard error (RED) | BCP will reject | Missing stamp/signature, wrong OV/SP, reference mismatch, date error, wrong species retained, missing seal, weight inconsistency, two transport boxes ticked, signing page date mismatch, page count exceeds declared pagination |
| Medium warning (AMBER) | BCP may reject — resolve before dispatch | Filename mismatch, DN ref mismatch, missing I.17, blank I.11, ISO code substitution, new consignee on unknown trade lane, signing date not today |
| Low notice (BLUE) | Valid variation, noted — no action | Extra stamps, older template, preferred text form, new destination for library entry, new consignee on known trade lane |

**Typographical errors in any free-text field = medium warning
(AMBER).** OV to confirm and correct before dispatch. Where the
authoritative coded field alongside (ISO code, zone code) is correct,
the error is AMBER not RED but must not be passed without OV
attention. BCPs including SIVEP have rejected on presentation grounds.

## A11. AMR Attestation — Universal Date Threshold

| **DATE THRESHOLD: II.1a AMR attestation applies to all EHC types (8468, 8384, 8350EHC COMP, 8436, 8471). Until 2 September 2026: present and completed = hard error (not yet applicable); deleted or redacted = silent pass. From 3 September 2026: deleted or redacted = hard error. Rule Set must be updated on or before that date. See E11.** |
|----|

# PART B --- Part I Field Rules: Apply to All EHCs

## B1. Field Rules — I.1 to I.9

| **Field** | **Rule** |
|----|----|
| I.1 Consignor / Exporter | Must be populated — hard error if blank. Trading entity or registered office acceptable where I.11 correctly identifies the dispatch establishment. Cross-check against H2 consignee library and H1 establishment library. Entries in H1 with note "I.1 consignor only" play the I.1 consignor role even though approval number is N/A — treat as a confirmed library entity, not a new one. |
| I.2 Certificate ref | Must match II.a reference on every page. |
| I.3 / I.4 CCA / LCA | Fixed DEFRA / APHA text — pass if present. |
| I.5 Consignee / Importer | Must be populated. Cross-check against H2/H3 consignee library. See E15 (AFI standing pattern with Irish/NI exception) and E14 (Novades I.5 = I.6). |
| I.6 Operator responsible | Hard error only if completely blank with no marking. Valid if populated, struck through with stamp/initials, or marked N/A. Same entity as I.5 = normal on some lanes — do not flag. |
| I.7 Country of origin | Must be populated. Preferred: GREAT BRITAIN / GB. |
| I.8 Region of origin | Rule varies by certificate type — see sub-table below. |
| I.9 Country of destination | Must be populated. Non-EU destination (excluding Switzerland): raise transit notice. |

### I.8 Region of Origin — by Certificate Type

| **Certificate type** | **Required code** | **Hard error if…** |
|----|----|----|
| 8468 dairy | GB-0 | Absent or any other code |
| 8322 Cat 3 dairy | GB-0 | Absent or any other code |
| 8324 canned petfood | N/A | Any zone code shown |
| 8471 egg products | GB-0 | Absent or any other code |
| 8350EHC COMP | GB-0 | Absent or any other code |
| 8384 poultry meat (MPNT) | GB-1 | Shows GB-0 or any other code |
| 8436 hatching eggs | GB-0 or GB-1 — depends on current HPAI status | Wrong zone code for current status. OV must check APHA HPAI map before every signing. |

> *GB-0 and GB-1 are never interchangeable except on 8436. A GB-0 on
> an 8384 poultry load = hard error. A GB-1 on a dairy load = hard
> error.*

## B1. Field Rules — I.11 to I.19

| **Field** | **Rule** |
|----|----|
| I.11 Place of dispatch | Name and address required. Approval number required — see H1 establishment library. Gregory Distribution, North Tawton, EX20 2EB: U1183488/TRANS (Cat 3 loads). Gregory Distribution, any other address: N/A — loading/logistics only. Heathfield: N/A — loading/logistics only. For 8436: PHS approval number required — medium warning if absent. If completely blank = low notice only. **NOTE:** I.11 is the dispatch establishment. I.13 is logistics/loading address only — no approval number required or expected at I.13. |
| I.12 Place of destination | Must be completed on all EHC types — blank = hard error. Approval number rules type-specific — see sub-table below. |
| I.13 Place of loading | Must be populated. May differ from I.11 — not an error. No approval number required. Immingham-Esbjerg (DKEBJ1): must include 'Immingham' in any form — full address not required. Rotterdam unaccompanied (NL-RTM1): exit port must be shown — hard error if warehouse address shown instead. Purfleet and Harwich are confirmed exit ports. OV may override with written confirmation if different port used (E61). |
| I.14 Departure date | Must be populated. Must be same day as or later than signing date — hard error if earlier. On groupage loads the signing date may precede I.14 by several days — normal, do not flag. |
| I.15 Means of transport | At least one box ticked and registration/identification present. See route sub-table below. |
| I.16 Entry BCP | Must be populated. Drives language check — see A6 (route layer). |
| I.17 Accompanying documents | Must contain a unique load identifier — hard error if blank, N/A, or label-only. **Label-only hard errors:** INVOICE, DN, INV, ORDER, REF, DELIVERY NOTE (no reference number). **Valid examples:** numeric PO (e.g. 7889908), batch ref (e.g. AF26165001), prefixed number (e.g. INV-28681, SOP/635056). Where multiple references present, filename match on any one = pass. |
| I.18 Transport conditions | Exactly one box ticked — hard error if two or more ticked. **Tick the temperature condition matching transport conditions, not product type alone.** Ambient: correct for all shelf-stable dry dairy powders on any route, any BCP — silent pass, no flag. Also correct for all bulk tanker loads (I.27 Type of packaging = BULK TANKER) — hard error if Chilled or Frozen ticked (E8). Chilled / Frozen: required where product has active cold-chain integrity requirements and is transported in a temperature-controlled vehicle or container. Hard error: wrong condition ticked for the transport method used. OV may override with written confirmation. |
| I.19 Container / Seal number | Seal number must be present for sealed loads — hard error if blank. Multiple seal numbers acceptable. Trailer plate in Container No field = acceptable practice. Bulk tanker: Container N/A acceptable. Bulk tanker loads: mandatory in-situ seal photo cross-check — see E54. Hard error on any discrepancy. DSV533031–533040: four seal numbers required — hard error if fewer (E27). Other DSV-prefixed trailers: standard seal rules apply. Sticker seal runs: first and last reference sufficient where seals applied sequentially. |

### I.12 Approval Number — by Certificate Type

| **Certificate type** | **Approval number rule** |
|----|----|
| 8468 — general | Approval number field = N/A. Correct and expected — do not flag absence. If approval number IS populated and matches an H3 entry (after name normalisation per Part 0.6) — silent pass, library-confirmed. If approval number IS populated and no H3 match — LOW notice, recommend library addition. The universal "new entity = BLUE" engine rule applies without escalation. |
| 8468 — AFI LPC tanker to Denmark | Destination approval number required — hard error if absent. EHC typically redacted so field rarely blank; flag only if visibly empty. See H3 M119 and E64. |
| 8468 — Poland exception | Polish destination on County Milk trade lane: destination approval number required — medium warning if absent. Milkpol → Logit 30106002; County Milk → ENTC PL 28041606 UE; Trade Milk Warehouse PL04631604WE. |
| 8322 Cat 3 | Destination approval number required — medium warning if absent. See C5 for exceptions. |
| 8324 petfood | Approval number N/A. Destination address required. |
| All other types | Populate per destination library H3/H4. |

### I.15 Means of Transport — by Route

| **Route / load type** | **I.15 requirement** | **Severity if wrong** |
|----|----|----|
| Standard road load | Road vehicle ticked. Registration present. | Hard error if blank |
| Vessel / ro-ro (accompanied) | Vessel + Road vehicle both ticked. I.15 Identification = N/A — trailer plate in I.19 (E12). | Hard error if neither ticked |
| Esbjerg DKEBJ1 — all loads | Vessel + Road vehicle both ticked. | Hard error |
| Rotterdam NL-RTM1 unaccompanied | Vessel + Road vehicle both ticked (E61). | Hard error |
| Air freight / courier samples | Courier waybill reference in I.15 Identification — accepted practice (E57). | Low notice on first instance |

> *PENDING: BCP/DAERA preference on I.15 vessel tick and I.13 exit
> port for NI-destined loads — awaiting confirmation. Update
> universally across all EHC types when confirmed.*

## B1. Field Rules — I.20 to I.27

| **Field** | **Rule** |
|----|----|
| I.20 Certified as or for | 8468: 'Products for human consumption' must be ticked — hard error if not. 8436: 'Germinal products' must be ticked — hard error if not. 8384: 'Products for human consumption' must be ticked — hard error if not. 8322 / 8324: I.25 governs — see C3. |
| I.22 For internal market | Must be ticked for standard EU / NI / Switzerland consignment. |
| I.24 Total number of packages | Must be populated. Must match commodity description table package count — hard error if mismatch. |
| I.25 Commodity certified for (8322 / 8324 only) | Exactly one tickbox must be ticked — hard error if none or more than one. Options: Animal feedingstuff / Further process / Production of petfood / Technical use. See C3. |
| I.26 Net weight | Must be populated — hard error if absent. Must match commodity description table — hard error if mismatch. |
| I.26 Gross weight | Non-tanker loads: must be populated — hard error if absent. Bulk tanker loads (I.27 Type of packaging = BULK TANKER): silent pass — do not mention in report. |
| I.27 Commodity description table | Populated rows must be complete in all fields. Unused rows: must be struck through or redacted — Method 3 blank = silent pass. Net weights across all rows must sum to I.26 — hard error if not. Package count across all rows must sum to I.24 — hard error if not. Production dates must match pallet label photos where uploaded — discrepancy = hard error. Silent pass if no photos. |

## B2. Weight Consistency

Net weight in I.26 must match the commodity description table net
weight. Mismatch = hard error. Cross-check against delivery note or
picklist when available.

## B3. Date Logic

Rule: Production date ≤ Signing date ≤ I.14 departure date.
Collection/production date in commodity table must be same day or
earlier than signing date — hard error if after. Signing date must be
same day or earlier than I.14 departure date — hard error if after.

> *Long gap between production and departure on aged products (aged
> cheese, aged powders, canned product) = valid — do not flag.*

## B4. Photo Evidence

> *PHOTO IS GROUND TRUTH. If a photo of any plate, seal or vehicle is
> uploaded it is the final and absolute decision maker. Any
> discrepancy between the EHC/dispatch document and the photo is
> resolved in favour of the photo. A combined shot showing the seal
> number, seal integrity and trailer plate in one frame = full
> verification of all three elements.*

## B5. ISO Country Code Vigilance

Check all ISO country code fields for digit/letter substitution. Known
confusion pairs: ES/E5, DK/OK, PT/P1, NL/N1, DE/GE. Severity: medium
warning. See H7 for the full EU/associated-country ISO code reference.

## B6. Species Rule

| **Certificate type** | **Rule** |
|----|----|
| 8468 / 8322 dairy | Bos taurus only. All other species must be fully deleted in BOTH English and second language sections — even a single word fragment = hard error. |
| 8384 cooked meat / 8324 petfood | Species in I.28 must match products on schedule. 'Member States' option always retained — never flag as undeleted fragment. |
| 8436 hatching eggs | Species in I.27 consistent with poultry category declared. Ratites must not appear. |
| 8471 egg products | Species in I.27 must match product — Gallus gallus for standard hen egg products. Latin name required. |

> *OV numbering systems: SP number (APHA-issued, used on circular
> stamps) and RCVS number (Royal College registration, on
> qualification stamp) are different systems for the same OV. Do not
> flag as mismatch or as two different OVs.*

# PART I --- Report Format and Check Sequence

## I1. Check Sequence

Before any check begins, the operator must declare report mode for the
session: FULL REPORT or CONCISE REPORT. The declared mode applies for
all certificates checked within that session. **Default if undeclared:
Concise Report** (noted in the report header).

- Identify certificate type from footer code and header.

- Preliminary checks — filename, page count including schedule pages
  (A5.1), reference consistency across all pages and II.a boxes.

- Part I field-by-field check against Part B rules and type-specific
  rules.

- Weight and date logic cross-checks (B2, B3).

- Commercial document cross-check against DN/dispatch confirmation and
  picklist/schedule.

- Part II attestation check against type-specific deletion map.

- Stamp and signature check — per-page and signing page (A7, A9).

- EN/second language parity check where applicable (E47).

- Added text stamp check (E60, A7.2): review both language sections
  for text entered into attestation clause blank fields or commodity
  table fields. Actively check specific field locations listed in C10
  (8322) and D5 (8468) — do not rely on spotting handwriting;
  Adobe-inserted text is indistinguishable from pre-printed text in a
  scan. Confirm each instance carries adjacent SP stamp and initials
  — absent = hard error.

- Photo evidence: if photos uploaded, use as ground truth for seal
  number and trailer plate cross-check. For bulk tanker loads (I.27
  Type of packaging = BULK TANKER): apply E53 (DN mandatory) and E54
  (in-situ seal photo cross-check). For DSV533031–533040 range: apply
  E27 four-seal rule.

- Produce report with PASS or HOLD verdict.

## I2. Full Report Format

SUMMARY: Certificate reference, filename, OV, SP reference, BCP,
commodity, date checked. Overall verdict: PASS / HOLD. Flag counts.

FLAGS: In severity order — hard errors (RED), medium warnings (AMBER),
low notices (BLUE). Each flag states field reference, page reference,
and concise description.

DETAILED FINDINGS: Section by section. Green pass-block for each
field/clause checked and found correct. Document cross-check section.
Rule set update recommendations.

FOOTER: Rule set version, report date, certificate reference, OV SP
reference.

## I3. Concise Report Format

**Default mode.** Use unless Full Report is explicitly declared at
session start.

| **Section** | **Content** |
|----|----|
| 1 — Title / Summary | Certificate ref, filename, OV, SP reference, BCP, commodity, date checked. |
| 2 — Verdict | PASS or HOLD. |
| 3 — Flag counts | e.g. 0 RED / 1 AMBER / 2 BLUE. |
| 4 — Flag list | Confirmed flags only — field ref, page ref, rule code(s), required action. |
| 5 — Checks performed | Brief bullet list of sections and fields checked. No discussion or reasoning. |
| 6 — Rule set update recommendations | Concise list of any new calibration notes, library additions, or rule amendments arising from this certificate. |

Do not show: withdrawn flags, alternative interpretations considered,
or step-by-step checking narrative.

## I4. Flag Emission Discipline

Before emitting any flag at any severity, complete your reasoning internally
and reach a firm conclusion. A flag is a concluded finding, not a train of
thought. Specifically:

1. **Do not emit flags you retract within the same flag body.** If your
   reasoning leads you to conclude "this is actually a PASS" or "withdrawing
   this" or "on closer inspection this is correct", DO NOT emit the flag
   at all. Drop it. The reasoning belongs in your internal process, not in
   the user-facing report.

2. **Do not emit hard errors on speculation.** A hard error means "BCP will
   reject this consignment." Do not promote a finding to hard error because
   "it might indicate a document version problem" or "could suggest a
   signing anomaly" when the underlying observation is consistent with
   normal practice. If you are uncertain, the appropriate severity is
   medium warning (needs confirmation) or low notice (informational).

3. **If observation and expectation diverge, the flag describes the
   observation, not your confusion.** If a field appears blank but on closer
   look is populated, the correct action is no flag. If a footer differs
   from rule set convention but matches a known template variation (per
   Part 0.5 Observation Discipline), the correct action is a low notice
   documenting the template variation — not a hard error on the mismatch.

4. **One flag per finding.** Do not emit multiple flags that argue with
   each other about the same field. Resolve the question in reasoning,
   emit a single flag with the final severity and clear language.

5. **Retraction language is a signal you should not have emitted the flag.**
   If you find yourself writing any of: "Self-retracted", "Withdrawing this",
   "Re-examining", "On closer inspection this is actually", "Actually this
   passes", "[Retracted]" — that is evidence the flag should not have been
   emitted in the first place. Revise your approach and drop the flag
   before finalising the report.

This discipline applies to all severities (hard error, medium warning, low
notice) and all rule set parts.

## Version History

| **V** | **Date** | **Summary** |
|----|----|----|
| 2.7 | April 2026 | Three-layer architecture established. Adjacent stamping rules clarified (A7.1). |
| 2.8 | April 2026 | E52 added (duplicate/extra pages on rolled loads = hard error). A9 amended (signing date not today = medium warning). A2.1 added (footer code conventions by certificate family). I.11 vs I.13 distinction hardened. |
| 2.9 | April 2026 | AFI tanker seal verification tightened following DN/seal mismatch incident (24 Apr 2026). E53 added (AFI tanker EHC — DN missing = medium warning). E54 added (AFI tanker in-situ seal photo cross-check — any mismatch = hard error). E27 amended (DSV533031-533040 H&S absence-of-photo exception removed). A12: Neil Blake BVSC MRCVS SP 155869 added. H4: Bech Gruppen I.25 'Further process' confirmed for AFI Variolac WPP loads. |
| 3.0 | April 2026 | I1 amended: mode selector — operator must declare Full Report (I2) or Training Report (I3) at session start; default Full Report. I3 added: Training Report condensed format. E44 amended: bulk tanker gross weight absence = no flag at any severity (clean pass). |
| 3.1 | April 2026 | Part 0 amended: paste instruction removed (Rule Set is project-held). Mode prompt added — engine confirms version and asks operator to declare report mode before the first certificate is submitted. |
| 3.2 | April 2026 | E16 amended: AQ-prefix batch truncation = silent pass at all severity levels. E55 added: AFI DN seal zero-padding formatting note. E56 added: boxed type suffix on overseas trailer ID. |
| 3.3 | April 2026 | First live 8350EHC COMP check (Truly Treats / Europ Foods Spain trade lane). Composite library additions. |
| 3.5 | April 2026 | E18 amended: DAIRY WHEY POWDER on AFI Variolac = silent pass. Port of Purfleet confirmed as standing I.13 loading point on Novades/Van Bentum/Zeebrugge lane. Estron Group added as logistics operator on Novades/Buisman/Rotterdam lane. |
| 3.6 | May 2026 | E44 amended (bulk tanker gross weight silent pass). E27 amended (Silvia Soescu clarification). E54 amended (rear seal photo exception). A13: Stockholm Airport added. H3: Caldic Ingredients added. E58 added. |
| 3.7 | May 2026 | B1 I.17 hard error clarification — label-only references are hard errors. |
| 3.8 | May 2026 | E58 duplicate removed. E58 (NEW): Forthglade/Renske multi-EHC groupage. H5: Renske and Yomax added. |
| 3.9 | May 2026 | A7.2, A7.3, A8 amended (added-text adjacent stamp universal). C10, D5 added. E18, E49, E60 amended/added. H1/H2: Taw Valley lane conventions. |
| 4.0 | May 2026 | Full editorial review and rationalisation. Rules tightened and deduplicated throughout. Key changes: gross weight non-tanker = hard error; bulk tanker identified by I.27 Type of packaging; Rotterdam unaccompanied I.13/I.15 hard errors (E61); AMR date threshold universal (A11); RUM_BOV_OV BSE deletion corrected; I.15 Esbjerg/Rotterdam vessel tick = hard error; E15 AFI I.5 Irish/NI exception; Concise Report as default mode; A5.1 schedule pages universal rule; A10 Windsor Framework deleted (Severity Levels promoted to A10); Belgium language clarified; 12 calibration notes retired. Libraries updated throughout. |
| 4.1 | May 2026 | E62: AFI commercial document reference / invoice PO mismatch — silent pass. E63: Leap year expiration date validity. E64: M119 at I.12 on AFI LPC tanker to Denmark — standing requirement, no flag. E16 amended: Fines/downgrade AQ F-suffix batch format on schedule pages — silent pass. B1/I.18 amended: Ambient rule rewritten — dry powder silent pass any route; bulk tanker ambient correct, hard error if Chilled/Frozen. A10 amended: typographical errors in free-text fields = AMBER. A7.2 dual-purpose stamp amendment proposed — rejected, recorded. Library additions: Farmel Dairy Products BV (H2), Milkeen (H2), Trade Milk Warehouse PL04631604WE (H3), Biomediks Lab SL (H3). |
| 4.1.1 | May 2026 | B1 I.1 amended: explicit cross-check against H2 consignee library AND H1 establishment library; entries in H1 with note "I.1 consignor only" treated as confirmed library entities. Resolves false positive on County Milk Products Ltd (I.1 consignor on Saputo/Davidstow loads). |
| 4.1.2 | May 2026 | Engine §2.5 flag-deduplication added (one root cause, one flag — formalises 30 April 2026 Notion ANTI_DUPLICATE_FLAGS_PROMPT principle; engine version 1.1 → 1.2). Part 0.6 entity-name normalisation added (`and ↔ &`, `B.V. ↔ BV`, `Ltd ↔ Limited`, `GmbH` variants; two-key safeguard: name + approval/postcode). B1 I.12 8468-general extended to handle approval-number PRESENCE (library-confirmed = silent pass; unknown = LOW). E14 generalised from Novades-only to "H2 entries with note `I.5 and I.6 same entity = normal` are confirmed standing practice" (Farmel BV joins Novades under this rule). E6 extended for DC-document handwriting artifacts (single LOW on DC, EHC silent pass when photo confirms). Resolves five-flag false-positive set on EHC 26-2-126149 (County Milk / Saputo / Farmel / Jonker & Schut). |
| 4.1.3 | May 2026 | Engine §2.6 calibration authority added (silent-pass calibrations are binding to zero flags; severity-cap calibrations cannot be escalated by the engine on the same event; engine version 1.2 → 1.3). Closes recurring false-positive pattern where the engine emitted LOW "for awareness" on E16-style silent-pass calibrations (E11 AMR, E16 Saputo batch, E18 Variolac) and escalated HARD on top of E6-style single-LOW calibrations. Observed and resolved on EHC 26-2-126149 (LOW on AQ6095 batch truncation suppressed; HARD on trailer plate O/H vs O/A character mismatch suppressed, LOW on DC retained as calibrated). No calibration text changes — fix is in engine interpretation. |
