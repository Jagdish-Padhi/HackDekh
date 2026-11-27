import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { sendScraperHealthAlert } from "../../src/infrastructure/notifications/alert.service.ts";

describe("Scraper Health Alerting", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("sends webhook alert when a scraper returns 0 items or fails", async () => {
    process.env.SCRAPER_ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({ status: 204 } as any);

    await sendScraperHealthAlert({
      total: 5,
      successful: 4,
      failed: 1,
      results: [
        { name: "Devfolio", status: "success", count: 25 },
        { name: "Unstop", status: "success", count: 0 },
        { name: "Devpost", status: "failed", count: 0, error: "Timeout" },
        { name: "MLH", status: "success", count: 12 },
        { name: "Hack2Skill", status: "success", count: 8 },
      ],
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, payload] = postSpy.mock.calls[0] as [string, { content: string }];
    expect(url).toBe("https://discord.com/api/webhooks/123/abc");
    expect(payload.content).toContain("Unstop");
    expect(payload.content).toContain("Devpost");
  });

  it("does not send alert when all scrapers return > 0 items", async () => {
    process.env.SCRAPER_ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({ status: 204 } as any);

    await sendScraperHealthAlert({
      total: 5,
      successful: 5,
      failed: 0,
      results: [
        { name: "Devfolio", status: "success", count: 10 },
        { name: "Unstop", status: "success", count: 10 },
        { name: "Devpost", status: "success", count: 10 },
        { name: "MLH", status: "success", count: 10 },
        { name: "Hack2Skill", status: "success", count: 10 },
      ],
    });

    expect(postSpy).not.toHaveBeenCalled();
  });
});
