export const DB_NAME = "test";

export const getCronSecret = () => {
	return process.env.CRON_SECRET || "your-secret-key-change-in-production";
};
