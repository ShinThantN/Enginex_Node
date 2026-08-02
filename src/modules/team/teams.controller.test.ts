import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as controller from "./teams.controller.ts";
import * as service from "./teams.service.ts";

jest.mock("./teams.service.ts", () => ({
  getTeamProfile: jest.fn(), updateTeamProfile: jest.fn(), getTeamMembers: jest.fn(),
  inviteTeamMember: jest.fn(), removeTeamMember: jest.fn(), getMyTeamInvitations: jest.fn(),
  decideTeamInvitation: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.user = { id: 7, role: "COMPANY" }; next(); });
app.get("/profile", controller.getProfile);
app.patch("/profile", controller.updateProfile);
app.post("/members", controller.inviteMember);
app.patch("/members/:memberId/decision", controller.decideInvitation);

describe("Team controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a company profile", async () => {
    jest.mocked(service.getTeamProfile).mockResolvedValue({ id: 2, userId: 7, companyName: "Build Co" } as never);
    const response = await request(app).get("/profile");
    expect(response.status).toBe(200);
    expect(response.body.data.companyName).toBe("Build Co");
  });

  it("rejects an empty profile update", async () => {
    const response = await request(app).patch("/profile").send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });

  it("creates a pending engineer invitation", async () => {
    jest.mocked(service.inviteTeamMember).mockResolvedValue({ id: 9, approvalStatus: "PENDING" } as never);
    const response = await request(app).post("/members").send({ engineerProfileId: 5, roleInTeam: "Structural engineer" });
    expect(response.status).toBe(201);
    expect(service.inviteTeamMember).toHaveBeenCalledWith(7, { engineerProfileId: 5, roleInTeam: "Structural engineer" });
  });

  it("allows an invitation decision only with a valid status", async () => {
    const response = await request(app).patch("/members/9/decision").send({ approvalStatus: "PENDING" });
    expect(response.status).toBe(400);
  });
});
