import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Save, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";

const APP_VERSION = "1.0";

export const SettingsSection = (): JSX.Element => {
  const { settings, refreshSettings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const [formData, setFormData] = useState({
    website_name: settings.website_name || "BaseList",
    website_description: settings.website_description || "Buy, sell, and connect—DoD verified.",
    website_logo_url: settings.website_logo_url || "/logo.png",
    support_email: settings.support_email || "support@yourdomain.com",
    admin_email: settings.admin_email || "admin@yourdomain.com",
    mailing_address: settings.mailing_address || "123 Main Street, Anytown, ST 12345",
    phone_number: settings.phone_number || "+1 (123) 456-7890",
    facebook_url: settings.facebook_url || "",
    twitter_url: settings.twitter_url || "",
    instagram_url: settings.instagram_url || "",
    footer_copyright: settings.footer_copyright || `© ${new Date().getFullYear()} BaseList. All rights reserved.`,
    footer_show_links: settings.footer_show_links || "true",
  });

  const [adminFormData, setAdminFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Failed to save settings");
        return;
      }

      await refreshSettings();
      setIsSaved(true);
      toast.success("Settings saved successfully!");

      // Reset saved indicator after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAccountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setAdminFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateAdminAccount = async () => {
    if (!adminFormData.username && !adminFormData.email && !adminFormData.newPassword) {
      toast.error("Please provide at least one change");
      return;
    }

    if (adminFormData.newPassword && adminFormData.newPassword !== adminFormData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (adminFormData.newPassword && adminFormData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    try {
      setIsAdminLoading(true);
      const response = await fetch("/api/admin/update-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminFormData.username || undefined,
          email: adminFormData.email || undefined,
          currentPassword: adminFormData.currentPassword || undefined,
          newPassword: adminFormData.newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update admin account");
        return;
      }

      toast.success("Admin account updated successfully!");
      setAdminFormData({
        username: "",
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update admin account";
      toast.error(errorMsg);
    } finally {
      setIsAdminLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">
            Manage your admin account, website information, and contact details
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
          <Info className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">v{APP_VERSION}</span>
        </div>
      </div>

      {/* Admin Account Settings */}
      <Card className="p-6 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Super Admin Account</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                type="text"
                name="username"
                value={adminFormData.username}
                onChange={handleAdminAccountChange}
                placeholder="Enter new username"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to keep current
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={adminFormData.email}
                onChange={handleAdminAccountChange}
                placeholder="Enter new email"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to keep current
              </p>
            </div>
          </div>

          {showPasswordForm ? (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={adminFormData.currentPassword}
                  onChange={handleAdminAccountChange}
                  placeholder="��•••••••"
                  className="rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    type="password"
                    name="newPassword"
                    value={adminFormData.newPassword}
                    onChange={handleAdminAccountChange}
                    placeholder="••••••••"
                    className="rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min 8 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    value={adminFormData.confirmPassword}
                    onChange={handleAdminAccountChange}
                    placeholder="••••••••"
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowPasswordForm(true)}
              variant="outline"
              className="w-full"
            >
              Change Password
            </Button>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleUpdateAdminAccount}
              disabled={isAdminLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {isAdminLoading ? "Updating..." : "Update Admin Account"}
            </Button>
            {showPasswordForm && (
              <Button
                onClick={() => {
                  setShowPasswordForm(false);
                  setAdminFormData((prev) => ({
                    ...prev,
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  }));
                }}
                variant="outline"
                className="rounded-lg"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Website Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Website Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website Name
            </label>
            <Input
              type="text"
              name="website_name"
              value={formData.website_name}
              onChange={handleChange}
              placeholder="BaseList"
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Appears in header and throughout the site
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website Description
            </label>
            <Textarea
              name="website_description"
              value={formData.website_description}
              onChange={handleChange}
              placeholder="Buy, sell, and connect—DoD verified."
              className="rounded-lg"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              Short tagline or description of your site
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <Input
              type="text"
              name="website_logo_url"
              value={formData.website_logo_url}
              onChange={handleChange}
              placeholder="/logo.png"
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Path to your website logo image
            </p>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support Email
              </label>
              <Input
                type="email"
                name="support_email"
                value={formData.support_email}
                onChange={handleChange}
                placeholder="support@yourdomain.com"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                User support email address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <Input
                type="email"
                name="admin_email"
                value={formData.admin_email}
                onChange={handleChange}
                placeholder="admin@yourdomain.com"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Administrator email address
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mailing Address
            </label>
            <Textarea
              name="mailing_address"
              value={formData.mailing_address}
              onChange={handleChange}
              placeholder="123 Main Street, Anytown, ST 12345"
              className="rounded-lg"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              Physical mailing address (shown in footer)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+1 (123) 456-7890"
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Contact phone number (shown in footer)
            </p>
          </div>
        </div>
      </Card>

      {/* Social Media */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facebook URL
              </label>
              <Input
                type="url"
                name="facebook_url"
                value={formData.facebook_url}
                onChange={handleChange}
                placeholder="https://facebook.com/yourpage"
                className="rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter URL
              </label>
              <Input
                type="url"
                name="twitter_url"
                value={formData.twitter_url}
                onChange={handleChange}
                placeholder="https://twitter.com/yourhandle"
                className="rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram URL
              </label>
              <Input
                type="url"
                name="instagram_url"
                value={formData.instagram_url}
                onChange={handleChange}
                placeholder="https://instagram.com/yourhandle"
                className="rounded-lg"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Leave blank to hide social links in footer
          </p>
        </div>
      </Card>

      {/* Footer Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Footer Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Copyright Text
            </label>
            <Input
              type="text"
              name="footer_copyright"
              value={formData.footer_copyright}
              onChange={handleChange}
              placeholder={`© ${new Date().getFullYear()} BaseList. All rights reserved.`}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Appears at the bottom of every page
            </p>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="footer_show_links"
                checked={formData.footer_show_links === "true"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footer_show_links: e.target.checked ? "true" : "false",
                  }))
                }
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Show footer links (Privacy, Terms, Contact, FAQ)
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Save Section */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {isSaved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">All changes saved</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Info Box */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Changes take effect immediately</p>
          <p>All settings are updated across the website as soon as you save.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
