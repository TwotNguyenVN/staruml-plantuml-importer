# PlantUML Importer Hardening Design

## Context

The repository is a StarUML extension that imports PlantUML into native StarUML
models and views. It is not an MCP server. The current code supports Use Case,
Class, Sequence, Activity, State, ER, Mindmap, and SysML Requirement diagrams.

The project has a useful mock-based regression suite, but the audit found a
broken Requirement containment operation, silent partial imports, privacy-risky
preview defaults, unsafe update command construction, missing input limits, and
thin CI and packaging controls.

## Goals

- Fix all High and Medium findings from the 2026-08-11 project audit.
- Preserve existing supported syntax and layout behavior unless it is known to
  be incorrect.
- Make Requirement parsing and rendering a reliable pattern for gradual parser
  modernization.
- Make privacy- and deletion-sensitive behavior safe by default.
- Establish repeatable CI, static checks, dependency auditing, and release
  verification.
- Support StarUML v7 and later consistently in metadata and documentation.

## Non-Goals

- Rewriting all eight parsers in one change.
- Adding an MCP server or MCP protocol surface.
- Redesigning existing diagram layout algorithms.
- Claiming live StarUML compatibility solely from mocked tests.
- Supporting StarUML v6 after this hardening release.

## Workstreams

### 1. Import Correctness

Requirement parsing will retain a pure AST boundary and return the documented
shape:

```text
requirements: [{ id, name, text, stereotype, kind, row, col }]
elements:     [{ id, name, type, docRef }]
relations:    [{ type, from, to, label }]
diagnostics:  [{ severity, line, message }]
```

Aliases may be retained as an internal field when needed for lookup, but public
fields must always be present. The parser will support labels after generic and
named relationship arrows. Duplicate aliases, unsupported non-empty lines, and
missing relation endpoints will produce diagnostics rather than being silently
discarded.

Requirement containment will execute as one repository operation. It will:

1. Remove the target model from its previous owner's `ownedElements`.
2. Insert the target model into the source requirement's `ownedElements`.
3. Create and insert the `UMLContainmentView`.
4. Insert the view into the diagram's `ownedViews`.
5. Commit the operation through `app.repository.doOperation`.

The import result will only be successful when at least one meaningful model is
created and no fatal diagnostic occurred. Recoverable syntax and reference
problems will be returned as warnings and displayed to the user. A transaction
failure will attempt rollback and must report whether rollback left residual
elements.

The same diagnostics/result contract will be introduced as a small shared
foundation for future parser migrations. The other seven parsers will not be
rewritten in this iteration; targeted silent-drop paths found by tests may use
the shared warning mechanism.

### 2. Privacy And Operational Safety

Preview will default to disabled, including when preferences are unavailable.
Enabling it requires an explicit Preferences action after the user sees that
the complete PlantUML source is sent to the configured rendering server. The
dialog will show the normalized destination while preview is enabled.

When preview is disabled, the extension must not encode source, build a remote
URL, or set a remote image source. Documentation will state that PlantUML URL
encoding is reversible and that GET URLs may be logged. Existing HTTPS
normalization remains, with localhost HTTP allowed.

A shared input guard will run before preview encoding and import parsing. Initial
limits will be constants covered by tests:

- 200,000 characters.
- 10,000 lines.
- 2,000 declared elements.
- 5,000 relationships.
- 50 levels of nesting where a parser tracks nesting.
- A maximum generated preview URL length of 16,384 characters.

Exceeded limits will produce a user-facing error before compression, network
access, or StarUML model mutation. The constants remain internal rather than
becoming preferences until real usage demonstrates a need for configurability.

The full StarUML removal operation will be removed from the interactive menu,
normal CLI action switch, README management instructions, and bundled clear
scripts. The supported clear operation removes only this extension. No hidden
or compatibility alias for destructive full removal will remain.

### 3. Update And Installation Safety

The updater will use `execFileSync(command, arguments, options)` without a shell.
Commands that inspect repository state will capture stdout. Commands intended
for user progress output may inherit stdio. The updater will:

1. Reject a dirty worktree.
2. Fetch without modifying the worktree.
3. Resolve the current branch and configured upstream.
4. Reject detached HEAD or an absent/invalid upstream with a clear error.
5. Verify the upstream remote matches the configured repository expectation.
6. Perform only a fast-forward merge.
7. Display the target revision before installing.
8. Install only after every update check succeeds.

Release-signature enforcement is deferred because the repository does not yet
publish a verified signed-release channel. The updater will not claim signature
verification. Documentation will recommend release artifacts for high-trust
managed deployments.

Installers must copy the same manifest of runtime files. Tests will compare the
Node installer, Windows script, and shell script file lists to prevent packaging
drift.

### 4. Quality And Packaging

Tests will be expanded without requiring a StarUML installation:

- Requirement AST contract, all relationships, labels, duplicates, unknown
  syntax, unresolved endpoints, operation commit, ownership, and rollback.
- Class and Mindmap parser smoke/integration coverage.
- A real assertion for Use Case overlap checks.
- Updater argument arrays and all safety branches.
- Preview opt-in, no-network disabled behavior, URL normalization, and input
  limits.
- Installer manifest parity.

GitHub Actions will run on Node 20 and Node 22 with `npm ci`, tests, static
checks, whitespace checks, and dependency audit. ESLint will use a minimal
configuration that understands Node and StarUML globals and focuses on
correctness rather than reformatting legacy code. A `package-lock.json` will
make CI and auditing reproducible.

Package metadata will include the MIT license and StarUML `>=7.0.0` engine
requirement. A root `LICENSE` file will match the README claim. English and
Vietnamese documentation will describe the new privacy default, safe clear
behavior, supported runtime, update guarantees, test commands, and release smoke
test.

## Error Model

Diagnostics have `warning` or `error` severity and include a source line when
available. Warnings indicate skipped or degraded input while preserving a valid
partial import. Errors prevent commit or trigger rollback. User dialogs summarize
counts and show bounded diagnostic details so very large input cannot create an
unusable alert.

Unexpected exceptions remain errors. They are logged for maintainers without
including the full PlantUML source, and users receive a concise message plus
rollback status.

## Testing And Release Gates

The implementation is complete only when:

- `npm test` passes all registered tests.
- `npm run check` passes syntax, ESLint, and repository policy checks.
- `npm audit` completes from the committed lockfile without unresolved High or
  Critical production vulnerabilities.
- Requirement containment tests prove operation commit and ownership changes.
- Tests prove disabled preview creates no remote request URL.
- GitHub Actions passes on Node 20 and Node 22.
- `git diff --check` reports no whitespace errors.
- English and Vietnamese documentation agree with runtime behavior.
- An independent JavaScript code review reports no unresolved High or Medium
  findings.
- A documented StarUML v7 smoke checklist covers install, each supported diagram
  type, privacy behavior, rollback, update, and extension-only removal.

Live StarUML smoke execution is evidence missing from this environment. The
release notes must state whether a maintainer completed that checklist before a
public release.

## Delivery Order

1. Add failing tests for Requirement correctness and diagnostics.
2. Fix Requirement parsing, containment, transaction results, and warnings.
3. Add privacy and input-limit tests, then implement safe preview behavior.
4. Add updater and installer tests, then harden management commands.
5. Close Class, Mindmap, and Use Case test gaps.
6. Add lint, lockfile, CI, license, metadata, and release documentation.
7. Run full verification and independent reviews.

This order keeps behavioral fixes test-first and isolates high-risk repository
and privacy changes from parser changes.
