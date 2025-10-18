import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authenticate";
import { store } from "../data/store";

export const settingsRouter = Router();

// Get all settings (public - cached on client)
settingsRouter.get("/", async (_req, res) => {
  try {
    const settings = store.getSettings();
    
    // Convert array to object for easier access
    const settingsObj: Record<string, string> = {};
    settings.forEach((setting: any) => {
      settingsObj[setting.keyName] = setting.value;
    });

    res.json({
      success: true,
      settings: settingsObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
    });
  }
});

// Update settings (admin only)
settingsRouter.patch("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid settings format",
      });
    }

    // Update each setting
    const updatedSettings: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      // Validate key name (alphanumeric, underscore only)
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        return res.status(400).json({
          success: false,
          error: `Invalid setting key: ${key}`,
        });
      }

      // Store the setting
      store.updateSetting(key, String(value));
      updatedSettings[key] = String(value);
    }

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

// Get specific setting
settingsRouter.get("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const settings = store.getSettings();
    const setting = settings.find((s: any) => s.keyName === key);

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: "Setting not found",
      });
    }

    res.json({
      success: true,
      setting: {
        key: setting.keyName,
        value: setting.value,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch setting",
    });
  }
});
