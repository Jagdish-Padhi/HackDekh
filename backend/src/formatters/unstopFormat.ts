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

const extractUnstopPrize = (h: any): string | null => {
  if (Array.isArray(h?.prizes) && h.prizes.length > 0) {
    const totalCash = h.prizes.reduce((sum: number, prize: any) => {
      return (
        sum +
        extractAmountFromValue(prize?.cash) +
        extractAmountFromValue(prize?.amount) +
        extractAmountFromValue(prize?.others)
      );
    }, 0);

    const totalPrize = formatCurrency(totalCash);
    if (totalPrize) {
      return totalPrize;
    }
  }

  const directPrizeAmount = extractAmountFromValue(h?.prize);
  const formattedDirectPrize = formatCurrency(directPrizeAmount);
  if (formattedDirectPrize) {
    return formattedDirectPrize;
  }

  const directPrize = sanitizePrizeText(h?.prize);
  if (directPrize) {
    return directPrize;
  }

  return null;
};

const extractUnstopLocation = (h: any): string | null => {
  const explicitLocation =
    normalizeText(h?.location) ||
    normalizeText(h?.venue) ||
    normalizeText(h?.address);

  if (explicitLocation) {
    return explicitLocation;
  }

  const city = normalizeText(h?.city) || normalizeText(h?.organization?.city) || normalizeText(h?.organisation?.city);
  const country = normalizeText(h?.country) || normalizeText(h?.organization?.country) || normalizeText(h?.organisation?.country);
  const composed = [city, country].filter(Boolean).join(", ");

  if (composed) {
    return composed;
  }

  const region = normalizeText(h?.region);
  if (region) {
    return region.charAt(0).toUpperCase() + region.slice(1);
  }

  return null;
};

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
      prize: extractUnstopPrize(h),
      location: extractUnstopLocation(h),
      // Try thumb, logoUrl2, logoUrl as possible cover images
      coverImage: h.thumb || h.logoUrl2 || h.logoUrl || h.organisation?.logoUrl2 || h.organisation?.logoUrl || null,
      scrapedFromURL: "https://unstop.com/hackathons",
    };
  });
  return formatedData;
}
