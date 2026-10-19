export const hackathonListCacheKey = (query: Record<string, unknown>) => {
  const normalizedQuery = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  return normalizedQuery
    ? `hackathons:list:${normalizedQuery}`
    : "hackathons:list:all";
};