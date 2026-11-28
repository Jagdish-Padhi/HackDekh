import cron from "node-cron";
import { runAllScrapers } from "../../modules/ingestion/index.ts";
import TeamHackathon from "../../modules/team/models/teamHackathon.model.ts";
import { dispatchDeadlineAlert } from "../notifications/alert.service.ts";

/**
 * Checks for tracked hackathons with 24h alerts enabled whose deadline is within the next 24 hours
 * and dispatches reminders across each member's configured channels.
 */
export async function processDeadlineAlerts(): Promise<number> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const candidates = await TeamHackathon.find({
    alertSentAt: null,
    status: { $in: ["tracking", "active"] },
  })
    .populate("hackathon", "title slug platform deadline prize applyLink")
    .populate({
      path: "team",
      select: "name members",
      populate: {
        path: "members",
        select: "email fullName preferences",
      },
    });

  let sentCount = 0;

  for (const participation of candidates) {
    const hack = participation.hackathon as any;
    const team = participation.team as any;
    if (!hack?.deadline || !team) continue;

    const deadlineDate = new Date(hack.deadline);
    if (Number.isNaN(deadlineDate.getTime())) continue;
    if (deadlineDate <= now || deadlineDate > in24Hours) continue;

    const members = Array.isArray(team.members) ? team.members : [];
    const delivered = await dispatchDeadlineAlert(
      members,
      {
        title: hack.title,
        slug: hack.slug,
        platform: hack.platform,
        deadline: deadlineDate,
        prize: hack.prize,
        applyLink: hack.applyLink,
      },
      team.name || "Your Team"
    );

    if (delivered) {
      participation.alertSentAt = new Date();
      await participation.save();
      sentCount++;
    }
  }

  return sentCount;
}

cron.schedule("0 3 * * *", async () => {
  console.log("[CRON] Starting nightly refresh at 3:00 AM");
  await runAllScrapers();
  console.log("[CRON] Hackathon refresh complete");
});

cron.schedule("*/30 * * * *", async () => {
  try {
    const sent = await processDeadlineAlerts();
    if (sent > 0) {
      console.log(`[CRON] Dispatched ${sent} 24h deadline alert(s).`);
    }
  } catch (err: any) {
    console.error("[CRON] Deadline alert check failed:", err?.message || err);
  }
});
