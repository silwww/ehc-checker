---
name: _routes/uk-eu/route.md
source: EHC_Checker_RULE_SET_v2_7.docx
version: 2.7
sections: Part A (A2 Template Versions, A2.1 Footer Code Conventions, A6 Language Check, A10 Windsor Framework)
description: UK-EU route layer — rules that depend on UK origin and EU destination (page counts by second-language, BCP→language mapping, footer code conventions, Windsor Framework boilerplate). Version held at 2.7 — v2.8 added A2.1 as a clarification of existing footer convention; shared layer not churned on dairy-driven edits.
---

## A2. Template Versions and Page Count

8468: 5 EN pages + second language section (5 or 6 pages depending on
language) = 10 or 11 pages total. Both are valid.

8322: 5 EN pages + 5 second language pages = 10 pages total.
English-only for Ireland, Northern Ireland, or where second language is
optional: 5 pages.

8384 MPNT: 7 EN pages + second language pages. 8324 Canned Petfood: 4 EN
pages + second language pages + schedule page(s).

8436 HEP: 7 EN pages + second language pages. English-only for
Ireland/Northern Ireland or where second language is optional. See K2.

Obsolete template (pre-2026): flag as medium warning. Page count varies
by language --- never flag page count as an error on number alone. Page
footer language code is the primary detection method.

## A2.1 Footer Code Conventions by Certificate Family

Footer code conventions differ by certificate family. Human-consumption
templates (8468, 8384, 8350, 8436, 8471) carry the EHC code plus
language code in the footer (e.g. \'8468EHC en\'). Non-human-consumption
templates (8322 and 8324) carry only the language code. A reliable
alternative identification anchor for the non-human-consumption family
is the presence of field I.25 \'Commodity certified for\' with four
tickboxes (Animal feedingstuff / Further process / Production of petfood
/ Technical use); this field is not present on human-consumption
certificates. When checking footer compliance, apply the convention of
the certificate type being checked.

## A6. Language Check

The second language is determined by the BCP entry point country (I.16)
--- NOT the destination country (I.9). Mismatch between BCP country and
language code = hard error.

  ------------- ------------ ---------------- ------------------------
  **BCP         **Required   **Authority**    **Notes**
  Country**     Language**                    

  France        French (fr)  SIVEP            e.g. Calais FRCQF1

  Denmark       Danish (da)  Danish border    e.g. Esbjerg DKEBJ1
                             authority        

  Netherlands   Dutch (nl)   Dutch border     Currently optional ---
                             authority        single English also
                                              acceptable at NL-RTM1. A
                                              single English-only 8468
                                              submitted for Rotterdam
                                              should be noted as a low
                                              notice only, not a
                                              medium warning. No
                                              action required.

  Belgium       French or    Belgian border   Depending on BCP
                Dutch        authority        location. Zeebrugge =
                                              French.

  Ireland       None         Irish border     Single English document
                             authority        --- no second language
                                              required

  Northern      None         DAERA            Single English document
  Ireland                                     --- no second language
                                              required

  Spain         Spanish (es) Spanish border   
                             authority        

  Other EU      That                          
                country\'s                    
                language                      
  ------------- ------------ ---------------- ------------------------

  ---------------------------------------------------------------
  **NOTE: Always use the BCP-specific authority name in reports
  --- never use \"SIVEP\" for a Danish, Irish, Belgian or other
  non-French BCP.**

  ---------------------------------------------------------------

## A10. Windsor Framework / Boilerplate Notes

Windsor Framework paragraph must be present and undeleted in Notes
section of both EN and second language pages on 8468 and 8322
certificates. Both Windsor Framework wording AND older Protocol on
Ireland/Northern Ireland wording are valid depending on template
version.

