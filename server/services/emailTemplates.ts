import { pool } from "../routes/auth";

export interface EmailTemplate {
  id: string;
  name: string;
  templateKey: string;
  subject: string;
  htmlContent: string;
  description?: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export const getEmailTemplate = async (
  templateKey: string,
): Promise<EmailTemplate | null> => {
  try {
    const result = await pool.query(
      `SELECT id, name, template_key, subject, html_content, description, 
              variables, is_active, created_by, created_at, updated_at, updated_by
       FROM email_templates
       WHERE template_key = $1 AND is_active = true`,
      [templateKey],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToTemplate(result.rows[0]);
  } catch (error) {
    console.error("Failed to get email template:", error);
    return null;
  }
};

export const getAllEmailTemplates = async (): Promise<EmailTemplate[]> => {
  try {
    const result = await pool.query(
      `SELECT id, name, template_key, subject, html_content, description,
              variables, is_active, created_by, created_at, updated_at, updated_by
       FROM email_templates
       ORDER BY created_at DESC`,
    );

    return result.rows.map(mapRowToTemplate);
  } catch (error) {
    console.error("Failed to get email templates:", error);
    return [];
  }
};

export const createEmailTemplate = async (
  userId: string,
  data: {
    name: string;
    templateKey: string;
    subject: string;
    htmlContent: string;
    description?: string;
    variables?: string[];
  },
): Promise<EmailTemplate | null> => {
  try {
    const { v4: uuidv4 } = await import("uuid");
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO email_templates (id, name, template_key, subject, html_content, description, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, template_key, subject, html_content, description, variables, is_active, created_by, created_at, updated_at, updated_by`,
      [
        id,
        data.name,
        data.templateKey,
        data.subject,
        data.htmlContent,
        data.description || null,
        JSON.stringify(data.variables || []),
        userId,
      ],
    );

    return mapRowToTemplate(result.rows[0]);
  } catch (error) {
    console.error("Failed to create email template:", error);
    return null;
  }
};

export const updateEmailTemplate = async (
  templateId: string,
  userId: string,
  data: {
    name?: string;
    subject?: string;
    htmlContent?: string;
    description?: string;
    variables?: string[];
    isActive?: boolean;
  },
): Promise<EmailTemplate | null> => {
  try {
    const updates: string[] = [];
    const values: unknown[] = [templateId, userId];
    let paramCount = 2;

    if (data.name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(data.name);
    }

    if (data.subject !== undefined) {
      paramCount++;
      updates.push(`subject = $${paramCount}`);
      values.push(data.subject);
    }

    if (data.htmlContent !== undefined) {
      paramCount++;
      updates.push(`html_content = $${paramCount}`);
      values.push(data.htmlContent);
    }

    if (data.description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(data.description);
    }

    if (data.variables !== undefined) {
      paramCount++;
      updates.push(`variables = $${paramCount}`);
      values.push(JSON.stringify(data.variables));
    }

    if (data.isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(data.isActive);
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount}`);
    values.push(userId);

    if (updates.length === 2) {
      // Only updated_at and updated_by, nothing else to update
      return null;
    }

    const query = `UPDATE email_templates
                   SET ${updates.join(", ")}
                   WHERE id = $1
                   RETURNING id, name, template_key, subject, html_content, description, variables, is_active, created_by, created_at, updated_at, updated_by`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToTemplate(result.rows[0]);
  } catch (error) {
    console.error("Failed to update email template:", error);
    return null;
  }
};

export const deleteEmailTemplate = async (
  templateId: string,
): Promise<boolean> => {
  try {
    const result = await pool.query(
      "DELETE FROM email_templates WHERE id = $1",
      [templateId],
    );

    return result.rowCount === 1;
  } catch (error) {
    console.error("Failed to delete email template:", error);
    return false;
  }
};

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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    updatedBy: row.updated_by,
  };
};
