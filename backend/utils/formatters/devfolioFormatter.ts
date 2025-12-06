export default function formatDevfolio(rawData: any) {
    const formatedData = rawData.map( h => ({
        title: h.name,
        startDate: h.starts_at,
        slug: h.slug,
        deadline: h.settings?.reg_ends_at ?? null,
        mode:h.is_online?"Online": "Offline",
        platform: "Devfolio",
        applyLink:`https://devfolio.co/hackathons/${h.slug}`,
        organization: h.settings?.organization_name?? null,
        tags: h.settings?.themes ?? [],
        coverImage: h.settings?.featured_cover_img_v2 ?? null,
        scrappedFromURL: "https://devfolio.co/hackathons"

    }))
    return formatedData;
}
