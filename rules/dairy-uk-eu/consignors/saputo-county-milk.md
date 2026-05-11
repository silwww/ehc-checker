---
consignorId: saputo-county-milk
commodity: dairy-uk-eu
source: EHC_Checker_v4_2_2_Saputo_CountyMilk.docx
version: 4.2
---

# EHC Checker Rule Set v4.2 · Consignor document

## Saputo / County Milk

> This document is loaded by the application together with the Master document on every check matching this consignor. *Universal rules and calibrations live in Master / General — not duplicated here. This document holds only rules, calibrations and libraries specific to this consignor group.*

Scope of this document. Saputo Dairy UK operates multiple manufacturing sites across the UK; this document covers the most frequent Saputo trade lane — sweet whey powder 8468 and Cat 3 8322 ABP dairy manufactured at Saputo Davidstow, Cornwall (GB CQ 501) and exported via Gregory Distribution at Heathfield. The Saputo Cornish Cruncher cheese (also from Davidstow) on the Rotterdam lane via Buiteman is covered here too. Other Saputo lanes seen operationally — including cheese ex-Gregory North Tawton and Cullompton creamery output — are listed at the end of this document as out of scope for v4.2 and are flagged in Master Appendix A as rule set gaps for v4.3.

Two distinct customers operate from the Davidstow / Heathfield setup:

- Saputo Dairy UK exports the product directly under its own commercial entity.
- County Milk Products Ltd buys the same product from Saputo and exports it onwards under its own commercial entity.

They collaborate on logistics but are commercially separate. Each has its own I.5 consignees and I.12 destinations. The application identifies the exporter from I.1 (consignor name) and applies sub-library rules accordingly. AQ-prefix batch numbers are typically root-truncated on the EHC — this is standard convention for the Davidstow whey product, applying equally to both exporters; whether it applies to cheese or to Cullompton-origin product is not yet calibrated.

## Establishment

| Field | Detail |
|---|---|
| **Manufacturing establishment** | Dairy Crest Ltd / Saputo Dairy UK, Davidstow, Camelford, Cornwall |
| **Approval number** | GB CQ 501 |
| **Loading depot** | Gregory Distribution Ltd, Heathfield — loading/logistics only, no approval number |
| **Certificate types** | 8468 dairy human consumption; 8322 Cat 3 ABP dairy |
| **Exporters** | Saputo Dairy UK (direct); County Milk Products Ltd (onward buyer-exporter) |
| **Primary trade lanes** | Calais FRCQF1 (Netherlands, Poland, Spain, France, Belgium); Rotterdam NL-RTM1 (Saputo cheese via Buiteman) |

## Rules — common to both exporters

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **C9 / D3** | AQ-prefix batch root truncation (e.g. AQ6070) is standard practice on Saputo Davidstow product | **silent** | No flag of any kind on either exporter |
| **I.1 / I.11** | I.1 may be Saputo Dairy UK or County Milk Products; I.11 remains Saputo Davidstow GB CQ 501 in both cases | **silent** | Identify exporter from I.1 — see sub-libraries |
| **Rotterdam I.13** | I.13 exit port must be shown on unaccompanied loads to NL-RTM1 — warehouse address = hard error | **HARD** | Purfleet and Harwich are confirmed exit ports; OV may override with written confirmation |
| **Rotterdam I.15** | Vessel + Road vehicle both ticked on unaccompanied Rotterdam loads | **HARD** | Road vehicle alone = hard error |
| **Heathfield I.13/I.11** | Gregory Distribution Heathfield is loading depot — no approval number expected; correct as I.13 | **silent** | Standing pass on Heathfield as I.13 across both exporters |

## Rules — Saputo only

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **Buiteman I.5/I.6** | Buiteman B.V. appearing as both I.5 and I.6 on Rotterdam cheese loads = correct and expected | **silent** | Saputo Cornish Cruncher cheese only |

## Rules — County Milk only

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **I.12 Poland** | Polish destination on the County Milk lane requires approval number at I.12 | **MED** | Milkpol → Logit 30106002; ENTC → PL 28041606 UE; Trade Milk Warehouse → PL04631604WE; Denkavit → FR49215001; Lacto Production → FR35184020 |
| **I.5 attribution** | County Milk Products as I.1 with named consignee at I.5 (ENTC, Milkeen, VAN KOMMER, R. BOONZAIJER, Van Zutven, Docomar, P.C. van Tuijl, Jonker & Schut) | **silent** | Cross-company arrangement — normal for County Milk lane |

## Calibration notes

### E16 · Saputo / Dairy Crest batch truncation

AQ-prefix batch numbers presented as root only (e.g. AQ6070) on Davidstow/Saputo (GB CQ 501) loads = confirmed standard practice. Silent pass — no flag of any kind. Applies equally on direct Saputo exports and on County Milk onward exports. Does NOT apply to AFI/Arla (GB DE 030) loads. On Fines and downgrade loads, full AQ-prefix batch references including F-suffix run number (e.g. AQ6079F03) appear on the schedule page — correct and expected. Silent pass.

### E61 · Rotterdam unaccompanied load conventions — NL-RTM1

Applies to all unaccompanied loads to Rotterdam NL-RTM1. I.13 Place of loading: exit port must be shown — hard error if warehouse address shown instead. Purfleet and Harwich are confirmed usual exit ports; OV may override with written confirmation. I.15 Means of transport: Vessel + Road vehicle both ticked — hard error if Road vehicle only. Background: cancel/replace issued May 2026 on Saputo cheese load where warehouse address was shown in I.13 instead of exit port.

## Library entries

### Shared — Heathfield destinations (Saputo or County Milk as exporter)

*Destinations operating from Gregory Heathfield warehouse with either Saputo or County Milk as exporter. The exporter is identified from I.1 on each EHC.*

| Approval No | Entity | Address / notes |
|---|---|---|
| **209359** | Docomar | Laan der Techniek 10, 3903 AT Veenendaal, Netherlands |
| **224341** | Jonker & Schut Nijkerk | Nijverheidsstraat 16, 3861 RJ Nijkerk, Netherlands |
| **207165** | Jonker & Schut Barneveld | Harselaarseweg 33, 3771 MA Barneveld, Netherlands. (Approval previously rendered N/A in v4.1 — corrected from spreadsheet.) |
| **19163** | P.C. van Tuijl Kesteren | Batterijenweg 17, 4041 DA Kesteren, Netherlands |
| **207492** | P.C. van Tuijl Lienden | Marsdijk 13, 4033 CC Lienden, Netherlands |
| **91124** | P.C. van Tuijl Opheusden | Tielsestraat 66a, 4043 JT Opheusden, Netherlands |

### Saputo only

*Destinations and consignees specific to direct Saputo exports.*

| Field / Approval | Entity | Address / notes |
|---|---|---|
| **I.5** | Buiteman B.V. | Mon Plaisir 93, 4879 AM Etten-Leur, Netherlands. Saputo cheese, Rotterdam NL-RTM1 lane. I.5 and I.6 same entity = normal |
| **I.12 — N/A** | Grozette B.V. | Woerden, Netherlands. Saputo Cornish Cruncher cheese, Rotterdam NL-RTM1 via Buiteman |
| **I.12 — N/A** | Jonker & Schut BV (8468) | Barneveld, Netherlands. Also appears on 8468 loads — approval field N/A on 8468 even where the establishment carries an approval (207165) on Cat 3 |

### County Milk only

*Destinations and consignees specific to County Milk Products onward exports of Saputo product.*

| Approval No | Entity | Address / notes |
|---|---|---|
| **I.1** | County Milk Products Ltd | Dean Court, 85 Adlington Road, Wilmslow, Cheshire, SK9 2BT. I.1 consignor only; I.11 remains Saputo Davidstow GB CQ 501 |
| **I.5** | ENTC Dairy Solutions Sp.z.o.o | Dworowa 10, 14-400 Paslek, Poland. Also I.12 destination — approval PL 28041606 UE. County Milk Calais route |
| **I.5** | Farmel Dairy Products BV | Ecopark 75B, 8305 BJ Emmeloord, Netherlands. County Milk sweet whey, Calais |
| **I.5** | Milkeen Krzysztof Cyba | Eukaliptusowa 9 M 1, 02-765 Warsaw, Poland. County Milk sweet whey, Calais, Poland lane |
| **NL218847** | VAN KOMMER | Ambachtsweg 24, 3771 MG Barneveld, Netherlands. County Milk lane via Heathfield |
| **218039** | R. BOONZAIJER Transport BV | Francis Baconstraat 7, 6718 XA Ede, Netherlands. County Milk lane via Heathfield |
| **30329** | Van Zutven Feed Processing | Pater van den Elsenlaan 15, 54462 GG Veghel, Netherlands. County Milk lane via Heathfield |
| **30106002** | Logit Sp. z o.o. | Stare Miasto, Poland. Milkpol Polska consignments via County Milk |
| **PL 28041606 UE** | ENTC Dairy Solutions Sp.z.o.o | Paslek, Poland. County Milk sweet whey, Calais — I.12 destination requiring approval |
| **PL04631604WE** | Trade Milk Warehouse | Włocławska 167, 87-100 Toruń, Poland. County Milk / Milkeen chain — approval required on 8468 |
| **FR49215001** | Denkavit France S.A.R.L. | ZI de Meron – CS 82003, 49260 Montreuil-Bellay, France. County Milk Cat 3 lane — previously mis-attributed to AFI in v4.1, see Master Appendix A error 1 |
| **FR35184020** | Lacto Production | Montauban de Bretagne, France. County Milk Cat 3 lane — previously mis-attributed to AFI in v4.1, see Master Appendix A error 1 |
| **N/A** | Buisman | Zwolle, Netherlands. County Milk / Saputo Davidstow, Calais |

### I.6 logistics — common

| Entity | Address / notes |
|---|---|
| **AGI Global Logistics (CT) Ltd** | Folkestone CT19 4RG. County Milk / Heathfield loads |
| **Proglog SAS** | Marseille, France. County Milk / ENTC Dairy Solutions, Calais route |
| **Estron Group** | NL plate OP-31-VX, trailer E 296. Buiteman Rotterdam lane (Saputo cheese) |
| **Gregory Distribution Ltd** | Heathfield. Loading depot for Saputo Davidstow output (sweet whey + Cornish Cruncher cheese). North Tawton and Taw Valley also operated by Gregory — see out-of-scope note below |

## Saputo trade lanes out of scope of v4.2

The following Saputo lanes are seen operationally but were not captured in v4.1 and therefore are not encoded in this v4.2 document. For EHCs matching any of these, the engine routes here on I.1 match, but the rules and library do not apply — verification falls back to Master / General only and a manual check by the OV is required until v4.3 captures full calibration.

- Saputo cheese ex-Gregory North Tawton — Buiteman destination observed; trade frequency and approval coverage not yet captured.
- Cullompton creamery — second Saputo manufacturing site; cheese exports observed, frequency lower than Heathfield lane. Plant approval number, loading depot routing, and consignees / destinations to be confirmed.

*Both lanes are flagged in Master Appendix A as Gap 1 with a recommended action for v4.3. Roger and the OV are asked to compile approval numbers, observed destinations and trade-frequency notes ahead of the next rule set release.*

### E62 · Trailer plate discrepancy — one flag only

When a trailer plate discrepancy exists between the Dispatch Confirmation (DC) and the EHC/photo, emit ONE flag only. The photo is ground truth. If EHC and photo agree, the DC is the discrepant document — raise a single LOW notice against the DC per E6. Do not emit a separate HARD flag for the same observation. One finding, one flag.

### E63 · OV library check — one flag only

When checking the signing OV against the library, emit ONE flag only regardless of how many pages or positions the OV name and SP number appear on. If the OV is not in the library, one LOW notice covering name + SP + RCVS. Do not emit separate flags for the name field and the stamp field on the same certificate.
