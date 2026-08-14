const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "hackdekh";

export const TABLES = {
  USERS: `${PREFIX}-users`,
  HACKATHONS: `${PREFIX}-hackathons`,
  TEAMS: `${PREFIX}-teams`,
  TEAM_MEMBERS: `${PREFIX}-teammembers`,
  TEAM_INVITATIONS: `${PREFIX}-teaminvitations`,
  TEAM_HACKATHONS: `${PREFIX}-teamhackathons`,
  STAGES: `${PREFIX}-stages`,
  PENDING_REFLECTIONS: `${PREFIX}-pendingreflections`,
  REFLECTIONS: `${PREFIX}-reflections`,
} as const;

export const getCronSecret = () => {
	return process.env.CRON_SECRET || "your-secret-key-change-in-production";
};