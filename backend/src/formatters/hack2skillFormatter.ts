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

    const modeTag = h.tags?.mode?.value || "";
    const mode = modeTag === "VIRTUAL" ? "Online" : "Offline";

    // Build location
    let locationStr = mode === "Online" ? "Online" : "In Person";
    if (h.tags?.finale?.value) {
      locationStr = h.tags.finale.value === "IN_PERSON" ? "In Person" : "Online";
    }

    const tags = [h.flag || "COMMUNITY"];
    if (h.tags?.technology?.value && Array.isArray(h.tags.technology.value)) {
      tags.push(...h.tags.technology.value);
    }

    const applyLink = h.customEventUrl || `https://vision.hack2skill.com/event/${slug}`;

    return {
      title: h.title,
      startDate,
      slug,
      deadline,
      mode,
      platform: "Hack2Skill",
      applyLink,
      organization: "Hack2Skill",
      tags,
      prize: "Prizes (See Platform)",
      location: locationStr,
      coverImage: h.thumbnail || null,
      scrapedFromURL: "https://hack2skill.com/hackathons",
    };
  });
}
