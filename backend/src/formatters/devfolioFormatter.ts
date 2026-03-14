const normalizeText = (value: unknown): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};

const formatCurrency = (amount: unknown): string | null => {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return null;
    }

    return `Rs ${amount.toLocaleString("en-IN")}`;
};

const extractAmountFromValue = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value;
    }

    if (typeof value !== "string") {
        return 0;
    }

    const matches = value.match(/\d[\d,]{2,}(?:\.\d+)?/g);
    if (!matches?.length) {
        return 0;
    }

    return matches.reduce((sum, match) => {
        const amount = Number(match.replace(/,/g, ""));
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
};

const sanitizePrizeText = (value: unknown): string | null => {
    const text = normalizeText(value);
    if (!text) {
        return null;
    }

    const cleaned = text
        .replace(/^\s*(?:total\s+)?prize\s*pool\s*[:\-–]?\s*/i, "")
        .replace(/^\s*prizes?\s*[:\-–]?\s*/i, "")
        .trim();

    return cleaned.length ? cleaned : null;
};

const extractDevfolioPrize = (settings: any): string | null => {
    const rawPrize = settings?.prize_pool ?? settings?.prize ?? settings?.prizes ?? null;

    const directAmount = extractAmountFromValue(rawPrize);
    const formattedDirectAmount = formatCurrency(directAmount);
    if (formattedDirectAmount) {
        return formattedDirectAmount;
    }

    const textPrize = sanitizePrizeText(rawPrize);
    if (textPrize) {
        return textPrize;
    }

    if (Array.isArray(rawPrize)) {
        const totalAmount = rawPrize.reduce((sum: number, item: any) => {
            return (
                sum +
                extractAmountFromValue(item?.cash) +
                extractAmountFromValue(item?.amount) +
                extractAmountFromValue(item?.value) +
                extractAmountFromValue(item?.title) +
                extractAmountFromValue(item?.label)
            );
        }, 0);

        const formattedTotalAmount = formatCurrency(totalAmount);
        if (formattedTotalAmount) {
            return formattedTotalAmount;
        }
    }

    return null;
};

const extractDevfolioLocation = (h: any): string | null => {
    const settings = h?.settings ?? {};

    const directLocation = normalizeText(settings?.location) || normalizeText(h?.location);
    if (directLocation) {
        return directLocation;
    }

    const city = normalizeText(settings?.city) || normalizeText(h?.city);
    const country = normalizeText(settings?.country) || normalizeText(h?.country);
    const composed = [city, country].filter(Boolean).join(", ");

    return composed || null;
};

export default function formatDevfolio(rawData: any) {
    const formatedData = rawData.map((h: any) => ({
        title: h.name,
        startDate: h.starts_at,
        slug: h.slug,
        deadline: h.settings?.reg_ends_at ?? null,
        mode: h.is_online ? "Online" : "Offline",
        platform: "Devfolio",
        applyLink: `https://${h.slug}.devfolio.co/overview`,
        organization: h.settings?.organization_name ?? null,
        tags: h.settings?.themes ?? [],
        prize: extractDevfolioPrize(h.settings),
        location: extractDevfolioLocation(h),
        // Use featured_cover_img_v2, then featured_cover_img, then fallback to other fields
        coverImage: h.settings?.featured_cover_img_v2 || h.settings?.featured_cover_img || h.settings?.cover_img || h.settings?.og_img || h.logo || h.settings?.logo || null,
        scrapedFromURL: "https://devfolio.co/hackathons"
    }));
    return formatedData;
}