'use strict';

// Pure matching logic for the golden-corpus per-finding assertions.
//
// Extracted out of golden-corpus.test.js so it can be exercised by a real
// (free) unit test in tests/unit/ — the integration test itself makes paid
// API calls and must never be run to check this logic; see
// tests/unit/golden-corpus-matchers.test.js for the coverage that stands in
// for that.

/**
 * Checks that every expected finding in `expectedFindings` is present among
 * `flags` from a check report, and — where the finding specifies one — that
 * its severity matches.
 *
 * @param {Array} flags - report.flags: [{ severity, title, field_reference,
 *   description }, ...]
 * @param {Array} expectedFindings - manifest-shaped matchers:
 *   [{ label, pattern, severity }, ...]
 *   - label: human name for the finding, used only in failure messages.
 *   - pattern: regex source (matched case-insensitively against each flag's
 *     title / field_reference / description — same fields the legacy
 *     single-pattern expectedFlagPattern checked).
 *   - severity: 'hard' | 'medium' | 'low' | null | undefined. When set, at
 *     least one matching flag must carry that exact severity. When
 *     null/undefined, any severity satisfies the finding — this is how a
 *     finding's severity is marked as *known-unstable* while its detection
 *     is still enforced (e.g. I.25 on cert-26-2-120241, which has been
 *     observed at both hard and medium with the correct consignor loaded).
 * @returns {{ ok: boolean, failures: string[] }} - `failures` has one
 *   human-readable entry per unmatched or severity-mismatched finding,
 *   always naming the finding's label, so a single missing detection
 *   surfaces on its own even if the report's overall counters happen to add
 *   up to something plausible.
 */
function matchExpectedFindings(flags, expectedFindings) {
  const safeFlags = Array.isArray(flags) ? flags : [];
  const failures = [];

  for (const expected of expectedFindings || []) {
    const regex = new RegExp(expected.pattern, 'i');
    const candidates = safeFlags.filter((f) =>
      regex.test((f && f.title) || '') ||
      regex.test((f && f.field_reference) || '') ||
      regex.test((f && f.description) || '')
    );

    if (candidates.length === 0) {
      failures.push(
        `missing finding "${expected.label}": no flag matched /${expected.pattern}/i in title/field_reference/description`
      );
      continue;
    }

    if (expected.severity) {
      const severityMatch = candidates.some((f) => f.severity === expected.severity);
      if (!severityMatch) {
        const actual = candidates.map((f) => f.severity).join(', ');
        failures.push(
          `finding "${expected.label}" matched but severity was [${actual}], expected "${expected.severity}"`
        );
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

module.exports = { matchExpectedFindings };
