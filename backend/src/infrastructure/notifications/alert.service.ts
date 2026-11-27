import axios from "axios";
import { isEmailDeliveryConfigured, sendAlertEmail } from "../email/email.service.ts";

export interface ScraperResultItem {
  name: string;
  status: "success" | "failed";
  count: number;
  error?: string;
}

export interface ScraperSummaryPayload {
  total: number;
  successful: number;
  failed: number;
  results: ScraperResultItem[];
}

const SITE_URL = process.env.FRONTEND_URL || "https://hackdekh.jdecodes.tech";

/**
 * Alerts maintainers whenever any platform scraper fails or returns 0 items during a sync.
 */
export async function sendScraperHealthAlert(summary: ScraperSummaryPayload): Promise<void> {
  const unhealthy = summary.results.filter((r) => r.status === "failed" || r.count === 0);
  if (unhealthy.length === 0) return;

  const lines = unhealthy.map((r) =>
    r.status === "failed"
      ? `- **${r.name}**: FAILED (${r.error || "Unknown error"})`
      : `- **${r.name}**: Returned **0** hackathons`
  );

  const summaryLine = summary.results
    .map((r) => `${r.name}: ${r.status === "failed" ? "ERR" : r.count}`)
    .join(" | ");

  console.warn(`[ALERT] Scraper health issue detected (${unhealthy.length}/${summary.total}): ${summaryLine}`);

  const webhookUrl = process.env.SCRAPER_ALERT_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      await axios.post(
        webhookUrl,
        {
          content: `**HackDekh Scraper Health Alert** (${new Date().toISOString()})\n${lines.join("\n")}\n\nSummary: \`${summaryLine}\``,
        },
        { timeout: 10000 }
      );
    } catch (err: any) {
      console.error("[ALERT] Failed to send scraper health webhook:", err?.message || err);
    }
  }

  const alertEmail = (process.env.SCRAPER_ALERT_EMAIL || process.env.ADMIN_ALERT_EMAIL || "").trim();
  if (alertEmail && isEmailDeliveryConfigured()) {
    try {
      const htmlList = unhealthy
        .map((r) =>
          r.status === "failed"
            ? `<li><strong>${r.name}</strong>: FAILED (${r.error || "Unknown error"})</li>`
            : `<li><strong>${r.name}</strong>: Returned <strong>0</strong> hackathons</li>`
        )
        .join("");

      await sendAlertEmail({
        to: alertEmail,
        subject: `[HackDekh Alert] ${unhealthy.length} scraper(s) unhealthy`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b; max-width: 560px;">
            <h2 style="margin: 0 0 12px; font-size: 18px;">HackDekh Scraper Health Alert</h2>
            <p style="margin: 0 0 12px; font-size: 14px; color: #52525b;">
              The scheduled sync detected ${unhealthy.length} unhealthy platform scraper(s):
            </p>
            <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 14px;">${htmlList}</ul>
            <p style="margin: 0; font-size: 12px; color: #71717a;">Summary: ${summaryLine}</p>
          </div>
        `,
        text: `HackDekh Scraper Health Alert\n\n${lines.join("\n")}\n\nSummary: ${summaryLine}`,
      });
    } catch (err: any) {
      console.error("[ALERT] Failed to send scraper health email:", err?.message || err);
    }
  }
}

export interface DeadlineAlertTarget {
  email?: string;
  fullName?: string;
  preferences?: {
    emailAlertsEnabled?: boolean;
    discordWebhookUrl?: string;
    telegramChatId?: string;
  };
}

export interface DeadlineAlertHackathon {
  title: string;
  slug?: string;
  platform: string;
  deadline: Date;
  prize?: string;
  applyLink?: string;
}

/**
 * Dispatches a 24-hour deadline reminder across each member's enabled channels (Email / Discord / Telegram).
 * Returns true if at least one channel delivery succeeded.
 */
export async function dispatchDeadlineAlert(
  members: DeadlineAlertTarget[],
  hackathon: DeadlineAlertHackathon,
  teamName: string
): Promise<boolean> {
  let deliveredAny = false;
  const deadlineStr = new Date(hackathon.deadline).toUTCString();
  const detailUrl = `${SITE_URL}/tracker`;
  const sentWebhooks = new Set<string>();
  const sentTelegramIds = new Set<string>();

  for (const member of members) {
    const prefs = member.preferences || {};

    // 1. Email (enabled by default unless explicitly opted out)
    if (prefs.emailAlertsEnabled !== false && member.email && isEmailDeliveryConfigured()) {
      try {
        await sendAlertEmail({
          to: member.email,
          subject: `[24h Reminder] ${hackathon.title} deadline is approaching`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b; max-width: 520px;">
              <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #2563eb; margin: 0 0 8px;">
                HackDekh 24h Deadline Alert
              </p>
              <h2 style="margin: 0 0 8px; font-size: 20px;">${hackathon.title}</h2>
              <p style="margin: 0 0 16px; font-size: 14px; color: #52525b;">
                Your tracked hackathon for <strong>${teamName}</strong> closes within 24 hours.
              </p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px;">
                <div><strong>Platform:</strong> ${hackathon.platform}</div>
                <div><strong>Deadline:</strong> ${deadlineStr}</div>
                ${hackathon.prize ? `<div><strong>Prize:</strong> ${hackathon.prize}</div>` : ""}
              </div>
              <a href="${detailUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                Open Tracker
              </a>
              ${
                hackathon.applyLink
                  ? `<a href="${hackathon.applyLink}" style="display: inline-block; margin-left: 8px; border: 1px solid #d4d4d8; color: #18181b; text-decoration: none; padding: 9px 14px; border-radius: 6px; font-size: 13px; font-weight: 600;">Official Site</a>`
                  : ""
              }
            </div>
          `,
          text: `HackDekh 24h Deadline Alert\n\n${hackathon.title} (${hackathon.platform}) for ${teamName} closes within 24 hours.\nDeadline: ${deadlineStr}\nView: ${detailUrl}`,
        });
        deliveredAny = true;
      } catch (err: any) {
        console.error(`[ALERT] Email deadline reminder failed for ${member.email}:`, err?.message || err);
      }
    }

    // 2. Discord Webhook
    const webhook = prefs.discordWebhookUrl?.trim();
    if (webhook && !sentWebhooks.has(webhook)) {
      sentWebhooks.add(webhook);
      try {
        await axios.post(
          webhook,
          {
            content: `**24h Deadline Alert: ${hackathon.title}**\nSquad: **${teamName}** • Platform: ${hackathon.platform}\nDeadline: ${deadlineStr}\n${detailUrl}`,
          },
          { timeout: 10000 }
        );
        deliveredAny = true;
      } catch (err: any) {
        console.error("[ALERT] Discord deadline reminder failed:", err?.message || err);
      }
    }

    // 3. Telegram Bot
    const chatId = prefs.telegramChatId?.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (chatId && botToken && !sentTelegramIds.has(chatId)) {
      sentTelegramIds.add(chatId);
      try {
        await axios.post(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            chat_id: chatId,
            text: `24h Deadline Alert: ${hackathon.title}\nSquad: ${teamName} (${hackathon.platform})\nDeadline: ${deadlineStr}\n${detailUrl}`,
          },
          { timeout: 10000 }
        );
        deliveredAny = true;
      } catch (err: any) {
        console.error(`[ALERT] Telegram deadline reminder failed for chat ${chatId}:`, err?.message || err);
      }
    }
  }

  return deliveredAny;
}
