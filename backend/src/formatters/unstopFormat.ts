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

const sanitizeLocationText = (value: unknown): string | null => {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned.length) {
    return null;
  }

  if (/^(?:tbd|na|n\/a|null|undefined|not\s*(?:disclosed|mentioned)|city|all)$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
};

const normalizeCountryName = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return sanitizeLocationText(value);
  }

  if (typeof value === "object") {
    const objectValue = value as any;
    return (
      sanitizeLocationText(objectValue?.name) ||
      sanitizeLocationText(objectValue?.country_name) ||
      null
    );
  }

  return null;
};

const composeLocationParts = (parts: Array<string | null | undefined>): string | null => {
  const output: string[] = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    const normalized = part.trim();
    if (!normalized.length) {
      continue;
    }

    if (output.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      continue;
    }

    output.push(normalized);
  }

  return output.length ? output.join(", ") : null;
};

const extractLocationFromAddressObject = (value: unknown): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const addressObject = value as any;
  const city = sanitizeLocationText(addressObject?.city);
  const state = sanitizeLocationText(addressObject?.state);
  const country = normalizeCountryName(addressObject?.country);
  const address = sanitizeLocationText(addressObject?.address);

  const cityStateCountry = composeLocationParts([city, state, country]);
  if (cityStateCountry) {
    return cityStateCountry;
  }

  return composeLocationParts([address, city, state, country]);
};

const extractLocationFromLocationsArray = (locations: unknown): string | null => {
  if (!Array.isArray(locations) || !locations.length) {
    return null;
  }

  for (const item of locations) {
    if (typeof item === "string") {
      const direct = sanitizeLocationText(item);
      if (direct) {
        return direct;
      }

      continue;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const objectItem = item as any;
    const composed = composeLocationParts([
      sanitizeLocationText(objectItem?.city),
      sanitizeLocationText(objectItem?.state),
      normalizeCountryName(objectItem?.country),
      sanitizeLocationText(objectItem?.name),
      sanitizeLocationText(objectItem?.location),
      sanitizeLocationText(objectItem?.address),
    ]);

    if (composed) {
      return composed;
    }
  }

  return null;
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
  const addressLocation = extractLocationFromAddressObject(h?.address_with_country_logo);
  if (addressLocation) {
    return addressLocation;
  }

  const locationsArrayLocation = extractLocationFromLocationsArray(h?.locations);
  if (locationsArrayLocation) {
    return locationsArrayLocation;
  }

  const explicitLocation =
    sanitizeLocationText(h?.location) ||
    sanitizeLocationText(h?.venue) ||
    sanitizeLocationText(h?.address);

  if (explicitLocation) {
    return explicitLocation;
  }

  const city =
    sanitizeLocationText(h?.city) ||
    sanitizeLocationText(h?.organization?.city) ||
    sanitizeLocationText(h?.organisation?.city);
  const state =
    sanitizeLocationText(h?.state) ||
    sanitizeLocationText(h?.organization?.state) ||
    sanitizeLocationText(h?.organisation?.state);
  const country =
    normalizeCountryName(h?.country) ||
    normalizeCountryName(h?.organization?.country) ||
    normalizeCountryName(h?.organisation?.country);
  const composed = composeLocationParts([city, state, country]);

  if (composed) {
    return composed;
  }

  const region = sanitizeLocationText(h?.region);
  if (region) {
    if (/^online$/i.test(region)) {
      return "Online";
    }

    if (!/^offline$/i.test(region)) {
      return region.charAt(0).toUpperCase() + region.slice(1);
    }
  }

  const workLocationType = sanitizeLocationText(h?.regnRequirements?.work_location_type);
  if (workLocationType && /^(?:remote|online|virtual|wfh)$/i.test(workLocationType)) {
    return "Online";
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
