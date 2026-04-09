# How to add a new rule set

A rule set is a commodity + origin + destination combination (e.g. "UK dairy exports to EU", "UK meat exports to China"). Adding a new rule set requires no engine code changes — only new files and a new registry entry.

## Step 1 — Create the folder

Create a new folder under `rules/` named `<commodity>-<origin>-<destination>` in lowercase. Examples:

- `rules/meat-uk-eu/` — UK meat exports to EU
- `rules/dairy-uk-cn/` — UK dairy exports to China
- `rules/honey-uk-jp/` — UK honey exports to Japan

## Step 2 — Add the rule set markdown

Place the rule set document at `<folder>/rule_set.md`. This is the authoritative document written by the Official Veterinarian who owns the rule set. It should cover:

- Universal rules for this commodity/destination combination
- Per-certificate-type rules (if multiple EHC numbers exist for this combination)
- Library tables (establishments, commodity-specific OVs, commodity-specific BCPs if any)
- Severity levels (hard error / medium warning / low notice)
- Reporting format expectations

## Step 3 — Add commodity-specific libraries

Create `<folder>/libraries/establishments.json` with the establishments approved for this commodity/destination. Use the same JSON format as existing rule sets (see `rules/dairy-uk-eu/libraries/establishments.json`).

Shared libraries (OVs, BCPs, consignees, logistics) do not need to be duplicated — they are loaded automatically from `rules/_shared/libraries/` alongside the commodity-specific establishments.

## Step 4 — Register the rule set

Add a new entry to `rules/_registry.json` in the `ruleSets` array. Use an existing entry as a template. Required fields:

- `id` — unique identifier, matches the folder name
- `name` — human-readable name shown in the UI
- `version` — rule set version (starts at `1.0`)
- `versionDate` — ISO date of this version
- `author` — the veterinarian who wrote it, with SP reference
- `commodity`, `origin`, `destination` — metadata
- `path` — relative path to the folder (e.g. `rules/meat-uk-eu`)
- `ruleSetFile` — markdown filename inside the folder (usually `rule_set.md`)
- `librariesPath` — libraries folder relative to path (usually `libraries`)
- `sharedLibrariesPath` — shared libraries path (usually `rules/_shared/libraries`)
- `certificateTypes` — array of certificate types, each with `code`, `name`, and `detection` patterns
- `enabled` — set to `true` to activate the rule set

## Step 5 — Test detection

The engine detects which rule set to apply by matching the PDF against each rule set's detection patterns (footer code, header keywords). Upload a sample certificate and verify the correct rule set is selected.

## Step 6 — No engine changes required

The engine reads the registry at request time and loads the matching rule set dynamically. No code changes are needed. If the new rule set does not work, check the registry entry, the file paths, and the detection patterns.

## Updating an existing rule set

To release a new version of an existing rule set (e.g. dairy v1.7 → v1.8):

1. Replace the content of `<folder>/rule_set.md` with the new version.
2. Bump `version` and `versionDate` in the registry entry.
3. Commit with a message describing the changes, e.g. `chore: update dairy-uk-eu rule set to v1.8`.

The Git history is the long-term record of all rule set versions. Do not keep old versions as separate files in the folder.
