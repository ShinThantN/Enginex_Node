/**
 * Email templates.
 *
 * Presentation lives here, isolated from business logic: services build the
 * data (recipient, OTP, expiry) and ask a template to turn it into a subject +
 * HTML body. No module should construct email HTML inline.
 *
 * The markup itself is kept in sibling `.html` files under `templates/` and
 * loaded at render time. Placeholders of the form `{{key}}` are replaced with
 * HTML-escaped, per-recipient values.
 *
 * Images are shipped as inline CID attachments rather than `data:` URIs: Gmail,
 * Outlook.com and Yahoo strip `data:` out of `img src`, leaving only alt text.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface OtpEmailParams {
  /** Recipient's display name, used to personalise the greeting. */
  name: string;
  /** The one-time code to display. Never logged. */
  otp: string;
  /** How long the code stays valid, in minutes. */
  expiryMinutes: number;
  /**
   * Destination for the "Verify email address" button. Optional so existing
   * callers keep working; falls back to `EMAIL_VERIFY_URL` (or a sane default).
   */
  verifyUrl?: string;
}

/**
 * An image referenced from template markup as `cid:<contentId>`.
 */
export interface InlineAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  attachments: InlineAttachment[];
}

const DEFAULT_VERIFY_URL =
  process.env["EMAIL_VERIFY_URL"] ?? "https://enginex.app/verify-email";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Load a template file once and cache it. Resolved relative to this module so
 * it works the same under tsx, the compiled build, and the test runner.
 */
const templateCache = new Map<string, string>();

const TEMPLATES_DIR = join(
  process.cwd(),
  "src",
  "shared",
  "email",
  "templates",
);

const loadTemplate = (fileName: string): string => {
  const cached = templateCache.get(fileName);
  if (cached !== undefined) {
    return cached;
  }
  const contents = readFileSync(join(TEMPLATES_DIR, fileName), "utf-8");
  templateCache.set(fileName, contents);
  return contents;
};

const assetCache = new Map<string, Buffer>();

const loadAsset = (fileName: string): Buffer => {
  const cached = assetCache.get(fileName);
  if (cached !== undefined) {
    return cached;
  }
  const contents = readFileSync(join(TEMPLATES_DIR, fileName));
  assetCache.set(fileName, contents);
  return contents;
};

/** `cid` referenced by the `<img src="cid:enginex-logo">` in the templates. */
const LOGO_CONTENT_ID = "enginex-logo";

const buildLogoAttachment = (): InlineAttachment => ({
  filename: "enginex-logo.png",
  content: loadAsset("enginex-logo.png"),
  contentType: "image/png",
  contentId: LOGO_CONTENT_ID,
});

/**
 * Replace every `{{key}}` placeholder with its (already-safe) replacement.
 * Uses split/join rather than a RegExp so replacement values are inserted
 * verbatim and can never be interpreted as replacement patterns.
 */
const fillTemplate = (
  template: string,
  values: Record<string, string>,
): string =>
  Object.entries(values).reduce(
    (html, [key, value]) => html.split(`{{${key}}}`).join(value),
    template,
  );

/**
 * Verification email carrying the OTP a user must enter to confirm their email.
 */
export const buildOtpVerificationEmail = (
  params: OtpEmailParams,
): RenderedEmail => {
  const expiryUnit = params.expiryMinutes === 1 ? "minute" : "minutes";
  const expiryText = `${params.expiryMinutes} ${expiryUnit}`;

  const subject = "Verify your Enginex email address";

  const html = fillTemplate(loadTemplate("otp-verification.html"), {
    name: escapeHtml(params.name),
    otp: escapeHtml(params.otp),
    expiryText: escapeHtml(expiryText),
    verifyUrl: escapeHtml(params.verifyUrl ?? DEFAULT_VERIFY_URL),
  });

  return { subject, html, attachments: [buildLogoAttachment()] };
};
