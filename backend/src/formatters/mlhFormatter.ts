export default function formatMLH(rawData: any[]) {
  return rawData.map((h: any) => {
    const slug = h.slug || `mlh-${h.id}`;
    
    let startDate: Date | null = null;
    let deadline: Date | null = null;
    if (h.startsAt) {
      const parsedStart = new Date(h.startsAt);
      if (!isNaN(parsedStart.getTime())) startDate = parsedStart;
    }
    if (h.endsAt) {
      const parsedEnd = new Date(h.endsAt);
      if (!isNaN(parsedEnd.getTime())) deadline = parsedEnd;
    }

    const formatType = (h.formatType || "").toLowerCase();
    const mode = formatType === "physical" ? "Offline" : "Online";

    // Build location
    let locationStr = h.location || "";
    if (!locationStr && h.venueAddress) {
      const city = h.venueAddress.city || "";
      const state = h.venueAddress.state || "";
      const country = h.venueAddress.country || "";
      locationStr = [city, state, country].filter(Boolean).join(", ");
    }

    const tags = ["MLH Season"];
    if (h.formatType) tags.push(h.formatType);
    if (h.region) tags.push(h.region);

    return {
      title: h.name,
      startDate,
      slug,
      deadline,
      mode,
      platform: "MLH",
      applyLink: h.websiteUrl || `https://mlh.io/events/${slug}`,
      organization: "Major League Hacking",
      tags,
      prize: "Prizes & Swag (TBD)",
      location: locationStr || null,
      coverImage: h.backgroundUrl || h.logoUrl || null,
      scrapedFromURL: "https://mlh.io/seasons/2026/events",
    };
  });
}
