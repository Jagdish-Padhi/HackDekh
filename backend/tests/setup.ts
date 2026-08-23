import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_32_chars_min';
  process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_32_chars_min';
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
