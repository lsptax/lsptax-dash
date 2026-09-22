import { sendError } from "../services/exportService.js";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  resetEmailTemplate,
  updateEmailTemplate,
} from "../services/emailTemplateService.js";

export async function getEmailTemplates(_req, res) {
  try {
    res.status(200).json(await listEmailTemplates());
  } catch (error) {
    sendError(res, 500, "Failed to load email templates", error);
  }
}

export async function patchEmailTemplate(req, res) {
  try {
    const result = await updateEmailTemplate(
      req.params.key,
      req.body,
      Number(req.user?.userId) || null
    );
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.status(200).json(result.template);
  } catch (error) {
    sendError(res, 500, "Failed to save email template", error);
  }
}

export async function postEmailTemplate(req, res) {
  try {
    const result = await createEmailTemplate(req.body, Number(req.user?.userId) || null);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.status(201).json(result.template);
  } catch (error) {
    sendError(res, 500, "Failed to create email template", error);
  }
}

export async function removeEmailTemplate(req, res) {
  try {
    const result = await deleteEmailTemplate(req.params.key);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, 500, "Failed to delete email template", error);
  }
}
export async function postResetEmailTemplate(req, res) {
  try {
    const result = await resetEmailTemplate(
      req.params.key,
      Number(req.user?.userId) || null
    );
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.status(200).json(result.template);
  } catch (error) {
    sendError(res, 500, "Failed to reset email template", error);
  }
}
