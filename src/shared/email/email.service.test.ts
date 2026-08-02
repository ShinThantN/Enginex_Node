import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;

const mockSend = jest.fn() as AsyncMock<{ error: unknown }>;

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({
    emails: { send: mockSend },
  })),
}));

const loadService = async () => await import("./email.service.ts");

describe("Email Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env["RESEND_API_KEY"] = "re_test_key";
  });

  it("should send an OTP email through Resend with a rendered subject/body", async () => {
    mockSend.mockResolvedValue({ error: null });
    const { sendOtpEmail } = await loadService();

    await sendOtpEmail({
      to: "thura@gmail.com",
      name: "Thura",
      otp: "123456",
      expiryMinutes: 10,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(payload.to).toBe("thura@gmail.com");
    expect(payload.subject).toBe("Verify your Enginex email address");
    expect(payload.html).toContain("123456");
    expect(payload.html).toContain("Thura");
  });

  it("should raise a 502 AppError when the provider returns an error", async () => {
    mockSend.mockResolvedValue({ error: { message: "provider down" } });
    const { sendEmail } = await loadService();

    await expect(
      sendEmail({ to: "thura@gmail.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow(
      expect.objectContaining({
        message: "Failed to send email",
        statusCode: 502,
      }),
    );
  });

  it("should raise a 500 AppError when no API key is configured", async () => {
    delete process.env["RESEND_API_KEY"];
    const { sendEmail } = await loadService();

    await expect(
      sendEmail({ to: "thura@gmail.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow(
      expect.objectContaining({
        message: "Email service is not configured",
        statusCode: 500,
      }),
    );
  });
});
