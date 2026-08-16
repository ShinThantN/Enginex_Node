import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {
  ApplyToProjectSchema,
  ProjectIdParamsSchema,
  UpdateEngineerProfileSchema,
  UpdateEngineerStatusSchema,
} from "./engineers.schema.js";
import {
  applyToProjectService,
  getCompaniesService,
  getDirectProjectsService,
  getEngineerApplicationsService,
  getEngineerProfileService,
  getOpenProjectsService,
  updateEngineerProfileService,
  updateEngineerStatusService,
} from "./engineers.service.js";

const getErrorStatus = (error: unknown) => {
  return error instanceof Error && "statusCode" in error
    ? Number(error.statusCode)
    : 500;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong";
};

export const getEngineerProfile = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const profile = await getEngineerProfileService(req.user!.id);
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Engineer Profile Displayed",
          data: profile,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const updateEngineerProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = UpdateEngineerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(422)
        .json({
          success: false,
          status: 422,
          message: "Validation Failed",
          errors: parsed.error.flatten(),
        });
      return;
    }

    try {
      const profile = await updateEngineerProfileService(
        req.user!.id,
        parsed.data,
      );
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Engineer Profile Updated Successfully",
          data: profile,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const updateEngineerStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = UpdateEngineerStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(422)
        .json({
          success: false,
          status: 422,
          message: "Validation Failed",
          errors: parsed.error.flatten(),
        });
      return;
    }

    try {
      const profile = await updateEngineerStatusService(
        req.user!.id,
        parsed.data.availabilityStatus,
      );
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Engineer Availability Status Updated Successfully",
          data: profile,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const getDirectProjects = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const projects = await getDirectProjectsService(req.user!.id);
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Assigned Projects Displayed",
          data: projects,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const getOpenProjects = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const projects = await getOpenProjectsService(req.user!.id);
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Open Projects Displayed",
          data: projects,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const getEngineerApplications = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const applications = await getEngineerApplicationsService(req.user!.id);
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Applications Displayed",
          data: applications,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const applyToProject = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedParams = ProjectIdParamsSchema.safeParse(req.params);
    const parsedBody = ApplyToProjectSchema.safeParse(req.body);

    if (!parsedParams.success || !parsedBody.success) {
      res
        .status(422)
        .json({ success: false, status: 422, message: "Validation Failed" });
      return;
    }

    try {
      const application = await applyToProjectService(
        req.user!.id,
        parsedParams.data.id,
        parsedBody.data,
      );
      res
        .status(201)
        .json({
          success: true,
          status: 201,
          message: "Project Application Submitted Successfully",
          data: application,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);

export const getCompanies = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const companies = await getCompaniesService(req.user!.id);
      res
        .status(200)
        .json({
          success: true,
          status: 200,
          message: "Companies Displayed",
          data: companies,
        });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      res
        .status(status)
        .json({ success: false, status, message: getErrorMessage(error) });
    }
  },
);
