import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

interface EmailTemplate {
  id: string;
  name: string;
  templateKey: string;
  subject: string;
  htmlContent: string;
  description?: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

const mapRowToTemplate = (row: any): EmailTemplate => {
  return {
    id: row.id,
    name: row.name,
    templateKey: row.template_key,
    subject: row.subject,
    htmlContent: row.html_content,
    description: row.description,
    variables: Array.isArray(row.variables)
      ? row.variables
      : JSON.parse(row.variables || "[]"),
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
};

// GET /api/email-templates - Get all templates
const handleGetTemplates = async () => {
  try {
    const result = await pool.query(
      `SELECT id, name, template_key, subject, html_content, description,
              variables, is_active, created_by, created_at, updated_at, updated_by
       FROM email_templates
       ORDER BY created_at DESC`,
    );

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows.map(mapRowToTemplate)),
    };
  } catch (error) {
    console.error("Failed to get email templates:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch templates" }),
    };
  }
};

// GET /api/email-templates/:id - Get single template
const handleGetTemplate = async (templateKey: string) => {
  try {
    const result = await pool.query(
      `SELECT id, name, template_key, subject, html_content, description,
              variables, is_active, created_by, created_at, updated_at, updated_by
       FROM email_templates
       WHERE template_key = $1 AND is_active = true`,
      [templateKey],
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Template not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(mapRowToTemplate(result.rows[0])),
    };
  } catch (error) {
    console.error("Failed to get email template:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch template" }),
    };
  }
};

// POST /api/email-templates - Create template
const handleCreateTemplate = async (event: any, userId: string) => {
  try {
    const { name, templateKey, subject, htmlContent, description, variables } =
      JSON.parse(event.body || "{}");

    if (!name || !templateKey || !subject || !htmlContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Missing required fields: name, templateKey, subject, htmlContent",
        }),
      };
    }

    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO email_templates (id, name, template_key, subject, html_content, description, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, template_key, subject, html_content, description, variables, is_active, created_by, created_at, updated_at, updated_by`,
      [
        id,
        name,
        templateKey,
        subject,
        htmlContent,
        description || null,
        JSON.stringify(variables || []),
        userId,
      ],
    );

    return {
      statusCode: 201,
      body: JSON.stringify(mapRowToTemplate(result.rows[0])),
    };
  } catch (error) {
    console.error("Failed to create email template:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create template" }),
    };
  }
};

// PUT /api/email-templates/:id - Update template
const handleUpdateTemplate = async (
  event: any,
  templateId: string,
  userId: string,
) => {
  try {
    const { name, subject, htmlContent, description, variables, isActive } =
      JSON.parse(event.body || "{}");

    const updates: string[] = [];
    const values: unknown[] = [templateId, userId];
    let paramCount = 2;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (subject !== undefined) {
      paramCount++;
      updates.push(`subject = $${paramCount}`);
      values.push(subject);
    }

    if (htmlContent !== undefined) {
      paramCount++;
      updates.push(`html_content = $${paramCount}`);
      values.push(htmlContent);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (variables !== undefined) {
      paramCount++;
      updates.push(`variables = $${paramCount}`);
      values.push(JSON.stringify(variables));
    }

    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No fields to update" }),
      };
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount}`);
    values.push(userId);

    const query = `UPDATE email_templates
                   SET ${updates.join(", ")}
                   WHERE id = $1
                   RETURNING id, name, template_key, subject, html_content, description, variables, is_active, created_by, created_at, updated_at, updated_by`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Template not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(mapRowToTemplate(result.rows[0])),
    };
  } catch (error) {
    console.error("Failed to update email template:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update template" }),
    };
  }
};

// DELETE /api/email-templates/:id - Delete template
const handleDeleteTemplate = async (templateId: string) => {
  try {
    const result = await pool.query(
      "DELETE FROM email_templates WHERE id = $1",
      [templateId],
    );

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Template not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Template deleted successfully" }),
    };
  } catch (error) {
    console.error("Failed to delete email template:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to delete template" }),
    };
  }
};

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path =
    event.path.replace("/.netlify/functions/email-templates", "") ||
    event.rawUrl?.split("?")[0]?.replace(/.*email-templates/, "") ||
    "";

  const userId = event.headers["user-id"];

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  if (method === "GET" && path === "") {
    return handleGetTemplates();
  }

  if (method === "GET" && path) {
    const templateKey = path.replace("/", "");
    return handleGetTemplate(templateKey);
  }

  if (method === "POST" && path === "") {
    return handleCreateTemplate(event, userId);
  }

  if (method === "PUT") {
    const templateId = path.replace("/", "");
    return handleUpdateTemplate(event, templateId, userId);
  }

  if (method === "DELETE") {
    const templateId = path.replace("/", "");
    return handleDeleteTemplate(templateId);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
