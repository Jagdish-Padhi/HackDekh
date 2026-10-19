import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
];

export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  const agent = USER_AGENTS[index];
  if (agent) return agent;
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
}

export async function axiosGetWithRetry<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  retries = 3,
  initialDelayMs = 2000
): Promise<AxiosResponse<T>> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const headers = {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        ...(config.headers || {})
      };
      
      const timeout = config.timeout || 25000; // default 25s
      
      return await axios.get<T>(url, {
        ...config,
        headers,
        timeout
      });
    } catch (error: any) {
      const isStatusError = error.response && (error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429);
      // If it's a client error (e.g. 404, 403, 401) and not 429 (rate limit), don't retry, just throw immediately.
      if (isStatusError || attempt >= retries) {
        throw error;
      }
      
      const delay = initialDelayMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4); // Add jitter
      console.warn(`[HTTP Fetch Retry] Failed to fetch ${url} (Attempt ${attempt}/${retries}). Error: ${error.message || error}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
