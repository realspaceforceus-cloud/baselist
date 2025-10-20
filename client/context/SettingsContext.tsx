import React, { createContext, useContext, useEffect, useState } from "react";

export interface Settings {
  website_name: string;
  website_description: string;
  website_logo_url: string;
  support_email: string;
  admin_email: string;
  mailing_address: string;
  phone_number: string;
  facebook_url: string;
  twitter_url: string;
  instagram_url: string;
  footer_copyright: string;
  footer_show_links: string;
  [key: string]: string;
}

interface SettingsContextType {
  settings: Partial<Settings>;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings || {});
      } else {
        setError(data.error || "Failed to load settings");
        // Use defaults if load fails
        setSettings({
          website_name: "TrustyPCS",
          website_description: "Military PCS Marketplace - Buy, Sell & Connect with DoD Families",
          support_email: "support@trustypcs.com",
          admin_email: "admin@trustypcs.com",
          mailing_address: "123 Military Lane, Fort Base, ST 12345",
          phone_number: "+1 (555) PCS-SELL",
          footer_copyright: `© ${new Date().getFullYear()} TrustyPCS. All rights reserved.`,
          footer_show_links: "true",
          // SEO Settings
          primary_tagline: "Military PCS Marketplace — Buy, Sell & Connect with Verified DoD Families",
          secondary_tagline: "The Trusted Marketplace for Military PCS Moves",
          homepage_meta_description: "TrustyPCS is the secure marketplace built for military members and DoD families. Buy, sell, and connect with verified users during your PCS relocation.",
          base_page_title_template: "{{base_name}} Military PCS Marketplace | Buy & Sell Locally | TrustyPCS",
          base_page_description_template: "Buy and sell locally at {{base_name}}. TrustyPCS connects verified DoD families for safe PCS relocation sales near {{base_name}}.",
          primary_keywords: "military PCS marketplace, PCS relocation sales, military base classifieds, military yard sale online, military moving sale, DoD family marketplace",
          local_keywords: "military classifieds, Fort Liberty PCS sales, Fayetteville military marketplace, San Antonio PCS, Ramstein Air Base classifieds",
          trust_keywords: "DoD verified marketplace, secure military marketplace, trusted PCS sales, verified military families only, family-friendly PCS community",
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      // Use defaults on error
      setSettings({
        website_name: "TrustyPCS",
        website_description: "Military PCS Marketplace - Buy, Sell & Connect with DoD Families",
        support_email: "support@trustypcs.com",
        admin_email: "admin@trustypcs.com",
        mailing_address: "123 Military Lane, Fort Base, ST 12345",
        phone_number: "+1 (555) PCS-SELL",
        footer_copyright: `© ${new Date().getFullYear()} TrustyPCS. All rights reserved.`,
        footer_show_links: "true",
        // SEO Settings
        primary_tagline: "Military PCS Marketplace — Buy, Sell & Connect with Verified DoD Families",
        secondary_tagline: "The Trusted Marketplace for Military PCS Moves",
        homepage_meta_description: "TrustyPCS is the secure marketplace built for military members and DoD families. Buy, sell, and connect with verified users during your PCS relocation.",
        base_page_title_template: "{{base_name}} Military PCS Marketplace | Buy & Sell Locally | TrustyPCS",
        base_page_description_template: "Buy and sell locally at {{base_name}}. TrustyPCS connects verified DoD families for safe PCS relocation sales near {{base_name}}.",
        primary_keywords: "military PCS marketplace, PCS relocation sales, military base classifieds, military yard sale online, military moving sale, DoD family marketplace",
        local_keywords: "military classifieds, Fort Liberty PCS sales, Fayetteville military marketplace, San Antonio PCS, Ramstein Air Base classifieds",
        trust_keywords: "DoD verified marketplace, secure military marketplace, trusted PCS sales, verified military families only, family-friendly PCS community",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};
