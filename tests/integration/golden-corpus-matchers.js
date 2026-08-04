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
 * `flags` from a check report, EACH claiming its own distinct flag, and —
 * where the finding specifies one — that its claimed flag's severity
 * matches.
 *
 * @param {Array} flags - report.flags: [{ severity, title, field_reference,
 *   description }, ...]
 * @param {Array} expectedFindings - manifest-shaped matchers:
 *   [{ label, pattern, severity }, ...]
 *   - label: human name for the finding, used only in failure messages.
 *   - pattern: regex source, matched case-insensitively against each flag's
 *     IDENTITY fields only — title and field_reference. `description` is
 *     deliberately excluded: it is LLM-generated free prose ("Detailed
 *     explanation of the issue and any context") and is prone to naming a
 *     nearby field in passing without that field being a separate finding
 *     (e.g. "...the I.25 tickbox nearby also looks inconsistent, though
 *     this was not raised as a separate flag" inside an unrelated flag's
 *     description used to satisfy an I.25 expectation that was never
 *     actually raised — see the RED-evidence test in
 *     tests/unit/golden-corpus-matchers.test.js).
 *   - severity: 'hard' | 'medium' | 'low' | null | undefined. When set, the
 *     flag claimed by this finding must carry that exact severity. When
 *     null/undefined, any severity satisfies the finding — this is how a
 *     finding's severity is marked as *known-unstable* while its detection
 *     is still enforced (e.g. I.25 on cert-26-2-120241, which has been
 *     observed at both hard and medium with the correct consignor loaded).
 *
 * Distinctness: two expected findings may never be satisfied by the same
 * flag. A flag that merely matches more than one finding's pattern can only
 * ever count toward ONE of them — a model that raises one flag covering
 * several field references must not be credited with independently
 * detecting all of them. The assignment of flags to findings is found by
 * exhaustive backtracking search (see assignFindings below) rather than a
 * greedy first-match pass, because greedy assignment can consume a flag
 * that a *different* finding needed, and report a false failure even when a
 * valid complete assignment exists.
 *
 * @returns {{ ok: boolean, failures: string[] }} - `failures` has one
 *   human-readable entry per unmatched or severity-mismatched finding,
 *   always naming the finding's label, so a single missing detection
 *   surfaces on its own even if the report's overall counters happen to add
 *   up to something plausible.
 */
function matchExpectedFindings(flags, expectedFindings) {
  const safeFlags = Array.isArray(flags) ? flags : [];
  const findings = expectedFindings || [];
  const n = findings.length;

  if (n === 0) {
    return { ok: true, failures: [] };
  }

  // Pattern-only candidate flag indices per finding (identity fields only —
  // see the "description" note above for why the free-text field is never
  // searched).
  const candidateSets = findings.map((expected) => {
    const regex = new RegExp(expected.pattern, 'i');
    const indices = [];
    safeFlags.forEach((f, flagIdx) => {
      const title = (f && f.title) || '';
      const fieldRef = (f && f.field_reference) || '';
      if (regex.test(title) || regex.test(fieldRef)) indices.push(flagIdx);
    });
    return indices;
  });

  function severityOk(findingIdx, flagIdx) {
    const severity = findings[findingIdx].severity;
    if (!severity) return true;
    return safeFlags[flagIdx].severity === severity;
  }

  // Exhaustive backtracking search over all injective (finding -> distinct
  // flag) assignments, scored lexicographically: maximize the count of
  // findings that are both matched AND severity-correct first, then the
  // count of findings merely matched (for message quality), with a
  // deterministic first-found tie-break. Because every candidate/skip
  // branch is explored for every finding, this is guaranteed to find a
  // fully-satisfying assignment whenever one exists — it cannot report a
  // false failure the way a single greedy left-to-right pass could (a
  // greedy pass can hand a flag to the first finding that matches it even
  // when a later finding has no other candidate, and never backtracks to
  // try the alternative). The search space is bounded by each finding's own
  // candidate count (small in practice — three findings in the current
  // manifest), so full enumeration is cheap and, more importantly, obviously
  // correct: there is no matching heuristic to get subtly wrong.
  let best = null;
  let bestScore = -1;

  function score(assignment) {
    let satisfied = 0;
    let matched = 0;
    for (let i = 0; i < n; i++) {
      if (assignment[i] !== null) {
        matched++;
        if (severityOk(i, assignment[i])) satisfied++;
      }
    }
    return satisfied * (n + 1) + matched;
  }

  function dfs(idx, used, assignment) {
    if (idx === n) {
      const s = score(assignment);
      if (s > bestScore) {
        bestScore = s;
        best = assignment.slice();
      }
      return;
    }
    for (const flagIdx of candidateSets[idx]) {
      if (used.has(flagIdx)) continue;
      used.add(flagIdx);
      assignment[idx] = flagIdx;
      dfs(idx + 1, used, assignment);
      used.delete(flagIdx);
    }
    assignment[idx] = null;
    dfs(idx + 1, used, assignment);
  }

  dfs(0, new Set(), new Array(n).fill(null));

  const failures = [];
  for (let i = 0; i < n; i++) {
    const expected = findings[i];
    const assignedFlagIdx = best[i];

    if (assignedFlagIdx === null) {
      if (candidateSets[i].length === 0) {
        failures.push(
          `missing finding "${expected.label}": no flag matched /${expected.pattern}/i in title/field_reference`
        );
      } else {
        failures.push(
          `missing finding "${expected.label}": flag(s) matched /${expected.pattern}/i in title/field_reference but none could be assigned distinctly — already claimed by another expected finding`
        );
      }
      continue;
    }

    if (!severityOk(i, assignedFlagIdx)) {
      const actual = candidateSets[i].map((flagIdx) => safeFlags[flagIdx].severity).join(', ');
      failures.push(
        `finding "${expected.label}" matched but severity was [${actual}], expected "${expected.severity}"`
      );
    }
  }

  return { ok: failures.length === 0, failures };
}

module.exports = { matchExpectedFindings };
