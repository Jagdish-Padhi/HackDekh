import { describe, it, expect } from "vitest";
import { Hackathon, getHackathonsService } from "../../src/modules/catalog/index.ts";
import { Stage, stageService } from "../../src/modules/tracking/index.ts";
import { Team, TeamInvitation, TeamHackathon, teamService } from "../../src/modules/team/index.ts";
import { User, PendingUser, registerUserService } from "../../src/modules/identity/index.ts";
import { universalFormatter, runAllScrapers } from "../../src/modules/ingestion/index.ts";
import { ApiError, ApiResponse, asyncHandler, DB_NAME } from "../../src/shared/index.ts";
import { isEmailDeliveryConfigured } from "../../src/infrastructure/index.ts";

describe("Modular Monolith Domain & Architecture Tests", () => {
  it("should verify Hackathon Catalog module exports and query contracts", () => {
    expect(Hackathon).toBeDefined();
    expect(typeof getHackathonsService).toBe("function");
  });

  it("should verify Progress Tracking module exports", () => {
    expect(Stage).toBeDefined();
    expect(stageService).toBeDefined();
    expect(typeof stageService.addStage).toBe("function");
  });

  it("should verify Team Collaboration module exports", () => {
    expect(Team).toBeDefined();
    expect(TeamInvitation).toBeDefined();
    expect(TeamHackathon).toBeDefined();
    expect(teamService).toBeDefined();
    expect(typeof teamService.createTeam).toBe("function");
  });

  it("should verify Identity module exports", () => {
    expect(User).toBeDefined();
    expect(PendingUser).toBeDefined();
    expect(typeof registerUserService).toBe("function");
  });

  it("should verify Ingestion module normalizer functionality", () => {
    expect(typeof universalFormatter).toBe("function");
    expect(typeof runAllScrapers).toBe("function");
  });

  it("should verify Shared primitives and error contracts", () => {
    const error = new ApiError(404, "Entity Not Found");
    expect(error.statusCode).toBe(404);
    expect(error.success).toBe(false);

    const response = new ApiResponse(200, { ok: true }, "Fetched");
    expect(response.statusCode).toBe(200);
    expect(response.success).toBe(true);
    expect(DB_NAME).toBe("test");
  });

  it("should verify Infrastructure adapters are properly exposed", () => {
    expect(typeof isEmailDeliveryConfigured).toBe("function");
  });
});
