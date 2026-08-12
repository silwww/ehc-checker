'use strict';

// Word delta for Roger: approved proposals rendered as paste-ready
// sections for the next master rule set version. Content building
// (deltaSections) is pure; buildDeltaDocx renders it with npm docx.

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const { xmlSafeText } = require('./xml-safe-text');

// Sanitising lives in ONE place (xml-safe-text) so the door and this gate
// cannot drift apart — they previously held identical hand-copied regexes,
// which meant this gate shared the door's exact blind spot.
const safe = xmlSafeText;

// A rule with no text used to render as a heading, the label "Proposed rule
// text:" and a blank line — indistinguishable from a rule Roger must read.
const NO_TITLE = '[UNTITLED PROPOSAL — no flag title recorded]';
const NO_RULE_TEXT = '[NO RULE TEXT — the proposer submitted no description. Check before merging.]';

const TIERS = new Set(['rule', 'library']);

function fmtDate(iso) { return String(iso || '').slice(0, 10); }

function provenance(p) {
  return [
    `Source: certificate ${safe(p.certificate_ref)}` + (p.cert_type ? ` (EHC ${safe(p.cert_type)})` : '') + `, ${fmtDate(p.created_at)}.`,
    // Which box on the certificate. Without it the author has to guess from
    // the title which part of the master document a proposal belongs to.
    p.field_reference ? `Certificate field: ${safe(p.field_reference)}` : null,
    p.proposed_by ? `Proposed by ${safe(p.proposed_by)}.` : null,
    p.proposer_note ? `Proposer note: ${safe(p.proposer_note)}` : null,
    `Approved by ${safe(p.reviewed_by)} on ${fmtDate(p.reviewed_at)}` + (p.decision_note ? ` — ${safe(p.decision_note)}` : '') + '.'
  ].filter(Boolean);
}

function ruleText(p) {
  const preferred = safe(p.model_recommendation).trim();
  if (preferred) return preferred;
  return safe(p.flag_description).trim() || NO_RULE_TEXT;
}

function deltaSections(proposals, opts) {
  const list = proposals || [];
  const rules = list.filter((p) => p.tier === 'rule');
  const libs = list.filter((p) => p.tier === 'library');
  // A tier the renderer does not recognise must never make a proposal
  // vanish: the export records proposals as delivered, so one dropped here
  // is gone for good. Surfaced in the document instead of filtered away.
  const unclassified = list.filter((p) => !TIERS.has(p.tier));

  if (rules.length + libs.length + unclassified.length !== list.length) {
    throw new Error('delta-docx: tier buckets do not cover the input — refusing to build a partial delta');
  }

  const sections = [];

  // The document travels to Roger on its own; a warning that lives only in
  // the web UI does not reach him.
  const partial = opts && opts.partial;
  if (partial && Number.isFinite(partial.shipped) && Number.isFinite(partial.total)) {
    const PARALLEL = 'were exported by a parallel export and are in a separate document — they are NOT queued.';
    const REVERTED = 'had their approval withdrawn by a reviewer while this document was being built. They are back in the queue and are NOT approved — do not act on them from an earlier copy.';
    // 'mixed' exists because the two above are opposite instructions, and a
    // single batch can suffer both. Naming only one told the reader to
    // disregard rule text that had in fact just been delivered to them.
    const lines = partial.cause === 'mixed'
      ? [
        `${partial.already_exported} ${PARALLEL}`,
        `${partial.reverted} ${REVERTED}`
      ]
      : [
        partial.cause === 'parallel' ? `The rest ${PARALLEL}`
          : partial.cause === 'error' ? 'The rest could not be recorded as exported and remain queued for the next delta.'
            : partial.cause === 'reverted' ? `The rest ${REVERTED}`
              // 'unknown' is only produced by a re-download, where the reason
              // is genuinely not recoverable. Saying so beats guessing at a
              // sentence that might contradict the copy already delivered.
              : 'The reason is not recorded in this re-download — check the originally delivered document, or the proposals page, before acting on the difference.'
      ];
    sections.push({
      heading: 'PARTIAL EXPORT — this document is incomplete',
      lines: [`This delta contains ${partial.shipped} of ${partial.total} approved proposals.`, ...lines]
    });
  }

  for (const p of rules) {
    sections.push({
      heading: safe(p.flag_title) || NO_TITLE,
      lines: ['Proposed rule text:', ruleText(p), ...provenance(p)]
    });
  }

  if (libs.length > 0) {
    sections.push({
      heading: 'Library additions',
      lines: libs.flatMap((p) => [`• ${safe(p.flag_title) || NO_TITLE}`, ruleText(p), ...provenance(p), ''])
    });
  }

  if (unclassified.length > 0) {
    sections.push({
      heading: 'Needs classification — review before merging',
      lines: unclassified.flatMap((p) => [
        `• ${safe(p.flag_title)} (tier recorded as ${safe(p.tier) || 'empty'})`,
        ruleText(p),
        ...provenance(p),
        ''
      ])
    });
  }

  return sections;
}

async function buildDeltaDocx(proposals, opts) {
  const sections = deltaSections(proposals, opts);
  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('EHC Checker — Rule set delta')] }),
    new Paragraph({ children: [new TextRun({ text: 'Approved proposals awaiting inclusion in the next master rule set version. Generated by the EHC Checker admin pipeline.', italics: true })] })
  ];
  for (const s of sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(safe(s.heading))] }));
    for (const line of s.lines) {
      children.push(new Paragraph({ children: [new TextRun(safe(line))] }));
    }
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children
    }]
  });
  return Packer.toBuffer(doc);
}

module.exports = { deltaSections, buildDeltaDocx };
