# How to add a new rule set

A rule set tells the engine how to verify a specific Export Health Certificate type. Rule sets are composed at request time from three layers:

- **Core layer** (`rules/_core/`) — universal rules that apply to every certificate (Parts 0, A, B, I — identification, signing, stamps, formatting). Owned by the engine, rarely changes per commodity.
- **Route layer** (`rules/_routes/<route-id>/`) — rules specific to an origin/destination route (e.g. `uk-eu` covers attestations and BCP behaviour for UK→EU exports). Shared by all commodities going on that route.
- **Commodity layer** (`rules/<commodity>-<route>/`) — rules specific to a commodity for that route (e.g. `dairy-uk-eu` covers Part F1 commodity codes, establishment lists, dairy-specific cross-checks). Each commodity layer can host one or more certificate types.

When a PDF is uploaded, the engine reads `rules/_registry.json`, matches the PDF against each registered certificate type's detection patterns, then composes the system prompt by concatenating the markdown from each layer in the `layerComposition` order.

This three-layer model means: adding a new EHC type for an existing commodity is small (one new `types/<code>.md` plus one registry entry); adding a new commodity is medium (one new folder + libraries + commodity stub); adding a new route is larger (a new `_routes/<route-id>/` folder).

## Adding a new EHC type for an existing commodity

This is the most common operation. Example: a new EHC code for dairy-uk-eu.

1. Create `rules/dairy-uk-eu/types/<code>.md`. Use an existing file (e.g. `types/8468.md`) as a template. The file describes the certificate-type-specific rules — attestation text, commodity-code conventions, weight-bracket logic, etc.
2. Add an entry to `rules/_registry.json` under `certificateTypes`:

   ```json
   "<code>": {
     "title": "Human-readable certificate title",
     "layerComposition": ["core", "routes.uk-eu", "commodities.dairy-uk-eu"],
     "commodityFile": "types/<code>.md",
     "detection": {
       "footerPatterns": ["<code>EHC", "<code> EHC"],
       "headerKeywords": ["..."],
       "notes": "Any disambiguation notes the model needs"
     }
   }
   ```

3. The `detection` block tells the engine how to recognise this certificate from a PDF. `footerPatterns` matches the small print on every page; `headerKeywords` matches text near the top of page 1. Add `bodyKeywords` if footer + header are insufficient (some non-human-consumption certificates need a body anchor).
4. Test by uploading a real cert of the new type and verifying the correct rule set composition is applied. Server logs will show the matched `certificateType` and resolved layer files.

No engine code changes are needed.

## Adding a new commodity for an existing route

Example: meat-products-uk-eu already exists; here's the same shape if a new commodity were added.

1. Create the commodity folder: `rules/<commodity>-<route>/`. Inside it:
   - `rule_set.md` — commodity stub. Often very short (a few lines). The bulk of the rules live in the `types/` files.
   - `types/<code>.md` — one file per certificate type for this commodity.
   - `libraries/` — commodity-specific JSON libraries (typically `establishments.json`; sometimes commodity-specific consignees or destinations).
   - `calibration-notes.json` — optional. Free-form notes the model receives at the end of the system prompt to disambiguate edge cases identified through real-cert testing.
2. Register the commodity layer in `rules/_registry.json` under `layers.commodities`:

   ```json
   "layers": {
     "commodities": {
       "<commodity>-<route>": "<commodity>-<route>"
     }
   }
   ```

3. Add one or more `certificateTypes` entries pointing at the new commodity (see "Adding a new EHC type" above). The `layerComposition` array references the new commodity.

## Adding a new route

Example: a hypothetical `uk-cn` route for UK→China exports.

1. Create `rules/_routes/uk-cn/`:
   - `route.md` — route-specific rules (attestations, BCP behaviour, language requirements specific to that destination)
   - `libraries/` — route-specific libraries (e.g. `bcps.json` for the destination's border control posts)
   - `routes/` — sub-folder for per-route calibration notes if the route has multiple corridors
2. Register the route in `rules/_registry.json` under `layers.routes`:

   ```json
   "layers": {
     "routes": {
       "uk-cn": "_routes/uk-cn"
     }
   }
   ```

3. New commodity layers can now reference this route in their `layerComposition` array as `"routes.uk-cn"`.

## Updating an existing rule set version

When a domain expert publishes a new rule set version (e.g. dairy-uk-eu v3.1 → v3.6):

1. Replace the content of the affected layer files. Most updates land in `types/<code>.md` for one or more certificate types; some land in the commodity stub `<commodity>-<route>/rule_set.md`; rare ones touch route or core.
2. Bump `version` and `versionDate` (and `sourceDocument` if the source `.docx` filename changed) at the top of `rules/_registry.json`.
3. Commit with a message describing the version, e.g. `chore: update dairy-uk-eu rule set to v3.6`.

Git history is the long-term version record. Do not keep old versions as separate files in the layer folders.

## Libraries — where they live

The engine loads JSON libraries (establishments, BCPs, consignees, logistics agents, OVs) from each layer that contributes to the active composition:

- `_core/libraries/` — universal libraries (OVs, anything used across all commodities and routes)
- `_routes/<route-id>/libraries/` — route-specific libraries (BCPs at destination ports, route-specific logistics agents)
- `<commodity>-<route>/libraries/` — commodity-specific libraries (establishments approved for this commodity, commodity-specific consignees)

There is no `_shared/` folder. Libraries used by multiple commodities live in the layer that semantically owns them (typically `_core/` for universal entities, the route layer for destination-side entities).

## Calibration notes

`calibration-notes.json` files at any layer let the rule set author capture edge cases without modifying the rule set markdown. They are appended to the system prompt at composition time. Use them for "the rule says X but in practice OVs accept Y when Z" — workarounds and disambiguations driven by real-cert testing.

## Detection — how the engine picks a rule set

When a PDF is uploaded, the engine iterates over `_registry.json`'s `certificateTypes` and scores each against the PDF text:

1. **Footer patterns** — strings expected to appear in the per-page footer (e.g. `"8468EHC"`). Highest confidence signal.
2. **Header keywords** — strings expected near the top of page 1 (e.g. `"Dairy products intended for human consumption"`). Used when footer patterns are absent.
3. **Body keywords** — strings expected anywhere in the body. Lowest priority, used only for certificates without distinctive footer/header (e.g. EHC 8322 non-human-consumption family).

The first matching certificate type wins. If no match, the engine returns an "unrecognised certificate" error to the frontend.

To debug detection on a new EHC type, upload the PDF and check the server console — it logs which patterns matched and which didn't.
