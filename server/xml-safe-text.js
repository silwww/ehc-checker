'use strict';

// ONE definition of "text that cannot corrupt a .docx", used by both the
// door (proposals.js, on the way into storage) and the last gate
// (delta-docx.js, on the way into the document).
//
// It lives here because the two used to hold identical hand-copied regexes,
// so the gate that exists precisely NOT to trust the door had the door's
// blind spot exactly: both stripped C0 controls and neither stripped U+FFFE
// or U+FFFF, which are equally illegal in XML 1.0. A single `\uFFFF` in a
// flag title produced a 200 response, a structurally valid zip, and a
// document.xml that Word refuses to open — the same signature as the C0 bug
// it was supposed to have fixed. A second copy of a rule is not defence in
// depth; it is the same defence twice, with the same gap.
//
// The docx library does not help: its escaper handles only & " < > '.

// Illegal in XML 1.0: C0 except tab/LF/CR, plus the two permanently
// unassigned noncharacters. (FDD0-FDEF and the other noncharacters ARE legal
// and are left intact.)
const ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

// A surrogate without its partner is not a character at all. Left in place it
// is silently replaced with U+FFFD somewhere downstream — a quiet alteration
// of text a veterinarian will paste into an authoritative rule set. Removed
// here so the loss is at least confined to the broken codepoint itself.
// Well-formed pairs (emoji and the like) are untouched.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function xmlSafeText(value) {
  return String(value == null ? '' : value)
    .replace(LONE_SURROGATE, '')
    .replace(ILLEGAL, '');
}

module.exports = { xmlSafeText };
