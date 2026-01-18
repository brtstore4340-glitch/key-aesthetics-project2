# Core Flows (Checklist)

## CREATE_NEW_SYSTEM
- Requirements + constraints
- Architecture + data model + boundaries
- Trade-offs + NOT building list
- UI states (if UI)
- Skeleton structure
- Risks + mitigations
- Acceptance criteria + tests

## CREATE_NEW_MODULE
- Responsibility + boundaries
- Integration points
- Minimal implementation
- Blast radius
- Tests needed

## EDIT_MODULE
- Impact analysis + blast radius
- Minimal change
- Verify no side effects
- Regression checklist

## BUG_FIX
- Expected vs Actual
- Hypotheses ranked
- Debug plan (concrete logs/checks)
- Minimal fix
- Bug chain review
- Regression + perf/cost check
