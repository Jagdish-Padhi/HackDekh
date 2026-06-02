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

    // Build location — thoroughly check all possible fields
    let locationStr = h.location || "";
    if (!locationStr && h.venueAddress) {
      const city = h.venueAddress.city || "";
      const state = h.venueAddress.state || "";
      const country = h.venueAddress.country || "";
      locationStr = [city, state, country].filter(Boolean).join(", ");
    }
    // Also try venue name
    if (!locationStr && h.venue) {
      locationStr = typeof h.venue === "string" ? h.venue.trim() : "";
    }
    // If digital/online mode, set explicitly
    if (!locationStr && mode === "Online") {
      locationStr = "Online";
    }

    // --- Tags: collect all available metadata ---
    const tags: string[] = ["MLH Season"];
    if (h.formatType) tags.push(h.formatType);
    if (h.region) tags.push(h.region);
    if (Array.isArray(h.themes)) {
      for (const t of h.themes) {
        const name = typeof t === "string" ? t.trim() : t?.name?.trim();
        if (name && !tags.includes(name)) tags.push(name);
      }
    }
    if (Array.isArray(h.tags)) {
      for (const t of h.tags) {
        const name = typeof t === "string" ? t.trim() : t?.name?.trim();
        if (name && !tags.includes(name)) tags.push(name);
      }
    }

    // --- Prize: try to extract real prize data instead of hardcoding ---
    let prize: string | null = null;
    if (h.prizeAmount && typeof h.prizeAmount === "number" && h.prizeAmount > 0) {
      prize = `$${h.prizeAmount.toLocaleString("en-US")}`;
    } else if (h.prize && typeof h.prize === "string" && h.prize.trim().length > 0) {
      prize = h.prize.trim();
    } else if (h.prizes && typeof h.prizes === "string" && h.prizes.trim().length > 0) {
      prize = h.prizes.trim();
    } else if (Array.isArray(h.prizes) && h.prizes.length > 0) {
      // Sum up prize amounts if it's an array of prize objects
      let total = 0;
      for (const p of h.prizes) {
        if (typeof p?.amount === "number" && p.amount > 0) total += p.amount;
        else if (typeof p?.value === "number" && p.value > 0) total += p.value;
      }
      if (total > 0) {
        prize = `$${total.toLocaleString("en-US")}`;
      }
    }
    // MLH events almost always have prizes/swag even if not listed in the data
    if (!prize) {
      prize = null; // Let the frontend handle null gracefully instead of showing a misleading placeholder
    }

    // --- Team Size ---
    let teamSize: string | null = null;
    if (h.minTeamSize && h.maxTeamSize) {
      teamSize = h.minTeamSize === h.maxTeamSize ? `${h.minTeamSize}` : `${h.minTeamSize}-${h.maxTeamSize}`;
    } else if (h.teamSize) {
      teamSize = typeof h.teamSize === "number" ? `${h.teamSize}` : h.teamSize;
    }

    // --- Organization ---
    const organization = h.organizer?.name || h.organizerName || "Major League Hacking";

    // --- Description ---
    const description = h.description || h.tagline || null;

    return {
      title: h.name,
      startDate,
      slug,
      deadline,
      mode,
      platform: "MLH",
      applyLink: h.websiteUrl || `https://mlh.io/events/${slug}`,
      organization,
      tags,
      prize,
      location: locationStr || null,
      teamSize,
      description,
      coverImage: h.backgroundUrl || h.logoUrl || null,
      scrapedFromURL: "https://mlh.io/seasons/2026/events",
    };
  });
}
