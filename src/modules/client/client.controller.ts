import type { Request, Response } from "express";
import * as clientService from "./client.service.ts";
import {
  updateProfileSchema,
  searchQuerySchema,
  saveFavoriteSchema,
  createProjectSchema,
  updateProjectSchema,
  reviewProjectApplicationSchema,
} from "./client.validator.ts";

export async function getProfile(req: Request, res: Response) {
  const profile = await clientService.getClientProfile(req.user!.id);

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ data: profile });
}

export async function updateProfile(req: Request, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const profile = await clientService.updateClientProfile(
    req.user!.id,
    parsed.data,
  );
  res.json({ data: profile });
}

export async function search(req: Request, res: Response) {
  const parsed = searchQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const results = await clientService.searchEngineersAndTeams(parsed.data);
  res.json({ data: results });
}

export async function getEngineerProfile(req: Request, res: Response) {
  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid engineer profile ID" });
    return;
  }

  const profile = await clientService.getEngineerProfile(id);
  if (!profile) {
    res.status(404).json({ error: "Engineer profile not found" });
    return;
  }

  res.json({ data: profile });
}

export async function getTeamProfile(req: Request, res: Response) {
  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid team profile ID" });
    return;
  }

  const profile = await clientService.getTeamProfile(id);
  if (!profile) {
    res.status(404).json({ error: "Team profile not found" });
    return;
  }

  res.json({ data: profile });
}

export async function saveFavorite(req: Request, res: Response) {
  const parsed = saveFavoriteSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const favorite = await clientService.saveFavorite(
    req.user!.id,
    parsed.data.engineerProfileId,
  );
  if (!favorite) {
    res.status(404).json({ error: "Engineer profile not found" });
    return;
  }

  res.status(201).json({ data: favorite });
}

export async function removeFavorite(req: Request, res: Response) {
  const engineerProfileId = Number(req.params["engineerProfileId"]);
  if (isNaN(engineerProfileId)) {
    res.status(400).json({ error: "Invalid engineer profile ID" });
    return;
  }

  await clientService.removeFavorite(req.user!.id, engineerProfileId);
  res.status(204).send();
}

export async function getFavorites(req: Request, res: Response) {
  const favorites = await clientService.getFavorites(req.user!.id);
  res.json({ data: favorites });
}

export async function createProject(req: Request, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const project = await clientService.createProject(req.user!.id, parsed.data);
  res.status(201).json({ data: project });
}

export async function getClientProjects(req: Request, res: Response) {
  const projects = await clientService.getClientProjects(req.user!.id);
  res.json({ data: projects });
}

export async function updateProject(req: Request, res: Response) {
  const projectId = Number(req.params["id"]);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const project = await clientService.updateClientProject(
      req.user!.id,
      projectId,
      parsed.data,
    );
    res.json({ data: project });
  } catch (error: unknown) {
    const message =
      error instanceof Error && "statusCode" in error
        ? error.message
        : "Project not found or you do not own it";
    const status =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 404;
    res.status(status).json({ error: message });
  }
}

export async function deleteProject(req: Request, res: Response) {
  const projectId = Number(req.params["id"]);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  try {
    await clientService.deleteClientProject(req.user!.id, projectId);
    res.status(204).send();
  } catch (error: unknown) {
    const message =
      error instanceof Error && "statusCode" in error
        ? error.message
        : "Project not found or you do not own it";
    const status =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 404;
    res.status(status).json({ error: message });
  }
}

export async function getProjectApplications(req: Request, res: Response) {
  const projectId = Number(req.params["id"]);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  try {
    const applications = await clientService.getProjectApplications(
      req.user!.id,
      projectId,
    );
    res.json({ data: applications });
  } catch (error: unknown) {
    const message =
      error instanceof Error && "statusCode" in error
        ? error.message
        : "Project not found or you do not own it";
    const status =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 404;
    res.status(status).json({ error: message });
  }
}

export async function reviewProjectApplication(req: Request, res: Response) {
  const projectId = Number(req.params["id"]);
  const applicationId = Number(req.params["applicationId"]);

  if (isNaN(projectId) || isNaN(applicationId)) {
    res.status(400).json({ error: "Invalid project or application ID" });
    return;
  }

  const parsed = reviewProjectApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const application = await clientService.reviewProjectApplication(
      req.user!.id,
      projectId,
      applicationId,
      parsed.data,
    );
    res.json({ data: application });
  } catch (error: unknown) {
    const message =
      error instanceof Error && "statusCode" in error
        ? error.message
        : "Project not found or you do not own it";
    const status =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 404;
    res.status(status).json({ error: message });
  }
}

export async function assignProjectToEngineer(req: Request, res: Response) {
  const projectId = Number(req.params["projectId"]);
  const engineerProfileId = Number(req.params["engineerProfileId"]);

  if (isNaN(projectId) || isNaN(engineerProfileId)) {
    res.status(400).json({ error: "Invalid project or engineer profile ID" });
    return;
  }

  await clientService.assignProjectToEngineer(projectId, engineerProfileId);
  res.status(204).send();
}
