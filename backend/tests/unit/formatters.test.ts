import { describe, it, expect } from "vitest";
import { universalFormatter } from "../../src/formatters/universalFormatter.ts";

describe("Scraper Universal Formatter Unit Tests", () => {
  it("should correctly format Devfolio raw data batch", () => {
    const mockDevfolioBatch = [
      {
        name: "Devfolio Hackathon 2026",
        slug: "devfolio-2026",
        starts_at: "2026-09-01T00:00:00Z",
        ends_at: "2026-09-03T00:00:00Z",
        is_online: true,
        desc: "Awesome Devfolio Event",
        cover_img: "https://devfolio.co/cover.png",
      },
    ];

    const result = universalFormatter(mockDevfolioBatch, "devfolio");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Devfolio Hackathon 2026");
    expect(result[0].platform).toBe("Devfolio");
    expect(result[0].mode).toBe("Online");
  });

  it("should throw an error for unsupported platforms", () => {
    expect(() => universalFormatter([], "unknown_platform")).toThrow();
  });
});
