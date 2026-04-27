**EHC ERROR CHECKER**

Combined Session Briefing and Rule Set

**Version 3.1 \| April 2026**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  INITIALISATION: Paste the entirety of this document into a new Claude session as the first message. Claude will read the full rule set before checking any certificate. No separate briefing document is required.

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**Version History**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Version**   **Date**     **Summary**
  ------------- ------------ -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  1.0--1.8      April 2026   Initial compilation through consignee library build-out. See archived versions for detail.

  2.0           April 2026   8384 MPNT and 8324 rule sets added. Calibration notes E24--E31. DSV533031-533040 four-seal rule. Immingham-Esbjerg loading rules. CMR groupage samples rule. Treatment D confirmed for Dartmouth/Around Noon route. Around Noon address hardened.

  2.1           April 2026   ENTC Dairy Solutions moved from H4 (Cat 3) to H2/H3 (8468 human consumption). Adjacent stamping rules clarified by deletion method --- new section A7.1.

  2.2           April 2026   PART J added: 8350EHC COMP composite products rule set (J1--J9). E32 dot matrix invoice calibration note. Library additions: Waldrons, Europ Foods c/o Tranzlberia, McCulla Customs.

  2.3           April 2026   PART K added: EHC 8436 HEP hatching eggs. NFG v18 absorbed. E33--E38 added. H6 placeholder.

  2.4           April 2026   PART L added: EHC 8471 EGG-PRODUCTS-PT. L1--L7 added. H7 placeholder. Briefing Notes updated.

  2.5           April 2026   E40--E47 added. A9 amended. B1 I.12 amended --- blank = hard error on all EHC types.

  2.6           April 2026   A6 Rotterdam footnote strengthened. I.12 type-specific approval number rules. E48 added. H2 Proglog SAS added. H3 ENTC Dairy Solutions approval number confirmed.

  2.7           April 2026   E49--E51 added. H3: PETI PROTEIN added (Novades/Zeebrugge sweet whey powder).

  2.8           April 2026   E52 added: duplicate/extra pages on rolled loads --- hard error. A9 amended: signing date not today = medium warning. H3 updated: Buisman, Zwolle added (approval N/A). Part C1 corrected: 8322 footer is language code only (no EHC prefix). New A2.1: footer code conventions by certificate family, I.25 tickboxes as non-human-consumption identification anchor. I.11 vs I.13 distinction hardened; E10 date positional flexibility confirmed as universal pass.

  2.9           April 2026   AFI tanker seal verification tightened following DN/seal mismatch incident (24 Apr 2026). E53 added: AFI tanker EHC --- DN not uploaded = medium warning. E54 added: AFI tanker in-situ seal photo required --- any discrepancy between photo, EHC and DN = hard error. E27 amended: DSV533031-533040 H&S absence-of-photo exception removed --- in-situ photos now required for this range also. Section 0.3 upload table updated. A12: Neil Blake BVSC MRCVS SP 155869 added. H4: Bech Gruppen I.25 \'Further process\' confirmed for AFI Variolac WPP loads.

  **3.0**       April 2026   I1 amended: mode selector added --- operator must declare Full Report (I2) or Training Report (I3) at session start; default is Full Report if no mode declared. I3 added: Training Report format defined (condensed format for operational use). E44 amended: bulk tanker gross weight absence now generates no flag of any kind --- clean pass at all severity levels.

  3.1           April 2026   Part 0 amended: paste instruction removed --- Rule Set is project-held, no pasting required. Session opener replaced with project-load trigger (\'EHC Checker --- load Rule Set\'). Mode prompt instruction added: Claude confirms Rule Set version and asks operator to declare Full Report or Training Report before first certificate is submitted.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**PART 0 --- SESSION BRIEFING: How to Start a New Chat**

**0.1 What This Tool Does**

The EHC Checker systematically verifies completed UK export health certificates against this rule set, cross-references accompanying commercial documents, and produces a structured report. The goal is to catch errors before the load departs rather than at the BCP.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **PART 0 ADDITION --- Mode Prompt --- insert after session opener**

  On receiving the \'EHC Checker --- load Rule Set\' trigger, Claude will confirm the Rule Set version and then ask: \'Please declare report mode for this session: FULL REPORT or TRAINING REPORT.\' The operator must reply before any certificate is submitted. If no mode is declared before the first certificate is uploaded, Claude defaults to Full Report (I2) and notes the default in the report header.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**0.2 Certificate Types in Use**

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **EHC**                    **Title**                                                                                                                   **Product**                                 **Rule Part**
  -------------------------- --------------------------------------------------------------------------------------------------------------------------- ------------------------------------------- ---------------
  8468 (DAIRY-PRODUCTS-PT)   Dairy products for human consumption requiring pasteurisation                                                               Dairy --- human consumption                 D

  8322                       Milk, milk-based products and milk-derived products not for human consumption                                               Dairy --- Category 3 ABP                    C

  8384 (MPNT)                Animal health/official certificate to the EU --- meat products not required to undergo specific risk-mitigating treatment   Cooked meat products --- Treatment A or D   E

  8324                       Canned pet food intended for dispatch to or transit through the EU and NI                                                   Canned pet food --- Fc3 heat treated        F

  8350EHC COMP               Animal health/official certificate to the EU --- composite products                                                         Composite food products                     J

  8436 (HEP)                 Animal health/official certificate to the EU --- hatching eggs of poultry other than ratites                                Hatching eggs                               K

  8471 (EGG-PRODUCTS-PT)     Egg products intended for human consumption requiring pasteurisation                                                        Egg products --- human consumption          L
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**0.3 What to Upload Per Check**

+---------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Document**                          | **Notes**                                                                                                                                                                                                                                 |
+=======================================+===========================================================================================================================================================================================================================================+
| Signed EHC (PDF)                      | Required --- the authoritative document                                                                                                                                                                                                   |
+---------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Delivery Note / Dispatch Confirmation | REQUIRED for AFI tanker loads --- absence = medium warning (E53). Strongly recommended for all other loads. Required for bulk tanker loads generally.                                                                                     |
+---------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Allocation / Picklist Sheet           | Recommended --- enables batch and weight cross-check                                                                                                                                                                                      |
+---------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Photos: combined seal-on-trailer shot |   --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                                       |   Recommended for all loads. REQUIRED for AFI tanker loads and DSV533031-533040 range tankers --- in-situ seal photos must be uploaded and cross-checked against EHC and DN. Any discrepancy = hard error (E54). Photo is ground truth.   |
|                                       |                                                                                                                                                                                                                                           |
|                                       |   --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+---------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**0.4 How to Report**

  ----------------------------------------------------------------------------------------
  **Severity**             **Action**
  ------------------------ ---------------------------------------------------------------
  Hard error (RED)         BCP will reject --- load must not depart

  Medium warning (AMBER)   Resolve before dispatch where possible --- BCP may query

  Low notice (BLUE)        Valid variation, noted for information --- no action required
  ----------------------------------------------------------------------------------------

Give a clear PASS or HOLD verdict. PASS = no hard errors. HOLD = one or more hard errors or unresolved medium warnings requiring confirmation before dispatch.

**PART A --- Universal Rules: Apply to Every EHC Regardless of Type**

**A1. Document Overview**

This rule set covers UK export health certificates signed by an Official Veterinarian under APHA authority. Certificate types in current use: 8468, 8322, 8384, 8324, 8350EHC COMP, 8436, 8471. Rules in Parts A and B apply to all certificate types. Certificate-specific rules are in Parts C (8322), D (8468), E (8384), F (8324), J (8350EHC COMP), K (8436), and L (8471). Part G contains checker calibration notes. Both 8468 and 8322 consist of an English section followed by a second language section determined by the BCP entry point country, not the destination country. 8384, 8324, 8436, and COMP follow the same principle.

**A2. Template Versions and Page Count**

8468: 5 EN pages + second language section (5 or 6 pages depending on language) = 10 or 11 pages total. Both are valid.

8322: 5 EN pages + 5 second language pages = 10 pages total. English-only for Ireland, Northern Ireland, or where second language is optional: 5 pages.

8384 MPNT: 7 EN pages + second language pages. 8324 Canned Petfood: 4 EN pages + second language pages + schedule page(s).

8436 HEP: 7 EN pages + second language pages. English-only for Ireland/Northern Ireland or where second language is optional.

Obsolete template (pre-2026): flag as medium warning. Page count varies by language --- never flag page count as an error on number alone. Page footer language code is the primary detection method.

**A2.1 Footer Code Conventions by Certificate Family**

Footer code conventions differ by certificate family. Human-consumption templates (8468, 8384, 8350, 8436, 8471) carry the EHC code plus language code in the footer (e.g. \'8468EHC en\'). Non-human-consumption templates (8322 and 8324) carry only the language code. A reliable alternative identification anchor for the non-human-consumption family is the presence of field I.25 \'Commodity certified for\' with four tickboxes (Animal feedingstuff / Further process / Production of petfood / Technical use); this field is not present on human-consumption certificates. When checking footer compliance, apply the convention of the certificate type being checked.

**A3. Filename Cross-Check**

The filename should contain three elements matching the certificate: (1) certificate reference --- digits must match I.2 on all pages; (2) commercial document reference --- must match I.17; where I.17 has multiple references, filename match on any one = pass; (3) date --- must match signing date on final pages. Any mismatch = medium warning.

**A4. Certificate Reference Consistency**

Extract the EHC reference from every page header and II.a box. All pages must show identical reference throughout. The first page of each language section and any page containing the commodity description table or product weight details are the highest-risk pages for retyping and reinsertion --- flag any mismatch by specific page number. See E41. Mismatch = hard error.

**A5. Pagination**

All pages must show \"X of N\" where N is consistent across every page including schedule pages. Inconsistent page totals = hard error. Known failure mode: superimposed pagination (garbled text such as \"111\" or \"141\") = hard error, not a scan artefact.

**A6. Language Check**

The second language is determined by the BCP entry point country (I.16) --- NOT the destination country (I.9). Mismatch between BCP country and language code = hard error.

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **BCP Country**    **Required Language**      **Authority**              **Notes**
  ------------------ -------------------------- -------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------
  France             French (fr)                SIVEP                      e.g. Calais FRCQF1

  Denmark            Danish (da)                Danish border authority    e.g. Esbjerg DKEBJ1

  Netherlands        Dutch (nl)                 Dutch border authority     Currently optional --- single English also acceptable at NL-RTM1. Single English-only 8468 for Rotterdam = low notice only, not a medium warning.

  Belgium            French or Dutch            Belgian border authority   Depending on BCP location. Zeebrugge = French.

  Ireland            None                       Irish border authority     Single English document --- no second language required

  Northern Ireland   None                       DAERA                      Single English document --- no second language required

  Spain              Spanish (es)               Spanish border authority   

  Other EU           That country\'s language                              
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

NOTE: Always use the BCP-specific authority name in reports --- never use \"SIVEP\" for a Danish, Irish, Belgian or other non-French BCP.

**A7. Per-Page Stamp and Signature Requirement**

Every page must have at least one SP circular red stamp visible. Every page must have a full signature (not initials). Initials are only used adjacent to individual deletions or added text, accompanied by a stamp. Stamp consistency: SP reference number must be identical on every stamp throughout the entire document. Different SP number on any page = hard error. Same OV must sign and stamp entire document --- two different OVs = instant rejection.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  NOTE: On a continuously signed single-document EHC by one OV using their own stamp, an apparent SP number discrepancy between pages is almost certainly a scan artefact. Only escalate if the number is clearly and unambiguously different (e.g. a completely different digit sequence).

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**A7.1 Adjacent Stamping by Deletion Method**

Section A7 establishes that every page must carry at least one SP circular red stamp and full signature. Section A7.1 clarifies the additional stamping required adjacent to deletions and added text, which varies by deletion method.

- Style 1 --- Manual deletions (pen strikethrough, Method 1): Each individual deletion must carry an adjacent SP stamp and initials. Each piece of added text written in pen must also carry an adjacent SP stamp and initials.

- Style 2 --- Adobe deletions (digital strikethrough, Method 2): Identical requirements to Style 1. A single page-level stamp does NOT satisfy the per-deletion requirement.

- Style 3 --- Redacted certificates (text removal, Method 3): No adjacent stamp required at the location of removed text. Page must still carry its mandatory page-level stamp. Where added text is present on a redacted page, an SP stamp and initials must appear adjacent to that added text.

  -------------------------------------------------------------------------------------------------------------
  **Page contains**                                       **Adjacent stamps required**   **Page-level stamp**
  ------------------------------------------------------- ------------------------------ ----------------------
  Method 1 or 2 deletions                                 One per deletion               Required (A7)

  Method 1 or 2 added text                                One per added text item        Required (A7)

  Method 3 redactions only, no added text                 None                           Required (A7)

  Method 3 with added text (digital or handwritten)       One per added text item        Required (A7)

  Page with no deletions and no added text (any method)   None                           Required (A7)

  Signing page (any method)                               Per A9                         Per A9
  -------------------------------------------------------------------------------------------------------------

**A8. Deletion Methods and Stamp Requirements**

- Method 1 --- Hand pen strikethrough: Stamp (SP circular red) with initials required adjacent to each deletion. Z-strike acceptable for blocks of text including multiple sub-clauses.

- Method 2 --- Adobe PDF strikethrough: Stamp with initials required adjacent to each deletion. A single page-level stamp does NOT satisfy the per-deletion requirement.

- Method 3 --- Redaction (whiteout/text removal): No stamp required adjacent to deleted text. Only requirement: at least one stamp per page.

Mixed methods: valid. Added text (e.g. GB-0 zone code): stamp required adjacent --- except N/A added to I.21 transit box which is exempt.

**A9. Signing Page Rules**

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Element**                                                                                                                                                                                           | **Rule**                                                                                                                                                                                                                                                                                                                                                                                                                              |
+=======================================================================================================================================================================================================+=======================================================================================================================================================================================================================================================================================================================================================================================================================================+
| SP stamp in Final OV Signature field                                                                                                                                                                  | Mandatory --- hard error if absent                                                                                                                                                                                                                                                                                                                                                                                                    |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Page stamp                                                                                                                                                                                            | Mandatory --- hard error if absent                                                                                                                                                                                                                                                                                                                                                                                                    |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Name and qualification                                                                                                                                                                                | Must be present as name/qualification stamp (rectangular) OR handwritten name in capitals plus qualification                                                                                                                                                                                                                                                                                                                          |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Date                                                                                                                                                                                                  | Must be present --- must be same as or earlier than I.14 departure date                                                                                                                                                                                                                                                                                                                                                               |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Signature                                                                                                                                                                                             | Must be present --- full signature required, not initials                                                                                                                                                                                                                                                                                                                                                                             |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Same OV both signing pages                                                                                                                                                                            | SP number, initials and name must be identical on EN and second language signing pages                                                                                                                                                                                                                                                                                                                                                |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Signing page dates                                                                                                                                                                                    | EN and second language signing page dates MUST ALWAYS match each other --- mismatch = hard error regardless of what date appears                                                                                                                                                                                                                                                                                                      |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Positional flexibility                                                                                                                                                                                | All signing area elements need only be present within the signing area on the page. Exact positional alignment to printed field labels is not required and must not be flagged. A date handwritten anywhere within the signing area is always a pass --- do not raise any flag, medium warning or otherwise, where the correct date is legible within the signing area. This applies equally to EN and second language signing pages. |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| OV/CO deletion                                                                                                                                                                                        | Stamp and initials required adjacent to deletion if Method 1 (hand strikethrough) or Method 2 (Adobe strikethrough). No stamp required if Method 3 (redaction/text removal). See E40.                                                                                                                                                                                                                                                 |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Signing date not today                                                                                                                                                                                | Where the signing date on any page of the EHC is not the current date, raise as a MEDIUM WARNING (AMBER) --- possible rolled load with unamended pages. OV must confirm all date fields (I.14 and both signing pages) are consistent and current before dispatch.                                                                                                                                                                     |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| NOTE: For live EHCs the signing date on both pages will almost always be today. The medium warning for a date that is not today is raised to flag possible rolled loads. Only flag if the signing date is not today. Do not flag if the two signing pages differ from each other (that remains a hard error), or if the date creates a logic failure (signing after departure, or before production date).                                                                                                                                                                                                                                    |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**A10. Windsor Framework / Boilerplate Notes**

Windsor Framework paragraph must be present and undeleted in Notes section of both EN and second language pages on 8468 and 8322 certificates. Both Windsor Framework wording AND older Protocol on Ireland/Northern Ireland wording are valid depending on template version.

**A11. Severity Levels**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Severity**             **Description**                                                 **Examples**
  ------------------------ --------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Hard error (RED)         BCP will reject the consignment                                 Missing stamp or signature, wrong OV/SP on any page, wrong reference, date error, wrong species retained, missing seal, weight inconsistency, two transport condition boxes ticked, EN/second language parity mismatch, signing page dates differ, physical page count exceeds declared pagination

  Medium warning (AMBER)   SIVEP/BCP may reject on a bad day --- resolve before dispatch   Filename mismatch, DN despatch ref mismatch, missing I.17 reference, blank I.11 with no marking, ISO code digit/letter substitution, new consignee not in library, signing date not today

  Low notice (BLUE)        Valid variation worth noting --- no action required             Extra stamps, older template version, preferred text form, new destination entry for library update
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**A12. Known OVs, SP References and RCVS Numbers**

  --------------------------------------------------------------------------
  **OV Name**                   **SP Reference**        **RCVS Number**
  ----------------------------- ----------------------- --------------------
  Hector Lopez MRCVS OV         SP 630859               7091037

  Silvia Soescu MRCVS           SP 632477               7280697

  RR Cunningham BVetMed MRCVS   SP 136830               0314006

  Neil Blake BVSC MRCVS         SP 155869               6070662
  --------------------------------------------------------------------------

**A13. Known BCPs**

  -------------------------------------------------------------------------------------------------------------------------------
  **BCP Name**    **TRACES Code**    **Country**        **Authority**              **Language**
  --------------- ------------------ ------------------ -------------------------- ----------------------------------------------
  Calais          FRCQF1             France             SIVEP                      French

  Esbjerg         DKEBJ1             Denmark            Danish border authority    Danish

  Zeebrugge       BE-BEZEE1          Belgium            Belgian border authority   French

  Rosslare        IE ROS 1           Ireland            Irish border authority     None (English only)

  Dublin Port     IE DUB 1           Ireland            Irish border authority     None (English only)

  Belfast Port    BCP/XIBEL1-DAERA   Northern Ireland   DAERA                      None (English only)

  Warrenpoint     BCP/XIWPT1-DAERA   Northern Ireland   DAERA                      None (English only)

  Larne Harbour   BCP/XILAR1-DAERA   Northern Ireland   DAERA                      None (English only)

  Rotterdam       NL-RTM1            Netherlands        Dutch border authority     Dutch (optional --- single English accepted)
  -------------------------------------------------------------------------------------------------------------------------------

**PART B --- Part I Field Rules: Apply to All EHCs**

**B1. Field-by-Field Rules**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                         **Rule**
  --------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.1 Consignor/Exporter            Must be populated --- hard error if blank. May be the trading entity or the registered office rather than the manufacturing address --- acceptable where I.11 correctly identifies the dispatch establishment.

  I.2 Certificate ref               Must match II.a reference throughout all pages.

  I.3 Central Competent Authority   Fixed DEFRA text --- pass if present.

  I.4 Local Competent Authority     Fixed APHA text --- pass if present.

  I.5 Consignee/Importer            Must be populated. Cross-check against known consignee library. For AFI powder EHCs: I.5 is always Arla Foods Ingredients P/S / Group P/S (Viby-J, Denmark) regardless of end customer --- confirmed standard practice, never flag. For Novades BV: I.5 and I.6 may be the same entity --- confirmed normal.

  I.6 Operator responsible          Valid if populated OR struck through with stamp/initials OR marked N/A. Hard error only if completely blank with no marking. Commonly a logistics agent. Same entity as I.5 = normal for some consignees --- do not flag.

  I.7 Country of origin             Must be populated. Preferred: GREAT BRITAIN / GB.

  I.8 Region of origin              Must show GB-0 for Great Britain exports of dairy and petfood --- hard error if missing. For poultry meat products (8384): must show GB-1 (not GB-0) --- hard error if wrong. For hatching eggs (8436): must show GB-0 or GB-1 depending on current AI disease status --- OV must check APHA HPAI interactive map immediately prior to signing.

  I.9 Country of destination        Must be populated. If non-EU --- raise transit notice.

  I.11 Place of dispatch            Name and address required. Approval number required --- see establishment lookup. If completely blank = low notice only. Gregory Distribution at any address = approval N/A --- correct. For 8436: PHS approval number of hatchery or flock of origin required. NOTE: I.11 is the dispatch establishment --- an approval number is required here. I.13 (Place of loading) is a logistics/loading address only --- no approval number is required or expected at I.13. Never flag absence of approval number at I.13.

  I.12 Place of destination         Must be completed on all EHC types. Blank = hard error. Approval number rules are type-specific: • 8322 (Cat 3 ABP): Destination approval number required --- medium warning if absent. See C5 for exceptions. • 8468 (human consumption) --- general rule: Approval number field is N/A --- this is correct and expected. Do not flag absence. • 8468 (human consumption) --- Poland exception: Where the consignee/destination is a Polish entity on a County Milk trade lane, the Polish customer requires the destination establishment approval number to be present. Absence = medium warning. Confirmed: Milkpol Polska → Logit Sp. z o.o. (30106002); County Milk → ENTC Dairy Solutions (PL 28041606 UE). • On 8324: Glenkrag NI = populated with Glenkrag address and N/A approval number.

  I.13 Place of loading             Must be populated. May differ from I.11 --- not an error. No approval number required at I.13. For Immingham-Esbjerg route: must show Immingham --- see E28/E42.

  I.14 Departure date               Must be populated. This is the OV signing date --- not the date the vehicle physically departs or boards the ferry.

  I.15 Means of transport           At least one box ticked AND registration/identification present --- UNLESS the load is a vessel/ro-ro consignment where I.15 Identification is N/A. Multiple boxes ticked (e.g. Vessel + Road vehicle) = valid for ro-ro.

  I.16 Entry BCP                    Must be populated --- extract country for language check.

  I.17 Accompanying documents       Commercial document reference must be present --- hard error if blank. Where I.17 contains multiple references, filename match on any one = pass.

  I.18 Transport conditions         Exactly ONE box must be ticked. Ambient, Chilled and Frozen are mutually exclusive --- two or more ticked = hard error.

  I.19 Container/Seal number        Seal number must be present for sealed loads --- hard error if blank. Multiple seal numbers acceptable. Trailer registration plate in Container No field = acceptable practice. Container N/A acceptable for bulk tanker.

  I.20 Certified as or for          On 8468: \'Products for human consumption\' must be ticked --- hard error if not. On 8436: \'Germinal products\' must be ticked --- hard error if not ticked.

  I.22 For internal market          Must be ticked for standard EU/NI consignment.

  I.24 Total number of packages     Must be populated. Must match commodity description table package count.

  I.26/I.20 Net/gross weight        Net weight must be populated. Must match commodity description table. Gross weight must also be populated on all non-tanker loads --- absence = medium warning (E44).
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**B2. Weight Consistency**

Net weight in I.20/I.26 must match the commodity description table net weight. Mismatch = hard error. Cross-check against delivery note or picklist when available.

**B3. Date Logic**

The rule is: Production date ≤ Signing date ≤ Departure date. Collection/production date in commodity table must be same day or earlier than signing date --- hard error if after. Signing date must be same day or earlier than I.14 departure date --- hard error if after. For aged products (aged cheese, aged powders, aged canned product): long gaps between production and departure are valid --- do not flag.

**B4. Destination and Transit**

EU member state ISO codes: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Northern Ireland ISO code: XI. Language check is always driven by BCP country (I.16), not destination country (I.9).

**B5. Photo Evidence**

RULE: PHOTO IS GROUND TRUTH. If a photo of any plate, seal or vehicle is uploaded, it is the final and absolute decision maker. Any discrepancy between the EHC/dispatch doc and the photo is resolved in favour of the photo. The photo cannot be wrong. A single combined photo showing the seal number, seal integrity and trailer plate in one frame is accepted as full verification of all three elements.

**B6. ISO Country Code Vigilance**

ISO country codes must be checked carefully for digit/letter substitution errors. Known confusion pairs: ES vs E5; DK vs OK; PT vs P1; NL vs N1; DE vs GE. Apply to all ISO code fields throughout the certificate. Severity: medium warning.

**B7. Species Rule**

For dairy EHCs (8468/8322): Only Bos taurus is valid for GB dairy exports. All other species names must be fully deleted in BOTH English and second language sections. Even a single word fragment = hard error. For petfood EHCs (8384/8324): Species listed in I.28 must match the products on the schedule. \'Member States\' option within animal origin clauses is always retained --- never flag. For hatching eggs (8436): Species in I.27 must be consistent with the poultry category declared. Ratites must not appear.

**B8. OV Numbering Systems**

SP number and RCVS number are different systems for the same OV. SP number --- APHA-issued OV reference, used on circular stamps. RCVS number --- Royal College of Veterinary Surgeons registration, typically shown on the qualification stamp on the signing page. Do not flag as a mismatch or as two different OVs.

**PART C --- EHC 8322: Not for Human Consumption (Category 3 ABP Dairy)**

**C1. Certificate Identification**

8322 pages carry a minimalist footer showing only the language code --- \'en\' on English pages, \'fr\' / \'da\' / \'nl\' etc. on second language pages. Unlike human-consumption certificates, the 8322 template does not include an EHC prefix in the footer. Certificate identification is anchored on header text \'Milk, milk-based products and milk-derived products not for human consumption\', the Category 3 labelling requirement at II.6, and the presence of field I.25 \'Commodity certified for\' with its four tickboxes (Animal feedingstuff / Further process / Production of petfood / Technical use). Footer code and header mismatch = hard error.

**C2. Page Count --- 8322**

Standard bilingual 8322: 5 EN pages + 5 second language pages = 10 pages. English-only (Ireland, Northern Ireland, or where BCP language is optional): 5 pages.

**C3. I.25 Commodity Certified For**

I.25 on the 8322 has four tickboxes. Exactly one must be ticked. None ticked = hard error. More than one ticked = hard error.

  --------------------------------------------------------------------------------------------------------------------------------------
  **Option**              **Notes**
  ----------------------- --------------------------------------------------------------------------------------------------------------
  Animal feedingstuff     Product destined for animal feed. Most common for whey/milk powder. Novades, Navobi, Van Tuijl consignments.

  Further process         Product destined for further processing. Nukamel consignments. J M W Farms Ltd Killylea consignments.

  Production of petfood   Product destined for pet food manufacture.

  Technical use           Any other use --- any use other than feeding farmed animals (other than fur animals) and petfood production.
  --------------------------------------------------------------------------------------------------------------------------------------

**C4. Part II Preamble --- Product Type Deletion**

  -------------------------------------------------------------------------------------------------------------------------------------
  **Product**                         **Required Deletion Pattern**
  ----------------------------------- -------------------------------------------------------------------------------------------------
  Sweet whey powder / milk powder     Retain \'the milk-based products\' only. Delete \'the milk\' and \'and milk-derived products\'.

  Whey permeate powder                All three product type options struck --- accepted practice for this product type on the 8322.

  Raw/liquid milk                     Retain \'the milk\' only.

  Casein / milk-derived ingredients   Retain \'and milk-derived products\' as applicable.
  -------------------------------------------------------------------------------------------------------------------------------------

**C5. I.12 Destination Approval Numbers --- Cat 3**

On 8322 certificates, I.12 (Place of destination) should carry the Cat 3 receiving establishment approval number. Flag as medium warning if blank. Exception: Ballywalter, Co Down, BT22 2NB --- reference 1018 is NOT a Cat 3 approval number and must be left blank. Feed and Food NI (Co Armagh) --- approval number status pending confirmation, leave blank until verified.

**C6. Part II Clause Structure and Standard Deletion Pattern --- 8322**

  ----------------------------------------------------------------------------------------------------------------------
  **Clause**                                    **Standard State**   **Notes**
  --------------------------------------------- -------------------- ---------------------------------------------------
  II.1 Country/FMD                              RETAIN               Fill in United Kingdom / GB-0

  II.2 Raw milk animal health                   RETAIN               

  II.3 (2) either \[treatments in II.4\]        RETAIN               

  II.3 (2) or \[whey/FMD arm\]                  DELETE entire arm    Including ALL sub-options. Z-strikes valid.

  II.4 HTST header                              RETAIN               

  II.4 (2) either --- second HTST               DELETE               

  II.4 (2) or --- drying process                RETAIN               Spray drying route

  II.4 (2) or --- pH reduction                  DELETE               

  II.4 (2)(5) or --- 21 days FMD                DELETE               

  II.4 (2)(5) or --- voyage date                DELETE               

  II.4 (2) or --- UHT 132 degrees               DELETE entire arm    Including all sub-options

  II.4 (2) or --- sterilisation Fo3             DELETE               

  II.5 Contamination precautions                RETAIN               

  II.6 (2) either --- new containers            RETAIN               For bagged product

  II.6 (2) or --- bulk container disinfection   DELETE               For bagged product; may retain for bulk tanker

  II.6 \'and\' --- Cat 3 labelling              RETAIN               Containers marked Cat 3 not for human consumption

  II.7 (2) either --- no ovine/caprine          RETAIN               For pure bovine product

  II.7 (2) or --- ovine/caprine arm             DELETE entire arm    Including all sub-clauses (a)(i-v), (b), (c)
  ----------------------------------------------------------------------------------------------------------------------

**C7. EN / Second Language Parity --- 8322**

All deletions in the EN section (pages 2-4) must be mirrored exactly in the second language section (pages 7-9). A deletion present in EN but absent in second language (or vice versa) = hard error.

**C8. Multi-Batch Consolidation --- 8322**

Where I.28 contains multiple batches: all batch numbers must be listed. On the 8322 Cat 3 dairy EHC, production dates are NOT required in I.28 and will never be present --- do not flag their absence. Single consolidated net weight covering all batches is correct and normal.

**C9. Batch Number Presentation Rules**

**CRITICAL RULE: Batch number presentation differs by consignor.**

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Consignor / Batch Type**                                          **Rule**
  ------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Saputo / Dairy Crest (Davidstow, GB CQ 501) --- AQ-prefix batches   AQ-root truncation (e.g. \'AQ6070\', \'AQ6069\') is confirmed standard practice. DO NOT FLAG --- no notice of any kind.

  AFI / Arla (Taw Valley, GB DE 030) --- AF-prefix batches            Full batch numbers are required (e.g. \'AF26111001\', \'AF26112001\'). Truncated root only (e.g. \'AF26111\' without individual run number) = HARD ERROR (red). BCP rejection grounds.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**PART D --- EHC 8468: Human Consumption (DAIRY-PRODUCTS-PT)**

**D1. Certificate Identification**

8468 pages carry footer code \'8468EHC en\' (English) and \'8468EHC da / fr / nl etc.\' (second language). Header reads: \'Dairy products intended for human consumption that are required to undergo a pasteurisation treatment.\' Part II header reads: \'Certificate model DAIRY-PRODUCTS-PT.\' I.20 \'Products for human consumption\' must be ticked.

**D2. I.27 Commodity Description Table --- Structure**

I.27 on the 8468 is a structured multi-row table with 5 numbered rows. Only populate as many rows as needed. Unused rows must be struck through or redacted in their entirety --- hard error if any unused row is left with visible unstruck content. Pure white/blank rows on digitally prepared EHCs are Method 3 redactions --- never flag as unstruck. The net weights across all populated rows must sum to I.26 net weight --- hard error if mismatch. The number of packages across all populated rows must sum to I.24 total packages --- hard error if mismatch.

**D3. I.27 Field Rules --- Per Field**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                       **Rule**
  ------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  CN Code                         Must be the numeric HS code (e.g. 0404100200). Text product descriptions in the CN Code field = hard error.

  Species                         Must be the Latin species name (BOS TAURUS for bovine). Must be present in every populated row.

  Nature of commodity             Text description of the product. Must be present. Note: \'DAIRY WHEY POWDER\' is accepted at FRCQF1 for AFI Variolac whey permeate loads --- low notice only.

  Batch No                        Must be present. AFI (AF-prefix) batches: full batch numbers required --- truncated root = hard error. Saputo (AQ-prefix): root truncation is standard --- do not flag.

  Net Weight                      Sum of all rows must equal I.26 net weight.

  Treatment Type                  Must describe the heat treatment applied. Must be present in every populated row.

  Date of collection/production   Production date(s) in date format. Hard error if absent or contains non-date content.

  Manufacturing plant             Must contain the establishment approval number or N/A. Must NOT contain dates, product descriptions, or other non-approval-number content --- hard error if it does.
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**D4. Part II Attestation --- 8468**

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Clause**                                           **Standard State**           **Notes**
  ---------------------------------------------------- ---------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------
  II.1 Public health attestation (a-e)                 RETAIN in full               Retain --- Union IS the final destination.

  II.1a AMR attestation                                DELETE                       Not applicable until 3 September 2026. Both full redaction (Method 3) AND pen strikethrough (Method 1) are confirmed normal methods --- do not flag either.

  II.2 Animal health attestation                       RETAIN                       Retain in full.

  II.2.1 Annex XVII entry route                        RETAIN with GB-0 zone code   Standard GB export route.

  II.2.1 Annex XXII transit route                      DELETE                       Retain only for transit consignments.

  II.2.2 Raw milk / Bos taurus                         RETAIN                       Zone code GB-0. Species Bos taurus retained.

  II.2.2 Member States option                          RETAIN                       Always retained --- never flag as undeleted fragment.

  \[Official veterinarian\] / \[Certifying officer\]   Delete one                   OV retained when II.2 animal health is retained (standard case).

  Windsor Framework note                               RETAIN                       Must be present and undeleted in Notes section of both EN and second language pages.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**PART E --- EHC 8384 MPNT: Cooked Meat Products (Treatment A)**

**E1. Certificate Overview**

+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| **Field**                                                                                                          | **Value**                                                                                                          |
+====================================================================================================================+====================================================================================================================+
| Certificate model                                                                                                  | 8384EHC --- MPNT (Meat Products, Non-specific Treatment)                                                           |
+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| Product type                                                                                                       | Cooked poultry meat product (e.g. IQF Shredded Duck, Gluten Free)                                                  |
+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| Species                                                                                                            | Anas platyrhynchos (domestic duck) --- species code: POU                                                           |
+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| Treatment                                                                                                          | Treatment A (non-specific) OR Treatment D where the product has genuinely undergone that process --- see E25       |
+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| Territory code                                                                                                     | GB-1 (Great Britain, poultry --- regionalised zone authorised for Treatment A)                                     |
+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| Destination                                                                                                        | NI (Northern Ireland) / EU                                                                                         |
+--------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------+
| KEY POINT --- GB POULTRY REGIONALISATION: The UK uses Treatment A for all species EXCEPT poultry, ratites and wild game, where it is regionalised. For poultry, GB-1 = Treatment A permitted. GB-0 in I.8 for poultry = hard error.     |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**E2. Part I Field Rules --- 8384 Specific**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                   **Rule**
  --------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.8 Region of origin        GB-1 for poultry --- hard error if shows GB-0 or GB-2.

  I.18 Transport conditions   FROZEN for IQF product.

  I.20 Certified as or for    On 8384: \'Products for human consumption\' --- confirm ticked.

  I.27 Commodity table        CN Code must be numeric HS code. Species: ANAS PLATYRHYNCHOS. Treatment type: TREATMENT A (or D where certified). Manufacturing plant: GB-1 establishment approval number. Production date required.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**E3. Standard Deletion Map --- 8384 Cooked Duck, GB-1, Destination NI/EU**

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Clause**                                                       **Standard State**   **Notes**
  ---------------------------------------------------------------- -------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  II.1 Public health attestation header                            RETAIN               Union IS the final destination --- retain the full attestation.

  II.1.1 HACCP / approved establishments                           RETAIN               

  II.1.2 --- first option (ante-mortem + post-mortem inspection)   RETAIN               Farmed duck slaughtered in UK abattoir --- retain this option.

  II.1.2 --- second option (wild game post-mortem only)            DELETE               No wild game --- delete.

  II.1.3 Raw material requirements                                 RETAIN               

  II.1.4 Identification mark                                       RETAIN               

  II.1.5 Labelling / approved establishments                       RETAIN               

  II.1.6 Microbiological criteria                                  RETAIN               

  II.1.7 Residue plan guarantees                                   RETAIN               UK listed in Annex I to Implementing Reg 2021/405 for poultry.

  II.1.8 Transport conditions                                      RETAIN               

  II.1.9.1 Trichinella (porcine)                                   DELETE               No porcine material in duck product.

  II.1.9.2 Trichinella (solipeds/wild boar)                        DELETE               No soliped or wild boar material.

  II.1.9.3 Stomachs, bladders, intestines                          DELETE               Product is shredded duck meat.

  II.1.9.4 Rendered animal fats / greaves                          DELETE               Product is shredded duck meat.

  II.1.10 BSE attestation                                          DELETE               Duck contains no bovine, ovine or caprine material.

  II.1.11 Domestic solipeds                                        DELETE               No soliped material.

  II.1.12 Cervidae (CWD)                                           DELETE               No cervid material and GB is not Canada/USA.

  II.1a AMR attestation                                            DELETE               Not applicable until 3 September 2026. Both full redaction (Method 3) AND Adobe strikethrough (Method 2 with adjacent stamp) are confirmed normal deletion methods.

  II.2 Animal health attestation header                            RETAIN               Duck (POU) requires II.2.

  II.2.1 --- first option (entry to Union, zone code)              RETAIN               Retain and complete: zone code GB-1.

  II.2.1 --- second option (transit through Union)                 DELETE               Not a transit consignment.

  II.2.2 Species code                                              RETAIN               Retain and complete: species code POU.

  II.2.3 Non-specific treatment                                    RETAIN               Retain --- GB-1 listed under Treatment A in Annex XV.

  II.2.4 --- first either (zone referred to in II.2.1)             RETAIN               Retain --- fresh meat is of GB-1 origin.

  II.2.4 --- first or (imported from non-EU third country)         DELETE               Duck is GB origin.

  II.2.4 --- second or (EU/NI origin fresh meat)                   DELETE               Duck is GB origin.

  II.2.4 --- Member States                                         RETAIN               Always retained --- never flag as undeleted fragment.

  II.2.5 --- first either (domestic animals)                       RETAIN               Retain --- farmed duck is a domestic animal.

  II.2.5 --- or (wild animals)                                     DELETE               Farmed duck --- not wild.

  II.2.6 Post-processing handling                                  RETAIN               

  II.2.7 Newcastle disease vaccination (Finland/Sweden)            DELETE               Destination is NI, not Finland or Sweden.

  II.3 Animal welfare attestation                                  RETAIN               Retain --- Union IS the final destination.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**E4. Disease Clearance --- 8384 Poultry**

For poultry products from GB-1, OV must check notifiable disease occurrence list immediately prior to certification. The GB-1 zone must be free from Highly Pathogenic Avian Influenza (HPAI) at the time of certification. Check the APHA notifiable disease occurrence list (ET171) and the interactive APHA HPAI map.

**PART F --- EHC 8324: Canned Petfood**

**F1. Certificate Overview**

EHC 8324 covers canned pet food intended for dispatch to or transit through the EU and Northern Ireland. Canned pet food is defined as heat processed (to Fc 3) pet food contained within a hermetically sealed container (cans, pouches, trays etc). The certificate is 4 EN pages plus second language pages plus schedule page(s). The footer carries the language code only (no EHC prefix). Certificate header reads: \"Canned Petfood\". Commodity code: 23.09. I.25 Petfood must be ticked.

**F2. Part I Field Rules --- 8324 Specific**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                            **Rule**
  ------------------------------------ -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.18 Transport conditions            Ambient --- correct for canned petfood. Do not flag.

  I.20 Quantity                        Net weight KG / (Gross weight KG) format. Must match schedule totals.

  I.22 Number of packages              Total unit count from schedule. Must match.

  I.25 Commodity certified for         Petfood must be ticked. Technical use blank.

  I.28 Identification of commodities   Species (Scientific name) must list all species present across all product lines. Manufacturing plant: Forthglade approval number 10/467/8110/ABP/PTF. Net weight: total net weight. Batch number: SEE SCHEDULE PAGE 5.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**F3. Schedule Rules --- 8324**

The schedule is page 5 of 5 for Glenkrag (NI destination). The schedule must carry the EHC reference number, be signed, stamped and dated by the OV, and be sequentially numbered as part of the complete document. All pages including schedule must bear the certificate reference. Consignment is typically split across multiple EHCs by species category:

+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+
| **EHC Category**                                                                                 | **Species**                                                                                      | **II.6 BSE Status**                                                                              | **Products**                                                                                     |
+==================================================================================================+==================================================================================================+==================================================================================================+==================================================================================================+
| RUM_BOV_OV                                                                                       | Ruminantia (bovine/ovine/caprine, excluding venison)                                             | II.6 \'or\' retained --- bovine/ovine/caprine material. GB negligible BSE risk confirmed.        | Lamb, beef, mixed Ruminantia/Aves lines                                                          |
+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+
| RUM_VEN                                                                                          | Ruminantia (cervid/venison only)                                                                 | II.6 \'either\' retained --- ruminants other than bovine/ovine/caprine                           | Venison products, duck & venison mixed lines                                                     |
+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+
| AVES_PESCA (or similar)                                                                          | Aves, Pesca, Mammalia, Suidae etc --- no ruminant material                                       | II.6 deleted entirely --- no ruminant material                                                   | Chicken, turkey, duck, salmon, rabbit etc                                                        |
+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------+
| CRITICAL RULE: Ruminantia TRUMPS everything. Any product line containing Ruminantia in the species field goes on the RUM certificate regardless of what other species are also present. Venison is identified by product description (word \'venison\') not by species tag --- venison products must go on the RUM_VEN certificate, never mixed with bovine/ovine/caprine on the same EHC.                |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**F4. Part II Deletion Map --- 8324**

F4a. II.1 and II.2 --- Starting Material (all 8324 certificates): II.1 --- Always retain: approved establishment attestation. II.2 --- Starting material: the first \'either\' option is the primary applicable option for Forthglade canned petfood. The second \'and/or\' (slaughterhouse ante-mortem inspection) is struck through. II.3 --- Always retain: heat treatment to minimum Fc value of 3 in hermetically sealed containers. II.4 --- Always retain: batch sampling. II.5 --- Always retain: contamination precautions.

**F4b. II.6 BSE --- Species-Dependent Either/Or**

+----------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Clause**                                                                                                                                               | **Standard State**                                                                                                                                       | **Notes**                                                                                                                                                                                                                                                                                                                                     |
+==========================================================================================================================================================+==========================================================================================================================================================+===============================================================================================================================================================================================================================================================================================================================================+
| II.6 --- No ruminant material (AVES/PESCA certificate)                                                                                                   | DELETE ENTIRELY                                                                                                                                          | Pure Aves, Pesca, Suidae, Mammalia etc --- no ruminant material at all. Delete II.6 in its entirety.                                                                                                                                                                                                                                          |
+----------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| II.6 \'either\' --- ruminants other than bovine/ovine/caprine (VEN certificate)                                                                          | RETAIN \'either\', DELETE \'or\'                                                                                                                         | Venison (cervid) is a ruminant but not bovine/ovine/caprine. Retain the first \'either\' option only. Delete the \'or\' option and all its sub-paragraphs.                                                                                                                                                                                    |
+----------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| II.6 \'or\' --- bovine/ovine/caprine material (RUM_BOV_OV certificate)                                                                                   | DELETE \'either\', RETAIN \'or\'                                                                                                                         | Bovine/ovine/caprine material present. Retain the \'or\' option. Under the \'or\': retain sub-option (a) \'or\' --- specified risk material; retain (b) mechanically separated meat; retain (c) slaughter method. The \'either\' sub-option (negligible BSE, no indigenous cases) must be struck through --- GB has had indigenous BSE cases. |
+----------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| NOTE on BSE status: GB was reclassified to NEGLIGIBLE BSE risk by Commission Implementing Decision (EU) 2025/2208. Under II.6 \'or\' for bovine/ovine/caprine material: the \'either\' sub-option (born, continuously reared and slaughtered in negligible BSE risk country with NO indigenous cases) must still be struck through as GB has had indigenous BSE cases. The \'or\' sub-options (a)(b)(c) are retained as GB negligible status satisfies their conditions.                                                                                                                                                                                            |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**F5. Glenkrag Specific Notes --- 8324**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                      **Glenkrag Standard**
  ------------------------------ ---------------------------------------------------------------------------------------------------------------------------
  I.1 Consignor                  Forthglade Foods Limited, Dartmoor View, Okehampton, Devon, EX20 1GH, Great Britain. Tel: 0183783322

  I.5 Consignee                  Glenkrag Limited, Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR

  I.6 Person responsible         N/A

  I.7 Country of origin          Great Britain / GB

  I.8 Region of origin           N/A

  I.9 Country of destination     Northern Ireland / XI

  I.11 Place of origin           Forthglade Foods Limited, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ, Great Britain. Approval: 10/467/8110/ABP/PTF

  I.12 Place of destination      Glenkrag Limited, Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR. Approval number N/A

  I.13 Place of loading          Forthglade Foods Ltd, Okehampton, Devon, EX20 1FJ, GB

  I.15 Means of transport        Ship + Road vehicle. Identification: N/A GROUPAGE

  I.16 Entry BCP                 Belfast / XIBEL1 --- DAERA (or Warrenpoint / Larne depending on consignment)

  I.17 Documentary references    PO GLENKRAG \[PO number\]

  I.18 Transport conditions      Ambient

  I.19 Seal/Container No         Sticker seals listed (format: K18_XXXXXX-XXX) / N/A GROUPAGE

  I.25 Commodity certified for   Petfood ticked

  I.28 Manufacturing plant       10/467/8110/ABP/PTF
  ----------------------------------------------------------------------------------------------------------------------------------------------------------

**PART G --- Checker Calibration Notes: Known False Positive Patterns**

+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Ref**                                                                                    | **Calibration Note**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+============================================================================================+===========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================+
| E1 --- Z-STRIKES                                                                           | Z-strikes may appear as undeleted text in low-resolution scans. Large diagonal Z-strikes spanning multiple sub-clauses are a valid Method 1 deletion technique. Do not raise a hard error on deletion completeness from scan appearance alone when Z-strikes are present. Request enlarged/higher-resolution image before raising a deletion hard error based on scan appearance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E2 --- BLANK FIELDS                                                                        | Blank/white fields are Method 3 redactions, not unstruck blanks. On digitally prepared EHCs, unused fields and unused commodity table rows are deleted by redaction (Method 3). Do not flag blank/white unused rows or fields as unstruck. Only flag if: (a) a strikethrough line is visible but incomplete (edge miss), or (b) a row contains partial data with no deletion marking.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E3 --- WORKSHEETS                                                                          | Worksheets are working documents --- judge only on the signed EHC. Pick sheets, load sheets and dispatch documents may contain multiple edits, corrections, different OV references, rolled date changes, and incomplete fields. They are not the signed certificate. Content on a worksheet must never trigger a hard error on the certificate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E4 --- OV NUMBERING SYSTEMS                                                                | SP number and RCVS number are different systems for the same OV. SP number --- APHA-issued OV reference, used on circular stamps. RCVS number --- Royal College of Veterinary Surgeons registration, typically shown on the qualification stamp on the signing page. Do not flag as a mismatch or as two different OVs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E5 --- SCAN QUALITY                                                                        | Do not raise hard errors based on scan appearance alone for ink colour or stamp clarity. Ink colour (black vs dark blue) cannot be reliably determined from a scanned PDF. Only flag stamp or signature ink as black if it is unambiguously black on the physical document --- not based on scan appearance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E6 --- VEHICLE & TRAILER IDENTIFICATION                                                    | Trailer plate in I.19 container field is acceptable practice on curtainsider road vehicle loads. Foreign plates (Lithuanian, Bulgarian, Polish, Romanian, Belgian, Dutch etc.) in I.15 and I.19 are expected for international haulage. Vehicle registration cross-check: compare alphanumeric characters only --- spaces, hyphens, dots and country prefixes in handwritten dispatch notes are optional formatting variations and never cause a mismatch. Handwriting variations resolved by photo --- photo is ground truth.                                                                                                                                                                                                                                                                                                                                                            |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E7 --- ROUTE & BCP COMBINATIONS                                                            | Destination country and BCP entry point may differ --- this is not an error. A load may enter the EU at one BCP country but be destined for a different EU member state. Language check is driven by BCP country (I.16), not destination country (I.9).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E8 --- AMBIENT WPC (8322)                                                                  | Liquid WPC on Immingham-Esbjerg tanker route: Ambient is correct. Liquid WPC consignments on the Immingham-Esbjerg tanker route are certified as Ambient in I.18 by agreement with the Esbjerg BCP (DKEBJ1). Although the product loads at approximately 2-4 degrees C, there is no active refrigeration during transit. Do not flag Ambient as incorrect for this product and route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E9 --- PDF EDITABLE FIELD FAINT PRINTING                                                   | All EU EHC templates print editable field text in a lighter/greyer font than the pre-printed text. This is a universal template characteristic --- not an error or omission. Before flagging any field as blank or illegible from a scan, check the opposite language section or request a photograph. Never raise a notice on field content based on scan faintness alone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E10 --- SIGNING PAGE POSITIONAL FLEXIBILITY                                                | All signing area elements (date, name/qualifications, stamp, signature) need only be present somewhere within the signing area on the page. Exact positional alignment to the printed field labels is not required and must not be flagged. A date handwritten anywhere within the signing area is always a pass --- do not raise any flag, medium warning or otherwise, where the correct date is legible within the signing area. This applies to all EHC types and all OVs.                                                                                                                                                                                                                                                                                                                                                                                                            |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E11 --- AMR ATTESTATION (II.1a)                                                            | On 8468 and 8384 certificates, the AMR attestation is not applicable until 3 September 2026. Both full redaction (blank/white field, Method 3) AND pen strikethrough (Method 1 with adjacent stamp) are confirmed normal deletion methods. Do not flag either method.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E12 --- VESSEL / RO-RO LOADS (I.15 N/A)                                                    | On vessel/ro-ro consignments, I.15 Means of transport will show Vessel ticked (often alongside Road vehicle) and Identification field as N/A. This is correct --- the trailer registration appears in I.19 Container No field. Do not flag I.15 Identification as N/A on these loads.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E13 --- COMBINED SEAL/TRAILER PHOTO                                                        | A single photo showing the seal number, seal integrity and trailer plate in one frame is accepted as full verification of all three elements. Separate photos are not required if the combined shot is clear and all three elements are legible. Photo remains ground truth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E14 --- NOVADES BV AS I.5 AND I.6                                                          | Novades BV appearing as both the I.5 Consignee and the I.6 Operator responsible is confirmed normal practice. Do not flag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E15 --- AFI I.5 CONSIGNEE PATTERN                                                          | Arla Foods Ingredients Group P/S (Viby-J, Denmark) as I.5 consignee on all AFI EHCs is confirmed standard practice regardless of I.9 destination country and regardless of I.12 end customer identity. Never flag under any circumstances.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E16 --- SAPUTO / DAIRY CREST BATCH TRUNCATION                                              | AQ-prefix batch numbers presented as root only (e.g. \'AQ6070\') on Davidstow/Saputo (GB CQ 501) loads is confirmed standard practice. Do not flag --- no notice of any kind. This does NOT apply to AFI/Arla (GB DE 030) loads, where full AF-prefix batch numbers are required (truncated root = hard error).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E17 --- VAN BENTUM TRAILERS                                                                | BTS-prefix trailer numbers (e.g. BTS2295, BTS2359) are Van Bentum (Netherlands) trailers, the expected haulier on Zeebrugge/BE-BEZEE1 ro-ro vessel loads for Novades BV. Dutch trailers --- foreign plates are expected and normal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E18 --- AFI VARIOLAC WHEY PERMEATE                                                         | \'DAIRY WHEY POWDER\' in I.27/I.28 Nature of commodity on AFI Variolac whey permeate loads is accepted practice at Calais FRCQF1 and Esbjerg DKEBJ1. The CN code (0404100200) is the definitive product identifier. Downgrade to low notice only --- not a hold reason.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E19 --- GB-1 ZONE CODE (8384 POULTRY)                                                      | The zone code in II.2.1 for poultry from Great Britain is GB-1 (not GB-0). GB-0 would be incorrect for poultry and should be flagged as a hard error. GB-0 is the correct code for ungulates and other non-regionalised species but NOT for poultry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E20 --- TREATMENT A WORDING (8384)                                                         | The certificate will state Treatment A in II.2.3 and in the commodity table. \'Treatment A\' is a non-specific treatment --- it is not a heat treatment code. Do not flag the absence of a temperature or time specification for Treatment A.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E21 --- PETFOOD SCHEDULE (8324)                                                            | The schedule is an integral part of the 8324 certificate and must be signed, stamped and dated on each page with the certificate reference number. Each schedule covers only the product lines applicable to that specific EHC (by species category). The total net weight and package count on the EHC page 1 must match the schedule totals for that certificate only, not the combined totals of all three EHCs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E22 --- PETFOOD PALLET NUMBERS (8324/GLENKRAG)                                             | Glenkrag consignments have multiple product lines across multiple pallets. The pallet number (1, 2, 3 etc) and the Forthglade batch/lot reference (e.g. 52518) are separate identifiers. The batch/lot reference is on each line; the pallet number groups lines together. Both appear on the schedule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E23 --- RABBIT/LAGOMORPHA (8324)                                                           | Products containing rabbit (Lagomorpha) are handled by deleting II.6 in its entirety (no ruminant material), retaining the Rodentia/Lagomorpha \'and/or\' option in II.2, and listing \'MAMMALIA\' in the I.28 species field. This is the confirmed correct pattern for AVES/MAM certificates containing rabbit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E24 --- SEAL PHOTO NOTE / BATCH ANNOTATION MISMATCH                                        | Where a handwritten note accompanies seal photos, the batch reference on the note may reflect a prior aborted load if the same tanker and seals were carried over to a subsequent consignment. The note is not a controlled document. Verify the batch number against the EHC and delivery note only --- if those agree and the physical seal numbers in the photo match I.19, the discrepancy on the note is a low notice at most and not a hold reason.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E25 --- DARTMOUTH FOODS / AROUND NOON IQF DUCK --- TREATMENT TYPE ON 8384                  | Belfast BCP/XIBEL1-DAERA confirmed in writing (12 April 2026) that Treatment A is acceptable for this product, and therefore so is Treatment D. For 8384 IQF duck loads where Treatment D is entered and the manufacturing process is confirmed as meeting Treatment D standards --- no flag of any kind.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E26 --- PO QUANTITY vs EHC QUANTITY (8384 / GROUPAGE LOADS)                                | Where the EHC package count is one unit below the PO ordered quantity and the internal weight arithmetic is consistent, the most likely explanation is a short pick at loading rather than a certificate error. Downgrade to low notice where the discrepancy is one unit and arithmetic is internally consistent. Retain as medium warning where the gap is larger or arithmetic does not reconcile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **E27 --- DSV TANKER RANGE DSV533031-DSV533040: FOUR SEAL REQUIREMENT**                    |   -------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------                                                                                                                                      |
|                                                                                            |                  Tankers in the range DSV533031 to DSV533040 are a new build series fitted with three top vents. Standard tankers (single vent): 2 seals required (1 vent + 1 rear). DSV533031-533040 (triple vent): 4 seals required (3 vents + 1 rear). When an EHC is submitted with any tanker in this range, apply a MEDIUM WARNING. Verify that I.19 records exactly four seal numbers. If fewer than four seals are recorded, escalate to hard error. AMENDED v2.9: In-situ seal photos are now REQUIRED for DSV533031-533040 range tankers. The previous H&S working-at-height absence-of-photo exception is withdrawn. All four seal numbers in the photos must match I.19 and the DN exactly --- any discrepancy = hard error (see E54).                                                                                                                                        |
|                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|                                                                                            |   -------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E28 --- IMMINGHAM-ESBJERG ROUTE: PLACE OF LOADING (I.13)                                   | For all EHCs on the Immingham-Esbjerg vessel route (BCP DKEBJ1), I.13 Place of loading must show Immingham terminal wording. \"Immingham\" alone satisfies the requirement --- the full postcode and street address are not required. See E42.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E29 --- IMMINGHAM-ESBJERG ROUTE: I.15 IDENTIFICATION (CMR)                                 | CMR reference in I.15 Identification applies only to groupage sample consignments on the Immingham-Esbjerg route. CMR reference is NOT applicable to full tanker loads (use tanker identification) or full powder/bagged loads (use trailer/vehicle identification). For groupage sample consignments on this route --- absence of CMR reference = low notice. For tanker or full powder loads --- CMR reference is not expected and its absence is never a flag.                                                                                                                                                                                                                                                                                                                                                                                                                         |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E30 --- SAMPLE CONSIGNMENTS: PALLET STICKER SEALS ON INDIVIDUAL BAGS                       | Where a small sample consignment (e.g. 4 bags) is dispatched with individual pallet sticker seals applied per bag, each seal number must appear in I.19. If the number of seals listed in I.19 does not match the number of bags/packages in I.24, flag as medium warning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E31 --- AROUND NOON LTD ADDRESS                                                            | The correct and confirmed address for Around Noon Ltd as I.5 consignee on all 8384 cooked duck EHCs is: 24A Rampart Road, Greenbank Industrial Estate, Newry, County Down, BT34 2QU. Any other address (including 25A) = HARD ERROR requiring correction before dispatch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E32 --- DOT MATRIX INVOICE SCAN QUALITY (WALDRONS)                                         | Waldrons Patisserie invoices are produced on dot matrix continuous stationery. Comma thousands separators in weight and value fields may render as decimal points in scanned PDFs. Do not raise a weight discrepancy flag based on invoice scan appearance alone where EHC and schedule are internally consistent. Applies to 8350EHC COMP certificates on the Waldrons / Europ Foods Carlow trade lane.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E33 --- 8436 SALMONELLA PROGRAMME SCOPE                                                    | The Salmonella control programme attestation at II.1.1 (including the Salmonella table) and the SE/ST freedom attestation at II.1.2 apply ONLY to Gallus gallus (chickens) and Meleagris gallopavo (turkeys). For all other poultry species, sections II.1.1 and II.1.2 must be marked Not Applicable or deleted. The II.1 public health attestation header is retained for all species.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E34 --- 8436 FINLAND/SWEDEN SALMONELLA CLAUSE (II.1.3)                                     | The Finland/Sweden clause at II.1.3 must be deleted if the consignment is NOT destined for Finland or Sweden. If destination IS Finland or Sweden, II.1.3 must be retained. Failure to delete II.1.3 when destination is neither = medium warning. Failure to retain II.1.3 when destination IS Finland or Sweden = hard error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E35 --- 8436 ZONE CODE IN I.8 AND II.2.1                                                   | For hatching eggs (8436), the zone code in I.8 and at II.2.1 must be GB-0 or GB-1 depending on current AI disease status at time of certification. The OV certifying an 8436 must actively check the APHA HPAI interactive map before every certification. A zone code mismatch between I.8 and II.2.1 = hard error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E36 --- 8436 NEWCASTLE DISEASE VACCINATION TABLE                                           | Where the flock has been vaccinated against Newcastle disease virus within the 12 months prior to loading, the vaccination table at II.2.4(d) must be completed with all mandatory fields. Incomplete or absent vaccination table when ND vaccination has occurred = hard error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E37 --- 8436 EGG MARKING AND CONTAINER SEALING                                             | Hatching eggs must be marked/stamped with coloured ink showing the unique approval number of the establishment of origin --- required at II.2.5(c). Containers must be closed in accordance with competent authority instructions --- required at II.2.7(d). Seal number(s) must appear at I.19.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E38 --- 8436 CLINICAL INSPECTION TIMING                                                    | Two valid options for clinical inspection of the flock of origin: (1) a full clinical inspection by an OV within 72 hours prior to the time of loading; or (2) monthly clinical inspections (most recent within 31 days prior to loading), combined with a health status evaluation by an OV within 72 hours of loading based on documentary review. One option must be retained at II.2.4(h) and the other deleted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E39 --- 8436 I.18 TRANSPORT CONDITIONS (PRE-STRUCK)                                        | I.18 (Transport conditions) is pre-struck on the 8436 HEP template. No entry, stamp, or initials are required or expected at I.18 on this certificate type. Do not flag as blank or unstruck.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E40 --- OV/CO DELETION ON SIGNING PAGE: STAMP REQUIREMENT BY METHOD                        | The stamp-free exception for OV/CO deletion on the signing page applies ONLY to Method 3 redaction (text removal/whiteout). Where the OV/CO choice is deleted by hand pen strikethrough (Method 1) or Adobe digital strikethrough (Method 2), a stamp and initials ARE required adjacent to that deletion. Failure to stamp a Method 1 or Method 2 OV/CO deletion on the signing page = hard error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E41 --- HIGH-RISK PAGE IDENTIFICATION FOR REFERENCE CONSISTENCY CHECK                      | Rule A4 applies to all pages equally, but the highest-risk pages for certificate reference mismatch are: (1) the first page of each language section; and (2) any page containing the commodity description table or product weight details. When checking A4, pay particular attention to these pages in both the English and second language sections. Flag any mismatch on any page as a hard error and note the specific page number.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E42 --- I.13 PLACE OF LOADING: IMMINGHAM-ESBJERG ROUTE --- SUFFICIENT ADDRESS              | It is sufficient for I.13 to include the word \"Immingham\" in any form --- the full postcode and street address are not required. Apply no flag where \"Immingham\" is present in I.13 in any form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E43 --- I.15 MEANS OF TRANSPORT: IMMINGHAM-ESBJERG ROUTE --- VESSEL REQUIRED               | On all EHCs on the Immingham-Esbjerg vessel route (BCP DKEBJ1), I.15 must show Vessel ticked in addition to any other transport mode. Road vehicle alone with no Vessel ticked on this route = medium warning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **E44 AMENDED** --- I.26 GROSS WEIGHT: POPULATION REQUIREMENT                              | Net weight must always be populated --- hard error if absent. Gross weight must also be populated on all non-tanker loads. For all bagged powder, canned product, cooked meat, composite products, petfood, and hatching egg consignments: absence of gross weight = medium warning. For bulk tanker EHCs: absence of gross weight = PASS. No flag of any kind --- do not raise at any severity level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E45 --- 8322 SCHEDULE PAGES                                                                | Net weight must always be populated --- hard error if absent. Gross weight must also be populated on all non-tanker loads. For all bagged powder, canned product, cooked meat, composite products, petfood, and hatching egg consignments: absence of gross weight = medium warning. For bulk tanker EHCs: absence of gross weight = PASS. No flag of any kind --- do not raise at any severity level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E46 --- HEATHFIELD (CAT 3 ABP STORAGE): APPROVAL NUMBER PENDING CONFIRMATION               | Where an 8322 EHC is submitted with Heathfield as I.11 on a Cat 3 load, apply a medium warning and request the OV to supply the Cat 3 storage approval number for library entry. This note will be updated to a confirmed standing pass once the number is verified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E47 --- EN / SECOND LANGUAGE PARITY CHECK: UNIVERSAL CHECK SEQUENCE REQUIREMENT            | The parity check between the English and second language deletion patterns must be performed as a discrete step in the check sequence on all bilingual EHC types (8468, 8322, 8384, 8324, 8436, 8471). A deletion present in the English section but absent from the second language section (or vice versa) = hard error on all bilingual types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E48 --- AMENDED/VERSION-SUFFIXED EHC FILENAMES                                             | Where an EHC has been amended after initial issue, the filename will include a prefix or suffix such as \"amended\_\", \"v2\", \"\_corrected\" or similar. The checker must always verify they are working from the most recent version. If an unamended version is presented for a consignment known to have required amendment, flag as medium warning and request the current version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E49 --- CURTAINSIDER SEAL COUNT: DISPATCH NOTE TEMPLATE WORDING                            | Dispatch notes on AFI/Gregory\'s curtainsider loads carry standard template text such as \"5 × curtainsider / 1 × container\" in the seals field. This describes available seal positions, not the number of seals actually applied. Do not raise a flag based on this wording. The seal photo is ground truth for the number of seals used --- if one seal appears in the photo and one seal number is recorded in I.19, this is correct and complete. No flag of any kind.                                                                                                                                                                                                                                                                                                                                                                                                              |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E50 --- 8468 FR SIGNING PAGE REFERENCE: SCAN COMPRESSION ARTEFACT                          | On scanned 8468 bilingual certificates, the II.a reference on the French signing page (page 11) may render with the leading characters of the reference compressed or partially obscured, causing digits such as \"26\" to read as \"20\" or similar. Do not flag a reference mismatch on this page based on scan appearance alone where all other pages are consistent and the physical document reads correctly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E51 --- SP STAMP DIGIT MISREAD ON NOTES PAGES                                              | On lower-resolution scans of notes/footnotes pages, SP stamp digits may render ambiguously --- particularly \"3\" reading as \"5\" in SP 136830. Do not escalate as a hard error where the discrepancy is consistent with scan degradation and all other pages clearly show the correct SP number. Apply A7 NOTE: only escalate if the number is clearly and unambiguously different.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| E52 --- DUPLICATE/EXTRA PAGES ON ROLLED LOADS                                              | When checking any EHC, verify that the actual PDF page count matches the declared \"X of N\" pagination on every page. A document containing more physical pages than the declared total --- including duplicate signing pages inserted during a roll/reissue --- is a hard error. The superseded page must be removed before dispatch. Particular vigilance required on rolled loads where only selected pages have been reprinted.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **E53 --- AFI TANKER EHC: DELIVERY NOTE MANDATORY**                                        | For all AFI bulk tanker EHCs (identified by I.1 consignor Arla Foods Ingredients Group P/S and manufacturing plant GB DE 030 or similar AFI establishment), the Delivery Note must be uploaded to the checker. If the DN is not uploaded, raise as a MEDIUM WARNING --- the load must not depart until the DN has been cross-checked against I.19 seal numbers, vehicle identification, and batch/weight details. Background: This rule was introduced following a DN/seal mismatch incident on 24 April 2026 where the factory issued a DN with an incorrect seal number. The error was not detectable without the DN being presented to the checker. The EHC was correct; the fault lay with the commercial document. Mandatory DN upload closes this gap.                                                                                                                              |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **E54 --- AFI TANKER AND DSV533031-533040: IN-SITU SEAL PHOTO CROSS-CHECK --- HARD ERROR** | For all AFI bulk tanker EHCs and all DSV533031-533040 range tankers, in-situ seal photos must be uploaded to the checker. The seal number(s) visible in the photo(s) must be cross-checked against: (1) I.19 on the EHC; (2) the seal number(s) on the Delivery Note; and (3) any other photo evidence uploaded. ANY discrepancy between any of these sources --- photo vs EHC, photo vs DN, EHC vs DN --- is a HARD ERROR. HOLD the load. Do not attempt to resolve by assumption or calibration. The discrepancy must be physically investigated and corrected before dispatch. For DSV533031-533040 (four seals): all four seal numbers must appear in photos and match EHC and DN. RULE: where multiple evidence sources are available, they must all agree --- any single discrepancy between any pair of sources = hard error regardless of which source appears to be the outlier. |
+--------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**PART H --- Known Libraries: Establishments, Consignees, Destinations**

**H1. Establishment Lookup --- I.11 Approval Numbers (Dairy)**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Establishment**                                                                                          **Approval No**       **Notes**
  ---------------------------------------------------------------------------------------------------------- --------------------- -----------------------------------------------------------------------
  Gregory Distribution (any address --- loading/logistics)                                                   N/A                   Not a manufacturing establishment

  Gregory Distribution Ltd, North Tawton (Cat 3 powder --- AFI/Arla)                                         U1183488/TRANS        Transport/logistics approval --- Cat 3 only

  Dairy Crest Ltd / Saputo Dairy UK, Davidstow, Camelford, Cornwall                                          GB CQ 501             

  Arla Foods Ingredients Taw Valley Limited / Taw Valley Creamery, South Weeke, North Tawton                 GB DE 030             

  Trewithen Dairy, Cornwall                                                                                  GB CQ 502             8468 human consumption --- occasional bulk tanker cream to EU

  Gregory\'s Distribution Ltd, Heathfield (loading depot for Davidstow/Saputo)                               N/A                   Loading/logistics only --- not a manufacturing establishment

  County Milk Products Ltd, Dean Court, 85 Adlington Road, Wilmslow, Cheshire, SK9 2BT                       N/A                   I.1 consignor only --- I.11 will be Dairy Crest/Davidstow (GB CQ 501)

  Forthglade Foods Ltd, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ                                    10/467/8110/ABP/PTF   Canned petfood and cooked meat products --- 8324 and 8384

  Dartmouth Foods, Units 1-9 Hearder Court, Beechwood Way, Langage Business Park, Plymouth, Devon, PL7 5HH   GB TO 060             Cooked duck products --- 8384
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**H2. Known Dairy Consignees and Logistics Agents**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**      **Name**                                                        **Address / Notes**
  -------------- --------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.5            Novades BV                                                      Maliebaan 50B, Utrecht, 3581 CS, Netherlands. Note: Novades BV also commonly appears as I.6 Operator --- confirmed normal practice, do not flag.

  I.5            Navobi                                                          JHR.DR.C.J. Sandbergweg 7, 3852 PT, Staverden (Gem. Ermelo), Netherlands.

  I.5            Uniblock                                                        Coes Road Industrial Estate, Dundalk, A91 TD60, Ireland

  I.5            Nukamel Productions BV                                          Industriekade 32-34, 6001 SE Weert, Netherlands. Animal nutrition. 8322 Further process.

  I.5            Nestle Bulgaria AD                                              Henri Nestle Str. 2, 1360 Sofia, Bulgaria. 8468 human consumption.

  I.5            Feed & Food Trading BV                                          Woudenbergseweg 19 C2, NL-3707 HW. Sweet whey powder, animal feed, Calais route.

  I.5            Milkeen Krzysztof Cyba                                          Eukaliptusowa 9 1, Warszawa, 02 765, Poland. Demineralized whey powder, 8468, Calais route.

  I.5            Puratos Nederland N.V.                                          Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands. 8468 human consumption, Calais route.

  I.5            Milkpol Polska Sp. z o.o.                                       ul. Lusinska 28A, 03-569 Warszawa, Poland. Sweet whey powder, 8468 human consumption, Calais route. I.5 and I.6 same entity.

  I.5            ENTC Dairy Solutions Sp.z.o.o                                   Dworowa 10, 14-400 Paslek, Poland. Sweet whey powder, 8468 human consumption, Calais route. Receives County Milk Products / Saputo Davidstow loads. MOVED from H4 Cat 3 in v2.1.

  I.1/I.5 Arla   Arla Foods Ingredients P/S / Arla Foods Ingredients Group P/S   I.1 consignor: c/o Taw Valley Creamery, South Weeke, North Tawton, Devon EX20 2DA. I.5 consignee (all AFI EHCs): Soenderhoej 1-12, DK-8260 Viby-J, Denmark. Always correct regardless of I.9 destination or I.12 end customer.

  I.6            Seabrook Global Logistics Ltd                                   Admiral House, 853 London Road, West Thurrock, Essex, RM20 3LG

  I.6            Kuehne + Nagel Ltd                                              Manchester International Airport, Building 317, World Freight Terminal, M90 5NA

  I.6            Maersk Logistics and Services Denmark A/S                       Faergehamnsvej 31, 9900 Frederikshavn, Denmark. Logistics agent for Arla --- multiple routes including Esbjerg and Calais.

  I.6            AGI Global Logistics (CT) Ltd                                   Unit A, Concept Court, Shearway Business Park, Folkestone, CT19 4RG. Confirmed as valid logistics operator for County Milk / Heathfield loads.

  I.1            Waldrons Patisserie Limited                                     Unit 15 Churchills, Mardle Way, Buckfastleigh, Devon, TQ11 0NR. Composite products dispatch (8350EHC COMP). No approval number required on COMP certificates --- standing pass.

  I.5            Europ Foods c/o Tranzlberia                                     Royal Oak Business Park, County Carlow, Republic of Ireland. Composite products consignee on Waldrons trade lane. Route: UK to Ireland via Dublin IE DUB 1, English-only, standing pass (8350EHC COMP).

  I.6            McCulla Customs Ltd                                             Blaris Industrial Estate, Altona Road, Lisburn BT27 5QB, County Antrim, Northern Ireland. I.6 operator on Waldrons COMP loads. Standing pass --- do not flag.

  I.6            Proglog SAS                                                     13 Boulevard de la Corderie, Marseille, 13007, France. Logistics operator on County Milk / ENTC Dairy Solutions loads via Calais.
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**H3. I.12 Destination Library --- 8468 (Human Consumption)**

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Approval No**   **Establishment**                                  **Address / Notes**
  ----------------- -------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------
  NL218847          Van Kommer                                         Ambachtsweg 24, Barneveld, 3771 MG, Netherlands

  207165            Jonker and Schut B.V.                              Harselaarseweg 33, 3771 MA Barneveld, Netherlands

  05929             Navobi BV                                          Jhr. Dr. Sandbergweg 7, 3852 PT, Staverden (gem Ermelo), Netherlands

  IE LH 242466      Mill Transport Ltd                                 Rathcor Riverstown Dundalk, Co Louth, Ireland

  M119              Arla Foods Ingredients Group P/S Danmark Protein   Soenderupvej 26, Nr Vium, DK-6920 Videbaek, Denmark

  N/A               Vicorquimia S.A.                                   Moli de Vent 2, 08150 Parets del Valles, Spain

  N/A               Barry Callebaut Belgium                            Bouwstraat 1, 9160 Lokeren, Belgium

  N/A               Milkeen Krzysztof Cyba                             Eukaliptusowa 9 1, Warszawa, Poland

  N/A               Nestle Bulgaria AD                                 Henri Nestle Str. 2, BG-1360 Sofia, Bulgaria

  N/A               Puratos Nederland N.V.                             Hartog Logistics / Puratos, Bloemendaalse Zeedijk 10, 4765 BP Zevenbergschenhoek, Netherlands

  N/A               Ferrer Alimentacion S.A.                           Pol. Ind. Sector Autopista, Calle Diesel No.2, Parets del Valles, 08150, Barcelona, Spain. AFI whey permeate powder loads, Calais route.

  30106002          Logit Sp. z o.o.                                   Barczyglow, ul. Skandynawska 7, 62-571 Stare Miasto, Poland. 8468 human consumption destination for Milkpol Polska consignments.

  PL 28041606 UE    ENTC Dairy Solutions Sp.z.o.o                      Dworowa 10, 14-400 Paslek, Poland. 8468 human consumption destination for County Milk Products / Saputo sweet whey powder consignments via Calais.

  N/A               PETI PROTEIN                                       Veredelingstraat 2, De Klomp, 6745 XT, Netherlands. 8468 human consumption. Novades BV consignee, Zeebrugge route, sweet whey powder. First seen 21/04/2026.

  N/A               Buisman                                            Mindenstraat 20, Zwolle 8028 PK, Netherlands. 8468 human consumption. County Milk / Saputo Davidstow trade lane via Calais. First seen 22/04/2026.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**H4. Cat 3 Destination Approval Numbers --- 8322**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Company**                                                         **Country**   **Approval No**    **Notes**
  ------------------------------------------------------------------- ------------- ------------------ ----------------------------------------------------------------------------------------------------------------------
  Nukamel Productions BV, Industriekade 32, 6001 SE Weert             NL            001188             Most common Nukamel destination. STORP.

  Jonker & Schut Barneveld, Harselaarseweg 33, 3771 MA Barneveld      NL            207165             

  P.C. van Tuijl Kesteren, Batterijenweg 17, 4041 DA Kesteren         NL            19163              

  P.C. van Tuijl Lienden, Marsdijk 13, 4033 CC Lienden                NL            207492             

  Van Kommer, Ambachtsweg 24, 3771 MG Barneveld                       NL            NL218847           

  J M W Farms Ltd, 35 Tonnagh Rd, Killylea, Armagh, BT60 4PZ          NI            GB NI/4111         Cat 3 receiving establishment. I.25 = Further process.

  Ballywalter, Co Down, BT22 2NB                                      NI            LEAVE BLANK        NOT a Cat 3 approval ref --- leave blank on EHC.

  Feed and Food NI, Co Armagh, NI                                     NI            PENDING            Approval number unconfirmed --- do not use until verified.

  Lacto Production, ZI La Brohiniere, 35360 Montauban de Bretagne     FR            FR35184020         

  Denkavit France S.A.R.L., ZI de Meron, CS 82003, Montreuil-Bellay   FR            FR49215001         

  R2 Agros AS, Odinsvej 25, 8722 Hedensted                            DK            DK-3-oth-987248    I.25 = Further process --- confirmed correct for AFI Variolac WPP loads to this destination (confirmed 24 Apr 2026).

  Bech Gruppen, Ove Jensens Alle, 8700 Horsens                        DK            DK-3-STP-1513648   
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**H5. Petfood and Cooked Duck Consignees --- 8324 / 8384**

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                                          **Details**
  -------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.5 Consignee (Glenkrag/8324)                      Glenkrag Limited, Unit 7 Kilroot Business Park, Larne Road, Carrickfergus, Co Antrim, BT38 7PR

  Manufacturing plant (Forthglade)                   Forthglade Foods Ltd, Higher Stockley Mead, Okehampton, Devon, EX20 1FJ. Approval: 10/467/8110/ABP/PTF

  BCP (Glenkrag/8324)                                Belfast / XIBEL1 --- DAERA (or Warrenpoint BCP/XIWPT1-DAERA / Larne BCP/XILAR1-DAERA)

  Around Noon Ltd (consignee for cooked duck 8384)   24A Rampart Road, Greenbank Industrial Estate, Newry, County Down, BT34 2QU. PO number must appear on ALL documents. Goods will be refused if P/order number is missing. HARD ERROR if address is incorrect.

  Dartmouth Foods (consignor for cooked duck 8384)   Units 1-9 Hearder Court, Beechwood Way, Langage Business Park, Plymouth, Devon, PL7 5HH. Approval: GB TO 060
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**H6. Hatching Egg Establishments --- 8436 (Aviagen / Scotland)**

Establishments certified under EHC 8436 must appear on the published Poultry Health Scheme (PHS) member list. The OV must verify PHS membership status before certification.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                   **Detail**
  --------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.1 Consignor               Aviagen Limited, 11 Lochend Road, Newbridge, Midlothian EH28 8SZ, Great Britain

  I.11 Place of dispatch      Egg Distribution Centre, 10 Townhead Street, Lockerbie, Dumfries & Galloway DG11 2AE. PHS approval: UK 75-319-8001. EU approval: UK-7-204-3. Note: format 75/319/8001 (slashes) is a known variant --- do not flag.

  I.5 Consignee               Aviagen EPI BV, Elmpterweg 47, Roermond, 6042 KJ, Netherlands. Note: Aviagen EPI BV also appears as I.6 operator --- confirmed normal practice, do not flag.

  I.12 Place of destination   Aviagen EPI B.V., Elmpterweg 47, Roermond, 6042 KJ, Netherlands. Approval N/A --- acceptable.

  BCP                         Rotterdam NL-RTM01. Language: Dutch. Second language section required (8436EHC nl).

  Transport / I.15            Vessel + Road vehicle (ro-ro via Stenaline). I.15 Identification: vessel name + trailer/container reference. I.18 is pre-struck on 8436 template --- see E39.

  I.17 Commercial document    Must be populated per rule B1. Aviagen SOP/shipment order reference (e.g. SOP Order Ref 635056) is the applicable commercial reference on this trade lane.

  Supporting documents        Aviagen submits: Farm Schedule (premises of origin with PHS numbers), Salmonella Testing Schedule, and individual Vaccination Schedules. All are stamped SP 158260 and signed by the Aviagen in-house OV.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**H6.2 Supply Farm PHS Approval Numbers**

  ---------------------------------------------------------------------------------------------------------------------------
  **Farm**                                                                 **PHS No.**   **EU Approval No.**   **Category**
  ------------------------------------------------------------------------ ------------- --------------------- --------------
  East Sidehead Farm, Lochlibo Road, Burnhouse, Beith, Ayrshire KA15 1LE   69/201/0132   UK-7-041-1            Grandparent

  Easter Norton, Newbridge, Midlothian EH28 8NH                            84/559/0037   UK-7-022-1            Grandparent

  Sawmill Poultry Farm, Kirkcowan, Newton Stewart, Wigtownshire DG8 0BW    98/853/8000   UK-7-029-1            Grandparent

  Glaudhall Farm, Muirhead, Chryston, Glasgow G69 9ET                      83/552/0092   UK-7-017-1            Grandparent
  ---------------------------------------------------------------------------------------------------------------------------

**PART I --- Report Format and Check Sequence**

**I1. Check Sequence**

- Before any check begins, the operator must declare the report mode for the session: FULL REPORT (I2) or TRAINING REPORT (I3). The declared mode applies to all certificates checked within that session. If no mode is declared, default to Full Report (I2).

- Identify certificate type from footer code and header (8468, 8322, 8384, 8324, 8350EHC COMP, 8436, 8471).

- Preliminary checks --- filename, page count (including E52: physical page count must match declared \"X of N\"), reference consistency across all pages and II.a boxes.

- Part I field-by-field check against Part B rules and type-specific rules.

- Weight and date logic cross-checks.

- Commercial document cross-check against delivery note/dispatch confirmation and picklist/schedule.

- Part II attestation check against type-specific deletion map.

- Stamp and signature check --- per-page and signing page.

- EN/second language parity check (where applicable) --- E47.

- Photo evidence: if pallet/seal photos uploaded, use as ground truth for seal number and trailer plate cross-check. For AFI tanker EHCs and DSV533031-533040 range tankers: apply E53 (DN mandatory --- absence = medium warning) and E54 (in-situ seal photo cross-check --- any discrepancy between photo, EHC and DN = hard error, hold the load).

- Produce report with PASS or HOLD verdict.

**I2. Report Format**

SUMMARY: Certificate reference, filename, OV, SP reference, BCP, commodity, date checked. Overall verdict: PASS / HOLD. Flag counts. Flags in severity order: hard errors (red), medium warnings (amber), low notices (blue). Each flag states the field reference, page reference, and a concise description. FULL REPORT: Detailed findings by section. Green pass-block for each field/clause checked and found correct. Document cross-check section. Rule set update recommendations. Footer: rule set version, report date, certificate reference, OV SP reference.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------
  **NEW RULE I3 --- Training Report Format**

  When Training Report mode is declared at session start, the following condensed format replaces the Full Report format (I2) for all checks in that session.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------

  ---- -----------------------------------------------------------------------------------------------------------------------------------------------------
  1    Title / Summary --- Certificate ref, filename, OV, SP reference, BCP, commodity, date checked.

  2    Verdict --- PASS or HOLD.

  3    Flag counts --- e.g. 0 RED / 1 AMBER / 2 BLUE.

  4    Flag list --- each flag: field ref, page ref, full description of issue, rule code(s), required action. Length as needed.

  5    Checks performed --- brief bullet list of sections and fields checked. No discussion or reasoning.

  6    Rule set update recommendations --- concise list of any new calibration notes, library additions, or rule amendments arising from this certificate.
  ---- -----------------------------------------------------------------------------------------------------------------------------------------------------

**PART J --- EHC 8350EHC COMP: Composite Products**

**J1. Certificate Identification**

Footer code: 8350EHC en. Header reads: \"Animal health/Official certificate to the EU --- composite products.\" Certificate model: COMP. 10 pages including schedule as page 10.

**J2. BCP / Language --- Irish Route**

Dublin IE DUB 1 --- English only, no second language required. Standing pass.

**J3. I.11 Place of Dispatch --- Waldrons Patisserie**

Dispatch from manufacturing establishment: Waldrons Patisserie Limited, Unit 1-5 Churchills, Mardle Way, Buckfastleigh, Devon TQ11 0NR. No separate cold store. No approval number required --- standing pass, do not flag absence.

**J4. I.17 Document Reference Convention**

Invoice number used as commercial reference (e.g. INV 28681). Invoice date may post-date signing date on Waldrons / Europ Foods loads --- confirmed normal practice on this trade lane. Do not flag date offset between I.17 document date and signing date.

**J5. Dairy Establishment (II.3.B)**

Compsey Creamery IE 1032 EC --- confirmed Irish dairy establishment approval number used at II.3.B on Waldrons COMP certificates. Standing pass.

**J6. Egg Establishment (II.3.D)**

Ready Egg Products UK NI ZX019 --- confirmed Northern Ireland egg processor approval number used at II.3.D on Waldrons COMP certificates. Standing pass.

**J7. Part II Deletion Map --- 8350EHC COMP**

  -------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Clause**                       **Standard State**           **Notes**
  -------------------------------- ---------------------------- -----------------------------------------------------------------------------------------------
  II.1 Public health attestation   RETAIN                       

  II.1a AMR                        DELETE                       Not applicable until 3 September 2026 --- both redaction and strikethrough are normal per E11

  II.2 Animal health attestation   RETAIN                       

  II.3.A Meat products             DELETE                       No meat in composite --- strike through entirely

  II.3.B Dairy products            RETAIN where dairy present   Enter dairy establishment approval number

  II.3.C Fishery products          DELETE                       No fishery products

  II.3.D Egg products              RETAIN where egg present     Enter egg establishment approval number

  II.3.E Gelatine/collagen         DELETE                       No gelatine/collagen

  II.3.F Honey/apiculture          DELETE                       No honey/apiculture products
  -------------------------------------------------------------------------------------------------------------------------------------------------------------

**J8. Schedule Page Rules**

Schedule is page 10 of 10. Must carry EHC reference number, be signed, stamped and dated by OV, and be sequentially numbered as part of the complete document. Must show: product list with quantities, net and gross weights, batch codes, best before dates, month and year when frozen, dairy and egg establishment approval numbers, commodity code, and OV signature/stamp/date.

**J9. Known Establishments and Operators --- COMP**

- I.1 Consignor: Waldrons Patisserie Limited, Units 1-5 Churchills, Mardle Way, Buckfastleigh, Devon TQ11 0NR. No establishment approval number required on COMP certificates.

- I.5 Consignee: Europ Foods C/O Tranzlberia, Royal Oak Business Park, County Carlow, Republic of Ireland.

- I.6 Operator: McCulla Customs Ltd, Blaris Industrial Estate, Altona Rd, Lisburn BT27 5QB, C Antrim, Northern Ireland. Standing pass --- do not flag.

**PART K --- EHC 8436 HEP: Hatching Eggs of Poultry (other than ratites)**

**K1. Certificate Overview**

+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Field**                                                                                                                             | **Value**                                                                                                                                                           |
+=======================================================================================================================================+=====================================================================================================================================================================+
| Certificate model                                                                                                                     | 8436EHC --- HEP (Hatching Eggs of Poultry)                                                                                                                          |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Footer code                                                                                                                           | 8436EHC en (English) / 8436EHC \[language code\] (second language)                                                                                                  |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Header                                                                                                                                | Animal health/Official certificate to the EU --- hatching eggs of poultry other than ratites                                                                        |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| NFG version                                                                                                                           | v18, April 2026. Specimen EHC: V3.                                                                                                                                  |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Product                                                                                                                               | Hatching eggs of poultry other than ratites (ratites excluded)                                                                                                      |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| I.20 Certified as or for                                                                                                              | \'Germinal products\' must be ticked --- hard error if not                                                                                                          |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| I.22 For internal market                                                                                                              | Must be ticked for standard EU/NI consignment                                                                                                                       |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Zone code                                                                                                                             | GB-0 (no active AI regionalisation) or GB-1 (active AI regionalisation in force). OV must check APHA HPAI interactive map immediately prior to every certification. |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Commodity code (HS)                                                                                                                   | 0407                                                                                                                                                                |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| I.27 Category                                                                                                                         | Pure line / grandparents / parents / laying pullets / others --- must be completed                                                                                  |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Signed by                                                                                                                             | OV only --- must hold appropriate OCQ(V) authorisation. CO/EHO cannot sign this certificate.                                                                        |
+---------------------------------------------------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| KEY POINT --- AI ZONE CHECK MANDATORY: Unlike dairy EHCs where GB-0 is a fixed standard, the OV certifying an 8436 must actively check the APHA HPAI interactive map before every certification. Failure to check current zone status is a certification error in itself.                                   |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**K2. Page Count --- 8436**

Standard bilingual 8436: 7 EN pages + second language pages (number varies by language). English-only for Ireland, Northern Ireland, or where second language is optional. Page footer language code \'8436EHC en\' is the primary identification method.

**K3. Part I Field Rules --- 8436 Specific**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                         **Rule**
  --------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.8 Region of origin              GB-0 or GB-1 depending on current AI disease status --- see E35. Must match the zone code entered at II.2.1. Mismatch between I.8 and II.2.1 = hard error.

  I.11 Place of dispatch            Must carry the PHS (Poultry Health Scheme) approval number of the hatchery or flock of origin. Missing approval number = medium warning.

  I.19 Container/Seal number        Seal numbers of hatching egg containers must be present. Hard error if absent for sealed loads.

  I.20 Certified as or for          \'Germinal products\' must be ticked --- hard error if not.

  I.22 For internal market          Must be ticked for standard EU/NI consignment.

  I.24 Total number of packages     Total number of egg containers --- must be populated and match I.27 description.

  I.25 Total quantity               Number of hatching eggs --- must be populated.

  I.27 Description of consignment   CN code: 0407. Category field must be completed. Species and identification system must be present for each line.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**K4. Salmonella Programme --- II.1 (Public Health Attestation)**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Species**                                                                        **II.1.1 Salmonella table**                                 **II.1.2 SE/ST attestation**
  ---------------------------------------------------------------------------------- ----------------------------------------------------------- ---------------------------------------
  Gallus gallus (chicken)                                                            REQUIRED --- complete with flock ID, age, date and result   REQUIRED --- retain

  Meleagris gallopavo (turkey)                                                       REQUIRED --- complete with flock ID, age, date and result   REQUIRED --- retain

  All other poultry (ducks, guinea fowl, quail, pheasant, partridge, Anas spp etc)   NOT APPLICABLE --- delete or mark N/A                       NOT APPLICABLE --- delete or mark N/A
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**K5. Part II Deletion Map --- 8436**

Standard deletion pattern for a typical GB hatching egg consignment: zone GB-0 or GB-1; no HPAI vaccination; Newcastle disease vaccines comply with both general and specific criteria (standard UK position); eggs dispatched from a PHS-approved hatchery.

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Clause**                                                                                    **Standard State**                                                           **Notes**
  --------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------------------
  II.1 Public health attestation header                                                         RETAIN if Union is final destination                                         Standard EU export: RETAIN

  II.1.1 Salmonella table                                                                       RETAIN for chickens/turkeys; DELETE/N/A for other species                    See K4 and E33

  II.1.2 SE/ST attestation                                                                      RETAIN for chickens/turkeys; DELETE/N/A for other species                    See K4 and E33

  II.1.3 Finland/Sweden Salmonella                                                              DELETE if not destined for Finland or Sweden                                 See E34. RETAIN if destination IS Finland or Sweden.

  II.2 Animal health attestation header                                                         RETAIN                                                                       

  II.2.1 Zone code                                                                              RETAIN --- enter GB-0 or GB-1                                                Must match I.8. OV must check APHA HPAI map before signing.

  II.2.1(a) Authorised in Annex IV                                                              RETAIN                                                                       GB is listed for hatching eggs

  II.2.1(b) AI surveillance programme                                                           RETAIN                                                                       UK complies with requirements

  II.2.1(c) Free from HPAI                                                                      RETAIN                                                                       Certifiable for GB-0/GB-1 on basis of OV disease check

  II.2.1(d) either --- free from Newcastle disease virus                                        RETAIN for standard UK zones                                                 

  II.2.1(d) or --- not free from ND virus but premises not restricted                           DELETE unless applicable                                                     

  II.2.2(a) either --- no HPAI vaccination                                                      RETAIN                                                                       Standard UK position

  II.2.2(a) or --- HPAI vaccination carried out                                                 DELETE                                                                       Not applicable for standard GB zones

  II.2.2(b) either --- ND vaccines comply with BOTH general and specific criteria of Annex XV   RETAIN                                                                       UK vaccines hold VMD marketing authorisation --- ICPI \< 0.4. Retain first \'either\'.

  II.2.2(b) or --- ND vaccines comply with general criteria only                                DELETE entire arm                                                            Delete including all sub-clauses (i)(1-4)(ii). Z-strikes acceptable.

  II.2.3(a) either --- approved hatchery                                                        RETAIN if eggs dispatched from hatchery                                      

  II.2.3(a) or --- approved flock establishment                                                 RETAIN if eggs dispatched direct from flock of origin                        

  II.2.3(b--e)                                                                                  RETAIN all                                                                   Under control of competent authority; regular vet visits; no restriction; 10km radius free from HPAI and ND.

  II.2.4(a) Zone residency --- flock in zone for at least 3 months                              RETAIN                                                                       

  II.2.4(b)(i--ix)                                                                              RETAIN and complete as applicable                                            See K5 full map in NFG v18 for detail on each sub-clause.

  II.2.4(c) either --- flock not vaccinated against HPAI                                        RETAIN                                                                       Standard UK position

  II.2.4(c) or --- flock HPAI vaccination carried out                                           DELETE                                                                       Not applicable for standard GB

  II.2.4(d) either --- flock not vaccinated against ND in last 12 months                        RETAIN if no ND vaccination                                                  Most common option for standard flocks

  II.2.4(d) or --- flock vaccinated against ND                                                  RETAIN and complete vaccination table if vaccinated in last 12 months        See E36 for mandatory fields in vaccination table

  II.2.4(e) Disease surveillance programme --- species-specific option                          RETAIN appropriate species option; DELETE others                             Gallus gallus: first option. Meleagris gallopavo: second option. Other species: third option.

  II.2.4(f--h)                                                                                  RETAIN appropriate options                                                   No contact with lower health status poultry; no symptoms; clinical inspection --- see E38.

  II.2.5(a--d)                                                                                  RETAIN appropriate options                                                   Eggs not vaccinated against HPAI (standard); egg marking; eggs disinfected.

  II.2.6 Date(s) of collection                                                                  RETAIN --- enter date(s)                                                     Dates must not be prior to zone authorisation date.

  II.2.7(a--f) Container requirements                                                           RETAIN all                                                                   Containers constructed, designed, closed, and labelled correctly. Disposable or reusable options as applicable.

  II.2.8 Transport requirements                                                                 RETAIN                                                                       Means of transport cleaned and disinfected before loading.

  II.2.9 Newcastle disease free Member State destination                                        DELETE unless destination MS has formal ND-free without vaccination status   Must be deleted for standard EU destinations.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**K6. EN / Second Language Parity --- 8436**

All deletions in the EN section must be mirrored exactly in the second language section. A deletion present in EN but absent in second language (or vice versa) = hard error.

**K7. Disease Clearance --- 8436**

- ET171 Notifiable disease occurrence list for Great Britain and Northern Ireland

- ET152 UK status for non-notifiable disease relevant to export certification

- APHA HPAI interactive map --- to confirm whether GB-0 or GB-1 applies, and to verify all premises of origin are within the correct zone

- For NI postcodes: DAERA AI Trade Map

**PART L --- EHC 8471 EGG-PRODUCTS-PT: Egg Products for Human Consumption**

**L1. Certificate Overview**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                  **Value**
  -------------------------- ------------------------------------------------------------------------------------------------------------------------------
  Certificate model          8471EHC --- EGG-PRODUCTS-PT (Egg Products for Human Consumption, pasteurisation treatment)

  Footer code                8471EHC en (English) / 8471EHC \[language code\] (second language)

  Header                     Egg products intended for human consumption that are required to undergo a pasteurisation treatment

  Product type               Pasteurised egg products for human consumption (e.g. liquid whole egg, liquid egg white, liquid yolk, frozen egg, dried egg)

  I.20 Certified as or for   \'Products for human consumption\' must be ticked --- hard error if not

  Commodity code (HS)        0408 (liquid/frozen egg); 0408 91/0408 99 (dried)

  Signed by                  OV or Certifying Officer (CO) --- see Part II signing page
  ---------------------------------------------------------------------------------------------------------------------------------------------------------

**L2. Certificate Identification**

8471 pages carry footer code \'8471EHC en\' (English) and \'8471EHC \[language code\]\' (second language). Header reads: \'Egg products intended for human consumption that are required to undergo a pasteurisation treatment.\' Part II header reads: \'Certificate model EGG-PRODUCTS-PT.\' I.20 \'Products for human consumption\' must be ticked.

**L3. Page Count --- 8471**

Standard bilingual 8471: 5 EN pages + second language section (5 or 6 pages depending on language). English-only for Ireland or Northern Ireland BCPs. Page footer language code \'8471EHC en\' is the primary detection method. Obsolete pre-2026 template: flag as medium warning.

**L4. Part I Field Rules --- 8471 Specific**

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Field**                   **Rule**
  --------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  I.8 Region of origin        GB-0 --- hard error if absent or different.

  I.18 Transport conditions   Chilled for liquid egg. Frozen for frozen product. Ambient is not valid for egg products. Two boxes ticked = hard error.

  I.20 Certified as or for    \'Products for human consumption\' must be ticked --- hard error if not ticked.

  I.27 Commodity table        CN Code: numeric HS code (0408 series). Species: GALLUS GALLUS (hen eggs, most common) or other applicable species in Latin. Nature of commodity: product description (e.g. LIQUID WHOLE EGG). Treatment type: PASTEURISED. Manufacturing plant: UK egg establishment approval number. Production/collection date required. Unused rows must be struck through or redacted. Net weights across all rows must sum to I.26.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**L5. Part II Attestation --- 8471**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Clause**                                           **Standard State**           **Notes**
  ---------------------------------------------------- ---------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------
  II.1 Public health attestation (a--e)                RETAIN in full               Union is the final destination. Retain all sub-clauses.

  II.1a AMR attestation                                DELETE                       Not applicable until 3 September 2026. Both redaction and pen strikethrough are valid --- see E11.

  II.2 Animal health attestation                       RETAIN                       Retain in full.

  II.2.1 Annex XIX entry route (zone code)             RETAIN with GB-0 zone code   Standard GB export. Transit arm: DELETE unless transit consignment.

  II.2.2 Species and establishment approval number     RETAIN --- complete          Enter species (e.g. GALLUS GALLUS) and egg establishment approval number. Member States option: RETAIN --- never flag as undeleted fragment.

  II.2.3 Avian influenza --- zone free from AI / IB    RETAIN for GB-0 zones        Check APHA disease status before certifying.

  II.2.4 Salmonella control programme                  RETAIN for Gallus gallus     Enter Salmonella programme results. For other species (ducks, quail etc) --- delete or mark N/A.

  \[Official veterinarian\] / \[Certifying officer\]   Delete one                   OV signs when II.2 animal health retained (standard case). CO may sign where only public health attestation applies.

  Windsor Framework note                               RETAIN                       Must be present and undeleted in Notes section of both EN and second language pages.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**L6. EN / Second Language Parity --- 8471**

All deletions in the EN section must be mirrored exactly in the second language section. A deletion present in EN but absent in second language (or vice versa) = hard error. Both signing pages must be signed, stamped, and carry the same date.

**L7. Known Establishments --- 8471 (Placeholder)**

Ready Egg Products UK NI ZX019 --- confirmed Northern Ireland egg processor (already in library via Part J COMP rules). As 8471 consignments are processed, add egg establishment approval numbers and consignee details here.

END OF RULE SET --- Version v3. \| April 2026 \| Certificate types: 8468, 8322, 8384, 8324, 8350EHC COMP, 8436, 8471
