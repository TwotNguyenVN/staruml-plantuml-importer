# StarUML v7 Release Smoke Test

Run this checklist against the packaged release on each supported operating system before publishing.
Record the StarUML version, operating system, release revision, and result for every run.

**Current status (2026-08-12): source and package version `2.3.0` are unreleased; the latest published
tag is `v2.2.0`. StarUML is available only on Windows in this environment, and this checklist has not
been executed; live behavior remains unverified. A maintainer must record run evidence before release.**

## Environment

- [ ] Windows with StarUML v7+
- [ ] macOS with StarUML v7+
- [ ] Linux with StarUML v7+

## Installation And Reload

- [ ] Install with the operating-system script and confirm only the
  `twot.staruml-plantuml-importer` extension directory is created or replaced.
- [ ] Restart StarUML or press `Ctrl/Cmd + R`; confirm **Tools > PlantUML Importer...** appears and
  `Ctrl/Cmd + I` opens and closes the importer.

## Diagram Imports

For each row, create the matching StarUML diagram, import a representative fixture from `test/`, and
confirm native model elements and relationships are created.

- [ ] Use Case Diagram
- [ ] Class Diagram
- [ ] Sequence Diagram
- [ ] Activity Diagram
- [ ] State Diagram, recording any known unstable placement behavior
- [ ] ER Diagram
- [ ] Mindmap Diagram
- [ ] Requirement Diagram
- [ ] Open one diagram type and paste another type's source; confirm a mismatch warning appears and no
  model elements are created.

## Preview And Input Safety

- [ ] With **Enable Preview** off, type valid PlantUML and confirm the disabled message appears and no
  HTTP request is made.
- [ ] Opt in to preview, set the intended public or private PlantUML server destination, and confirm the
  preview request goes only to that destination.
- [ ] Confirm preview source is reversibly encoded in the GET URL and review the destination/proxy logs
  for the documented source-disclosure risk.
- [ ] Submit invalid input and input over each documented limit; confirm import is rejected without model
  changes or a preview request.

## Failure And Management Safety

- [ ] Force a parser/model creation failure after an element is created; confirm rollback removes changes
  from that import and reports any rollback failure.
- [ ] From a clean checkout with the expected upstream, run `node manage.js update`; confirm the target
  revision is shown and only a fast-forward update is accepted before reinstalling.
- [ ] Repeat update with a dirty worktree, detached HEAD, missing upstream, unexpected remote, and
  non-fast-forward history; confirm each case aborts without reinstalling.
- [ ] Run extension clear on Windows, macOS, and Linux; confirm only
  `twot.staruml-plantuml-importer` is removed and StarUML, settings, and other extensions remain intact.
- [ ] Replace the extension directory with a symbolic link, junction, or reparse point in an isolated test
  profile; confirm install/clear refuses recursive deletion and leaves the linked destination intact.
- [ ] Point an isolated management test at a canonically resolved path outside the exact StarUML
  `extensions/user` root; confirm deletion is refused.

## CI And Audit Evidence

- [ ] Confirm CI passed on Node.js 20 and 22 with `npm ci`, `npm run check`, `npm run coverage`, pull-request
  and merge-aware push whitespace gates, full `npm audit`, and production `npm audit --omit=dev
  --audit-level=high`.
