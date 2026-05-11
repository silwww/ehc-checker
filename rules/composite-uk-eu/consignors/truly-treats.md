---
consignorId: truly-treats
commodity: composite-uk-eu
source: EHC_Checker_v4_2_5_Smaller_consignors.docx
version: 4.2
---

# EHC Checker Rule Set v4.2 · Consignor document

## Truly Treats

> This document is loaded by the application together with the Master document on every check matching this consignor. *Universal rules and calibrations live in Master / General — not duplicated here. This document holds only rules, calibrations and libraries specific to Truly Treats.*

8350EHC COMP composite products to Europ Foods Spain via Calais FRCQF1. Standing pass on absent approval number — Truly Treats is not a TRACES-registered establishment. French second language required for Calais. SOTRACOM Eurotunnel groupage logistics at Coquelles.

## Establishment

| Field | Detail |
|---|---|
| **Establishment** | Truly Treats Ltd, 1-3 Rocklands, Exeter Road, Kingsteignton, Devon TQ12 3HX |
| **Approval number** | No approval number required — standing pass |
| **Certificate type** | 8350EHC COMP — composite products |
| **Trade lane** | Europ Foods Spain, Villajoyosa — via Calais FRCQF1 — French second language required |
| **Logistics** | I.6 SOTRACOM (Coquelles, Eurotunnel groupage); I.11 THERMOTRAFFIC (UK FL004, Hythe assembly) |

## Rules

| Rule | Description | Severity | Notes |
|---|---|---|---|
| **J3 / J9** | I.1 Truly Treats Ltd — no approval number required on COMP | **silent** | Standing pass — do not flag absence |
| **A6 French** | Calais FRCQF1 BCP — French second language required (fr) | **HARD** | Always use SIVEP for FRCQF1 specifically |
| **J7 deletion map** | Apply per-certificate deletion map for composite contents | **HARD** | II.3.A through II.3.F retained or deleted per actual contents |
| **J8 schedule** | Schedule is page 10 of 10 — must carry EHC ref, OV signature, stamp, signing date | **HARD** | Hard error if any element absent |
| **I.6 SOTRACOM** | SOTRACOM as I.6 operator — Coquelles Eurotunnel groupage | **silent** | Standing pass on this lane |

## Calibration notes

*No Truly Treats-specific calibrations beyond the Part J common rules. Calibrations from Master / General apply.*

## Library entries

| Field | Entity | Address / notes |
|---|---|---|
| **I.5** | Europ Foods (Spain) | Partida de Torres, C/Dels Oficis 42, 03570 Villajoyosa, Alicante, Spain. Truly Treats lane, Calais FRCQF1, French second language |
| **I.6** | SOTRACOM | Terminal Eurotunnel, Boulevard de l'Europe, 62231 Coquelles, France. Dover-Calais groupage route. Standing pass |
| **I.11 (assembly)** | THERMOTRAFFIC | Units R1-R8, Lympne Industrial Estate, Otterpool Lane, Hythe, CT21 4LR. Approval: UK FL004 |
