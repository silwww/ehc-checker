# `rules/_engine/`

This folder holds the **engine layer** of the layered rule set architecture. The engine layer contains behavioural instructions for the model — how to check a certificate, how to use the `submit_check_report` tool, and how to discipline the report output. It is independent of any specific commodity, route, or rule set version.

The engine layer is loaded as the **first layer** in the system prompt composition by `loadRuleSetForCertificate()` in `src/check.js`. It is followed by the core layer, then the route layer, then the commodity layer for the detected certificate type, and optionally a tenant practice layer.

## Files

| File | Purpose |
|---|---|
| `instructions.md` | The engine instructions document. Authoritative for model behaviour. |

## Update workflow

Engine instructions change less often than rule set content. Updates are typically:
- A new behavioural pattern observed across certificates and commodities (universal)
- An adjustment to mode-specific output rules (Training vs Full Audit)
- A new safety-critical output discipline that prevents over-enumeration on a specific rule (e.g. the A7.2 / A7.3 / E60 discipline added at v1.0)

To update: edit `instructions.md`, increment the version in the document control section at the bottom, update the same version in `_registry.json` under `layers.engine`, commit, and deploy. No engine code changes required.

## Relationship to the rule set

The rule set (Roger's monolithic Word document, decomposed into `_core/` + `_routes/` + commodity layers) is the source of truth for *what* to check. This folder is the source of truth for *how* to check and *how to report*. The two evolve independently.
