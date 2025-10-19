import sgMail from "@sendgrid/mail";

interface TransactionalEmail {
  to: string;
  subject: string;
  template: "verify" | "reset" | "report-receipt" | string;
  context?: Record<string, unknown>;
}

const getEmailConfig = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@baselist.mil";

  return { apiKey, fromEmail };
};

const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const buildVerificationEmailBody = (code: string): string => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verify your BaseList account</h2>
        <p>Hi,</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="letter-spacing: 5px; color: #1565c0; margin: 0;">${code}</h1>
        </div>
        <p>Enter this code in the BaseList app to verify your account. The code expires in 10 minutes.</p>
        <p>If you didn't sign up for BaseList, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">BaseList - Verified classifieds for military bases</p>
      </body>
    </html>
  `;
};

export const sendTransactionalEmail = async (email: TransactionalEmail) => {
  const { apiKey, fromEmail } = getEmailConfig();

  if (process.env.NODE_ENV !== "production") {
    console.info("[email:stub]", { ...email, preview: true });
    return { ok: true };
  }

  if (!apiKey) {
    console.error("SENDGRID_API_KEY is not set");
    return { ok: false };
  }

  try {
    sgMail.setApiKey(apiKey);

    let htmlContent = "";

    if (email.template === "verify" && email.context?.code) {
      htmlContent = buildVerificationEmailBody(email.context.code as string);
    } else {
      htmlContent = `<p>Email template '${email.template}' not yet implemented</p>`;
    }

    const msg = {
      to: email.to,
      from: fromEmail,
      subject: email.subject,
      html: htmlContent,
    };

    await sgMail.send(msg);
    console.log(`[email:sent] to: ${email.to}, template: ${email.template}`);
    return { ok: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { ok: false };
  }
};

export const sendVerificationCode = async (
  email: string,
  code: string,
): Promise<boolean> => {
  try {
    const result = await sendTransactionalEmail({
      to: email,
      subject: "Verify your BaseList account",
      template: "verify",
      context: {
        code,
        email,
      },
    });
    return result.ok;
  } catch (error) {
    console.error("Failed to send verification code email:", error);
    return false;
  }
};
