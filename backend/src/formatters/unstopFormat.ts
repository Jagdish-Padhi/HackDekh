export default function formatUnstop(rawData: any) {
  const formatedData = rawData.map((h: any) => {
    const publicUrl = h.public_url || '';
    let applyLink = '';
    if (publicUrl.startsWith('http')) {
      applyLink = publicUrl;
    } else if (publicUrl) {
      applyLink = `https://unstop.com/${publicUrl.replace(/^\//, '')}`;
    } else if (h.slug) {
      applyLink = `https://unstop.com/${h.slug.replace(/^\//, '')}`;
    }
    return {
      title: h.title,
      startDate: h.start_date,
      slug: publicUrl,
      deadline: h.regnRequirements?.end_regn_dt || h.end_date || null,
      mode: h.is_online ? "Online" : "Offline",
      platform: "Unstop",
      applyLink,
      organization: h.organization?.name || h.organisation?.name || "Unknown",
      tags: h.filters ? h.filters.map((f: any) => f.name) : [],
      // Try thumb, logoUrl2, logoUrl as possible cover images
      coverImage: h.thumb || h.logoUrl2 || h.logoUrl || h.organisation?.logoUrl2 || h.organisation?.logoUrl || null,
      scrappedFromURL: "https://unstop.com/hackathons",
    };
  });
  return formatedData;
}
