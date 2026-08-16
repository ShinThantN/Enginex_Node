import { prisma } from "../../shared/config/prisma.ts";
import { AppError } from "../../shared/utils/utils.ts";
import {
  getStorageProvider,
  validateImage,
  type StorageProvider,
} from "../../shared/config/image-storage.ts";

export async function saveProfileImage(
  userId: number,
  image: Buffer,
  mimeType: string,
): Promise<{ profileImage: string; storageProvider: StorageProvider }> {
  const validatedType = validateImage(image, mimeType);
  const storageProvider = getStorageProvider();

  if (storageProvider === "s3") {
    const { uploadImage } = await import("../../shared/config/s3.ts");
    const uploaded = await uploadImage(userId, image, validatedType);

    await prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: uploaded.url,
        imageData: null,
        imageType: null,
      },
    });

    return { profileImage: uploaded.url, storageProvider };
  }

  const profileImage = `/api/users/${userId}/profile-image`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      profileImage,
      imageData: Uint8Array.from(image),
      imageType: validatedType,
    },
  });

  return { profileImage, storageProvider };
}

export async function getProfileImage(
  userId: number,
): Promise<{ imageData: Uint8Array; imageType: string }> {
  const image = await prisma.user.findUnique({
    where: { id: userId },
    select: { imageData: true, imageType: true },
  });

  if (!image?.imageData || !image.imageType) {
    throw new AppError("Profile image not found", 404);
  }

  return { imageData: image.imageData, imageType: image.imageType };
}

export async function deleteProfileImage(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      profileImage: null,
      imageData: null,
      imageType: null,
    },
  });
}
