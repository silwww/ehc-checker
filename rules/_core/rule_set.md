---
name: _core/rule_set.md
source: EHC_Checker_RULE_SET_v2_7.docx
version: 2.7
sections: Part 0 (0.1-0.4), Part A (A1, A3, A4, A5, A7, A7.1, A8, A9, A11), Part B (B1-B8), Part I (I1-I2)
description: Core layer — universal rules that apply to every EHC regardless of route or commodity. Sections A2, A2.1, A6, A10 are in the route layer; A12 and A13 are in JSON libraries. Version held at 2.7 — v2.8 dairy-driven clarifications (A9 signing-date-not-today row, A11 severity additions, B1 I.11/I.13 hardening) applied without version bump per task directive; shared layer not churned on commodity-specific edits.
---

# PART 0 --- SESSION BRIEFING: How to Start a New Chat

## 0.1 What This Tool Does

The EHC Checker systematically verifies completed UK export health
certificates against this rule set, cross-references accompanying
commercial documents, and produces a structured report. The goal is to
catch errors before the load departs rather than at the BCP.

## 0.2 Certificate Types in Use

  --------------------- ------------------- --------------- ---------------
  **EHC**               **Title**           **Product**     **Rule Part**

  8468                  Dairy products for  Dairy --- human D
  (DAIRY-PRODUCTS-PT)   human consumption   consumption     
                        requiring                           
                        pasteurisation                      

  8322                  Milk, milk-based    Dairy ---       C
                        products and        Category 3 ABP  
                        milk-derived                        
                        products not for                    
                        human consumption                   

  8384 (MPNT)           Animal              Cooked meat     E
                        health/official     products ---    
                        certificate to the  Treatment A or  
                        EU --- meat         D               
                        products not                        
                        required to undergo                 
                        specific                            
                        risk-mitigating                     
                        treatment                           

  8324                  Canned pet food     Canned pet food F
                        intended for        --- Fc3 heat    
                        dispatch to or      treated         
                        transit through the                 
                        EU and NI                           

  8350EHC COMP          Animal              Composite food  J
                        health/official     products        
                        certificate to the                  
                        EU --- composite                    
                        products                            

  8436 (HEP)            Animal              Hatching eggs   K
                        health/official                     
                        certificate to the                  
                        EU --- hatching                     
                        eggs of poultry                     
                        other than ratites                  
  --------------------- ------------------- --------------- ---------------

## 0.3 What to Upload Per Check

  ----------------- ---------------------------------------------
  **Document**      **Notes**

  Signed EHC (PDF)  Required --- the authoritative document

  Delivery Note /   Strongly recommended --- required for bulk
  Dispatch          tanker loads
  Confirmation      

  Allocation /      Recommended --- enables batch and weight
  Picklist Sheet    cross-check

  Photos: combined  Recommended. One photo showing seal number,
  seal-on-trailer   seal integrity and trailer plate in a single
  shot              frame is accepted as full verification. Photo
                    is ground truth.
  ----------------- ---------------------------------------------

## 0.4 How to Report

  --------------- ------------------------------------------------
  **Severity**    **Action**

  Hard error      BCP will reject --- load must not depart
  (RED)           

  Medium warning  Resolve before dispatch where possible --- BCP
  (AMBER)         may query

  Low notice      Valid variation, noted for information --- no
  (BLUE)          action required
  --------------- ------------------------------------------------

Give a clear PASS or HOLD verdict. PASS = no hard errors. HOLD = one or
more hard errors or unresolved medium warnings requiring confirmation
before dispatch.

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

# PART A --- Universal Rules: Apply to Every EHC Regardless of Type

## A1. Document Overview

This rule set covers UK export health certificates signed by an Official
Veterinarian under APHA authority. Certificate types in current use:
8468, 8322, 8384, 8324, 8350EHC COMP, 8436. Rules in Parts A and B apply
to all certificate types. Certificate-specific rules are in Parts C
(8322), D (8468), E (8384), F (8324), J (8350EHC COMP), and K (8436).
Part G contains checker calibration notes.

Both 8468 and 8322 consist of an English section followed by a second
language section determined by the BCP entry point country, not the
destination country. 8384, 8324, 8436, and COMP follow the same
principle.

## A3. Filename Cross-Check

The filename should contain three elements matching the certificate: (1)
certificate reference --- digits must match I.2 on all pages; (2)
commercial document reference --- must match I.17; where I.17 has
multiple references, filename match on any one = pass; (3) date --- must
match signing date on final pages. Any mismatch = medium warning.

## A4. Certificate Reference Consistency

Extract the EHC reference from every page header and II.a box. All pages
must show identical reference throughout. The first page of each
language section and any page containing the commodity description table
or product weight details are the highest-risk pages for retyping and
reinsertion --- flag any mismatch by specific page number. See E41.
Mismatch = hard error.

## A5. Pagination

All pages must show \"X of N\" where N is consistent across every page
including schedule pages. Inconsistent page totals = hard error. Known
failure mode: superimposed pagination (garbled text such as \"111\" or
\"141\") = hard error, not a scan artefact.

## A7. Per-Page Stamp and Signature Requirement

Every page must have at least one SP circular red stamp visible. Every
page must have a full signature (not initials). Initials are only used
adjacent to individual deletions or added text, accompanied by a stamp.

Stamp consistency: SP reference number must be identical on every stamp
throughout the entire document. Different SP number on any page = hard
error. Same OV must sign and stamp entire document --- two different OVs
= instant rejection.

  ---------------------------------------------------------------
  **NOTE: On a continuously signed single-document EHC by one OV
  using their own stamp, an apparent SP number discrepancy
  between pages is almost certainly a scan artefact. Only
  escalate if the number is clearly and unambiguously different
  (e.g. a completely different digit sequence).**

  ---------------------------------------------------------------

## A7.1 Adjacent Stamping by Deletion Method

Section A7 establishes that every page must carry at least one SP
circular red stamp and full signature. Section A7.1 clarifies the
additional stamping required adjacent to deletions and added text, which
varies by deletion method.

Style 1 --- Manual deletions (pen strikethrough, Method 1): Each
individual deletion must carry an adjacent SP stamp and initials. Each
piece of added text written in pen must also carry an adjacent SP stamp
and initials. These are in addition to the mandatory page-level stamp.

Style 2 --- Adobe deletions (digital strikethrough, Method 2): Identical
requirements to Style 1. A single page-level stamp does NOT satisfy the
per-deletion requirement.

Style 3 --- Redacted certificates (text removal, Method 3): No adjacent
stamp required at the location of removed text. Page must still carry
its mandatory page-level stamp. Where added text is present on a
redacted page, an SP stamp and initials must appear adjacent to that
added text.

Signing pages --- all styles: A9 rules apply unchanged regardless of
deletion method. Mixed methods on the same certificate: each page is
judged against the rules for the method actually used on that page.

  ------------------------- ------------------- ------------------
  **Page contains**         **Adjacent stamps   **Page-level
                            required**          stamp**

  Method 1 or 2 deletions   One per deletion    Required (A7)

  Method 1 or 2 added text  One per added text  Required (A7)
                            item                

  Method 3 redactions only, None                Required (A7)
  no added text                                 

  Method 3 with added text  One per added text  Required (A7)
  (digital or handwritten)  item                

  Page with no deletions    None                Required (A7)
  and no added text (any                        
  method)                                       

  Signing page (any method) Per A9              Per A9
  ------------------------- ------------------- ------------------

## A8. Deletion Methods and Stamp Requirements

- Method 1 --- Hand pen strikethrough: Stamp (SP circular red) with
  initials required adjacent to each deletion. Z-strike acceptable for
  blocks of text including multiple sub-clauses.

- Method 2 --- Adobe PDF strikethrough: Stamp with initials required
  adjacent to each deletion. A single page-level stamp does NOT satisfy
  the per-deletion requirement.

- Method 3 --- Redaction (whiteout/text removal): No stamp required
  adjacent to deleted text. Only requirement: at least one stamp per
  page.

Mixed methods: valid. Added text (e.g. GB-0 zone code): stamp required
adjacent --- except N/A added to I.21 transit box which is exempt.

## A9. Signing Page Rules

  ------------------ ---------------------------------------------
  **Element**        **Rule**

  SP stamp in Final  Mandatory --- hard error if absent
  OV Signature field 

  Page stamp         Mandatory --- hard error if absent

  Name and           Must be present as name/qualification stamp
  qualification      (rectangular) OR handwritten name in capitals
                     plus qualification

  Date               Must be present --- must be same as or
                     earlier than I.14 departure date

  Signature          Must be present --- full signature required,
                     not initials

  Same OV both       SP number, initials and name must be
  signing pages      identical on EN and second language signing
                     pages

  Signing page dates EN and second language signing page dates
                     MUST ALWAYS match each other --- mismatch =
                     hard error regardless of what date appears

  Positional         All signing area elements need only be
  flexibility        present within the signing area on the page.
                     Exact positional alignment to printed field
                     labels is not required and must not be
                     flagged. A date handwritten anywhere within
                     the signing area is always a pass --- do not
                     raise any flag, medium warning or otherwise,
                     where the correct date is legible within the
                     signing area. This applies equally to EN and
                     second language signing pages.

  OV/CO deletion     Stamp and initials required adjacent to
                     deletion if Method 1 (hand strikethrough) or
                     Method 2 (Adobe strikethrough). No stamp
                     required if Method 3 (redaction/text
                     removal). See E40.

  Signing date not   Where the signing date on any page of the
  today              EHC is not the current date, raise as a
                     MEDIUM WARNING (AMBER) --- possible rolled
                     load with unamended pages. OV must confirm
                     all date fields (I.14 and both signing
                     pages) are consistent and current before
                     dispatch.
  ------------------ ---------------------------------------------

  ---------------------------------------------------------------
  **NOTE: For live EHCs the signing date on both pages will
  almost always be today. The medium warning for a date that is
  not today is raised to flag possible rolled loads. Only flag if
  the signing date is not today. Do not flag if the two signing
  pages differ from each other (that remains a hard error), or if
  the date creates a logic failure (signing after departure, or
  before production date).**

  ---------------------------------------------------------------

## A11. Severity Levels

  -------------- --------------------- ----------------------------
  **Severity**   **Description**       **Examples**

  Hard error     BCP will reject the   Missing stamp or signature,
  (RED)          consignment           wrong OV/SP on any page,
                                       wrong reference, date error,
                                       wrong species retained,
                                       missing seal, weight
                                       inconsistency, two transport
                                       condition boxes ticked,
                                       EN/second language parity
                                       mismatch, signing page dates
                                       differ, physical page count
                                       exceeds declared pagination

  Medium warning SIVEP/BCP may reject  Filename mismatch, DN
  (AMBER)        on a bad day ---      despatch ref mismatch,
                 resolve before        missing I.17 reference,
                 dispatch              blank I.11 with no marking,
                                       ISO code digit/letter
                                       substitution, new consignee
                                       not in library, signing date
                                       not today

  Low notice     Valid variation worth Extra stamps, older template
  (BLUE)         noting --- no action  version, preferred text
                 required              form, new destination entry
                                       for library update
  -------------- --------------------- ----------------------------

# PART B --- Part I Field Rules: Apply to All EHCs

## B1. Field-by-Field Rules

+--------------------+-------------------------------------------------+
| **Field**          | **Rule**                                        |
+--------------------+-------------------------------------------------+
| I.1                | Must be populated --- hard error if blank. May  |
| Consignor/Exporter | be the trading entity or the registered office  |
|                    | rather than the manufacturing address ---       |
|                    | acceptable where I.11 correctly identifies the  |
|                    | dispatch establishment.                         |
+--------------------+-------------------------------------------------+
| I.2 Certificate    | Must match II.a reference throughout all pages. |
| ref                |                                                 |
+--------------------+-------------------------------------------------+
| I.3 Central        | Fixed DEFRA text --- pass if present.           |
| Competent          |                                                 |
| Authority          |                                                 |
+--------------------+-------------------------------------------------+
| I.4 Local          | Fixed APHA text --- pass if present.            |
| Competent          |                                                 |
| Authority          |                                                 |
+--------------------+-------------------------------------------------+
| I.5                | Must be populated. Cross-check against known    |
| Consignee/Importer | consignee library. For AFI powder EHCs: I.5 is  |
|                    | always Arla Foods Ingredients P/S / Group P/S   |
|                    | (Viby-J, Denmark) regardless of end customer    |
|                    | and regardless of destination country ---       |
|                    | confirmed standard practice, never flag. For    |
|                    | Novades BV: I.5 and I.6 may be the same entity  |
|                    | --- confirmed normal.                           |
+--------------------+-------------------------------------------------+
| I.6 Operator       | Valid if populated OR struck through with       |
| responsible        | stamp/initials OR marked N/A. Hard error only   |
|                    | if completely blank with no marking. Commonly a |
|                    | logistics agent. Same entity as I.5 = normal    |
|                    | for some consignees --- do not flag.            |
+--------------------+-------------------------------------------------+
| I.7 Country of     | Must be populated. Preferred: GREAT BRITAIN /   |
| origin             | GB.                                             |
+--------------------+-------------------------------------------------+
| I.8 Region of      | Must show GB-0 for Great Britain exports of     |
| origin             | dairy and petfood --- hard error if missing on  |
|                    | signed EHC. For poultry meat products (8384):   |
|                    | must show GB-1 (not GB-0) --- hard error if     |
|                    | wrong zone code. For hatching eggs (8436): must |
|                    | show GB-0 or GB-1 depending on current AI       |
|                    | disease status at time of certification --- OV  |
|                    | must check APHA HPAI interactive map            |
|                    | immediately prior to signing. Mismatch between  |
|                    | I.8 and II.2.1 zone code = hard error.          |
+--------------------+-------------------------------------------------+
| I.9 Country of     | Must be populated. If non-EU --- raise transit  |
| destination        | notice.                                         |
+--------------------+-------------------------------------------------+
| I.11 Place of      | Name and address required. Approval number      |
| dispatch           | required --- see establishment lookup. If       |
|                    | completely blank = low notice only. Gregory     |
|                    | Distribution at any address = approval N/A ---  |
|                    | correct. For 8436: PHS approval number of       |
|                    | hatchery or flock of origin required.           |
|                    |                                                 |
|                    | **NOTE:** I.11 is the dispatch establishment    |
|                    | --- an approval number is required here. I.13   |
|                    | (Place of loading) is a logistics/loading       |
|                    | address only --- no approval number is required |
|                    | or expected at I.13. Never flag absence of      |
|                    | approval number at I.13.                        |
+--------------------+-------------------------------------------------+
| I.12 Place of      | **I.12 Place of destination** --- Must be       |
| destination        | completed on all EHC types. Blank = hard error. |
|                    | Approval number rules are type-specific:        |
|                    |                                                 |
|                    | - **8322 (Cat 3 ABP):** Destination             |
|                    |   establishment approval number required ---    |
|                    |   medium warning if absent. See C5 for          |
|                    |   exceptions.                                   |
|                    |                                                 |
|                    | - **8468 (human consumption) --- general        |
|                    |   rule:** Approval number field is N/A --- this |
|                    |   is correct and expected. Do not flag absence  |
|                    |   of approval number on 8468 certificates.      |
|                    |                                                 |
|                    | - **8468 (human consumption) --- Poland         |
|                    |   exception:** Where the consignee/destination  |
|                    |   is a Polish entity on a County Milk trade     |
|                    |   lane, the Polish customer requires the        |
|                    |   destination establishment approval number to  |
|                    |   be present. Absence = medium warning.         |
|                    |   Confirmed trade lanes: Milkpol Polska → Logit |
|                    |   Sp. z o.o. (30106002); County Milk → ENTC     |
|                    |   Dairy Solutions (PL 28041606 UE). Any new     |
|                    |   County Milk Poland 8468 without I.12 approval |
|                    |   number = medium warning pending confirmation. |
|                    |                                                 |
|                    | - **On 8324:** Glenkrag NI = populated with     |
|                    |   Glenkrag address and N/A approval number.     |
|                    |   *(Existing rule --- unchanged.)*              |
+--------------------+-------------------------------------------------+
| I.13 Place of      | Must be populated. May differ from I.11 --- not |
| loading            | an error. No approval number required at I.13.  |
|                    | For Immingham-Esbjerg route: must show          |
|                    | Immingham --- see E28/E42.                      |
+--------------------+-------------------------------------------------+
| I.14 Departure     | Must be populated. This is the OV signing date  |
| date               | --- not the date the vehicle physically departs |
|                    | or boards the ferry.                            |
+--------------------+-------------------------------------------------+
| I.15 Means of      | At least one box ticked AND                     |
| transport          | registration/identification present --- UNLESS  |
|                    | the load is a vessel/ro-ro consignment where    |
|                    | I.15 Identification is N/A. Multiple boxes      |
|                    | ticked (e.g. Vessel + Road vehicle) = valid for |
|                    | ro-ro.                                          |
+--------------------+-------------------------------------------------+
| I.16 Entry BCP     | Must be populated --- extract country for       |
|                    | language check.                                 |
+--------------------+-------------------------------------------------+
| I.17 Accompanying  | Commercial document reference must be present   |
| documents          | --- hard error if blank. Where I.17 contains    |
|                    | multiple references, filename match on any one  |
|                    | = pass.                                         |
+--------------------+-------------------------------------------------+
| I.18 Transport     | Exactly ONE box must be ticked. Ambient,        |
| conditions         | Chilled and Frozen are mutually exclusive ---   |
|                    | two or more ticked = hard error. Liquid WPC on  |
|                    | Immingham-Esbjerg tanker route: Ambient is      |
|                    | correct. Canned petfood and cooked meat         |
|                    | products: Ambient is correct.                   |
+--------------------+-------------------------------------------------+
| I.19               | Seal number must be present for sealed loads    |
| Container/Seal     | --- hard error if blank. Multiple seal numbers  |
| number             | acceptable. Trailer registration plate in       |
|                    | Container No field = acceptable practice.       |
|                    | Container N/A acceptable for bulk tanker. For   |
|                    | 8436: seal number(s) of hatching egg containers |
|                    | required --- OV must supervise or have evidence |
|                    | of sealing.                                     |
+--------------------+-------------------------------------------------+
| I.20 Certified as  | On 8468: \'Products for human consumption\'     |
| or for             | must be ticked --- hard error if not. On 8436:  |
|                    | \'Germinal products\' must be ticked --- hard   |
|                    | error if not ticked. On 8322, 8384, 8324: not   |
|                    | applicable in same format.                      |
+--------------------+-------------------------------------------------+
| I.22 For internal  | Must be ticked for standard EU/NI consignment.  |
| market             |                                                 |
+--------------------+-------------------------------------------------+
| I.24 Total number  | Must be populated. Must match commodity         |
| of packages        | description table package count. For 8436:      |
|                    | total number of egg containers.                 |
+--------------------+-------------------------------------------------+
| I.25 Commodity     | On 8324: Petfood must be ticked. Technical use  |
| certified for      | = blank. On 8322: see Part C3.                  |
| (8324)             |                                                 |
+--------------------+-------------------------------------------------+
| I.25 Total         | Number of hatching eggs --- must be populated.  |
| quantity (8436)    |                                                 |
+--------------------+-------------------------------------------------+
| I.26/I.20          | Net weight must be populated. Must match        |
| Net/gross weight   | commodity description table.                    |
+--------------------+-------------------------------------------------+
| I.27 Description   | CN code: 0407. Category field (Pure line /      |
| of consignment     | grandparents / parents / laying pullets /       |
| (8436)             | others) must be completed. Species and          |
|                    | identification system must be present for each  |
|                    | line.                                           |
+--------------------+-------------------------------------------------+

## B2. Weight Consistency

Net weight in I.20/I.26 must match the commodity description table net
weight. Mismatch = hard error. Cross-check against delivery note or
picklist when available.

## B3. Date Logic

The rule is: Production date ≤ Signing date ≤ Departure date.
Collection/production date in commodity table must be same day or
earlier than signing date --- hard error if after. Signing date must be
same day or earlier than I.14 departure date --- hard error if after.
For aged products (aged cheese, aged powders, aged canned product): long
gaps between production and departure are valid --- do not flag.

## B4. Destination and Transit

EU member state ISO codes: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE,
GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Northern
Ireland ISO code: XI. Language check is always driven by BCP country
(I.16), not destination country (I.9).

## B5. Photo Evidence

  ---------------------------------------------------------------
  **RULE: PHOTO IS GROUND TRUTH. If a photo of any plate, seal or
  vehicle is uploaded, it is the final and absolute decision
  maker. Any discrepancy between the EHC/dispatch doc and the
  photo is resolved in favour of the photo. The photo cannot be
  wrong. A single combined photo showing the seal number, seal
  integrity and trailer plate in one frame is accepted as full
  verification of all three elements.**

  ---------------------------------------------------------------

## B6. ISO Country Code Vigilance

ISO country codes must be checked carefully for digit/letter
substitution errors. Known confusion pairs: ES vs E5; DK vs OK; PT vs
P1; NL vs N1; DE vs GE. Apply to all ISO code fields throughout the
certificate. Severity: medium warning.

## B7. Species Rule

For dairy EHCs (8468/8322): Only Bos taurus is valid for GB dairy
exports. All other species names must be fully deleted in BOTH English
and second language sections. Even a single word fragment = hard error.

For petfood EHCs (8384/8324): Species listed in I.28 must match the
products on the schedule. \'Member States\' option within animal origin
clauses is always retained --- never flag as an undeleted fragment.

For hatching eggs (8436): Species in I.27 must be consistent with the
poultry category declared. Ratites must not appear --- this certificate
covers poultry other than ratites only. Species-specific deletion of
Salmonella attestation options in Part II is required --- see K4 and
E33.

## B8. OV Numbering Systems

SP number and RCVS number are different systems for the same OV. SP
number --- APHA-issued OV reference, used on circular stamps. RCVS
number --- Royal College of Veterinary Surgeons registration, typically
shown on the qualification stamp on the signing page. Do not flag as a
mismatch or as two different OVs.

# PART I --- Report Format and Check Sequence

## I.1 Check Sequence

- Identify certificate type from footer code and header (8468, 8322,
  8384, 8324, 8350EHC COMP, 8436).

- Preliminary checks --- filename, page count, reference consistency
  across all pages and II.a boxes.

- Part I field-by-field check against Part B rules and type-specific
  rules.

- Weight and date logic cross-checks.

- Commercial document cross-check against delivery note/dispatch
  confirmation and picklist/schedule.

- Part II attestation check against type-specific deletion map.

- Stamp and signature check --- per-page and signing page.

- EN/second language parity check (where applicable).

- Photo evidence: if pallet/seal photos uploaded, use as ground truth
  for seal number and trailer plate cross-check.

- Produce report with PASS or HOLD verdict.

## I.2 Flag Emission Discipline

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

## I.3 Report Format

SUMMARY: Certificate reference, filename, OV, SP reference, BCP,
commodity, date checked. Overall verdict: PASS / HOLD. Flag counts.
Flags in severity order: hard errors (red), medium warnings (amber), low
notices (blue). Each flag states the field reference, page reference,
and a concise description.

FULL REPORT: Detailed findings by section. Green pass-block for each
field/clause checked and found correct. Document cross-check section.
Rule set update recommendations. Footer: rule set version, report date,
certificate reference, OV SP reference.

