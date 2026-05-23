export default function formatDevpost(rawData: any[]) {
  return rawData.map((h: any) => {
    // Extract slug from url
    let slug = "";
    if (h.url) {
      slug = h.url
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .replace(/\.devpost\.com$/, "")
        .replace(/devpost\.com\/challenges\//, "")
        .trim();
    }
    if (!slug) {
      slug = `devpost-${h.id}`;
    }

    // Parse dates from "May 05 - Jun 11, 2026"
    let startDate: Date | null = null;
    let deadline: Date | null = null;
    if (h.submission_period_dates) {
      const parts = h.submission_period_dates.split(" - ");
      if (parts.length === 2) {
        const startStr = parts[0].trim();
        const endStr = parts[1].trim();
        const yearMatch = endStr.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
        
        const parsedStart = new Date(`${startStr}, ${year}`);
        const parsedEnd = new Date(endStr);

        if (!isNaN(parsedStart.getTime())) startDate = parsedStart;
        if (!isNaN(parsedEnd.getTime())) deadline = parsedEnd;
      } else {
        const parsedDate = new Date(h.submission_period_dates);
        if (!isNaN(parsedDate.getTime())) {
          deadline = parsedDate;
        }
      }
    }

    // Determine Mode
    const locationStr = h.displayed_location?.location || "";
    const mode = locationStr.toLowerCase() === "online" ? "Online" : "Offline";

    // Clean prize amount from HTML tags (e.g. "$<span data-currency-value>60,000</span>")
    let prize = null;
    if (h.prize_amount) {
      prize = h.prize_amount.replace(/<[^>]*>/g, "").trim();
    }

    return {
      title: h.title,
      startDate,
      slug,
      deadline,
      mode,
      platform: "Devpost",
      applyLink: h.url || `https://devpost.com/challenges/${slug}`,
      organization: h.organization_name || "Unknown",
      tags: Array.isArray(h.themes) ? h.themes.map((t: any) => t.name) : [],
      prize,
      location: locationStr || null,
      coverImage: h.thumbnail_url ? (h.thumbnail_url.startsWith("http") ? h.thumbnail_url : `https:${h.thumbnail_url}`) : null,
      scrapedFromURL: "https://devpost.com/hackathons",
    };
  });
}
