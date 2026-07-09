/**
 * Email templates.
 *
 * Presentation lives here, isolated from business logic: services build the
 * data (recipient, OTP, expiry) and ask a template to turn it into a subject +
 * HTML body. No module should construct email HTML inline.
 */

export interface OtpEmailParams {
  /** Recipient's display name, used to personalise the greeting. */
  name: string;
  /** The one-time code to display. Never logged. */
  otp: string;
  /** How long the code stays valid, in minutes. */
  expiryMinutes: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Verification email carrying the OTP a user must enter to confirm their email.
 */
export const buildOtpVerificationEmail = (
  params: OtpEmailParams,
): RenderedEmail => {
  const safeName = escapeHtml(params.name);
  const safeOtp = escapeHtml(params.otp);

  const subject = "Verify your Enginex email address";

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <h2 style="margin: 0 0 16px;">Confirm your email</h2>
    <p style="margin: 0 0 16px;">Hi ${safeName},</p>
    <p style="margin: 0 0 16px;">
      Welcome to Enginex. Use the verification code below to confirm your email address:
    </p>
    <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px 0; background: #f4f6f8; border-radius: 8px; margin: 0 0 16px;">
      ${safeOtp}
    </div>
    <p style="margin: 0 0 16px; color: #555;">
      This code expires in ${params.expiryMinutes} minute${params.expiryMinutes === 1 ? "" : "s"}.
      If you did not create an Enginex account, you can safely ignore this email.
    </p>
    <p style="margin: 0; color: #999; font-size: 12px;">— The Enginex Team</p>
  </div>`;

  return { subject, html };
};
