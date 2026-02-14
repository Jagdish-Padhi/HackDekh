export default function formatDevfolio(rawData: any) {
    const formatedData = rawData.map((h: any) => ({
        title: h.name,
        startDate: h.starts_at,
        slug: h.slug,
        deadline: h.settings?.reg_ends_at ?? null,
        mode: h.is_online ? "Online" : "Offline",
        platform: "Devfolio",
        applyLink: `https://devfolio.co/hackathons/${h.slug}`,
        organization: h.settings?.organization_name ?? null,
        tags: h.settings?.themes ?? [],
        // Use featured_cover_img_v2, then featured_cover_img, then fallback to other fields
        coverImage: h.settings?.featured_cover_img_v2 || h.settings?.featured_cover_img || h.settings?.cover_img || h.settings?.og_img || h.logo || h.settings?.logo || null,
        scrappedFromURL: "https://devfolio.co/hackathons"
    }));
    return formatedData;
}