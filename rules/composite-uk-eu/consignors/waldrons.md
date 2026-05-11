---
consignorId: waldrons
commodity: composite-uk-eu
source: EHC_Checker_v4_2_5_Smaller_consignors.docx
version: 4.2
---

# EHC Checker Rule Set v4.2 · Consignor document

## Waldrons

> This document is loaded by the application together with the Master document on every check matching this consignor. *Universal rules and calibrations live in Master / General — not duplicated here. This document holds only rules, calibrations and libraries specific to Waldrons Patisserie.*

8350EHC COMP composite products to Europ Foods Carlow via Dublin IE DUB 1. Standing pass on absent approval number — Waldrons is not a TRACES-registered establishment. English-only certificate (no second language required for Dublin). Invoices come on dot matrix continuous stationery; invoice date may post-date signing.

## Establishment

| Field | Detail |
|---|---|
| **Establishment** | Waldrons Patisserie Limited, Unit 1-5 Churchills, Mardle Way, Buckfastleigh, Devon TQ11 0NR |
| **Approval number** | No approval number required — standing pass |
| **Certificate type** | 8350EHC COMP — composite products |
| **Trade lane** | Europ Foods c/o Tranzlberia, Carlow — via Dublin IE DUB 1 — English only |
| **Logistics** | I.6: McCulla Customs Ltd (Lisburn) — standing pass |

## Rules

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **J3** | I.11 Waldrons Patisserie — no approval number required on COMP | **silent** | Standing pass — do not flag absence |
| **J4** | I.17 invoice number used as commercial reference (e.g. INV 28681) — invoice date may post-date signing | **silent** | Do not flag date offset between I.17 document date and signing date |
| **J5** | II.3.B dairy establishment: Compsey Creamery IE 1032 EC | **silent** | Confirmed Irish dairy approval on Waldrons COMP |
| **J6** | II.3.D egg establishment: Ready Egg Products UK NI ZX019 | **silent** | Confirmed NI egg processor on Waldrons COMP |
| **J7 deletion map** | II.3.A meat delete; II.3.B retain (dairy); II.3.C fishery delete; II.3.D retain (egg); II.3.E gelatine delete; II.3.F honey delete | **HARD** | Composite contains dairy + egg only |
| **J8** | Schedule is page 10 of 10 — must carry EHC ref, OV signature, stamp, signing date | **HARD** | Hard error if any element absent |
| **J2** | Dublin IE DUB 1 — English only, no second language required | **silent** | Standing pass |
| **I.6 McCulla** | McCulla Customs Ltd as I.6 operator on Waldrons COMP loads | **silent** | Standing pass — do not flag |

## Calibration notes

### E32 · Dot matrix invoice scan quality — Waldrons

Waldrons Patisserie invoices are produced on dot matrix continuous stationery. Comma thousands separators in weight and value fields may render as decimal points in scanned PDFs. Do not raise a weight discrepancy flag based on invoice scan appearance alone where EHC and schedule are internally consistent.

## Library entries

| Field | Entity | Address / notes |
|---|---|---|
| **I.5** | Europ Foods c/o Tranzlberia | Royal Oak Business Park, County Carlow, Republic of Ireland. Dublin IE DUB 1, English only |
| **I.6** | McCulla Customs Ltd | Blaris Industrial Estate, Altona Road, Lisburn BT27 5QB, Co Antrim, NI. Standing pass |
| **I.11 (assembly)** | THERMOTRAFFIC | Units R1-R8, Lympne Industrial Estate, Otterpool Lane, Hythe, CT21 4LR. Approval: UK FL004. Cold store / groupage assembly for COMP loads |
| **II.3.B** | Compsey Creamery | Approval IE 1032 EC — dairy at II.3.B on Waldrons COMP |
| **II.3.D** | Ready Egg Products | Approval UK NI ZX019 — egg processor at II.3.D on Waldrons COMP |
