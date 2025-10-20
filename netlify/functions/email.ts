import { Handler } from "@netlify/functions";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@baselist.mil";

// Simple email sending using environment setup
const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<boolean> => {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@baselist.mil";

    if (!apiKey) {
      console.log("[EMAIL] SendGrid API key not configured - logging instead");
      console.log(`[EMAIL] To: ${to}`);
      console.log(`[EMAIL] Subject: ${subject}`);
      console.log(`[EMAIL] HTML: ${html.substring(0, 200)}...`);
      return true; // Return true for graceful degradation
    }

    const requestBody = {
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: {
        email: fromEmail,
      },
      subject,
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    };

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[EMAIL] SendGrid error (${response.status}):`, error);
      return false;
    }

    console.log(`[EMAIL] Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending email:", error);
    return false;
  }
};

const handleBaseRequest = async (event: any) => {
  const { baseName, email } = JSON.parse(event.body || "{}");

  if (!baseName || !email) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing baseName or email" }),
    };
  }

  try {
    const userEmail = email.trim().toLowerCase();
    const baseNameTrimmed = baseName.trim();

    console.log(
      `[EMAIL] Base request received from ${userEmail} for ${baseNameTrimmed}`,
    );

    // Send email to user confirming receipt
    const userConfirmationHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Base Request Received</h2>
          <p>Hi,</p>
          <p>Thank you for requesting <strong>${baseNameTrimmed}</strong> to be added to BaseList.</p>
          <p>Our team will review your request and add it to the platform shortly. We'll notify you when it's ready.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">BaseList - Verified classifieds for military bases</p>
        </body>
      </html>
    `;

    // Send email to admins about the request
    const adminHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>New Base Request</h2>
          <p><strong>Base Name:</strong> ${baseNameTrimmed}</p>
          <p><strong>Requested By:</strong> ${userEmail}</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">BaseList Admin Notification</p>
        </body>
      </html>
    `;

    // Send both emails
    const userEmailSent = await sendEmail(
      userEmail,
      "Base Request Received - BaseList",
      userConfirmationHtml,
    );

    const adminEmailSent = await sendEmail(
      ADMIN_EMAIL,
      `New Base Request: ${baseNameTrimmed}`,
      adminHtml,
    );

    if (userEmailSent || adminEmailSent) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Base request submitted successfully",
          baseName: baseNameTrimmed,
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to send email" }),
      };
    }
  } catch (error) {
    console.error("[EMAIL] Error processing base request:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  }
};

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/email", "") || "";

  console.log("[EMAIL] Request received:", {
    method,
    path,
    url: event.rawUrl,
  });

  if (method === "POST" && (!path || path === "" || path === "/")) {
    const body = JSON.parse(event.body || "{}");
    const type = body.type;

    if (type === "base_request") {
      return handleBaseRequest(event);
    }

    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unknown email type" }),
    };
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Not found" }),
  };
};
