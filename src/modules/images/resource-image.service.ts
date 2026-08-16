import { prisma } from "../../shared/config/prisma.ts";
import { AppError } from "../../shared/utils/utils.ts";
import { getStorageProvider, validateImage } from "../../shared/config/image-storage.ts";

export const resourceKinds = ["posts", "projects", "portfolios"] as const;
export type ResourceKind = (typeof resourceKinds)[number];

type StoredResourceImage = {
  imageData: Uint8Array | null;
  imageType: string | null;
};

function databaseImageUrl(resource: ResourceKind, resourceId: number): string {
  return `/api/images/${resource}/${resourceId}`;
}

async function assertResourceOwner(
  resource: ResourceKind,
  resourceId: number,
  userId: number,
): Promise<void> {
  if (resource === "posts") {
    const post = await prisma.post.findUnique({
      where: { id: resourceId },
      select: { userId: true },
    });
    if (!post) throw new AppError("Post not found", 404);
    if (post.userId !== userId) throw new AppError("You can only modify your own posts", 403);
    return;
  }

  if (resource === "projects") {
    const project = await prisma.project.findUnique({
      where: { id: resourceId },
      select: { clientId: true },
    });
    if (!project) throw new AppError("Project not found", 404);
    if (project.clientId !== userId) {
      throw new AppError("You can only modify your own projects", 403);
    }
    return;
  }

  const portfolio = await prisma.engineerPortfolio.findUnique({
    where: { id: resourceId },
    select: { engineerProfile: { select: { userId: true } } },
  });
  if (!portfolio) throw new AppError("Portfolio not found", 404);
  if (portfolio.engineerProfile.userId !== userId) {
    throw new AppError("You can only modify your own portfolios", 403);
  }
}

async function updateResourceImage(
  resource: ResourceKind,
  resourceId: number,
  data: {
    imageUrl: string | null;
    imageData: Uint8Array<ArrayBuffer> | null;
    imageType: string | null;
  },
): Promise<void> {
  if (resource === "posts") {
    await prisma.post.update({ where: { id: resourceId }, data });
    return;
  }
  if (resource === "projects") {
    await prisma.project.update({ where: { id: resourceId }, data });
    return;
  }
  await prisma.engineerPortfolio.update({ where: { id: resourceId }, data });
}

async function queryResourceImage(
  resource: ResourceKind,
  resourceId: number,
): Promise<StoredResourceImage | null> {
  const query = {
    where: { id: resourceId },
    select: { imageData: true, imageType: true },
  } as const;

  if (resource === "posts") return prisma.post.findUnique(query);
  if (resource === "projects") return prisma.project.findUnique(query);
  return prisma.engineerPortfolio.findUnique(query);
}

export async function saveResourceImage(
  userId: number,
  resource: ResourceKind,
  resourceId: number,
  image: Buffer,
  mimeType: string,
): Promise<{ imageUrl: string; storageProvider: "database" | "s3" }> {
  const validatedType = validateImage(image, mimeType);
  await assertResourceOwner(resource, resourceId, userId);
  const storageProvider = getStorageProvider();

  if (storageProvider === "s3") {
    const { uploadImage } = await import("../../shared/config/s3.ts");
    const uploaded = await uploadImage(userId, image, validatedType);
    await updateResourceImage(resource, resourceId, {
      imageUrl: uploaded.url,
      imageData: null,
      imageType: null,
    });
    return { imageUrl: uploaded.url, storageProvider };
  }

  const imageUrl = databaseImageUrl(resource, resourceId);
  await updateResourceImage(resource, resourceId, {
    imageUrl,
    imageData: Uint8Array.from(image),
    imageType: validatedType,
  });
  return { imageUrl, storageProvider };
}

export async function getResourceImage(
  resource: ResourceKind,
  resourceId: number,
): Promise<{ imageData: Uint8Array; imageType: string }> {
  const image = await queryResourceImage(resource, resourceId);
  if (!image?.imageData || !image.imageType) {
    throw new AppError("Image not found", 404);
  }
  return { imageData: image.imageData, imageType: image.imageType };
}

export async function deleteResourceImage(
  userId: number,
  resource: ResourceKind,
  resourceId: number,
): Promise<void> {
  await assertResourceOwner(resource, resourceId, userId);
  await updateResourceImage(resource, resourceId, {
    imageUrl: null,
    imageData: null,
    imageType: null,
  });
}
