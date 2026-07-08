# Contributing to HackDekh

## Navigation

- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Architecture](docs/Architecture.md)
- [API](docs/API.md)

## Project Setup

HackDekh is a full-stack TypeScript repository with separate frontend and backend workspaces.

1. Install dependencies in both workspaces.
   - `cd backend && npm install`
   - `cd frontend && npm install`
2. Configure the backend environment variables before starting the server.
3. Run the backend and frontend in separate terminals.
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`
4. Verify both builds before opening a pull request.
   - `cd backend && npm run build`
   - `cd frontend && npm run build`

## Coding Standards

- Keep changes small, focused, and consistent with the existing codebase.
- Prefer explicit TypeScript types where the surrounding code already uses them.
- Match the current naming conventions for controllers, services, models, and routes.
- Avoid unrelated refactors in feature or bug-fix pull requests.
- Preserve the existing architecture unless a change has been discussed and approved.

## Branch Naming

Use short, descriptive branch names.

| Type | Example |
| --- | --- |
| Feature | `feature/team-stage-timeline` |
| Fix | `fix/tracker-build-cleanup` |
| Docs | `docs/contributing-guidelines` |
| Chore | `chore/dependency-refresh` |

## Commit Messages

Use concise, imperative commit messages.

Recommended format:

`type: short summary`

Examples:

- `fix: remove unused tracker imports`
- `docs: add API reference`
- `chore: update repository templates`

## Pull Request Checklist

- The change has a clear purpose and stays within scope.
- Local builds pass for the touched workspace.
- Documentation is updated when repository behavior or usage changes.
- No unrelated files are modified.
- Screenshots or logs are attached when they help explain the change.
- The PR description explains any trade-offs or follow-up work.

## Process Expectations

- Major features should be discussed with the core maintainers before implementation.
- This repository is primarily maintained by the core maintainers; outside contributions are welcome, but coordination is expected for larger changes.
- Opening an issue or discussion before coding is the best way to avoid duplicated work.
