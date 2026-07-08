# Scraper System

## Navigation

- [Architecture](Architecture.md)
- [API](API.md)
- [Database](Database.md)
- [Deployment](Deployment.md)

## Overview

HackDekh uses a modular scraper system to normalize hackathon listings from supported external sources and store them in MongoDB.

## Supported Sources

| Source | Notes |
| --- | --- |
| Devfolio | Supported scraper and manual trigger route |
| Unstop | Supported scraper and manual trigger route |
| Devpost | Supported scraper and manual trigger route |
| MLH | Supported scraper and manual trigger route |
| Hack2Skill | Supported scraper and manual trigger route |

## Refresh Flow

1. A scraper fetches source-specific listings.
2. The scraper normalizes the data into the hackathon schema.
3. Existing records are deduplicated using the model-level uniqueness constraints.
4. The nightly cron job refreshes the full set at 3:00 AM.

## Trigger Paths

| Trigger | Purpose |
| --- | --- |
| Individual scrape route | Run one source scraper on demand |
| `/api/v1/scrape/refresh` | Run all scrapers sequentially |
| `/api/v1/scrape/cron/trigger` | Protected manual trigger for the scheduled refresh path |
| Internal cron scheduler | Automatic nightly refresh |

## Maintenance Notes

- Keep each scraper isolated so failures in one source do not block the others.
- Preserve the normalized hackathon shape used by the API and frontend.
- When a new source is added, document it here and in the API reference.
