import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/utils.ts";
import * as teamService from "./teams.service.ts";
import {
  CreateTeamMemberSchema,
  TeamMemberDecisionSchema,
  TeamMemberIdParamsSchema,
  UpdateTeamProfileSchema,
} from "./teams.schema.ts";

function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

function validationError(res: Response, details: unknown): void {
  res.status(400).json({ error: "Validation failed", details });
}

export async function getProfile(req: Request, res: Response) {
  try {
    const profile = await teamService.getTeamProfile(req.user!.id);
    if (!profile) {
      res.status(404).json({ error: "Team profile not found" });
      return;
    }
    res.json({ data: profile });
  } catch (error) { sendError(res, error); }
}

export async function updateProfile(req: Request, res: Response) {
  const parsed = UpdateTeamProfileSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  try {
    const profile = await teamService.updateTeamProfile(req.user!.id, parsed.data);
    res.json({ data: profile });
  } catch (error) { sendError(res, error); }
}

export async function listMembers(req: Request, res: Response) {
  try { res.json({ data: await teamService.getTeamMembers(req.user!.id) }); }
  catch (error) { sendError(res, error); }
}

export async function inviteMember(req: Request, res: Response) {
  const parsed = CreateTeamMemberSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  try {
    const member = await teamService.inviteTeamMember(req.user!.id, parsed.data);
    res.status(201).json({ data: member });
  } catch (error) { sendError(res, error); }
}

export async function removeMember(req: Request, res: Response) {
  const parsed = TeamMemberIdParamsSchema.safeParse(req.params);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  try {
    await teamService.removeTeamMember(req.user!.id, parsed.data.memberId);
    res.status(204).send();
  } catch (error) { sendError(res, error); }
}

export async function listMyInvitations(req: Request, res: Response) {
  try { res.json({ data: await teamService.getMyTeamInvitations(req.user!.id) }); }
  catch (error) { sendError(res, error); }
}

export async function decideInvitation(req: Request, res: Response) {
  const params = TeamMemberIdParamsSchema.safeParse(req.params);
  const body = TeamMemberDecisionSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    const details = !params.success ? params.error.issues : body.error?.issues;
    return validationError(res, details);
  }
  try {
    const member = await teamService.decideTeamInvitation(req.user!.id, params.data.memberId, body.data);
    res.json({ data: member });
  } catch (error) { sendError(res, error); }
}
