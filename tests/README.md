# EHC Checker — Tests

Two suites, zero new dependencies. Built on Node's built-in `node:test`
runner.

## Suites

- **`tests/util/`** — unit tests on `public/assets/certificate-fields.js`.
  Pure synthetic input. 17 `it()` runs (15 named cases, weights
  parameterized into 3 runs). Runs in <5s. Free.
- **`tests/integration/`** — concise-mode smoke test on
  `runCheckStream` against the real Anthropic API. 17 contract
  assertions on the SSE event payloads. Requires a real cert PDF
  + ANTHROPIC_API_KEY. Takes ~120-130s and costs ~$0.10 per run.
  Full mode is not covered here — see "What this test does NOT
  cover" below.

## Running

```bash
npm test                  # unit only, fast, free
npm run test:unit         # alias for npm test
npm run test:integration  # unit + integration, slow, costs money
```

## Integration test setup (one-time)

### 1. ANTHROPIC_API_KEY

Add to `.env` at the repo root (gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Cert fixture

Real EHC PDFs contain commercial PII. They are gitignored. Place the
test cert at `tests/fixtures/cert-26-2-126149.pdf`. The canonical
source is the Saputo Davidstow → Farmel Dairy Products dispatch from
11 May 2026 (sweet whey powder, Calais BCP).

If the fixture is missing or the API key is missing, the integration
suite fails with a clear error message and does not skip silently.

## Cost

The integration suite calls the real Anthropic API in concise
mode only. Per-run cost at current Claude Sonnet 4.6 pricing:

| Component | Time | Cost |
| --- | --- | --- |
| Concise mode | ~120-130s | ~$0.10 |

Expected use: 8-10 runs/day across the 4-OV team = ~$20-25/month.
No cost gate is implemented (friction trains people to bypass it).

## What this test does NOT cover

By design, the integration test runs concise mode only on one
cert with consignor explicitly set to saputo-county-milk. This
covers the primary OV workflow path but leaves four edge cases
untested:

- **Full report mode**: full mode runs ~256s and generates
  ~14-16k output tokens per request, unsuitable for daily smoke
  test budget. Earlier iterations attempted parallel and
  sequential designs with full mode; both exceeded practical
  timeout limits or doubled the per-run cost. Full-mode contract
  assertions (sections shape, multi-section parity) warrant a
  separate test observation, run manually pre-handover or via
  a dedicated weekly script post-handover.
- **Cold-cache full mode**: related to the above, untested.
- **Auto-consignor path**: omitting consignorId so the server
  auto-detects (no consignor section loaded, smaller system
  prompt). Production typically has consignor selected from the
  UI dropdown, but the auto path exists in code and should be
  smoke-tested separately.
- **Multi-cert load**: the suite uses one cert (26/2/126149).
  Other cert types (8322, 8350, 8324, 8436, 8471) are not
  exercised by integration; only the unit suite exercises field
  selection across synthetic shapes.

These edge cases warrant separate test observations
post-handover. Track them as follow-up work, not as gaps in
current coverage.

## Failure modes

| Symptom | Likely cause |
| --- | --- |
| `ANTHROPIC_API_KEY missing` | `.env` absent or key not set |
| `Fixture missing` | PDF not copied to `tests/fixtures/` |
| `runCheckStream did not throw` fails | API error, network, rate limit |
| `final_report has exactly 9 keys` fails | `runCheckStream` payload changed — update `FINAL_REPORT_KEYS` |
| `rule_set_version matches regex` fails | `applyReportMeta` format changed |
| Weight test fails on a fresh CI machine | locale produces non-comma thousands; force locale or relax assertion |

## Updating tests when the schema changes

The integration test asserts the SSE event contract. If you add or
remove a key from `onEvent('final_report', {...})` in `src/check.js`,
update `FINAL_REPORT_KEYS` in
`tests/integration/sse-final-report.test.js`. If you add a new
`flag.severity` enum value, update `SEVERITY_ENUM` and the tool
schema in `src/check.js:603` together.

## Not tested here — prompt-text contracts (post-handover work)

Some contracts in the system are enforced only by prompt text, not by
engine code. The integration suite intentionally does not assert on
these, because the assertion would catch *model drift from the prompt*
rather than a function-contract violation — a different category of
test that belongs in a prompt-regression suite.

The known case at the time of writing:

- **Concise mode `sections.length === 1`**. The instruction lives in
  the user-content template literal at `src/check.js:822–844`
  ("Populate `sections[]` with EXACTLY ONE section"). No code path
  validates this — `postProcessReport` and `applyReportMeta` do not
  inspect `sections.length`. If the model ever returns 0, 2, or 3
  sections in concise mode, the integration tests here will pass
  cleanly. Locking that contract is appropriate work for a separate
  prompt-regression suite (suggested for the developer taking over
  from Roger post-handover).
