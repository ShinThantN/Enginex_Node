/**
 * Shared Email service.
 *
 * The only place in the codebase that talks to the Resend SDK. It exposes
 * intent-revealing methods (e.g. `sendOtpEmail`) and knows nothing about OTPs,
 * authentication, or any domain concept beyond "send this rendered email".
 * Other modules depend on this service, never on `resend` directly.
 */

import { Resend } from "resend";
import { AppError } from "../utils/utils.ts";
import { buildOtpVerificationEmail } from "./email.templates.ts";
import type { InlineAttachment } from "./email.templates.ts";

const EMAIL_FROM =
  process.env["EMAIL_FROM"] ?? "Enginex <onboarding@resend.dev>";

/**
 * Lazily constructed Resend client. Building it on demand (rather than at import
 * time) lets the app and test suite load this module without a configured API
 * key, and surfaces a clear error only when an email is actually sent.
 */
let resendClient: Resend | null = null;

const getResendClient = (): Resend => {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new AppError("Email service is not configured", 500);
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Inline images referenced from the HTML as `cid:<contentId>`. */
  attachments?: InlineAttachment[];
}

/**
 * Low-level send. Wraps the provider call and translates provider failures into
 * an `AppError` without leaking SDK internals to callers.
 */
export const sendEmail = async (params: SendEmailParams): Promise<void> => {
  const client = getResendClient();

  const { error } = await client.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.attachments?.length
      ? { attachments: params.attachments }
      : {}),
  });

  if (error) {
    throw new AppError("Failed to send email", 502);
  }
};

export interface SendOtpEmailParams {
  to: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

/**
 * Send an email-verification OTP. Kept as a dedicated method so callers never
 * need to know which template or subject line is used.
 */
export const sendOtpEmail = async (
  params: SendOtpEmailParams,
): Promise<void> => {
  const { subject, html, attachments } = buildOtpVerificationEmail({
    name: params.name,
    otp: params.otp,
    expiryMinutes: params.expiryMinutes,
  });

  await sendEmail({ to: params.to, subject, html, attachments });
};
