**EHC ERROR CHECKER**

Combined Session Briefing and Rule Set

Version 2.1 \| April 2026

|  |
|----|
| **INITIALISATION: Paste the entirety of this document into a new Claude session as the first message. Claude will read the full rule set before checking any certificate. No separate briefing document is required.** |

**Version History**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Summary** |
| 1.0 | April 2026 | Initial rule set compiled |
| 1.1 | April 2026 | BCP authority names, Z-strike calibration, seal cross-checks, OV numbering systems |
| 1.2 | April 2026 | Cat 3 addendum. Gregory North Tawton and Heathfield entries. Rotterdam NL-RTM1. I.12 library started. Ambient/WPC exception. Redaction calibration |
| 1.3 | April 2026 | Full structural reorganisation into Parts A-E. Checker Brief integrated. Cat 3 approval number library. Picklist/worksheet/dispatch doc rules. Photo evidence protocol. |
| 1.4 | April 2026 | J M W Farms Ltd Killylea added. Trewithen Dairy GB CQ 502 confirmed. Feed and Food NI held as pending. |
| 1.5 | April 2026 | Session calibration integrated: AFI liquid WPC tanker workflow. 8322 production date rule corrected. Multi-batch weight presentation. Part II preamble rule for whey permeate. Signing page date rule finalised. Vehicle registration cross-check. Photo as ground truth. PDF editable field faint-print calibration. Nukamel 001188 confirmed. Puratos added. |
| 1.6 | April 2026 | Briefing and rule set merged into single document. New BCPs: Zeebrugge BE-BEZEE1, Warrenpoint BCP/XIWPT1-DAERA, Larne BCP/XILAR1-DAERA. New consignees: AGI Global Logistics, Ferrer Alimentacion SA, Van Bentum haulier note. Signing page positional calibration. II.1a AMR struck-through confirmed normal. Novades as I.5/I.6 confirmed normal. I.15 N/A on vessel/ro-ro loads confirmed normal. Batch number rules: Saputo AQ-root = no flag; AFI truncated root = hard error. |
| 1.7 | April 2026 | AFI I.5 consignee pattern confirmed standard (never flag regardless of destination). AFI Variolac whey permeate DAIRY WHEY POWDER commodity description accepted at FRCQF1 (low notice only, not hold). Full AF-prefix batch numbers on 8322: correct, never flag. Combined seal/trailer photo accepted as full photo evidence. |
| 1.8 | April 2026 | New consignee: Milkpol Polska Sp. z o.o. added. New destination: Logit Sp. z o.o. (Poland, approval 30106002). County Milk Products / Saputo sweet whey powder route to Poland via Calais confirmed. |
| 2.0 | April 2026 | EHC 8384 MPNT (cooked poultry meat products) rule set added. EHC 8324 (canned petfood) rule set added. Document restructured to cover all certificate types in use. New calibration notes E24-E30. Treatment type D confirmed for Dartmouth/Around Noon Belfast route. Around Noon address hardened to 24A Rampart Road (hard error if incorrect). DSV533031-533040 four-seal rule added. Immingham-Esbjerg loading rules. CMR groupage samples rule. |
| 2.1 | April 2026 | ENTC Dairy Solutions Sp.z.o.o (Paslek, Poland) moved from H4 to H2 consignee library and H3 I.12 destination library. The entry was originally added to H4 in v2.0 from a company spreadsheet but belongs under 8468 human consumption (sweet whey powder route County Milk Products / Saputo Davidstow via Calais), not 8322 Cat 3. Adjacent stamping rules clarified by deletion method (new section A7.1). |

**PART 0 — SESSION BRIEFING: How to Start a New Chat**

**0.1 What This Tool Does**

The EHC Checker systematically verifies completed UK export health certificates against this rule set, cross-references accompanying commercial documents, and produces a structured report. The goal is to catch errors before the load departs rather than at the BCP.

**0.2 Certificate Types in Use**

|  |  |  |
|----|----|----|
| **EHC** | **Title** | **Product** |
| 8468 (DAIRY-PRODUCTS-PT) | Dairy products for human consumption requiring pasteurisation treatment | Dairy — human consumption |
| 8322 | Milk, milk-based products and milk-derived products not for human consumption | Dairy — Category 3 ABP |
| 8384 (MPNT) | Animal health/official certificate to the EU — meat products not required to undergo specific risk-mitigating treatment | Cooked meat products — Treatment A (or D where certified) |
| 8324 | Canned pet food intended for dispatch to or transit through the EU and NI | Canned pet food — Fc3 heat treated |

**0.3 What to Upload Per Check**

|  |  |
|----|----|
| **Document** | **Notes** |
| Signed EHC (PDF) | Required — the authoritative document |
| Delivery Note / Dispatch Confirmation | Strongly recommended — required for bulk tanker loads |
| Allocation / Picklist Sheet | Recommended — enables batch and weight cross-check |
| Photos: combined seal-on-trailer shot | Recommended. One photo showing seal number, seal integrity and trailer plate in a single frame is accepted as full verification. Photo is ground truth. |

**0.4 How to Report**

|  |  |
|----|----|
| **Severity** | **Action** |
| 🔴 Hard error (RED) | BCP will reject — load must not depart |
| 🟠 Medium warning (AMBER) | Resolve before dispatch where possible — BCP may query |
| 🔵 Low notice (BLUE) | Valid variation, noted for information — no action required |

Give a clear PASS or HOLD verdict. PASS = no hard errors. HOLD = one or more hard errors or unresolved medium warnings requiring confirmation before dispatch.

**PART A — Universal Rules: Apply to Every EHC Regardless of Type**

**A1. Document Overview**

This rule set covers UK export health certificates signed by an Official Veterinarian under APHA authority. Certificate types in current use: 8468, 8322, 8384, 8324. Rules in Parts A and B apply to all certificate types. Certificate-specific rules are in Parts C (8322), D (8468), E (8384), and F (8324). Part G contains checker calibration notes.

Both 8468 and 8322 consist of an English section followed by a second language section determined by the BCP entry point country, not the destination country. 8384 and 8324 follow the same principle.

**A2. Template Versions and Page Count**

8468 current template: 5 EN pages + second language section (5 or 6 pages depending on language) = 10 or 11 pages total. Both are valid.

8322 current template: 5 EN pages + 5 second language pages = 10 pages total (bilingual). English-only for Ireland, Northern Ireland, or where second language is optional: 5 pages.

8384 MPNT: 7 EN pages + second language pages. 8324 Canned Petfood: 4 EN pages + second language pages + schedule page(s).

Obsolete template (pre-2026): flag as medium warning. Page count varies by language — never flag page count as an error on number alone. Page footer language code is the primary detection method.

**A3. Filename Cross-Check**

The filename should contain three elements matching the certificate: (1) certificate reference — digits must match I.2 on all pages; (2) commercial document reference — must match I.17; where I.17 has multiple references, filename match on any one = pass; (3) date — must match signing date on final pages. Any mismatch = medium warning.

**A4. Certificate Reference Consistency**

Extract the EHC reference from every page header and II.a box. All pages must show identical reference throughout. Pages 1 and 6 are most commonly retyped and reinserted — flag any mismatch by specific page number. Mismatch = hard error.

**A5. Pagination**

All pages must show "X of N" where N is consistent across every page including schedule pages. Inconsistent page totals = hard error. Known failure mode: superimposed pagination occurs when the original PDF already has the page total entered and a redaction/guided action tool adds its own numbering on top. Result is garbled text (e.g. "111" or "141"). This is a hard error, not a scan artefact.

**A6. Language Check**

The second language is determined by the BCP entry point country (I.16) — NOT the destination country (I.9). Mismatch between BCP country and language code = hard error.

|  |  |  |  |
|----|----|----|----|
| **BCP Country** | **Required Language** | **Authority** | **Notes** |
| France | French (fr) | SIVEP | e.g. Calais FRCQF1 |
| Denmark | Danish (da) | Danish border authority | e.g. Esbjerg DKEBJ1 |
| Netherlands | Dutch (nl) | Dutch border authority | Currently optional — single English also acceptable at NL-RTM1 |
| Belgium | French or Dutch | Belgian border authority | Depending on BCP location. Zeebrugge = French. |
| Ireland | None | Irish border authority | Single English document — no second language required |
| Northern Ireland | None | DAERA | Single English document — no second language required |
| Spain | Spanish (es) | Spanish border authority |  |
| Other EU | That country's language |  |  |

|  |
|----|
| **NOTE: Always use the BCP-specific authority name in reports — never use "SIVEP" for a Danish, Irish, Belgian or other non-French BCP.** |

**A7. Per-Page Stamp and Signature Requirement**

Every page must have at least one SP circular red stamp visible. Every page must have a full signature (not initials). Initials are only used adjacent to individual deletions or added text, accompanied by a stamp.

Stamp consistency: SP reference number must be identical on every stamp throughout the entire document. Different SP number on any page = hard error. Same OV must sign and stamp entire document — two different OVs = instant rejection.

|  |
|----|
| **NOTE: On a continuously signed single-document EHC by one OV using their own stamp, an apparent SP number discrepancy between pages is almost certainly a scan artefact. Only escalate if the number is clearly and unambiguously different (e.g. a completely different digit sequence).** |

**A7.1 Adjacent Stamping by Deletion Method \[Added v2.1\]**

Section A7 establishes that every page must carry at least one SP circular red stamp and full signature. This requirement is universal and applies to all pages of all certificates regardless of deletion method, including pages with no deletions or added text. Section A7.1 clarifies the additional stamping required adjacent to deletions and added text, which varies by deletion method.

The three certificate styles in current use have different adjacent-stamping profiles:

**Style 1 — Manual deletions (pen strikethrough, Method 1)**

Each individual deletion (struck-through paragraph, sub-clause, or alternative) must carry an adjacent SP stamp and signature. Each piece of added text written in pen (e.g. handwritten zone code, handwritten establishment number) must also carry an adjacent SP stamp and signature. These adjacent stamps are in addition to the mandatory page-level stamp required by A7.

*Worked example:* a page with three struck-through paragraphs and one piece of added handwritten text requires four adjacent stamps (one per deletion or added text item) plus one page-level stamp = five stamps total. Absence of any adjacent stamp on a Method 1 deletion or added text item is a hard error. Absence of the page-level stamp is also a hard error (per A7).

**Style 2 — Adobe deletions (digital strikethrough, Method 2)**

Identical adjacent-stamping requirements to Style 1. Each individual digital strikethrough must carry an adjacent SP stamp and signature; each piece of added text (digital or handwritten) must carry an adjacent SP stamp and signature. These adjacent stamps are in addition to the mandatory page-level stamp required by A7. Absence of any adjacent stamp on a Method 2 deletion or added text item is a hard error.

**Style 3 — Redacted certificates (text removal, Method 3)**

Where unwanted text has been removed by redaction (whiteout) and no text has been added, no adjacent stamp is required at the location of the removed text. The page must still carry its mandatory page-level stamp per A7.

Where added text is present on a redacted page (e.g. "GB-0" zone code typed digitally in Adobe, or written by hand in pen on the zone line), an SP stamp and signature must appear adjacent to that added text. Added text on redacted certificates is most commonly digital (Adobe text insertion) but handwritten additions are equally valid and follow the same rule. The adjacent stamp on added text is in addition to the mandatory page-level stamp.

**Signing pages — all styles**

The signing page rules in A9 apply unchanged regardless of deletion method. There is no Method 3 exemption for signing pages.

**Mixed methods on the same certificate**

Where a certificate uses different methods on different pages (e.g. Method 1 for a species deletion on page 3 but Method 3 for an unused I.27 row on page 2), each page is judged against the rules for the method actually used on that page. The page-level stamp from A7 is required on every page in every case.

|  |  |  |
|----|----|----|
| **Page contains** | **Adjacent stamps required** | **Page-level stamp** |
| Method 1 deletions | One per deletion | Required (A7) |
| Method 1 added text | One per added text item | Required (A7) |
| Method 2 deletions | One per deletion | Required (A7) |
| Method 2 added text | One per added text item | Required (A7) |
| Method 3 redactions only, no added text | None | Required (A7) |
| Method 3 with added text (digital or handwritten) | One per added text item | Required (A7) |
| Page with no deletions and no added text (any method) | None | Required (A7) |
| Signing page (any method) | Per A9 | Per A9 |

**A8. Deletion Methods and Stamp Requirements**

Three valid deletion methods:

- Method 1 — Hand pen strikethrough: Stamp (SP circular red) with initials required adjacent to each deletion. Z-strike acceptable for blocks of text including multiple sub-clauses.

- Method 2 — Adobe PDF strikethrough: Stamp with initials required adjacent to each deletion. A single page-level stamp does NOT satisfy the per-deletion requirement.

- Method 3 — Redaction (whiteout/text removal): No stamp required adjacent to deleted text. Text is simply absent. Only requirement: at least one stamp per page.

Mixed methods: valid. Added text (e.g. GB-0 zone code): stamp required adjacent — except N/A added to I.21 transit box which is exempt.

**A9. Signing Page Rules**

|  |  |
|----|----|
| **Element** | **Rule** |
| SP stamp in Final OV Signature field | Mandatory — hard error if absent |
| Page stamp | Mandatory — hard error if absent |
| Name and qualification | Must be present as name/qualification stamp (rectangular) OR handwritten name in capitals plus qualification |
| Date | Must be present — must be same as or earlier than I.14 departure date |
| Signature | Must be present — full signature required, not initials |
| Same OV both signing pages | SP number, initials and name must be identical on EN and second language signing pages |
| Signing page dates | EN and second language signing page dates MUST ALWAYS match each other — mismatch = hard error regardless of what date appears |
| Positional flexibility | All signing area elements need only be present within the signing area on the page. Exact positional alignment to printed field labels is not required and must not be flagged. |
| OV/CO deletion | No stamp required regardless of deletion method |

|  |
|----|
| **NOTE: For live EHCs the signing date on both pages will almost always be today. Do not flag a date that is not today as an error in itself. Only flag if the two signing pages differ from each other, or if the date creates a logic failure (signing after departure, or before production date).** |

**A10. Windsor Framework / Boilerplate Notes**

Windsor Framework paragraph must be present and undeleted in Notes section of both EN and second language pages on 8468 and 8322 certificates. Both Windsor Framework wording AND older Protocol on Ireland/Northern Ireland wording are valid depending on template version.

**A11. Severity Levels**

|  |  |  |
|----|----|----|
| **Severity** | **Description** | **Examples** |
| Hard error (RED) | BCP will reject the consignment | Missing stamp or signature, wrong OV/SP on any page, wrong reference, date error, wrong species retained, missing seal, weight inconsistency, two transport condition boxes ticked, EN/second language parity mismatch, signing page dates differ |
| Medium warning (AMBER) | SIVEP/BCP may reject on a bad day — resolve before dispatch | Filename mismatch, DN despatch ref mismatch, missing I.17 reference, blank I.11 with no marking, ISO code digit/letter substitution, new consignee not in library |
| Low notice (BLUE) | Valid variation worth noting — no action required | Extra stamps, older template version, preferred text form, new destination entry for library update |

**A12. Known OVs, SP References and RCVS Numbers**

|                             |                  |                 |
|-----------------------------|------------------|-----------------|
| **OV Name**                 | **SP Reference** | **RCVS Number** |
| Hector Lopez MRCVS OV       | SP 630859        | 7091037         |
| Silvia Soescu MRCVS         | SP 632477        | 7280697         |
| RR Cunningham BVetMed MRCVS | SP 136830        | 0314006         |

**A13. Known BCPs**

|  |  |  |  |  |
|----|----|----|----|----|
| **BCP Name** | **TRACES Code** | **Country** | **Authority** | **Language** |
| Calais | FRCQF1 | France | SIVEP | French |
| Esbjerg | DKEBJ1 | Denmark | Danish border authority | Danish |
| Zeebrugge | BE-BEZEE1 | Belgium | Belgian border authority | French |
| Rosslare | IE ROS 1 | Ireland | Irish border authority | None (English only) |
| Dublin Port | IE DUB 1 | Ireland | Irish border authority | None (English only) |
| Belfast Port | BCP/XIBEL1-DAERA | Northern Ireland | DAERA | None (English only) |
| Warrenpoint | BCP/XIWPT1-DAERA | Northern Ireland | DAERA | None (English only) |
| Larne Harbour | BCP/XILAR1-DAERA | Northern Ireland | DAERA | None (English only) |
| Rotterdam | NL-RTM1 | Netherlands | Dutch border authority | Dutch (optional — single English accepted) |

**PART B — Part I Field Rules: Apply to All EHCs**

**B1. Field-by-Field Rules**

|  |  |
|----|----|
| **Field** | **Rule** |
| I.1 Consignor/Exporter | Must be populated — hard error if blank. May be the trading entity or the registered office rather than the manufacturing address — acceptable where I.11 correctly identifies the dispatch establishment. |
| I.2 Certificate ref | Must match II.a reference throughout all pages. |
| I.3 Central Competent Authority | Fixed DEFRA text — pass if present. |
| I.4 Local Competent Authority | Fixed APHA text — pass if present. |
| I.5 Consignee/Importer | Must be populated. Cross-check against known consignee library. For AFI powder EHCs: I.5 is always Arla Foods Ingredients P/S / Group P/S (Viby-J, Denmark) regardless of end customer and regardless of destination country — confirmed standard practice, never flag. For Novades BV: I.5 and I.6 may be the same entity — confirmed normal. |
| I.6 Operator responsible | Valid if populated OR struck through with stamp/initials OR marked N/A. Hard error only if completely blank with no marking. Commonly a logistics agent. Same entity as I.5 = normal for some consignees — do not flag. |
| I.7 Country of origin | Must be populated. Preferred: GREAT BRITAIN / GB. |
| I.8 Region of origin | Must show GB-0 for Great Britain exports of dairy and petfood — hard error if missing on signed EHC. For poultry meat products (8384): must show GB-1 (not GB-0) — hard error if wrong zone code. |
| I.9 Country of destination | Must be populated. If non-EU — raise transit notice. |
| I.11 Place of dispatch | Name and address required. Approval number required — see establishment lookup. If completely blank = low notice only. Gregory Distribution at any address = approval N/A — correct. |
| I.12 Place of destination | Note if blank — not an error for standard import consignments on 8468 or 8384. On 8322: approval number required for Cat 3 — see Section C5. On 8324: Glenkrag NI = populated with Glenkrag address and N/A approval number. |
| I.13 Place of loading | Must be populated. May differ from I.11 — not an error. For Immingham-Esbjerg route: must show Immingham Dock, N.E. Lincs, DN40 2LZ — see rule E28. |
| I.14 Departure date | Must be populated. This is the OV signing date — not the date the vehicle physically departs or boards the ferry. |
| I.15 Means of transport | At least one box ticked AND registration/identification present — UNLESS the load is a vessel/ro-ro consignment where I.15 Identification is N/A. Multiple boxes ticked (e.g. Vessel + Road vehicle) = valid for ro-ro. For groupage samples on Immingham-Esbjerg: CMR reference expected in Identification — see E29. |
| I.16 Entry BCP | Must be populated — extract country for language check. |
| I.17 Accompanying documents | Commercial document reference must be present — hard error if blank. Where I.17 contains multiple references, filename match on any one = pass. |
| I.18 Transport conditions | Exactly ONE box must be ticked. Ambient, Chilled and Frozen are mutually exclusive — two or more ticked = hard error. NOTE: liquid WPC consignments on the Immingham-Esbjerg tanker route are certified as Ambient by agreement with DKEBJ1 regardless of product load temperature — do not flag. Canned petfood and cooked meat products: Ambient is correct. |
| I.19 Container/Seal number | Seal number must be present for sealed loads — hard error if blank. Multiple seal numbers acceptable. Trailer registration plate in Container No field = acceptable practice. Container N/A acceptable for bulk tanker. For Glenkrag groupage: sticker seals listed. See E27 for DSV533031-533040 four-seal requirement. |
| I.20 Certified as or for (8468 only) | On 8468: 'Products for human consumption' must be ticked — hard error if not. On 8322, 8384, 8324: this field is not applicable in the same format. |
| I.22 For internal market | Must be ticked for standard EU/NI consignment. |
| I.24 Total number of packages | Must be populated. Must match commodity description table package count. |
| I.25 Commodity certified for (8324) | On 8324: Petfood must be ticked. Technical use = blank. On 8322: see Part C3. |
| I.26/I.20 Net/gross weight | Net weight must be populated. Must match commodity description table. Batch number field: "SEE SCHEDULE PAGE 5" is correct for schedule-supported certificates. |

**B2. Weight Consistency**

Net weight in I.20/I.26 must match the commodity description table net weight. All weight entries must be identical. Mismatch = hard error. Cross-check against delivery note or picklist when available.

**B3. Date Logic**

The rule is: Production date ≤ Signing date ≤ Departure date. Collection/production date in commodity table must be same day or earlier than signing date — hard error if after. Signing date must be same day or earlier than I.14 departure date — hard error if after.

For aged products (e.g. aged cheese, aged powders, aged canned product): production date may be weeks or months before departure — this is valid. Do not flag long gaps for these products.

**B4. Destination and Transit**

EU member state ISO codes: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Northern Ireland ISO code: XI.

A load may enter the EU at one BCP but travel on to a different country — this is not an error. Language check is always driven by BCP country (I.16), not destination country (I.9).

**B5. Photo Evidence**

|  |
|----|
| **RULE: PHOTO IS GROUND TRUTH. If a photo of any plate, seal or vehicle is uploaded, it is the final and absolute decision maker. Any discrepancy between the EHC/dispatch doc and the photo is resolved in favour of the photo. The photo cannot be wrong. A single combined photo showing the seal number, seal integrity and trailer plate in one frame is accepted as full verification of all three elements.** |

**B6. ISO Country Code Vigilance**

ISO country codes must be checked carefully for digit/letter substitution errors. Known confusion pairs: ES vs E5 (numeral 5 substituted for letter S); DK vs OK; PT vs P1; NL vs N1; DE vs GE. Apply to all ISO code fields throughout the certificate. Severity: medium warning.

**B7. Species Rule**

For dairy EHCs (8468/8322): Only Bos taurus is valid for GB dairy exports. All other species names (Ovis aries, Capra hircus, Bubalus bubalis, Camelus dromedarius) must be fully deleted in BOTH English and second language sections. Even a single word fragment = hard error.

For petfood EHCs (8384/8324): Species listed in I.28 must match the products on the schedule. 'Member States' option within animal origin clauses is always retained — never flag as an undeleted fragment.

**B8. OV Numbering Systems**

SP number and RCVS number are different systems for the same OV. SP number — APHA-issued OV reference, used on circular stamps. RCVS number — Royal College of Veterinary Surgeons registration, typically shown on the qualification stamp on the signing page. Do not flag as a mismatch or as two different OVs.

**PART C — EHC 8322: Not for Human Consumption (Category 3 ABP Dairy)**

**C1. Certificate Identification**

8322 pages carry footer code '8322EHC en' (English) and '8322EHC fr / da / nl etc.' (second language). Header reads: 'Milk, milk-based products and milk-derived products not for human consumption.' Footer code and header mismatch = hard error.

**C2. Page Count — 8322**

Standard bilingual 8322: 5 EN pages + 5 second language pages = 10 pages. English-only (Ireland, Northern Ireland, or where BCP language is optional): 5 pages.

**C3. I.25 Commodity Certified For**

I.25 on the 8322 has four tickboxes. Exactly one must be ticked. None ticked = hard error. More than one ticked = hard error.

|  |  |
|----|----|
| **Option** | **Notes** |
| Animal feedingstuff | Product destined for animal feed. Most common for whey/milk powder. Novades, Navobi, Van Tuijl consignments. |
| Further process | Product destined for further processing. Nukamel consignments. J M W Farms Ltd Killylea consignments. |
| Production of petfood | Product destined for pet food manufacture. |
| Technical use | Any other use — any use other than feeding farmed animals (other than fur animals) and petfood production. |

**C4. Part II Preamble — Product Type Deletion**

|  |  |
|----|----|
| **Product** | **Required Deletion Pattern** |
| Sweet whey powder / milk powder | Retain 'the milk-based products' only. Delete 'the milk' and 'and milk-derived products'. |
| Whey permeate powder | All three product type options struck — accepted practice for this product type on the 8322. |
| Raw/liquid milk | Retain 'the milk' only. |
| Casein / milk-derived ingredients | Retain 'and milk-derived products' as applicable. |

**C5. I.12 Destination Approval Numbers — Cat 3**

On 8322 certificates, I.12 (Place of destination) should carry the Cat 3 receiving establishment approval number. Flag as medium warning if blank. Exception: Ballywalter, Co Down, BT22 2NB (Northern Ireland AFI address) — reference 1018 is NOT a Cat 3 approval number and must be left blank on the EHC. Feed and Food NI (Co Armagh) — approval number status pending confirmation, leave blank until verified.

**C6. Part II Clause Structure and Standard Deletion Pattern — 8322**

|  |  |  |
|----|----|----|
| **Clause** | **Standard State** | **Notes** |
| II.1 Country/FMD | RETAIN | Fill in United Kingdom / GB-0 |
| II.2 Raw milk animal health | RETAIN |  |
| II.3 (2) either \[treatments in II.4\] | RETAIN |  |
| II.3 (2) or \[whey/FMD arm\] | DELETE entire arm | Including ALL sub-options. Z-strikes valid. |
| II.4 HTST header | RETAIN |  |
| II.4 (2) either — second HTST | DELETE |  |
| II.4 (2) or — drying process | RETAIN | Spray drying route |
| II.4 (2) or — pH reduction | DELETE |  |
| II.4 (2)(5) or — 21 days FMD | DELETE |  |
| II.4 (2)(5) or — voyage date | DELETE |  |
| II.4 (2) or — UHT 132 degrees | DELETE entire arm | Including all sub-options |
| II.4 (2) or — sterilisation Fo3 | DELETE |  |
| II.5 Contamination precautions | RETAIN |  |
| II.6 (2) either — new containers | RETAIN | For bagged product |
| II.6 (2) or — bulk container disinfection | DELETE | For bagged product; may retain for bulk tanker |
| II.6 'and' — Cat 3 labelling | RETAIN | Containers marked Cat 3 not for human consumption |
| II.7 (2) either — no ovine/caprine | RETAIN | For pure bovine product |
| II.7 (2) or — ovine/caprine arm | DELETE entire arm | Including all sub-clauses (a)(i-v), (b), (c) |

**C7. EN / Second Language Parity — 8322**

All deletions in the EN section (pages 2-4) must be mirrored exactly in the second language section (pages 7-9). A deletion present in EN but absent in second language (or vice versa) = hard error.

**C8. Multi-Batch Consolidation — 8322**

Where I.28 contains multiple batches: all batch numbers must be listed. On the 8322 Cat 3 dairy EHC, production dates are NOT required in I.28 and will never be present — do not flag their absence. Single consolidated net weight covering all batches is correct and normal.

**C9. Batch Number Presentation Rules**

|  |
|----|
| **CRITICAL RULE: Batch number presentation differs by consignor and must be treated differently.** |

|  |  |
|----|----|
| **Consignor / Batch Type** | **Rule** |
| Saputo / Dairy Crest (Davidstow, GB CQ 501) — AQ-prefix batches | AQ-root truncation (e.g. 'AQ6070', 'AQ6069') is confirmed standard practice. DO NOT FLAG — no notice of any kind. |
| AFI / Arla (Taw Valley, GB DE 030) — AF-prefix batches | Full batch numbers are required (e.g. 'AF26111001', 'AF26112001'). Truncated root only (e.g. 'AF26111' without individual run number) = HARD ERROR (red). BCP rejection grounds. |

**PART D — EHC 8468: Human Consumption (DAIRY-PRODUCTS-PT)**

**D1. Certificate Identification**

8468 pages carry footer code '8468EHC en' (English) and '8468EHC da / fr / nl etc.' (second language). Header reads: 'Dairy products intended for human consumption that are required to undergo a pasteurisation treatment.' Part II header reads: 'Certificate model DAIRY-PRODUCTS-PT.' I.20 'Products for human consumption' must be ticked.

**D2. I.27 Commodity Description Table — Structure**

I.27 on the 8468 is a structured multi-row table with 5 numbered rows. Only populate as many rows as needed. Unused rows must be struck through or redacted in their entirety — hard error if any unused row is left with visible unstruck content. Pure white/blank rows on digitally prepared EHCs are Method 3 redactions — never flag as unstruck.

The net weights across all populated rows must sum to I.26 net weight — hard error if mismatch. The number of packages across all populated rows must sum to I.24 total packages — hard error if mismatch.

**D3. I.27 Field Rules — Per Field**

|  |  |
|----|----|
| **Field** | **Rule** |
| CN Code | Must be the numeric HS code (e.g. 0404100200). Text product descriptions in the CN Code field = hard error. |
| Species | Must be the Latin species name (BOS TAURUS for bovine). Must be present in every populated row. |
| Nature of commodity | Text description of the product. Must be present. Note: 'DAIRY WHEY POWDER' is accepted at FRCQF1 for AFI Variolac whey permeate loads — low notice only. |
| Batch No | Must be present. AFI (AF-prefix) batches: full batch numbers required — truncated root = hard error. Saputo (AQ-prefix): root truncation is standard — do not flag. |
| Net Weight | Sum of all rows must equal I.26 net weight. |
| Treatment Type | Must describe the heat treatment applied. Must be present in every populated row. |
| Date of collection/production | Production date(s) in date format. Hard error if absent or contains non-date content. |
| Manufacturing plant | Must contain the establishment approval number or N/A. Must NOT contain dates, product descriptions, or other non-approval-number content — hard error if it does. |

**D4. Part II Attestation — 8468**

|  |  |  |
|----|----|----|
| **Clause** | **Standard State** | **Notes** |
| II.1 Public health attestation (a-e) | RETAIN in full | Retain — Union IS the final destination. Sub-clauses (a)(i-vi), (b), (c), (d), (e) all retained. |
| II.1a AMR attestation | DELETE | Not applicable until 3 September 2026. Both full redaction (Method 3) AND pen strikethrough (Method 1) are confirmed normal methods — do not flag either. |
| II.2 Animal health attestation | RETAIN | Retain in full. |
| II.2.1 Annex XVII entry route | RETAIN with GB-0 zone code | Standard GB export route. |
| II.2.1 Annex XXII transit route | DELETE | Retain only for transit consignments. |
| II.2.2 Raw milk / Bos taurus | RETAIN | Zone code GB-0. Species Bos taurus retained. |
| II.2.2 Member States option | RETAIN | Always retained — never flag as undeleted fragment. |
| \[Official veterinarian\] / \[Certifying officer\] | Delete one | OV retained when II.2 animal health is retained (standard case). |
| Windsor Framework note | RETAIN | Must be present and undeleted in Notes section of both EN and second language pages. |

**PART E — EHC 8384 MPNT: Cooked Meat Products (Treatment A)**

**E1. Certificate Overview**

|  |  |
|----|----|
| **Field** | **Value** |
| Certificate model | 8384EHC — MPNT (Meat Products, Non-specific Treatment) |
| Product type | Cooked poultry meat product (e.g. IQF Shredded Duck, Gluten Free) |
| Species | Anas platyrhynchos (domestic duck) — species code: POU |
| Treatment | Treatment A (non-specific) OR Treatment D where the product has genuinely undergone that process — see E25 |
| Territory code | GB-1 (Great Britain, poultry — regionalised zone authorised for Treatment A) |
| Destination | NI (Northern Ireland) / EU |

|  |
|----|
| **KEY POINT — GB POULTRY REGIONALISATION: The UK uses Treatment A for all species EXCEPT poultry, ratites and wild game, where it is regionalised. For poultry, GB-1 = Treatment A permitted. GB-2 areas require Treatment D and EHC 8385. Confirm all premises of origin are within the GB-1 zone before certifying. GB-0 in I.8 for poultry = hard error.** |

**E2. Part I Field Rules — 8384 Specific**

|  |  |
|----|----|
| **Field** | **Rule** |
| I.8 Region of origin | GB-1 for poultry — hard error if shows GB-0 or GB-2. |
| I.18 Transport conditions | FROZEN for IQF product. |
| I.20 Certified as or for | On 8384: 'Products for human consumption' — confirm ticked. |
| I.27 Commodity table | CN Code must be numeric HS code. Species: ANAS PLATYRHYNCHOS. Treatment type: TREATMENT A (or D where certified — see E25). Manufacturing plant: GB-1 establishment approval number. Production date required. |

**E3. Standard Deletion Map — 8384 Cooked Duck, GB-1, Destination NI/EU**

|  |  |  |
|----|----|----|
| **Clause** | **Standard State** | **Notes** |
| II.1 Public health attestation header | RETAIN | Union IS the final destination (NI/EU) — retain the full attestation. |
| II.1.1 HACCP / approved establishments | RETAIN | Certify on basis of EU-approved establishment status and oval mark. |
| II.1.2 — first option (ante-mortem + post-mortem inspection) | RETAIN | Farmed duck slaughtered in UK abattoir — retain this option. |
| II.1.2 — second option (wild game post-mortem only) | DELETE | No wild game — delete. |
| II.1.3 Raw material requirements | RETAIN |  |
| II.1.4 Identification mark | RETAIN |  |
| II.1.5 Labelling / approved establishments | RETAIN |  |
| II.1.6 Microbiological criteria | RETAIN |  |
| II.1.7 Residue plan guarantees | RETAIN | UK listed in Annex I to Implementing Reg 2021/405 for poultry. |
| II.1.8 Transport conditions | RETAIN |  |
| II.1.9.1 Trichinella (porcine) | DELETE | No porcine material in duck product — delete entire clause. |
| II.1.9.2 Trichinella (solipeds/wild boar) | DELETE | No soliped or wild boar material — delete entire clause. |
| II.1.9.3 Stomachs, bladders, intestines | DELETE | Product is shredded duck meat — delete. |
| II.1.9.4 Rendered animal fats / greaves | DELETE | Product is shredded duck meat — delete. |
| II.1.10 BSE attestation | DELETE | Duck contains no bovine, ovine or caprine material — delete entire II.1.10 clause and all sub-options. |
| II.1.11 Domestic solipeds | DELETE | No soliped material — delete entire clause. |
| II.1.12 Cervidae (CWD) | DELETE | No cervid material and GB is not Canada/USA — delete entire clause. |
| II.1a AMR attestation | DELETE | Not applicable until 3 September 2026. Both full redaction (Method 3) AND Adobe strikethrough (Method 2 with adjacent stamp) are confirmed normal deletion methods — do not flag either. |
| II.2 Animal health attestation header | RETAIN | Duck (POU) requires II.2. |
| II.2.1 — first option (entry to Union, zone code) | RETAIN | Retain and complete: zone code GB-1. |
| II.2.1 — second option (transit through Union) | DELETE | Not a transit consignment — delete. |
| II.2.2 Species code | RETAIN | Retain and complete: species code POU (poultry other than ratites). |
| II.2.3 Non-specific treatment | RETAIN | Retain — GB-1 listed under Treatment A in Annex XV. |
| II.2.4 — first either (zone referred to in II.2.1) | RETAIN | Retain — fresh meat is of GB-1 origin. |
| II.2.4 — first or (imported from non-EU third country) | DELETE | Duck is GB origin — delete this option. |
| II.2.4 — second or (EU/NI origin fresh meat) | DELETE | Duck is GB origin — delete this option. |
| II.2.4 — Member States | RETAIN | Always retained — never flag as undeleted fragment. |
| II.2.5 — first either (domestic animals) | RETAIN | Retain — farmed duck is a domestic animal. |
| II.2.5 — or (wild animals) | DELETE | Farmed duck — not wild. Delete. |
| II.2.6 Post-processing handling | RETAIN |  |
| II.2.7 Newcastle disease vaccination (Finland/Sweden) | DELETE | Destination is NI, not Finland or Sweden — delete. |
| II.3 Animal welfare attestation | RETAIN | Retain — Union IS the final destination. |

**E4. Disease Clearance — 8384 Poultry**

For poultry products from GB-1, OV must check notifiable disease occurrence list immediately prior to certification. The GB-1 zone must be free from Highly Pathogenic Avian Influenza (HPAI) at the time of certification. Check the APHA notifiable disease occurrence list (ET171) and the interactive APHA HPAI map to confirm GB-1 status.

|  |
|----|
| **NOTE: If a disease outbreak occurs AFTER the EHC has been signed, the OV must not certify and must contact CITC immediately. If an outbreak occurs after signing but before dispatch, contact CITC for advice.** |

**PART F — EHC 8324: Canned Petfood**

**F1. Certificate Overview**

EHC 8324 covers canned pet food intended for dispatch to or transit through the EU and Northern Ireland. Canned pet food is defined as heat processed (to Fc 3) pet food contained within a hermetically sealed container (cans, pouches, trays etc). The certificate is 4 EN pages plus second language pages plus schedule page(s).

Certificate header reads: "Canned Petfood". Footer reads: "Veterinary certificate to EU". Commodity code: 23.09. I.25 Petfood must be ticked.

**F2. Part I Field Rules — 8324 Specific**

|  |  |
|----|----|
| **Field** | **Rule** |
| I.18 Transport conditions | Ambient — correct for canned petfood. Do not flag. |
| I.20 Quantity | Net weight KG / (Gross weight KG) format. Must match schedule totals. |
| I.22 Number of packages | Total unit count from schedule. Must match. |
| I.25 Commodity certified for | Petfood must be ticked. Technical use blank. |
| I.28 Identification of commodities | Species (Scientific name) must list all species present across all product lines. Manufacturing plant: Forthglade approval number 10/467/8110/ABP/PTF. Net weight: total net weight. Batch number: SEE SCHEDULE PAGE 5. |

**F3. Schedule Rules — 8324**

The schedule is page 5 of 5 for Glenkrag (NI destination). The schedule must carry the EHC reference number, be signed, stamped and dated by the OV, and be sequentially numbered as part of the complete document. All pages including schedule must bear the certificate reference.

Consignment is typically split across multiple EHCs by species category. Each EHC has its own schedule showing only the product lines applicable to that certificate:

|  |  |  |  |
|----|----|----|----|
| **EHC Category** | **Species** | **II.6 BSE Status** | **Products** |
| RUM_BOV_OV | Ruminantia (bovine/ovine/caprine, excluding venison) | II.6 "or" retained — bovine/ovine/caprine material. GB negligible BSE risk confirmed. | Lamb, beef, mixed Ruminantia/Aves lines |
| RUM_VEN | Ruminantia (cervid/venison only) | II.6 "either" retained — ruminants other than bovine/ovine/caprine | Venison products, duck & venison mixed lines |
| AVES_PESCA (or similar) | Aves, Pesca, Mammalia, Suidae etc — no ruminant material | II.6 deleted entirely — no ruminant material | Chicken, turkey, duck, salmon, rabbit etc |

|  |
|----|
| **CRITICAL RULE: Ruminantia TRUMPS everything. Any product line containing Ruminantia in the species field goes on the RUM certificate regardless of what other species are also present. Venison is identified by product description (word "venison") not by species tag — venison products must go on the RUM_VEN certificate, never mixed with bovine/ovine/caprine on the same EHC. This is enforced by the BSE either/or structure on II.6 which makes mixing impossible.** |

**F4. Part II Deletion Map — 8324**

**F4a. II.1 and II.2 — Starting Material (all 8324 certificates)**

II.1 — Always retain: approved establishment attestation.

II.2 — Starting material: the first "either" option (carcases and parts of animals slaughtered and fit for human consumption but not intended for human consumption for commercial reasons) is the primary applicable option for Forthglade canned petfood. The second "and/or" (slaughterhouse ante-mortem inspection) is struck through. Other and/or options not applicable to this product are struck through.

II.3 — Always retain: heat treatment to minimum Fc value of 3 in hermetically sealed containers.

II.4 — Always retain: batch sampling.

II.5 — Always retain: contamination precautions.

**F4b. II.6 BSE — Species-Dependent Either/Or**

|  |  |  |
|----|----|----|
| **Clause** | **Standard State** | **Notes** |
| II.6 — No ruminant material (AVES/PESCA certificate) | DELETE ENTIRELY | Pure Aves, Pesca, Suidae, Mammalia etc — no ruminant material at all. Delete II.6 in its entirety. |
| II.6 "either" — ruminants other than bovine/ovine/caprine (VEN certificate) | RETAIN "either", DELETE "or" | Venison (cervid) is a ruminant but not bovine/ovine/caprine. Retain the first "either" option only. Delete the "or" option and all its sub-paragraphs. |
| II.6 "or" — bovine/ovine/caprine material (RUM_BOV_OV certificate) | DELETE "either", RETAIN "or" | Bovine/ovine/caprine material present. Retain the "or" option. Under the "or": retain sub-option (a) "or" — specified risk material; retain (b) mechanically separated meat; retain (c) slaughter method. The "either" sub-option (negligible BSE, no indigenous cases) must be struck through — GB has had indigenous BSE cases. The "or" sub-option (a)(b)(c) are retained as GB is negligible BSE risk and complies with all conditions. |

|  |
|----|
| **NOTE on BSE status: GB (England, Wales, Scotland) was reclassified to NEGLIGIBLE BSE risk by Commission Implementing Decision (EU) 2025/2208. Under II.6 "or" for bovine/ovine/caprine material: the "either" sub-option (born, continuously reared and slaughtered in negligible BSE risk country with NO indigenous cases) must still be struck through as GB has had indigenous BSE cases. The "or" sub-options (a)(b)(c) are retained as GB negligible status satisfies their conditions. NFG v9 November 2025 confirms this approach.** |

**F5. Glenkrag Specific Notes — 8324**

|  |  |
|----|----|
| **Field** | **Glenkrag Standard** |
| I.1 Consignor | Forthglade Foods Limited, Dartmoor View, Okehampton, Devon, EX20 1GH, Great Britain. Tel: 0183783322 |
| I.5 Consignee | Glenkrag Limited, Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR |
| I.6 Person responsible | N/A |
| I.7 Country of origin | Great Britain / GB |
| I.8 Region of origin | N/A |
| I.9 Country of destination | Northern Ireland / XI |
| I.11 Place of origin | Forthglade Foods Limited, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ, Great Britain. Approval: 10/467/8110/ABP/PTF |
| I.12 Place of destination | Glenkrag Limited, Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR. Approval number N/A |
| I.13 Place of loading | Forthglade Foods Ltd, Okehampton, Devon, EX20 1FJ, GB |
| I.15 Means of transport | Ship + Road vehicle. Identification: N/A GROUPAGE |
| I.16 Entry BCP | Belfast / XIBEL1 — DAERA (or Warrenpoint / Larne depending on consignment) |
| I.17 Documentary references | PO GLENKRAG \[PO number\] |
| I.18 Transport conditions | Ambient |
| I.19 Seal/Container No | Sticker seals listed (format: K18_XXXXXX-XXX) / N/A GROUPAGE |
| I.21 Temperature | Ambient ticked |
| I.25 Commodity certified for | Petfood ticked |
| I.26/I.27 Transit/Import | I.27 For import or admission into EU ticked |
| I.28 Manufacturing plant | 10/467/8110/ABP/PTF |

**PART G — Checker Calibration Notes: Known False Positive Patterns**

|  |  |
|----|----|
| **Ref** | **Calibration Note** |
| E1 — Z-STRIKES | Z-strikes may appear as undeleted text in low-resolution scans. Large diagonal Z-strikes spanning multiple sub-clauses are a valid Method 1 deletion technique. Do not raise a hard error on deletion completeness from scan appearance alone when Z-strikes are present. Request enlarged/higher-resolution image before raising a deletion hard error based on scan appearance. |
| E2 — BLANK FIELDS | Blank/white fields are Method 3 redactions, not unstruck blanks. On digitally prepared EHCs, unused fields and unused commodity table rows are deleted by redaction (Method 3). The field appears white/blank with no text visible and no strikethrough line. Do not flag blank/white unused rows or fields as unstruck. Only flag if: (a) a strikethrough line is visible but incomplete (edge miss), or (b) a row contains partial data with no deletion marking. |
| E3 — WORKSHEETS | Worksheets are working documents — judge only on the signed EHC. Pick sheets, load sheets and dispatch documents may contain multiple edits, corrections, different OV references, rolled date changes, and incomplete fields. They are not the signed certificate. Content on a worksheet must never trigger a hard error on the certificate. |
| E4 — OV NUMBERING SYSTEMS | SP number and RCVS number are different systems for the same OV. SP number — APHA-issued OV reference, used on circular stamps. RCVS number — Royal College of Veterinary Surgeons registration, typically shown on the qualification stamp on the signing page. Do not flag as a mismatch or as two different OVs. |
| E5 — SCAN QUALITY | Do not raise hard errors based on scan appearance alone for ink colour or stamp clarity. Ink colour (black vs dark blue) cannot be reliably determined from a scanned PDF. Only flag stamp or signature ink as black if it is unambiguously black on the physical document — not based on scan appearance. |
| E6 — VEHICLE & TRAILER IDENTIFICATION | Trailer plate in I.19 container field is acceptable practice on curtainsider road vehicle loads. Foreign plates (Lithuanian, Bulgarian, Polish, Romanian, Belgian, Dutch etc.) in I.15 and I.19 are expected for international haulage. Vehicle registration cross-check: compare alphanumeric characters only — spaces, hyphens, dots and country prefixes in handwritten dispatch notes are optional formatting variations and never cause a mismatch. Handwriting variations resolved by photo — photo is ground truth. |
| E7 — ROUTE & BCP COMBINATIONS | Destination country and BCP entry point may differ — this is not an error. A load may enter the EU at one BCP country but be destined for a different EU member state. Language check is driven by BCP country (I.16), not destination country (I.9). |
| E8 — AMBIENT WPC (8322) | Liquid WPC on Immingham-Esbjerg tanker route: Ambient is correct. Liquid WPC consignments on the Immingham-Esbjerg tanker route are certified as Ambient in I.18 by agreement with the Esbjerg BCP (DKEBJ1). Although the product loads at approximately 2-4 degrees C, there is no active refrigeration during transit. Do not flag Ambient as incorrect for this product and route. |
| E9 — PDF EDITABLE FIELD FAINT PRINTING | All EU EHC templates print editable field text in a lighter/greyer font than the pre-printed text. This is a universal template characteristic — not an error or omission. Before flagging any field as blank or illegible from a scan, check the opposite language section or request a photograph. Never raise a notice on field content based on scan faintness alone. |
| E10 — SIGNING PAGE POSITIONAL FLEXIBILITY | All signing area elements (date, name/qualifications, stamp, signature) need only be present somewhere within the signing area on the page. Exact positional alignment to the printed field labels is not required and must not be flagged. This applies to all EHC types and all OVs. |
| E11 — AMR ATTESTATION (II.1a) | On 8468 and 8384 certificates, the AMR attestation is not applicable until 3 September 2026. Both full redaction (blank/white field, Method 3) AND pen strikethrough (Method 1 with adjacent stamp) are confirmed normal deletion methods. Do not flag either method. |
| E12 — VESSEL / RO-RO LOADS (I.15 N/A) | On vessel/ro-ro consignments, I.15 Means of transport will show Vessel ticked (often alongside Road vehicle) and Identification field as N/A. This is correct — the trailer registration appears in I.19 Container No field. Do not flag I.15 Identification as N/A on these loads. |
| E13 — COMBINED SEAL/TRAILER PHOTO | A single photo showing the seal number, seal integrity and trailer plate in one frame is accepted as full verification of all three elements. Separate photos are not required if the combined shot is clear and all three elements are legible. Photo remains ground truth. |
| E14 — NOVADES BV AS I.5 AND I.6 | Novades BV appearing as both the I.5 Consignee and the I.6 Operator responsible is confirmed normal practice. Do not flag. |
| E15 — AFI I.5 CONSIGNEE PATTERN | Arla Foods Ingredients Group P/S (Viby-J, Denmark) as I.5 consignee on all AFI EHCs is confirmed standard practice regardless of I.9 destination country and regardless of I.12 end customer identity. Never flag under any circumstances. |
| E16 — SAPUTO / DAIRY CREST BATCH TRUNCATION | AQ-prefix batch numbers presented as root only (e.g. 'AQ6070') on Davidstow/Saputo (GB CQ 501) loads is confirmed standard practice. Do not flag — no notice of any kind. This does NOT apply to AFI/Arla (GB DE 030) loads, where full AF-prefix batch numbers are required (truncated root = hard error). |
| E17 — VAN BENTUM TRAILERS | BTS-prefix trailer numbers (e.g. BTS2295, BTS2359) are Van Bentum (Netherlands) trailers, the expected haulier on Zeebrugge/BE-BEZEE1 ro-ro vessel loads for Novades BV. Dutch trailers — foreign plates are expected and normal. |
| E18 — AFI VARIOLAC WHEY PERMEATE | 'DAIRY WHEY POWDER' in I.27/I.28 Nature of commodity on AFI Variolac whey permeate loads is accepted practice at Calais FRCQF1 and Esbjerg DKEBJ1. The CN code (0404100200) is the definitive product identifier. Downgrade to low notice only — not a hold reason. |
| E19 — GB-1 ZONE CODE (8384 POULTRY) | The zone code in II.2.1 for poultry from Great Britain is GB-1 (not GB-0). GB-0 would be incorrect for poultry and should be flagged as a hard error. GB-0 is the correct code for ungulates and other non-regionalised species but NOT for poultry. |
| E20 — TREATMENT A WORDING (8384) | The certificate will state Treatment A in II.2.3 and in the commodity table. 'Treatment A' is a non-specific treatment — it is not a heat treatment code. Do not flag the absence of a temperature or time specification for Treatment A. |
| E21 — PETFOOD SCHEDULE (8324) | The schedule is an integral part of the 8324 certificate and must be signed, stamped and dated on each page with the certificate reference number. Each schedule covers only the product lines applicable to that specific EHC (by species category). The total net weight and package count on the EHC page 1 must match the schedule totals for that certificate only, not the combined totals of all three EHCs. |
| E22 — PETFOOD PALLET NUMBERS (8324/GLENKRAG) | Glenkrag consignments have multiple product lines across multiple pallets. The pallet number (1, 2, 3 etc) and the Forthglade batch/lot reference (e.g. 52518) are separate identifiers. The batch/lot reference is on each line; the pallet number groups lines together. Both appear on the schedule. |
| E23 — RABBIT/LAGOMORPHA (8324) | Products containing rabbit (Lagomorpha) are handled by deleting II.6 in its entirety (no ruminant material), retaining the Rodentia/Lagomorpha 'and/or' option in II.2, and listing 'MAMMALIA' in the I.28 species field. This is the confirmed correct pattern for AVES/MAM certificates containing rabbit. |
| E24 — SEAL PHOTO NOTE / BATCH ANNOTATION MISMATCH | Where a handwritten note accompanies seal photos, the batch reference on the note may reflect a prior aborted load if the same tanker and seals were carried over to a subsequent consignment. The note is not a controlled document. Verify the batch number against the EHC and delivery note only — if those agree and the physical seal numbers in the photo match I.19, the discrepancy on the note is a low notice at most and not a hold reason. |
| E25 — DARTMOUTH FOODS / AROUND NOON IQF DUCK — TREATMENT TYPE ON 8384 | Belfast BCP/XIBEL1-DAERA confirmed in writing (12 April 2026, belfast.portal.vets@daera-ni.gov.uk) that Treatment A is acceptable for this product, and therefore so is Treatment D. The BCP position is that the OV should attest to the treatment the product has actually undergone. If the manufacturing process meets Treatment D, Treatment D is the correct and accurate entry. Treatment A would also be acceptable if that were the actual process applied. Checker rule: For 8384 IQF duck loads where Treatment D is entered and the manufacturing process is confirmed as meeting Treatment D standards — no flag of any kind. This also sets a general principle: attest to what was done, not just the regulatory minimum. |
| E26 — PO QUANTITY vs EHC QUANTITY (8384 / GROUPAGE LOADS) | Where the EHC package count is one unit below the PO ordered quantity and the internal weight arithmetic is consistent, the most likely explanation is a short pick at loading rather than a certificate error. The EHC certifies what is physically loaded — the PO is a commercial document stating what was ordered. A minor shortfall is normal in food production. Downgrade to low notice where the discrepancy is one unit and arithmetic is internally consistent. Retain as medium warning where the gap is larger or arithmetic does not reconcile. |
| E27 — DSV TANKER RANGE DSV533031-DSV533040: FOUR SEAL REQUIREMENT | Tankers in the range DSV533031 to DSV533040 are a new build series fitted with three top vents. The sealing rule for all tankers is one seal per vent plus one for the rear compartment: Standard tankers (single vent): 2 seals required (1 vent + 1 rear) DSV533031-533040 (triple vent): 4 seals required (3 vents + 1 rear) When an EHC is submitted with any tanker in this range, apply a MEDIUM WARNING — Four seals are required. Verify that I.19 records exactly four seal numbers. If fewer than four seals are recorded, escalate to hard error. Seal type: DSV-issued seals in situ are acceptable. Preferred: own seals in a consecutive run of four numbers. Photo evidence: Recommended but not always obtainable due to working-at-height H&S restrictions. Absence of photo is not a flag for this tanker range. |
| E28 — IMMINGHAM-ESBJERG ROUTE: PLACE OF LOADING (I.13) | For all EHCs on the Immingham-Esbjerg vessel route (BCP DKEBJ1), I.13 Place of loading must read Riverside Terminal, Humber Road, Immingham Dock, N.E. Lincs, DN40 2LZ (or equivalent Immingham terminal wording). Any other place of loading on this route = medium warning — verify with consignor that loading actually occurred at Immingham. |
| E29 — IMMINGHAM-ESBJERG ROUTE: I.15 IDENTIFICATION (CMR) | CMR reference in I.15 Identification applies only to groupage sample consignments on the Immingham-Esbjerg route. It allows DKEBJ1 to link the EHC to the specific shipment within a multi-consignment groupage movement. CMR reference is NOT applicable to: full tanker loads (use tanker identification) or full powder/bagged loads (use trailer/vehicle identification). Checker rule: For groupage sample consignments on this route — absence of CMR reference = low notice. For tanker or full powder loads — CMR reference is not expected and its absence is never a flag. |
| E30 — SAMPLE CONSIGNMENTS: PALLET STICKER SEALS ON INDIVIDUAL BAGS | Where a small sample consignment (e.g. 4 bags) is dispatched with individual pallet sticker seals applied per bag, each seal number must appear in I.19. If the number of seals listed in I.19 does not match the number of bags/packages in I.24, flag as medium warning. |
| E31 — AROUND NOON LTD ADDRESS | The correct and confirmed address for Around Noon Ltd as I.5 consignee on all 8384 cooked duck EHCs is: 24A Rampart Road, Greenbank Industrial Estate, Newry, County Down, BT34 2QU. Any other address (including 25A) = HARD ERROR requiring correction before dispatch. Around Noon's own PO states goods will be refused if documentation is incorrect. |

**PART H — Known Libraries: Establishments, Consignees, Destinations**

**H1. Establishment Lookup — I.11 Approval Numbers (Dairy)**

|  |  |  |
|----|----|----|
| **Establishment** | **Approval No** | **Notes** |
| Gregory Distribution (any address — loading/logistics) | N/A | Not a manufacturing establishment |
| Gregory Distribution Ltd, North Tawton (Cat 3 powder — AFI/Arla) | U1183488/TRANS | Transport/logistics approval — Cat 3 only |
| Dairy Crest Ltd / Saputo Dairy UK, Davidstow, Camelford, Cornwall | GB CQ 501 |  |
| Arla Foods Ingredients Taw Valley Limited / Taw Valley Creamery, South Weeke, North Tawton | GB DE 030 |  |
| Trewithen Dairy, Cornwall | GB CQ 502 | 8468 human consumption — occasional bulk tanker cream to EU |
| Gregory's Distribution Ltd, Heathfield (loading depot for Davidstow/Saputo) | N/A | Loading/logistics only — not a manufacturing establishment |
| County Milk Products Ltd, Dean Court, 85 Adlington Road, Wilmslow, Cheshire, SK9 2BT | N/A | I.1 consignor only — I.11 will be Dairy Crest/Davidstow (GB CQ 501) |
| Forthglade Foods Ltd, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ | 10/467/8110/ABP/PTF | Canned petfood and cooked meat products — 8324 and 8384 |
| Dartmouth Foods, Units 1-9 Hearder Court, Beechwood Way, Langage Business Park, Plymouth, Devon, PL7 5HH | GB TO 060 | Cooked duck products — 8384 |

**H2. Known Dairy Consignees and Logistics Agents**

|  |  |  |
|----|----|----|
| **Field** | **Name** | **Address / Notes** |
| I.5 | Novades BV | Maliebaan 50B, Utrecht, 3581 CS, Netherlands. Note: Novades BV also commonly appears as I.6 Operator — confirmed normal practice, do not flag. |
| I.5 | Navobi | JHR.DR.C.J. Sandbergweg 7, 3852 PT, Staverden (Gem. Ermelo), Netherlands. |
| I.5 | Uniblock | Coes Road Industrial Estate, Dundalk, A91 TD60, Ireland |
| I.5 | Nukamel Productions BV | Industriekade 32-34, 6001 SE Weert, Netherlands. Animal nutrition. 8322 Further process. |
| I.5 | Nestle Bulgaria AD | Henri Nestle Str. 2, 1360 Sofia, Bulgaria. 8468 human consumption. |
| I.5 | Feed & Food Trading BV | Woudenbergseweg 19 C2, NL-3707 HW. Sweet whey powder, animal feed, Calais route. |
| I.5 | Milkeen Krzysztof Cyba | Eukaliptusowa 9 1, Warszawa, 02 765, Poland. Demineralized whey powder, 8468, Calais route. |
| I.5 | Puratos Nederland N.V. | Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands. 8468 human consumption, Calais route. |
| I.5 | Milkpol Polska Sp. z o.o. | ul. Lusinska 28A, 03-569 Warszawa, Poland. Sweet whey powder, 8468 human consumption, Calais route. I.5 and I.6 same entity. \[Added v1.8\] |
| I.5 | ENTC Dairy Solutions Sp.z.o.o | Dworowa 10, 14-400 Paslek, Poland. Sweet whey powder, 8468 human consumption, Calais route. Receives County Milk Products / Saputo Davidstow loads. Moved from H4 (Cat 3) to H2 (8468 human consumption) in v2.1. \[Added v2.1\] |
| I.1/I.5 Arla | Arla Foods Ingredients P/S / Arla Foods Ingredients Group P/S | I.1 consignor: c/o Taw Valley Creamery, South Weeke, North Tawton, Devon EX20 2DA. I.5 consignee (all AFI EHCs): Soenderhoej 1-12, DK-8260 Viby-J, Denmark. Always correct regardless of I.9 destination or I.12 end customer. |
| I.6 | Seabrook Global Logistics Ltd | Admiral House, 853 London Road, West Thurrock, Essex, RM20 3LG |
| I.6 | Kuehne + Nagel Ltd | Manchester International Airport, Building 317, World Freight Terminal, M90 5NA |
| I.6 | Maersk Logistics and Services Denmark A/S | Faergehamnsvej 31, 9900 Frederikshavn, Denmark. Logistics agent for Arla — multiple routes including Esbjerg and Calais. |
| I.6 | AGI Global Logistics (CT) Ltd | Unit A, Concept Court, Shearway Business Park, Folkestone, CT19 4RG. Confirmed as valid logistics operator for County Milk / Heathfield loads. |

**H3. I.12 Destination Library — 8468 (Human Consumption)**

|  |  |  |
|----|----|----|
| **Approval No** | **Establishment** | **Address / Notes** |
| NL218847 | Van Kommer | Ambachtsweg 24, Barneveld, 3771 MG, Netherlands |
| 207165 | Jonker and Schut B.V. | Harselaarseweg 33, 3771 MA Barneveld, Netherlands |
| 05929 | Navobi BV | Jhr. Dr. Sandbergweg 7, 3852 PT, Staverden (gem Ermelo), Netherlands |
| IE LH 242466 | Mill Transport Ltd | Rathcor Riverstown Dundalk, Co Louth, Ireland |
| M119 | Arla Foods Ingredients Group P/S Danmark Protein | Soenderupvej 26, Nr Vium, DK-6920 Videbaek, Denmark |
| N/A | Vicorquimia S.A. | Moli de Vent 2, 08150 Parets del Valles, Spain |
| N/A | Barry Callebaut Belgium | Bouwstraat 1, 9160 Lokeren, Belgium |
| N/A | Milkeen Krzysztof Cyba | Eukaliptusowa 9 1, Warszawa, Poland |
| N/A | Nestle Bulgaria AD | Henri Nestle Str. 2, BG-1360 Sofia, Bulgaria |
| N/A | Puratos Nederland N.V. | Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands |
| N/A | Ferrer Alimentacion S.A. | Pol. Ind. Sector Autopista, Calle Diesel No.2, Parets del Valles, 08150, Barcelona, Spain. AFI whey permeate powder loads, Calais route. |
| 30106002 | Logit Sp. z o.o. | Barczyglow, ul. Skandynawska 7, 62-571 Stare Miasto, Poland. 8468 human consumption destination for Milkpol Polska consignments. \[Added v1.8\] |
| PL 28041606 UE | ENTC Dairy Solutions Sp.z.o.o | Dworowa 10, 14-400 Paslek, Poland. 8468 human consumption destination for County Milk Products / Saputo sweet whey powder consignments via Calais. Moved from H4 (Cat 3) to H3 (8468 human consumption) in v2.1. \[Added v2.1\] |

**H4. Cat 3 Destination Approval Numbers — 8322**

|  |  |  |  |
|----|----|----|----|
| **Company** | **Country** | **Approval No** | **Notes** |
| Nukamel Productions BV, Industriekade 32, 6001 SE Weert | NL | 001188 | Most common Nukamel destination. STORP. |
| Jonker & Schut Barneveld, Harselaarseweg 33, 3771 MA Barneveld | NL | 207165 |  |
| P.C. van Tuijl Kesteren, Batterijenweg 17, 4041 DA Kesteren | NL | 19163 |  |
| P.C. van Tuijl Lienden, Marsdijk 13, 4033 CC Lienden | NL | 207492 |  |
| Van Kommer, Ambachtsweg 24, 3771 MG Barneveld | NL | NL218847 |  |
| J M W Farms Ltd, 35 Tonnagh Rd, Killylea, Armagh, BT60 4PZ | NI | GB NI/4111 | Cat 3 receiving establishment. I.25 = Further process. |
| Ballywalter, Co Down, BT22 2NB | NI | LEAVE BLANK | NOT a Cat 3 approval ref — leave blank on EHC. |
| Feed and Food NI, Co Armagh, NI | NI | PENDING | Approval number unconfirmed — do not use until verified. |
| Lacto Production, ZI La Brohiniere, 35360 Montauban de Bretagne | FR | FR35184020 |  |
| Denkavit France S.A.R.L., ZI de Meron, CS 82003, Montreuil-Bellay | FR | FR49215001 |  |
| R2 Agros AS, Odinsvej 25, 8722 Hedensted | DK | DK-3-oth-987248 | OTHER — Other ABP activities. |
| Bech Gruppen, Ove Jensens Alle, 8700 Horsens | DK | DK-3-STP-1513648 |  |

**H5. Petfood and Cooked Duck Consignees — 8324 / 8384**

|  |  |
|----|----|
| **Field** | **Details** |
| I.5 Consignee (Glenkrag/8324) | Glenkrag Limited, Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR |
| Manufacturing plant (Forthglade) | Forthglade Foods Ltd, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ. Approval: 10/467/8110/ABP/PTF |
| BCP (Glenkrag/8324) | Belfast / XIBEL1 — DAERA (or Warrenpoint BCP/XIWPT1-DAERA / Larne BCP/XILAR1-DAERA) |
| Around Noon Ltd (consignee for cooked duck 8384) | 24A Rampart Road, Greenbank Industrial Estate, Newry, County Down, BT34 2QU. PO number must appear on ALL documents. Goods will be refused if P/order number is missing. HARD ERROR if address is incorrect. |
| Dartmouth Foods (consignor for cooked duck 8384) | Units 1-9 Hearder Court, Beechwood Way, Langage Business Park, Plymouth, Devon, PL7 5HH. Approval: GB TO 060 |

**PART I — Report Format and Check Sequence**

**I1. Check Sequence**

1.  Identify certificate type from footer code and header (8468, 8322, 8384, 8324).

2.  Preliminary checks — filename, page count, reference consistency across all pages and II.a boxes.

3.  Part I field-by-field check against Part B rules and type-specific rules.

4.  Weight and date logic cross-checks.

5.  Commercial document cross-check against delivery note/dispatch confirmation and picklist/schedule.

6.  Part II attestation check against type-specific deletion map.

7.  Stamp and signature check — per-page and signing page.

8.  EN/second language parity check (where applicable).

9.  Photo evidence: if pallet/seal photos uploaded, use as ground truth for seal number and trailer plate cross-check.

10. Produce report with PASS or HOLD verdict.

**I2. Report Format**

SUMMARY: Certificate reference, filename, OV, SP reference, BCP, commodity, date checked. Overall verdict: PASS / HOLD. Flag counts. Flags in severity order: hard errors (red), medium warnings (amber), low notices (blue). Each flag states the field reference, page reference, and a concise description.

FULL REPORT: Detailed findings by section. Green pass-block for each field/clause checked and found correct. Document cross-check section. Rule set update recommendations. Footer: rule set version, report date, certificate reference, OV SP reference.

**END OF RULE SET — Version 2.1 \| April 2026 \| All certificate types: 8468, 8322, 8384, 8324**
