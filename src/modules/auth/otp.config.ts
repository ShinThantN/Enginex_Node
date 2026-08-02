/**
 * OTP configuration.
 *
 * Kept dependency-free (no Prisma, no Email SDK) so it can be imported by both
 * the OTP service and the validation schema without dragging heavier modules
 * into every consumer. Values are configurable via environment variables.
 */

const numberFromEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const OTP_LENGTH = numberFromEnv("OTP_LENGTH", 6);
export const OTP_EXPIRY_MINUTES = numberFromEnv("OTP_EXPIRY_MINUTES", 10);
export const OTP_RESEND_COOLDOWN_SECONDS = numberFromEnv(
  "OTP_RESEND_COOLDOWN_SECONDS",
  60,
);
