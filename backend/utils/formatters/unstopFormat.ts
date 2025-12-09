export default function formatUnstop(rawData: any) {
  const formatedData = rawData.map((h: any) => ({
    title: h.title,
    startDate: h.start_date,
    slug: h.public_url,
    deadline: h.regnRequirements?.end_regn_dt || h.end_date || null,
    mode: h.is_online ? "Online" : "Offline",
    platform: "Unstop",
    applyLink: `https://unstop.com/${h.slug}`,
    organization: h.organization?.name || "Unknown",
    tags: h.filters ? h.filters.map((f: any) => f.name) : [],
    coverImage: h.banner_mobile?.url || h.banner_desktop?.url || null,
    scrappedFromURL: "https://unstop.com/hackathons",
  }));
  return formatedData;
}
