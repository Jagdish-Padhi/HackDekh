import {createClient} from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (error) => {
    console.error("[Redis] Error:", error);
});

redisClient.on("connect", () => {
    console.error("[Redis] connecting...");
});

redisClient.on("ready", () => {
    console.error("[Redis] connected successfully");
});

export const connectRedis = async () => {
    if(!redisClient.isOpen){
        await redisClient.connect();
    }
};

export const invalidateHackathonCache = async () => {
    const keys = await redisClient.keys("hackathons:list:*");

    if(keys.length > 0){
        await redisClient.del(keys);
        console.log(`[Redis] Invalidated ${keys.length} hackathon cache key(s)`);
    }else{
        console.log("[Redis] No hackathon cache keys to invalidate");
    }
};

export default redisClient;
