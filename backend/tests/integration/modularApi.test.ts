import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { Hackathon } from "../../src/modules/catalog/index.ts";
import { User } from "../../src/modules/identity/index.ts";
import { Team } from "../../src/modules/team/index.ts";
import { userInfo } from "node:os";

beforeEach(async () => {
  await Hackathon.deleteMany({});
  await User.deleteMany({});
  await Team.deleteMany({});
});

describe("Modular Monolith API End-to-End Tests", () => {
  it("should respond to health check ping endpoint", async () => {
    const res = await request(app).get("/api/v1/ping");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("pong");
  });

  it("should query Hackathon Catalog and return formatted response", async () => {
    await Hackathon.create({
      title: "Modular Monolith Hackathon",
      slug: "modular-monolith-hackathon",
      platform: "Devpost",
      mode: "Online",
      prize: "$5,000 USD",
      applyLink: "https://devpost.com/hackathons/test",
      organization: "Top Tech Corp",
      tags: ["TypeScript", "Monolith"],
    });

    const res = await request(app).get("/api/v1/hackathons?search=Modular");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Modular Monolith Hackathon");
    expect(res.body.data[0].platform).toBe("Devpost");
  });

  it("should enforce authorization on protected team routes", async () => {
    const res = await request(app).get("/api/v1/teams");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should allow previewing team invitation without login", async () => {
    const res = await request(app).get("/api/v1/teams/invitations/preview?token=invalidtoken");
    expect(res.status).toBe(404);
  });
});
