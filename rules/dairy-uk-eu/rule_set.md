**EHC ERROR CHECKER**

Combined Session Briefing and Rule Set

**Version 1.8 — April 2026**

**Version History**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Summary** |
| 1.0 | April 2026 | Initial rule set compiled |
| 1.1 | April 2026 | BCP authority names, Z-strike calibration, seal cross-checks, OV numbering systems |
| 1.2 | April 2026 | Cat 3 addendum. Gregory North Tawton and Heathfield entries. Rotterdam NL-RTM1. I.12 library started. Ambient/WPC exception. Redaction calibration |
| 1.3 | April 2026 | Full structural reorganisation into Parts A–E. Checker Brief integrated. Cat 3 approval number library. Picklist/worksheet/dispatch doc rules. Photo evidence protocol. |
| 1.4 | April 2026 | J M W Farms Ltd Killylea added. Trewithen Dairy GB CQ 502 confirmed. Feed and Food NI held as pending. |
| 1.5 | April 2026 | Session calibration integrated: AFI liquid WPC tanker workflow. 8322 production date rule corrected. Multi-batch weight presentation. Part II preamble rule for whey permeate. Signing page date rule finalised. Vehicle registration cross-check. Photo as ground truth. PDF editable field faint-print calibration. Nukamel 001188 confirmed. Puratos added. |
| 1.6 | April 2026 | Briefing and rule set merged into single document. New BCPs: Zeebrugge BE-BEZEE1, Warrenpoint BCP/XIWPT1-DAERA, Larne BCP/XILAR1-DAERA. New consignees: AGI Global Logistics, Ferrer Alimentacion SA, Van Bentum haulier note. Signing page positional calibration. II.1a AMR struck-through confirmed normal. Novades as I.5/I.6 confirmed normal. I.15 N/A on vessel/ro-ro loads confirmed normal. Batch number rules: Saputo AQ-root = no flag; AFI truncated root = hard error. |
| 1.7 | April 2026 | AFI I.5 consignee pattern confirmed standard (never flag regardless of destination). AFI Variolac whey permeate ‘DAIRY WHEY POWDER’ commodity description accepted at FRCQF1 (low notice only, not hold). Full AF-prefix batch numbers on 8322: correct, never flag. Combined seal/trailer photo accepted as full photo evidence — single shot verifies seal number, integrity and trailer plate. |
| 1.8 | April 2026 | New consignee: Milkpol Polska Sp. z o.o. (Warszawa, Poland) added to B6 library. New destination: Logit Sp. z o.o. (Barczyglow, Stare Miasto, Poland, approval 30106002) added to B7 I.12 library. County Milk Products / Saputo sweet whey powder route to Poland via Calais confirmed. |

**PART 0 — SESSION BRIEFING: How to Start a New Chat**

**Paste the entirety of this document into a new Claude session as the first message. Claude will read the full rule set before checking any certificate. No separate briefing document is required — this document contains everything.**

**0.1 What This Tool Does**

The EHC Checker systematically verifies completed UK dairy export health certificates against this rule set, cross-references accompanying commercial documents, and produces a structured PDF report. The goal is to catch errors before the load departs rather than at the BCP.

**0.2 Certificate Types in Use**

|  |  |
|----|----|
| **EHC 8468 (DAIRY-PRODUCTS-PT)** | Dairy products for human consumption requiring pasteurisation treatment |
| **EHC 8322** | Milk, milk-based products and milk-derived products not for human consumption (Category 3 ABP) |

**0.3 What to Upload Per Check**

|  |  |
|----|----|
| **Signed EHC (PDF)** | Required — the authoritative document |
| **Delivery Note or AFI/Gregory Dispatch Confirmation** | Strongly recommended — required for bulk tanker loads |
| **Allocation / picklist sheet** | Recommended — enables batch and weight cross-check |
| **Photos: combined seal-on-trailer shot** | Recommended — one photo showing seal number, seal integrity and trailer plate in a single frame is accepted as full verification of all three elements. Photo is ground truth and overrides all other sources. Separate tractor, trailer and seal photos are not required if the combined shot is clear. |

**0.4 How to Report**

|  |  |
|----|----|
| **Hard error (RED)** | BCP will reject — load must not depart |
| **Medium warning (AMBER)** | Resolve before dispatch where possible — BCP may query |
| **Low notice (BLUE)** | Valid variation, noted for information — no action required |

Give a clear PASS or HOLD verdict. PASS = no hard errors. HOLD = one or more hard errors or unresolved medium warnings requiring confirmation before dispatch.

**PART A — Universal Rules: Apply to Every EHC Regardless of Type**

**A1. Document Overview**

This rule set covers all UK dairy export health certificates signed by an Official Veterinarian under APHA authority for export to the EU. Two certificate models are in current use: EHC 8468 (DAIRY-PRODUCTS-PT) for dairy products for human consumption requiring pasteurisation treatment, and EHC 8322 for milk, milk-based products and milk-derived products not for human consumption (Category 3 ABP). The same product may appear on either certificate depending on its designated end use. Rules in Part A and Part B apply to both certificate types. Certificate-specific rules are in Parts C (8322) and D (8468). Part E contains checker calibration notes.

Both certificates consist of an English section followed by a second language section determined by the BCP entry point country, not the destination country.

**A2. Template Versions and Page Count**

8468 current template: 5 EN pages + second language section (5 or 6 pages depending on language) = 10 or 11 pages total. Both are valid.

8322 current template: 5 EN pages + 5 second language pages = 10 pages total (bilingual). English-only for Ireland, Northern Ireland, or where second language is optional: 5 pages.

Obsolete template (pre-2026): flag as medium warning. Page count varies by language — never flag page count as an error on number alone. Page footer language code is the primary detection method.

8468: English pages show 8468EHC en bottom-left. 8322: English pages show 8322EHC en bottom-left. Second language pages show 8468EHC fr / da / nl etc.

**A3. Filename Cross-Check**

The filename should contain three elements matching the certificate: (1) certificate reference — digits must match I.2 on all pages; (2) commercial document reference — must match I.17; where I.17 has multiple references, filename match on any one = pass; (3) date — must match signing date on final pages. Any mismatch = medium warning. SIVEP uses filename discrepancies as grounds for additional scrutiny.

**A4. Certificate Reference Consistency**

Extract the EHC reference from every page header and II.a box. All pages must show identical reference throughout. Pages 1 and 6 are most commonly retyped and reinserted — flag any mismatch by specific page number. Mismatch = hard error.

**A5. Pagination**

All pages must show “X of N” where N is consistent across every page including schedule pages. Inconsistent page totals = hard error. Known failure mode: superimposed pagination occurs when the original PDF already has the page total entered and a redaction/guided action tool adds its own numbering on top. Result is garbled text (e.g. “111” or “141”). This is a hard error, not a scan artefact.

**A6. Language Check**

The second language is determined by the BCP entry point country (I.16) — NOT the destination country (I.9). Mismatch between BCP country and language code = hard error.

|  |  |  |  |
|----|----|----|----|
| **BCP Country** | **Required Language** | **Authority** | **Notes** |
| France | French (fr) | SIVEP | Calais FRCQF1 |
| Denmark | Danish (da) | Danish border authority | Esbjerg DKEBJ1 |
| Netherlands | Dutch (nl) | Dutch border authority | Currently optional — single English also acceptable at NL-RTM1 |
| Belgium | French or Dutch | Belgian border authority | Depending on BCP location. Zeebrugge = French. |
| Ireland | None | Irish border authority | Single English document — no second language required |
| Northern Ireland | None | DAERA | Single English document — no second language required |
| Spain | Spanish (es) | Spanish border authority |  |
| Other EU | That country’s language |  |  |

**A7. Per-Page Stamp and Signature Requirement**

Every page must have at least one SP circular red stamp visible. Every page must have a full signature (not initials). Initials are only used adjacent to individual deletions or added text, accompanied by a stamp.

Stamp consistency: SP reference number must be identical on every stamp throughout the entire document. Different SP number on any page = hard error. Same OV must sign and stamp entire document — two different OVs = instant rejection.

|  |
|----|
| *NOTE: On a continuously signed single-document EHC by one OV using their own stamp, an apparent SP number discrepancy between pages is almost certainly a scan artefact. Only escalate if the number is clearly and unambiguously different (e.g. a completely different digit sequence).* |

**A8. Deletion Methods and Stamp Requirements**

Three valid deletion methods:

Method 1 — Hand pen strikethrough: Stamp (SP circular red) with initials required adjacent to each deletion. Z-strike acceptable for blocks of text including multiple sub-clauses.

Method 2 — Adobe PDF strikethrough: Stamp with initials required adjacent to each deletion. A single page-level stamp does NOT satisfy the per-deletion requirement.

Method 3 — Redaction (whiteout/text removal): No stamp required adjacent to deleted text. Text is simply absent. Only requirement: at least one stamp per page.

Mixed methods: valid. Added text (e.g. GB-0 zone code): stamp required adjacent — except N/A added to I.21 transit box which is exempt.

**A9. Signing Page Rules**

|  |  |
|----|----|
| **SP stamp in Final OV Signature field** | Mandatory — hard error if absent |
| **Page stamp** | Mandatory — hard error if absent |
| **Name and qualification** | Must be present as name/qualification stamp (rectangular) OR handwritten name in capitals plus qualification |
| **Date** | Must be present — must be same as or earlier than I.14 departure date |
| **Signature** | Must be present — full signature required, not initials |
| **Same OV both signing pages** | SP number, initials and name must be identical on EN and second language signing pages |
| **Signing page dates** | EN and second language signing page dates MUST ALWAYS match each other — mismatch = hard error regardless of what date appears |
| **Positional flexibility** | All signing area elements (date, name/qualifications, stamp, signature) need only be present within the signing area on the page. Exact positional alignment to the printed field labels is not required and must not be flagged. |
| **OV/CO deletion** | No stamp required regardless of deletion method |

|  |
|----|
| *NOTE: For live dairy EHCs the signing date on both pages will almost always be today. Do not flag a date that is not today as an error in itself. Only flag if the two signing pages differ from each other, or if the date creates a logic failure (signing after departure, or before production date).* |

**A10. Windsor Framework / Boilerplate Notes**

Windsor Framework paragraph must be present and undeleted in Notes section of both EN and second language pages. Both Windsor Framework wording AND older Protocol on Ireland/Northern Ireland wording are valid depending on template version.

**A11. Fields to Ignore Completely**

I.2a — never check, never flag. I.21 For transit — ignore unless ticked AND destination is non-EU. I.23 — pre-struck by APHA on template, always blank, ignore. I.25 — always blank on 8468, ignore on 8468. On 8322 I.25 carries the commodity purpose tickboxes — see Part C.

**A12. Severity Levels**

|  |  |  |
|----|----|----|
| **Severity** | **Description** | **Examples** |
| Hard error (RED) | BCP will reject the consignment | Missing stamp or signature, wrong OV/SP on any page, wrong reference, date error, wrong species retained, missing seal, weight inconsistency, two transport condition boxes ticked, EN/second language parity mismatch, signing page dates differ, AFI batch numbers truncated to root only |
| Medium warning (AMBER) | SIVEP/BCP may reject on a bad day — resolve before dispatch where possible | Filename mismatch, DN despatch ref mismatch, missing I.17 reference, blank I.11 with no marking, ISO code digit/letter substitution, new consignee not in library |
| Low notice (BLUE) | Valid variation worth noting — no action required | Extra stamps, I.11 N/A for Gregory Distribution, older template version, preferred text form, new destination entry for library update, AFI Variolac ‘DAIRY WHEY POWDER’ description at FRCQF1 |

**A13. Known OVs, SP References and RCVS Numbers**

|                             |                  |                 |
|-----------------------------|------------------|-----------------|
| **OV Name**                 | **SP Reference** | **RCVS Number** |
| Hector Lopez MRCVS OV       | SP 630859        | 7091037         |
| Silvia Soescu MRCVS         | SP 632477        | 7280697         |
| RR Cunningham BVetMed MRCVS | SP 136830        | 0314006         |

**A14. Known BCPs**

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

|  |
|----|
| *NOTE: Always use the BCP-specific authority name in reports — never use ‘SIVEP’ for a Danish, Irish, Belgian or other non-French BCP.* |

**PART B — Part I Field Rules: Apply to All EHCs**

**B1. Field-by-Field Rules**

|  |  |
|----|----|
| **I.1 Consignor** | Must be populated — hard error if blank. May be the trading entity (e.g. Arla Foods Ingredients P/S) or the registered office (e.g. Dairy Crest Ltd, Weybridge) rather than the manufacturing address — acceptable where I.11 correctly identifies the dispatch establishment. These are cross-company consignor arrangements, not simple address variations. |
| **I.2 Certificate ref** | Must match II.a reference throughout all pages. |
| **I.3 Central Competent Authority** | Fixed DEFRA text — pass if present. |
| **I.4 Local Competent Authority** | Fixed APHA text — pass if present. |
| **I.5 Consignee/Importer** | Must be populated. Cross-check against known consignee library. For AFI powder EHCs: I.5 is always Arla Foods Ingredients P/S / Group P/S (Viby-J, Denmark) regardless of end customer and regardless of destination country — confirmed standard practice, never flag. For Novades BV: I.5 and I.6 may be the same entity — confirmed normal. |
| **I.6 Operator responsible** | Valid if populated OR struck through with stamp/initials OR marked N/A. Hard error only if completely blank with no marking. On 8322: commonly a logistics agent. Novades BV appearing as both I.5 and I.6 is confirmed normal practice — do not flag. |
| **I.7 Country of origin** | Must be populated. Preferred: GREAT BRITAIN / GB. |
| **I.8 Region of origin** | Must show GB-0 for Great Britain exports — hard error if missing on signed EHC. |
| **I.9 Country of destination** | Must be populated. If non-EU — raise transit notice. |
| **I.11 Place of dispatch** | Name and address required. Approval number — see establishment lookup (Section B5). If completely blank = low notice only. Gregory Distribution at any address = approval N/A — correct. |
| **I.12 Place of destination** | Note if blank — not an error for standard import consignments. On 8322: approval number required for Cat 3 — see Section C5. On 8468: approval number N/A or blank is acceptable. |
| **I.13 Place of loading** | Must be populated. May differ from I.11 — not an error. |
| **I.14 Departure date** | Must be populated. This is the OV signing date — not the date the vehicle physically departs or boards the ferry. |
| **I.15 Means of transport** | At least one box ticked AND registration/identification present — UNLESS the load is a vessel/ro-ro consignment where I.15 Identification is N/A. This is confirmed normal practice for vessel loads where the trailer registration appears in I.19 Container No field instead. Multiple boxes ticked (e.g. Vessel + Road vehicle) = valid for ro-ro. |
| **I.16 Entry BCP** | Must be populated — extract country for language check. |
| **I.17 Accompanying documents** | Commercial document reference must be present — hard error if blank. Where I.17 contains multiple references, filename match on any one = pass. |
| **I.18 Transport conditions** | Exactly ONE box must be ticked. Ambient, Chilled and Frozen are mutually exclusive — two or more ticked = hard error. Note: liquid WPC consignments on the Immingham-Esbjerg tanker route are certified as Ambient by agreement with DKEBJ1 regardless of product load temperature — do not flag. |
| **I.19 Container/Seal number** | Seal number must be present for sealed loads — hard error if blank. Multiple seal numbers acceptable. Trailer registration plate in Container No field = acceptable practice. Container N/A acceptable for bulk tanker. |
| **I.20 Certified as or for** | On 8468: ‘Products for human consumption’ must be ticked — hard error if not. On 8322: this field is blank — do not apply the 8468 rule. |
| **I.22 For internal market** | Must be ticked for standard EU/NI consignment. |
| **I.24 Total number of packages** | Must be populated. Must match I.27 (8468) or I.28 (8322) number of packages. |
| **I.26 Net/gross weight** | Net weight must be populated. Gross weight not required for bulk tanker consignments. |

**B2. Weight Consistency**

I.26 net weight (pages 1 and 6) must match I.27/I.28 net weight (pages 2 and 7). All four weight entries must be identical. Mismatch = hard error. Cross-check against delivery note or picklist when available.

**B3. Date Logic**

The rule is: Production date \<= Signing date \<= Departure date. Collection/production date in I.27/I.28 must be same day or earlier than signing date — hard error if after. Signing date must be same day or earlier than I.14 departure date — hard error if after.

For aged cheeses and aged powders (e.g. whey permeate, Cheddar): production date may be weeks or months before departure — this is valid. Do not flag long gaps for these products.

AFI Taw Valley liquid WPC tanker loads: production date is typically one day before signing date. Production date two or more days before signing = low notice (confirm at POL — may indicate tanker unavailability delay).

**B4. Destination and Transit**

EU member state ISO codes: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Northern Ireland ISO code: XI.

A load may enter the EU at one BCP but travel on to a different country. E.g. Spain destination via Calais FRCQF1 is entirely normal — do not flag as inconsistent. French second language is correct for FRCQF1 regardless of final EU destination.

**B5. Establishment Lookup — I.11 Approval Numbers**

|  |  |  |
|----|----|----|
| **Establishment** | **Approval No** | **Notes** |
| Gregory Distribution (any address — loading/logistics) | N/A | Not a manufacturing establishment |
| Gregory Distribution Ltd, North Tawton (Cat 3 powder — AFI/Arla) | U1183488/TRANS | Transport/logistics approval — Cat 3 only |
| Dairy Crest Ltd / Saputo Dairy UK, Davidstow, Camelford, Cornwall | GB CQ 501 |  |
| Arla Foods Ingredients Taw Valley Limited / Taw Valley Creamery, South Weeke, North Tawton | GB DE 030 |  |
| Trewithen Dairy, Cornwall | GB CQ 502 | 8468 human consumption — occasional bulk tanker cream to EU |
| Gregory’s Distribution Ltd, Heathfield (loading depot for Davidstow/Saputo) | N/A | Loading/logistics only — not a manufacturing establishment |
| County Milk Products Ltd, Dean Court, 85 Adlington Road, Wilmslow, Cheshire, SK9 2BT | N/A | I.1 consignor only — I.11 will be Dairy Crest/Davidstow (GB CQ 501) |

**B6. Known Consignees and Logistics Agents**

|  |  |  |
|----|----|----|
| **Field** | **Name** | **Address / Notes** |
| I.5 Consignee | Novades BV | Maliebaan 50B, Utrecht, 3581 CS, Netherlands. Note: Novades BV also commonly appears as I.6 Operator — confirmed normal practice, do not flag. |
| I.5 Consignee | Navobi | JHR.DR.C.J. Sandbergweg 7, 3852 PT, Staverden (Gem. Ermelo), Netherlands. |
| I.5 Consignee | Uniblock | Coes Road Industrial Estate, Dundalk, A91 TD60, Ireland |
| I.5 Consignee | Nukamel Productions BV | Industriekade 32-34, 6001 SE Weert, Netherlands. Animal nutrition. 8322 Further process. |
| I.5 Consignee | Nestle Bulgaria AD | Henri Nestle Str. 2, 1360 Sofia, Bulgaria. 8468 human consumption. |
| I.5 Consignee | Feed & Food Trading BV | Woudenbergseweg 19 C2, NL-3707 HW. Sweet whey powder, animal feed, Calais route. |
| I.5 Consignee | Milkeen Krzysztof Cyba | Eukaliptusowa 9 1, Warszawa, 02 765, Poland. Demineralized whey powder, 8468, Calais route. |
| I.5 Consignee | Puratos Nederland N.V. | Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands. 8468 human consumption, Calais route. |
| I.5 Consignee | Milkpol Polska Sp. z o.o. | ul. Lusinska 28A, 03-569 Warszawa, Poland. Sweet whey powder, 8468 human consumption, Calais route. I.5 and I.6 same entity. \[Added v1.8\] |
| I.1/I.5 Arla | Arla Foods Ingredients P/S / Arla Foods Ingredients Group P/S | I.1 consignor: c/o Taw Valley Creamery, South Weeke, North Tawton, Devon EX20 2DA. I.5 consignee (all AFI EHCs): Soenderhoej 1-12, DK-8260 Viby-J, Denmark. Always correct regardless of I.9 destination or I.12 end customer. |
| I.6 Logistics | Seabrook Global Logistics Ltd | Admiral House, 853 London Road, West Thurrock, Essex, RM20 3LG |
| I.6 Logistics | Kuehne + Nagel Ltd | Manchester International Airport, Building 317, World Freight Terminal, M90 5NA |
| I.6 Logistics | Maersk Logistics and Services Denmark A/S | Faergehamnsvej 31, 9900 Frederikshavn, Denmark. Logistics agent for Arla — multiple routes including Esbjerg and Calais. |
| I.6 Logistics | AGI Global Logistics (CT) Ltd | Unit A, Concept Court, Shearway Business Park, Folkestone, CT19 4RG. Confirmed as valid logistics operator for County Milk / Heathfield loads. |

**B7. I.12 Destination Library — 8468 (Human Consumption)**

On 8468 certificates I.12 approval number is not mandatory — blank or N/A is acceptable. Where present, cross-check against this library.

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

**B8. Delivery Note, Dispatch Confirmation and Document Cross-Check**

|  |  |
|----|----|
| **Net weight** | DN/picklist total must match I.26 and I.27/I.28 weight |
| **Seal number(s)** | DN/dispatch doc seal must match I.19. DN may omit leading zeros — EHC format takes precedence where zeros are present on the physical seal. |
| **Vehicle/trailer registration** | Dispatch doc vehicle/trailer must match I.15 and I.19 container field. Cross-check alphanumeric characters only — spaces, hyphens, dots and country prefixes in handwritten dispatch notes are optional formatting and never cause a mismatch. Photo is ground truth and final decision maker — if photo uploaded, it overrides all other sources. Handwriting variations (e.g. D written as B) are resolved by photo. |
| **Batch reference** | Batch number on dispatch doc must match I.17 and I.27/I.28 batch number. |
| **Commercial document reference** | DN despatch reference must match I.17. References may carry a ‘-XX’ suffix appended by EHCO — where base number matches, flag suffix as low notice only. |
| **Loading date** | Picklist date is scheduled date — may predate signing date (low notice only). Gregory’s/AFI dispatch confirmation date is actual loading date. |

**B9. Photo Evidence**

|  |
|----|
| *NOTE: RULE: PHOTO IS GROUND TRUTH. If a photo of any plate, seal or vehicle is uploaded, it is the final and absolute decision maker. Any discrepancy between the EHC/dispatch doc and the photo is resolved in favour of the photo. The photo cannot be wrong. A single combined photo showing the seal number, seal integrity and trailer plate in one frame is accepted as full verification of all three elements — separate photos are not required if the combined shot is clear.* |

**B10. EN / Second Language Part I Consistency**

Every data field on EN pages 1 and 2 must exactly match second language pages 6 and 7. Flag any discrepancy as hard error. PDF template editable fields are linked and mirror automatically between EN and second language sections. Manually added Adobe text boxes (e.g. signing page dates) are independent and must be cross-checked between both pages.

**B11. ISO Country Code Vigilance**

ISO country codes must be checked carefully for digit/letter substitution errors. Known confusion pairs: ES vs E5 (numeral 5 substituted for letter S); DK vs OK; PT vs P1; NL vs N1; DE vs GE. Apply to all ISO code fields throughout the certificate. Severity: medium warning.

**B12. Text Conventions**

All typed/entered text throughout the certificate should be in CAPITALS. Mixed case or lower case entries should be noted as a low notice. Preferred: GREAT BRITAIN / GB rather than United Kingdom / UK (either is technically correct).

**B13. Species Rule**

Only Bos taurus is valid for GB dairy exports. All other species names (Ovis aries, Capra hircus, Bubalus bubalis, Camelus dromedarius) must be fully deleted in BOTH English and second language sections. Check for any visible fragment — even a single word is a hard error. ‘Member States’ option within animal origin clauses is always retained — never flag as an undeleted fragment.

**B14. Arla Direct Consignment Field Patterns**

|  |  |
|----|----|
| **I.1 Consignor** | Arla Foods Ingredients P/S, c/o Arla Foods Ingredients Taw Valley Limited, Taw Valley Creamery, South Weeke, North Tawton, Devon EX20 2DA. ‘Arla Foods Ingredients Taw Valley Limited’ is also accepted as I.1 for direct manufacturing-site dispatches. |
| **I.11 Place of dispatch** | Arla Foods Ingredients Taw Valley Limited or Gregory Distribution Ltd North Tawton, approval GB DE 030 or N/A respectively. |
| **I.13 Place of loading** | Gregory Distribution Ltd, North Tawton, Devon — no Gregory’s Heathfield depot for Arla/Taw Valley loads. |
| **I.5 Consignee (all AFI EHCs)** | Arla Foods Ingredients Group P/S, Soenderhoej 1-12, DK-8260 Viby-J, Denmark — regardless of end customer and regardless of I.9 destination country. Confirmed standard practice — never flag. |
| **I.6 Logistics (Esbjerg route)** | Maersk Logistics and Services Denmark A/S, Faergehamnsvej 31, 9900 Frederikshavn, Denmark. |

**B15. Dairy Crest / Saputo Field Patterns**

For consignments from Dairy Crest Limited (trading as Saputo Dairy UK), I.1 may show the registered office address (5 The Heights, Brooklands, Weybridge, Surrey, KT13 0NY) rather than the Davidstow manufacturing address. I.11 will show Davidstow / GB CQ 501 as the dispatch establishment — this is the definitive entry. This is a cross-company consignor arrangement and should be noted as such in reports. Do not flag as an error.

**B16. AFI Liquid WPC Tanker Batch Reference Decode**

For AFI Taw Valley liquid WPC tanker loads to Denmark, the batch reference decodes as: AF-YY-week-day-run. For example AF26147001 = 2026, week 14, day 7 (Sunday), run 1.

The production date in I.27 will always match the day before the OV signing/departure date, reflecting the manufacturing workflow: product is made and passed to AFI on day 1, exported on day 2.

**B17. Batch Number Presentation Rules**

|  |
|----|
| *NOTE: CRITICAL RULE: Batch number presentation differs by consignor and must be treated differently.* |

|  |  |
|----|----|
| **Saputo / Dairy Crest (Davidstow, GB CQ 501) — AQ-prefix batches** | AQ-root truncation (e.g. ‘AQ6070’, ‘AQ6069’) is confirmed standard practice. DO NOT FLAG — no notice of any kind. |
| **AFI / Arla (Taw Valley, GB DE 030) — AF-prefix batches** | Full batch numbers are required (e.g. ‘AF26111001’, ‘AF26112001’). Truncated root only (e.g. ‘AF26111’ without individual run number) = HARD ERROR (red). BCP rejection grounds. A correctly presented full AF-prefix batch number is simply correct — no notice of any kind. |

**PART C — EHC 8322: Not for Human Consumption (Category 3 ABP)**

**C1. Certificate Identification**

8322 pages carry footer code ‘8322EHC en’ (English) and ‘8322EHC fr / da / nl etc.’ (second language). Header reads: ‘Milk, milk-based products and milk-derived products not for human consumption.’ Footer code and header mismatch = hard error.

**C2. Page Count — 8322**

Standard bilingual 8322: 5 EN pages + 5 second language pages = 10 pages. English-only (Ireland, Northern Ireland, or where BCP language is optional and single English used): 5 pages.

**C3. I.25 Commodity Certified For**

I.25 on the 8322 has four tickboxes. Exactly one must be ticked. None ticked = hard error. More than one ticked = hard error. On 8468 certificates I.25 is always blank — do not apply this rule to 8468.

|  |  |
|----|----|
| **Animal feedingstuff** | Product destined for animal feed. Most common for whey/milk powder. Novades, Navobi, Van Tuijl consignments. |
| **Further process** | Product destined for further processing. Nukamel consignments. J M W Farms Ltd Killylea consignments. |
| **Production of petfood** | Product destined for pet food manufacture. |
| **Technical use** | Any other use — any use other than feeding farmed animals (other than fur animals) and petfood production. |

**C4. Part II Preamble — Product Type Deletion**

The Part II preamble certifying statement includes ‘the milk (2), the milk-based products (2) and milk-derived products (2)’. Only the applicable product type(s) should be retained.

|  |  |
|----|----|
| **Sweet whey powder / milk powder** | Retain ‘the milk-based products’ only. Delete ‘the milk’ and ‘and milk-derived products’. |
| **Whey permeate powder** | All three product type options struck — this is accepted practice for this product type on the 8322. |
| **Raw/liquid milk** | Retain ‘the milk’ only. |
| **Casein / milk-derived ingredients** | Retain ‘and milk-derived products’ as applicable. |

**C5. I.12 Destination Approval Numbers — Cat 3 (8322 only)**

On 8322 certificates, I.12 (Place of destination) should carry the Cat 3 receiving establishment approval number. Flag as medium warning if blank. Exception: Ballywalter, Co Down, BT22 2NB (Northern Ireland AFI address) — reference 1018 is NOT a Cat 3 approval number and must be left blank on the EHC. Feed and Food NI (Co Armagh) — approval number status pending confirmation, leave blank until verified.

**C5a. Gregory’s Heathfield (Saputo / County Milk exports)**

|  |  |  |  |  |
|----|----|----|----|----|
| **Company** | **Address** | **Country** | **Approval No** | **Notes** |
| Docomar | Laan der Techniek 10, 3903 AT Veenendaal | NL | 209359 |  |
| Jonker & Schut Nijkerk | Nijverheidsstraat 16, 3861 RJ Nijkerk | NL | 224341 |  |
| Jonker & Schut Barneveld | Harselaarseweg 33, 3771 MA Barneveld | NL | 207165 |  |
| P.C. van Tuijl Kesteren | Batterijenweg 17, 4041 DA Kesteren | NL | 19163 |  |
| P.C. van Tuijl Lienden | Marsdijk 13, 4033 CC Lienden | NL | 207492 |  |
| P.C. van Tuijl Opheusden | Tielsestraat 66a, 4043 JT Opheusden | NL | 91124 |  |
| Van Kommer | Ambachtsweg 24, 3771 MG Barneveld | NL | NL218847 |  |
| R. Boonzaijer Transport BV | Francis Baconstraat 7, 6718 XA Ede | NL | 218039 |  |
| Van Zutven Feed Processing | Pater van den Elsenlaan 15, 5462 GG Veghel | NL | 30329 |  |
| ENTC Dairy Solutions Sp.z.o.o | Dworowa 10, 14-400 Paslek | PL | PL 28041606 UE |  |
| Denkavit France S.A.R.L. | ZI de Meron, CS 82003, Montreuil-Bellay | FR | FR49215001 |  |

**C5b. Gregory’s North Tawton (AFI / Arla exports)**

|  |  |  |  |  |
|----|----|----|----|----|
| **Company** | **Address** | **Country** | **Approval No** | **Notes** |
| Nukamel Productions BV | Industriekade 32, 6001 SE Weert | NL | 001188 | Most common Nukamel destination. STORP — ABP Storage Plant. |
| Nukamel / Van Zutven | Pater van den Elsenlaan 15, 5462 GG Veghel | NL | 30329 | Also supplied by County Milk. |
| Van Tuijl Kesteren BV (Lienden) | Marsdijk 13, 4033 Lienden | NL | 207492 |  |
| Van Tuijl Kesteren BV (Kesteren) | Batterijenweg 17, 4041 DA Kesteren | NL | 19163 |  |
| R2 Agros AS | Odinsvej 25, 8722 Hedensted | DK | DK-3-oth-987248 | OTHER — Other ABP activities. |
| R2 Agros AS (Sole Ejendomme) | Kaervej 45, 8722 Hedenstead | DK | DK-3-oth-974735 | Second site. |
| Van der Heijden Logistiek | Diamantweg 64, 5527 LC Hapert | NL | 227149 |  |
| Navobi BV (Van Veluw Landweer) | Van Veluw Landweer 3, 3771 LN Barneveld | NL | 219249 |  |
| Navobi BV (Van Veluw industrieweg) | Van Veluw industrieweg 8, 3771 MB Barneveld | NL | 227121 |  |
| Navobi BV (Sandbergweg) | Jhr. Dr. Sandbergweg 7, 3852 PT Staverden (gem Ermelo) | NL | 05929 |  |
| Ballywalter | Ballywalter, Co Down, BT22 2NB | NI | LEAVE BLANK | NOT a Cat 3 approval ref — leave blank on EHC. |
| J M W Farms Ltd | 35 Tonnagh Rd, Killylea, Armagh, BT60 4PZ | NI | GB NI/4111 | Cat 3 receiving establishment. I.25 = Further process. |
| Feed and Food NI | Co Armagh, NI | NI | PENDING | Approval number unconfirmed — do not use until verified. |
| Lacto Production | ZI La Brohiniere, 35360 Montauban de Bretagne | FR | FR35184020 |  |
| R. Boonzaijer Transport BV | Francis Baconstraat 7, 6718 XA Ede | NL | 218039 | Also supplied by County Milk. |
| Van Kommer | Ambachtsweg 24, 3771 MG Barneveld | NL | NL218847 | Also supplied by County Milk. |
| Bech Gruppen | Ove Jensens Alle, 8700 Horsens | DK | DK-3-STP-1513648 |  |

**C6. Part II Clause Structure and Standard Deletion Pattern — 8322**

|  |  |  |
|----|----|----|
| **Clause** | **Standard state** | **Notes** |
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
| II.6 ‘and’ — Cat 3 labelling | RETAIN | Containers marked Cat 3 not for human consumption |
| II.7 (2) either — no ovine/caprine | RETAIN | For pure bovine product |
| II.7 (2) or — ovine/caprine arm | DELETE entire arm | Including all sub-clauses (a)(i-v), (b), (c) |

**C7. EN / Second Language Parity — 8322**

All deletions in the EN section (pages 2-4) must be mirrored exactly in the second language section (pages 7-9). A deletion present in EN but absent in second language (or vice versa) = hard error.

**C8. I.6 — Logistics Agents on 8322**

On 8322 certificates, I.6 is commonly populated with a logistics or freight forwarding company rather than the consignee. This is valid. I.6 may also be the same entity as I.5. Do not flag a logistics company in I.6 as an error. I.6 blank with no marking = low notice only.

**C9. Multi-Batch Consolidation — 8322**

Where I.28 contains multiple batches: all batch numbers must be listed. On the 8322 Cat 3 dairy EHC, production dates are NOT required in I.28 and will never be present — do not flag their absence. Single consolidated net weight covering all batches is correct and normal. A schedule is only added where batch count and/or odd weights make consolidation impractical.

**PART D — EHC 8468: Human Consumption (DAIRY-PRODUCTS-PT)**

**D1. Certificate Identification**

8468 pages carry footer code ‘8468EHC en’ (English) and ‘8468EHC da / fr / nl etc.’ (second language). Header reads: ‘Dairy products intended for human consumption that are required to undergo a pasteurisation treatment.’ Part II header reads: ‘Certificate model DAIRY-PRODUCTS-PT.’ I.20 ‘Products for human consumption’ must be ticked. If header reads ‘not for human consumption’ the certificate is an 8322 — apply Part C rules.

**D2. I.20 — Certified as or for**

‘Products for human consumption’ must be ticked — hard error if not ticked. This is the 8468-specific certification purpose field.

**D3. I.27 Commodity Description Table — Structure**

I.27 on the 8468 is a structured multi-row table with 5 numbered rows. Only populate as many rows as needed. Unused rows must be struck through or redacted in their entirety — hard error if any unused row is left with visible unstruck content. Pure white/blank rows on digitally prepared EHCs are Method 3 redactions — not unstruck blanks.

The net weights across all populated rows must sum to I.26 net weight — hard error if mismatch. The number of packages across all populated rows must sum to I.24 total packages — hard error if mismatch.

**D4. I.27 Field Rules — Per Field**

|  |  |
|----|----|
| **CN Code** | Must be the numeric HS code (e.g. 0404100200). Text product descriptions in the CN Code field = hard error. |
| **Species** | Must be the Latin species name (BOS TAURUS for bovine). Must be present in every populated row. |
| **Nature of commodity** | Text description of the product. Must be present in every populated row. Must accurately reflect the product. Note: ‘DAIRY WHEY POWDER’ is accepted at FRCQF1 for AFI Variolac whey permeate loads — low notice only, not a hold reason. |
| **Number of packages** | Packages for that specific row. SUM across all populated rows must equal I.24. |
| **Type of packaging** | Must be present in every populated row. |
| **Batch No** | Must be present. AFI (AF-prefix) batches: full batch numbers required — truncated root = hard error. A correctly presented full AF-prefix batch number is correct — no notice of any kind. Saputo/Dairy Crest (AQ-prefix) batches: root truncation is standard practice — do not flag. |
| **Net Weight** | Net weight for this row. Sum of all rows must equal I.26 net weight. |
| **Treatment Type** | Must describe the heat treatment applied. Must be present in every populated row. |
| **Date of collection/production** | Production date(s) in date format (DD.MM.YYYY). Hard error if absent. Hard error if this field contains non-date content. |
| **Manufacturing plant** | Must contain the establishment approval number (e.g. GB DE 030) or N/A. Must NOT contain dates, product descriptions, or other non-approval-number content — hard error if it does. |
| **Cold Store** | N/A if not applicable. Note if blank. |
| **Final consumer** | Checkbox — usually blank for wholesale/trade consignments. |

**D5. Multi-Batch Consolidation — 8468**

Where I.27 contains multiple batches with different production dates in a single row: all batch numbers must be listed in the Batch No field; all corresponding production dates must be listed in the Date of collection/production field; the number of dates must match the number of batches — medium warning if count differs; cross-check each batch number against the allocation/picklist.

**D6. Part II Attestation — 8468**

|  |  |  |
|----|----|----|
| **Clause** | **Standard state** | **Notes** |
| II.1 Public health attestation (a-e) | RETAIN in full | Delete instruction ‘Delete when the Union is not the final destination.’ For standard EU consignments: retain. Sub-clauses (a)(i-vi), (b), (c), (d), (e) all retained. |
| II.1a AMR attestation | DELETE | Not applicable until 3 September 2026. Both full redaction (Method 3) AND pen strikethrough (Method 1) are confirmed normal methods — do not flag either. Adjacent stamp required for Method 1 strikethrough. |
| II.2 Animal health attestation | RETAIN | Delete instruction re solipeds/leporidae not applicable for bovine dairy — retain in full. |
| II.2.1 Annex XVII entry route | RETAIN with GB-0 zone code | Standard GB export route. |
| II.2.1 Annex XXII transit route | DELETE | Retain only for transit consignments. |
| II.2.2 Raw milk / Bos taurus | RETAIN | Zone code GB-0. Species Bos taurus retained. |
| II.2.2 Member States option | RETAIN | Always retained — never flag as undeleted fragment. |
| \[Official veterinarian\] / \[Certifying officer\] | Delete one | OV retained when II.2 animal health is retained (standard case). |
| Windsor Framework note | RETAIN | Must be present and undeleted in Notes section of both EN and second language pages. |

**D7. Groupage Consignments — 8468**

A groupage consignment is a small consignment consolidated with others for shipping. I.15 Identification: ‘N/A GROUPAGE’ acceptable — low notice only. I.19 Container: ‘N/A GROUPAGE’ acceptable. I.19 Seal: pallet-level security seals must still be present — hard error if absent. Non-contiguous seal ranges are valid.

**PART E — Checker Calibration Notes: Known False Positive Patterns**

|  |  |
|----|----|
| **E1 — Z-STRIKES** | Z-strikes may appear as undeleted text in low-resolution scans. Large diagonal Z-strikes spanning multiple sub-clauses are a valid Method 1 deletion technique. The checker must not raise a hard error on deletion completeness from scan appearance alone when Z-strikes are present. Request enlarged/higher-resolution image of the relevant page before raising a deletion hard error based on scan appearance. |
| **E2 — BLANK FIELDS** | Blank/white fields are Method 3 redactions, not unstruck blanks. On digitally prepared EHCs, unused fields and unused I.27/I.28 rows are deleted by redaction (Method 3). The field appears white/blank with no text visible and no strikethrough line. Do not flag blank/white unused rows or fields as unstruck. Only flag if: (a) a strikethrough line is visible but incomplete (edge miss), or (b) a row contains partial data with no deletion marking. |
| **E3 — WORKSHEETS** | Worksheets are working documents — judge only on the signed EHC. Worksheets (e.g. Be52, Gregory’s pick sheets, AFI load sheets) may contain multiple edits, corrections, different OV references, rolled date changes, and incomplete fields. They are not the signed certificate. Content on a worksheet must never trigger a hard error on the certificate. |
| **E4 — OV NUMBERING SYSTEMS** | SP number and RCVS number are different systems for the same OV. OV records carry two distinct reference numbers: (1) SP number — APHA-issued OV reference, used on circular stamps; (2) RCVS number — Royal College of Veterinary Surgeons registration, typically shown on the qualification stamp on the signing page. Do not flag as a mismatch or as two different OVs. |
| **E5 — SCAN QUALITY** | Do not raise hard errors based on scan appearance alone for ink colour or stamp clarity. Ink colour (black vs dark blue) cannot be reliably determined from a scanned PDF. Only flag stamp or signature ink as black if it is unambiguously black on the physical document — not based on scan appearance. |
| **E6 — VEHICLE & TRAILER IDENTIFICATION** | Trailer plate in I.19 container field is acceptable practice on curtainsider road vehicle loads. Foreign plates (Lithuanian, Bulgarian, Polish, Romanian, Belgian, Dutch etc.) in I.15 and I.19 are expected for international haulage. Vehicle registration cross-check: compare alphanumeric characters only — spaces, hyphens, dots and country prefixes in handwritten dispatch notes are optional formatting variations and never cause a mismatch. Handwriting variations (e.g. B written as D, or D as B) are resolved by photo — photo is ground truth. |
| **E7 — ROUTE & BCP COMBINATIONS** | Destination country and BCP entry point may differ — this is not an error. A load may enter the EU at one BCP country but be destined for a different EU member state. E.g. Spain destination via Calais FRCQF1, or Netherlands destination via Calais or Zeebrugge, are entirely standard for road freight. Language check is driven by BCP country (I.16), not destination country (I.9). |
| **E8 — PRODUCT-SPECIFIC RULES: AMBIENT WPC** | Liquid WPC on Immingham-Esbjerg tanker route: Ambient is correct. Liquid WPC (Whey Protein Concentrate) consignments on the Immingham-Esbjerg tanker route are certified as Ambient in I.18 by agreement with the Esbjerg BCP (DKEBJ1). Although the product loads at approximately 2-4 degrees C, there is no active refrigeration during transit. Do not flag Ambient as incorrect for this product and route. |
| **E9 — TANKER SEAL PHOTOS** | Seal photos on Immingham-Esbjerg tanker loads are taken at the previous loading in advance. Photo date predating the EHC production/signing date is expected and normal for this route. Never flag. |
| **E10 — TEMPLATE ARTEFACTS** | Stray row number (e.g. ‘2’) visible below treatment type in I.27 on DK tanker EHCs is a consistent template artefact. Never flag. |
| **E11 — PDF EDITABLE FIELD FAINT PRINTING** | All EU EHC templates print editable field text in a lighter/greyer font than the pre-printed text. This is a universal template characteristic — not an error or omission. Before flagging any field as blank or illegible from a scan, check the opposite language section (PDF-linked fields are identical) or request a photograph. Never raise a notice on field content based on scan faintness alone. |
| **E12 — SIGNING PAGE POSITIONAL FLEXIBILITY** | All signing area elements (date, name/qualifications, stamp, signature) need only be present somewhere within the signing area on the page. Exact positional alignment to the printed field labels is not required and must not be flagged. This applies to all EHC types (8322 and 8468) and all OVs. |
| **E13 — AMR ATTESTATION (II.1a)** | On 8468 certificates, the II.1a AMR attestation is not applicable until 3 September 2026. Both full redaction (blank/white field, Method 3) AND pen strikethrough (Method 1 with adjacent stamp) are confirmed normal deletion methods for this clause. Do not flag either method. |
| **E14 — NOVADES BV AS I.5 AND I.6** | Novades BV appearing as both the I.5 Consignee and the I.6 Operator responsible for the consignment is confirmed normal practice for this consignee. Do not flag. |
| **E15 — VESSEL / RO-RO LOADS (I.15 N/A)** | On vessel/ro-ro consignments, I.15 Means of transport will show Vessel ticked (often alongside Road vehicle) and Identification field as N/A. This is correct — the trailer registration appears in I.19 Container No field. Do not flag I.15 Identification as N/A on these loads. |
| **E16 — SAPUTO / DAIRY CREST BATCH TRUNCATION** | AQ-prefix batch numbers presented as root only (e.g. ‘AQ6070’, ‘AQ6069’) on Davidstow/Saputo (GB CQ 501) loads is confirmed standard practice. Do not flag — no notice of any kind. This does NOT apply to AFI/Arla (GB DE 030) loads, where full AF-prefix batch numbers are required (truncated root = hard error). |
| **E17 — VAN BENTUM TRAILERS** | BTS-prefix trailer numbers (e.g. BTS2295, BTS2359) are Van Bentum (www.bentum.nl, Netherlands) trailers, the expected haulier on Zeebrugge/BE-BEZEE1 ro-ro vessel loads for Novades BV. These are Dutch trailers — foreign plates are expected and normal. |
| **E18 — AFI I.5 CONSIGNEE PATTERN** | Arla Foods Ingredients Group P/S (Viby-J, Denmark) as I.5 consignee on all AFI EHCs is confirmed standard practice regardless of I.9 destination country and regardless of I.12 end customer identity. This applies to all routes including Irish destination loads. Never flag under any circumstances. |
| **E19 — AFI VARIOLAC WHEY PERMEATE COMMODITY DESCRIPTION** | ‘DAIRY WHEY POWDER’ in I.27/I.28 Nature of commodity on AFI Variolac whey permeate loads is accepted practice at Calais FRCQF1. The CN code (0404100200) is the definitive product identifier. Downgrade to low notice only — not a hold reason. |
| **E20 — COMBINED SEAL/TRAILER PHOTO** | A single photo showing the seal number, seal integrity and trailer plate in one frame is accepted as full verification of all three elements. Separate photos of tractor, trailer and seal are not required if the combined shot is clear and all three elements are legible. Photo remains ground truth. |

**PART F — Checker Brief: System Description and Technical Specification**

**F1. Purpose**

The EHC Checker is a tool that systematically verifies completed UK dairy export health certificates against the rules in Parts A-E of this document, cross-references accompanying commercial documents, and produces a structured PDF report. The goal is to catch errors before the load departs rather than at the BCP.

**F2. Inputs**

|  |  |
|----|----|
| **Signed EHC (PDF)** | Required — the authoritative document. All checks run against this. |
| **Delivery Note or AFI/Gregory’s Dispatch Confirmation** | Strongly recommended. Required for bulk tanker consignments. Enables seal, vehicle and weight cross-check. |
| **Picklist / allocation sheet** | Recommended. Enables batch and weight cross-check. Note: dates on picklist are scheduled dates, not actual loading dates. |
| **Photos — combined seal-on-trailer shot** | Recommended. A single photo showing the seal number, seal integrity and trailer plate in one frame satisfies the full photo evidence requirement. Immediately and definitively resolves vehicle and seal identity queries. Photo is ground truth. |
| **Invoice** | Optional. Additional commercial reference cross-check. |

**F3. Check Sequence**

The checker runs in the following order:

\(1\) Identify certificate type (8468 or 8322) from footer code and header.

\(2\) Preliminary checks — filename, page count, reference consistency, language.

\(3\) Part I field-by-field check against Part B rules and type-specific rules.

\(4\) Weight and date logic cross-checks.

\(5\) Commercial document cross-check against DN/dispatch confirmation and picklist.

\(6\) Part II attestation check against type-specific deletion map.

\(7\) Stamp and signature check — per-page and signing page.

\(8\) EN/second language parity check.

\(9\) Produce PDF report.

**F4. Report Format**

PAGE 1 — SUMMARY: Header with certificate reference, filename, OV, SP reference, BCP, commodity, date checked. Overall verdict box: PASS / HOLD. Metric row: count of hard errors / medium warnings / low notices. Flags in severity order: all hard errors first (red), then medium warnings (amber), then low notices (blue). Each flag states the field reference, page reference, and a concise description.

PAGE BREAK then SUBSEQUENT PAGES — FULL REPORT: Detailed findings section by section. Green pass-block for every field checked and found correct. Photo and document cross-check section where applicable. Rule set update recommendations table — new library entries and rule additions arising from this certificate. Footer: rule set version, report date, certificate reference, OV SP reference.

**F5. Deployment**

Current deployment: Claude.ai (this interface). Uploads accepted in the chat — EHC PDF, supporting documents, and photos. Checker applies rule set and produces a PDF report. Paste this entire document into a new Claude session to initialise the checker. No separate briefing document is required.

**F6. Rule Set Maintenance**

The rule set is updated when: (a) new certificate types, BCPs, OVs or establishments are encountered; (b) BCP feedback reveals new rejection grounds; (c) calibration notes identify systematic false positives; (d) policy or template changes are issued by APHA. Version history is maintained on the cover page.

Version 1.8 adds: New consignee Milkpol Polska Sp. z o.o. (ul. Lusinska 28A, 03-569 Warszawa, Poland) added to B6 known consignee library — sweet whey powder, 8468 human consumption, Calais route, I.5 and I.6 same entity. New destination Logit Sp. z o.o. (Barczyglow, ul. Skandynawska 7, 62-571 Stare Miasto, Poland, approval 30106002) added to B7 I.12 destination library — 8468 human consumption destination for Milkpol Polska consignments. County Milk Products / Saputo sweet whey powder route to Poland via Calais confirmed operational.
