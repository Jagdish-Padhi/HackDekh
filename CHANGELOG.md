# Changelog

All notable changes to this project will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Repository governance and maintenance docs: CONTRIBUTING, SECURITY, LICENSE, GitHub issue and PR templates, and reference docs for architecture, API, database, deployment, and the scraper system.

### Changed

- Current main-line work after `v2.0.0` includes the latest dashboard, login, GitHub callback, scraper utility, hackathon list, and team workflow refinements merged in pull request #16.

### Fixed

- None.

### Removed

- None.

## [2.0.0] - 2026-06-16

### Added

- Team collaboration workspace with team creation, membership management, invitations, and join-code flows.
- Team-hackathon lifecycle tracking with status updates, stage progression, reflection handling, and untrack safeguards.
- GitHub OAuth login and callback handling alongside the existing authentication flow.
- Settings screens for account, security, appearance, and team management.
- A tracker workspace that organizes hackathon participation into a dedicated timeline view.
- Scraper hardening with retries, user-agent rotation, isolated execution, and better refresh orchestration.
- Frontend polish across loaders, tabs, cards, toasts, dropdowns, dark mode, and sidebar behavior.
- Backend and frontend refinements that stabilized the hackathon listing, dashboard, and invitation flows.

## [1.1] - 2026-04-07

### Added

- Public hackathon listing experience backed by the core backend API.
- Hackathon detail pages, filtering, sorting, and bookmark / tracker entry points.
- Authentication, protected routes, dashboard shell, bookmarks, and application tracking.
- Initial team management APIs and invitation workflows.
- Expanded scraper coverage for the supported hackathon sources.
- Early UI and navigation refinements for the main product shell.

### Fixed

- Layout, loading, and navigation issues that affected the initial listing and team flows.

## [1.0.1] - 2026-02-15

### Added

- Scheduled cron-based refresh for the scraper pipeline.

### Changed

- Early MVP cleanup and landing page structure updates.

## [1.0.0] - 2026-02-14

### Added

- Initial MVP with two scrapers and a stable hackathon aggregation pipeline.
- Baseline MongoDB-backed storage and server-side API foundation.
