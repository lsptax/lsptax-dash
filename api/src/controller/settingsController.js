import { sendError } from "../services/exportService.js";
import { parseSettingsPatch, saveAppSettings, serializeSettings } from "../utils/appSettings.js";
import { resetDocuSignAccessTokenCache } from "../controller/docuSignUtils.js";

export async function getInfraSettings(_req, res) {
  try {
    res.status(200).json(serializeSettings());
  } catch (error) {
    sendError(res, 500, "Failed to load settings", error);
  }
}

export async function updateInfraSettings(req, res) {
  try {
    const { updates, errors } = parseSettingsPatch(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }
    if (!updates.length) {
      return res.status(400).json({ message: "No settings to update" });
    }

    const settings = await saveAppSettings(updates, Number(req.user?.userId) || null);
    if (updates.some((row) => row.key.startsWith("DOCUSIGN_"))) {
      resetDocuSignAccessTokenCache();
    }
    res.status(200).json(settings);
  } catch (error) {
    sendError(res, 500, "Failed to save settings", error);
  }
}
