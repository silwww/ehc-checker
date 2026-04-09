# Certificate type files

This folder is reserved for future per-certificate-type rule splits.

Currently the rule set is monolithic: `../rule_set.md` contains all rules for both EHC 8468 and EHC 8322 — universal rules (Parts A, B, E, F) and type-specific rules (Part C for 8322, Part D for 8468) in a single document.

When a future version of the dairy rule set splits per-type rules out of the main file, this folder will contain:

- `8468.md` — rules specific to EHC 8468 (dairy for human consumption)
- `8322.md` — rules specific to EHC 8322 (dairy Cat 3 ABP)

The engine will then load `rule_set.md` (universal) plus the appropriate `types/<code>.md` based on the detected certificate type.

Until then, the engine loads only `rule_set.md` and passes the entire monolithic document to Claude.
