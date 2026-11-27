export function downloadDeadlineICS(opts: {
  title: string;
  deadline?: string | null;
  platform?: string;
  location?: string;
  applyLink?: string;
  description?: string;
}): boolean {
  if (!opts.deadline?.trim()) return false;
  const parsed = new Date(opts.deadline.trim());
  if (Number.isNaN(parsed.getTime())) return false;

  // Format as YYYYMMDD for an all-day event on the deadline date
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const nextDay = new Date(Date.UTC(year, parsed.getUTCMonth(), parsed.getUTCDate() + 1));
  const nextDateStr = `${nextDay.getUTCFullYear()}${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}${String(nextDay.getUTCDate()).padStart(2, "0")}`;

  const escapeICS = (val: string) =>
    val.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

  const summary = escapeICS(`Deadline: ${opts.title}`);
  const details = [
    opts.platform ? `Platform: ${opts.platform}` : "",
    opts.description || "",
    opts.applyLink ? `Link: ${opts.applyLink}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HackDekh//Deadline Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@hackdekh`,
    `DTSTAMP:${dateStr}T000000Z`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${nextDateStr}`,
    `SUMMARY:${summary}`,
    details ? `DESCRIPTION:${escapeICS(details)}` : "",
    opts.location ? `LOCATION:${escapeICS(opts.location)}` : "",
    opts.applyLink ? `URL:${opts.applyLink}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const slug = opts.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  link.download = `${slug || "hackathon"}-deadline.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
