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

export default redisClient;
