import cron from 'node-cron';
import { runAllScrapers } from './runAllScrapers.ts';

cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Starting nightly refresh at 3:00 AM');
    await runAllScrapers();
    console.log('[CRON] Hackathon refresh complete');
});