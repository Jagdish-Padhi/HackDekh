const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export default function formatHack2Skill(rawData: any[]) {
  return rawData.map((h: any) => {
    const slug = h.eventUrl || h._id;
    
    let startDate: Date | null = null;
    let deadline: Date | null = null;
    if (h.registrationStart) {
      const parsedStart = new Date(h.registrationStart);
      if (!isNaN(parsedStart.getTime())) startDate = parsedStart;
    }
    if (h.registrationEnd) {
      const parsedEnd = new Date(h.registrationEnd);
      if (!isNaN(parsedEnd.getTime())) deadline = parsedEnd;
    }

    // --- Mode: check tags.mode.value ---
    const modeTag = h.tags?.mode?.value || "";
    const mode = modeTag === "VIRTUAL" ? "Online" : (modeTag === "HYBRID" ? "Hybrid" : "Offline");

    // --- Location: based on mode and finale ---
    let locationStr: string | null = null;
    if (mode === "Online") {
      locationStr = "Online";
    } else if (mode === "Hybrid") {
      // Hybrid events - indicate both online and in-person
      const finaleValue = h.tags?.finale?.value;
      if (finaleValue === "VIRTUAL") {
        locationStr = "Hybrid (Finale: Virtual)";
      } else if (finaleValue === "IN_PERSON") {
        locationStr = "Hybrid (Finale: In-Person)";
      } else {
        locationStr = "Hybrid";
      }
    } else {
      // Offline / In-person events
      const finaleValue = h.tags?.finale?.value;
      if (finaleValue === "VIRTUAL") {
        locationStr = "Online";
      } else {
        locationStr = null; // Will show as null, frontend can handle
      }
    }

    // --- Team Size: extract from tags.teamSize.min/max ---
    let teamSize: string | null = null;
    const minTeam = h.tags?.teamSize?.min;
    const maxTeam = h.tags?.teamSize?.max;
    if (typeof minTeam === "number" && typeof maxTeam === "number" && minTeam > 0 && maxTeam > 0) {
      teamSize = minTeam === maxTeam ? `${minTeam}` : `${minTeam}-${maxTeam}`;
    } else if (typeof maxTeam === "number" && maxTeam > 0) {
      teamSize = `1-${maxTeam}`;
    } else if (typeof minTeam === "number" && minTeam > 0) {
      teamSize = `${minTeam}+`;
    }

    // --- Tags ---
    const tags: string[] = [h.flag || "COMMUNITY"];
    if (h.tags?.technology?.value && Array.isArray(h.tags.technology.value)) {
      tags.push(...h.tags.technology.value.filter((t: any) => typeof t === "string" && t.trim().length > 0));
    }
    // Add ticket type as tag
    if (h.tags?.ticket?.value) {
      tags.push(h.tags.ticket.value);
    }

    // --- Prize: Hack2Skill list API doesn't include prize data ---
    // Return null and let frontend handle gracefully
    const prize: string | null = null;

    // --- Organization ---
    const organization = "Hack2Skill";

    const applyLink = h.customEventUrl || `https://hack2skill.com/event/${slug}`;

    return {
      title: h.title,
      startDate,
      slug,
      deadline,
      mode,
      platform: "Hack2Skill",
      applyLink,
      organization,
      tags,
      prize,
      location: locationStr,
      teamSize,
      coverImage: h.thumbnail || null,
      scrapedFromURL: "https://hack2skill.com/hackathons",
    };
  });
}
