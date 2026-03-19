export const DB_NAME = "hackdekh";

export const getCronSecret = () => {
	return process.env.CRON_SECRET || "your-secret-key-change-in-production";
};
