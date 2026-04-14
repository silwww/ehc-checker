# Rule Set Update — Quick Reference

How to apply a new version of an existing rule set (e.g. dairy-uk-eu v1.9, v2.0, etc.).
For content-only updates: new library entries, calibration notes, version bumps.
For structural changes (new sections, new severities, new fields), open a separate planning chat first.

---

## Prerequisites (one-time setup, already done)

- Homebrew installed
- pandoc installed (`brew install pandoc`)
- Repo cloned at `~/projects/ehc-checker-app`
- Claude Code installed and authenticated

---

## Steps for each new version

Replace `X.Y` with the new version number throughout (e.g. `1.9`, `2.0`).
Replace `OLD` with the previous version (e.g. `1.8`).

### 1. Save the new `.docx` somewhere on your Mac

Get `EHC_Rule_Set_and_Brief_vX_Y.docx` from Dr. Cunningham (email, shared folder, etc.).
Note the exact path. Spaces in the filename are fine — we handle them with quotes.

### 2. Open Terminal and navigate to the repo

```
cd ~/projects/ehc-checker-app
pwd
```

You should see `/Users/sorina/projects/ehc-checker-app`.

### 3. Create the source folder for the new version (if needed) and copy the file

The `source/` folder already exists from v1.8. Copy the new `.docx` into it with the standardised name:

```
cp "/full/path/to/EHC Rule Set and Brief vX Y.docx" rules/dairy-uk-eu/source/EHC_Rule_Set_and_Brief_vX_Y.docx
```

Verify it landed:

```
ls -la rules/dairy-uk-eu/source/
```

You should see the new `.docx` next to the previous version(s).

### 4. Open a chat with Claude (this Project) and say:

> "Am vX.Y a rule set-ului dairy-uk-eu. E în repo la `rules/dairy-uk-eu/source/EHC_Rule_Set_and_Brief_vX_Y.docx`. Generează promptul pentru Claude Code."

Claude will:
- Read the new `.docx` from project knowledge to confirm what changed
- Tell you the expected diff (new entries, version history row, F6 paragraph)
- Give you a single Claude Code prompt customised for vOLD → vX.Y

### 5. Paste the prompt into Claude Code

Start Claude Code from inside the repo:

```
claude
```

Paste the prompt. Approve permissions with `y` when asked.

The prompt will:
- Run pandoc to convert the new `.docx` to markdown
- Diff against the current `rule_set.md` and show you the changes
- Stop if anything unexpected appears (structural changes outside the expected additions)
- Overwrite `rule_set.md` if the diff matches expectations
- Update `rules/_registry.json` (version + versionDate)
- Fix the hardcoded version pill in `public/index.html`
- Fix any stale version references in `README.md`
- Run a smoke test (`node -e ...`) to confirm the registry loads
- Stage and commit with a clear message
- NOT push (you push manually after verifying)

### 6. Exit Claude Code

Type `/exit` or press `Ctrl+D`.

### 7. Test locally with the Express dev server npm run dev

Open `http://localhost:3000` in the browser.
Hard reload with `Cmd+Shift+R`.

Verify three things:
1. **Header pill** shows `Rule Set vX.Y — April 2026` (or whatever date)
2. **Upload a test PDF** and run a check — should return HTTP 200
3. **Footer of the report** shows `Rule Set X.Y — YYYY-MM-DD`

Stop the dev server with `Ctrl+C` when done.

### 8. Push to GitHub

```
git status
git log --oneline origin/main..HEAD
git push
```

`git status` should say `working tree clean`.
`git log` should show your new commit at the top.
`git push` syncs main to GitHub.

---

## Useful Terminal commands (memory aid)

| Command | What it does |
|---|---|
| `pwd` | Print working directory — where am I? |
| `ls -la` | List files (long format, including hidden) |
| `cd <folder>` | Change directory |
| `cd ..` | Go up one level |
| `cd ~` or `cd` | Go to home directory |
| `cd ~/projects/ehc-checker-app` | Jump straight to the repo |
| `Ctrl+C` | Cancel current command / exit interactive prompt |
| `Ctrl+U` | Clear current line (if you mistyped) |
| `Tab` | Autocomplete file/folder names |
| `clear` or `Cmd+K` | Clear the Terminal screen |

---

## If something goes wrong

| Symptom | What to do |
|---|---|
| Stuck in `quote>` prompt | Press `Ctrl+C` |
| Stuck inside `npm run dev` or `claude` | Press `Ctrl+C` |
| Pandoc not found | `brew install pandoc` |
| Diff in step 5 shows unexpected structural changes | STOP. Open a chat with Claude and paste the diff. Don't overwrite. |
| Smoke test fails in step 5 | STOP. Don't commit. Open a chat with Claude with the error. |
| `git push` rejected with `non-fast-forward` | STOP. Don't force push. Open a chat with Claude. |
| Browser still shows old version after deploy | `Cmd+Shift+R` for hard reload, or open Incognito |

---

## Files this process touches

- `rules/dairy-uk-eu/source/EHC_Rule_Set_and_Brief_vX_Y.docx` (new)
- `rules/dairy-uk-eu/rule_set.md` (overwritten)
- `rules/_registry.json` (version + versionDate updated)
- `public/index.html` (header pill + footer fallback)
- `README.md` (any stale version references)

That's it. Five files per release. No engine code changes for content-only updates.

---

## Files this process does NOT touch

- `server/server.js` — Express HTTP layer
- `src/check.js` — business logic (ENGINE_PROMPT, TOOL_DEFINITION, runCheck)
- `rules/_schema.json` — rule set schema
- `rules/_shared/libraries/*.json` — shared libraries (OVs, BCPs, consignees, logistics)
- `rules/dairy-uk-eu/libraries/*.json` — dairy-specific establishments library
- `package.json`, `package-lock.json` — dependencies
- Anything under `node_modules/`, `.git/`

If a Claude Code prompt tries to touch any of these, STOP and ask.

---

## When to use a different process

This quick reference is for **content-only version bumps** of an **existing** rule set.

For other situations, open a fresh planning chat with Claude:

| Situation | Why a fresh chat |
|---|---|
| New commodity (meat, fish, honey, composite) | Need to create `/rules/<commodity>-uk-eu/` folder structure and register in `_registry.json` |
| New severity level or report field | Touches engine code and report rendering |
| New library type (e.g. transport routes) | May need schema changes and admin panel updates |
| Migration from current Express dev setup to handover server | Separate deployment planning |
| Adding rule set for non-EU export | Detection logic and consignee/destination libraries differ |

---

*Last updated: 2026-04-14. Reflects the Express-based workflow after migration from Netlify Functions (commits 03afed1 and 58e98ba). Tested for dairy-uk-eu v2.0 → v2.1.*
