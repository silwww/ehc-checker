# Meat rule set (placeholder)

This folder is a placeholder for the future meat rule set. No rules are defined here yet.

When a meat rule set is ready, this folder will contain:

- `rule_set.md` — the meat rule set document
- `types/` — per-certificate-type rule splits (if applicable)
- `libraries/establishments.json` — meat-specific establishments library

Shared libraries (OVs, BCPs, consignees, logistics) will be loaded from `../_shared/libraries/` alongside the meat-specific establishments.

To activate a meat rule set once it is ready:

1. Place the rule set markdown in `rule_set.md` here.
2. Create `libraries/establishments.json` with meat-specific establishments.
3. Add a new entry to `rules/_registry.json` with `"id": "meat-uk-eu"`, certificate type detection patterns, and `"enabled": true`.

No engine code changes are required.
