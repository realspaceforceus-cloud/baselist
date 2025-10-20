/**
 * SEO Settings Configuration
 * 
 * This file centralizes all SEO-related settings and metadata.
 * Admins can update these settings through the admin panel to control:
 * - Page titles and meta descriptions
 * - Taglines and branding
 * - Keywords by page
 * - Local SEO (base-specific content)
 */

export interface SEOConfig {
  // Primary tagline
  primary_tagline: string;
  // Secondary/visual tagline  
  secondary_tagline: string;
  // Homepage meta description
  homepage_meta_description: string;
  // Base page title template (use {{base_name}} placeholder)
  base_page_title_template: string;
  // Base page description template (use {{base_name}} placeholder)
  base_page_description_template: string;
  // Primary keywords (comma-separated)
  primary_keywords: string;
  // Local/geographic keywords (comma-separated)
  local_keywords: string;
  // Trust/community keywords (comma-separated)
  trust_keywords: string;
}

// Default SEO configuration
export const DEFAULT_SEO_CONFIG: SEOConfig = {
  primary_tagline: "Military PCS Marketplace — Buy, Sell & Connect with Verified DoW Families",
  secondary_tagline: "The Trusted Marketplace for Military PCS Moves",
  homepage_meta_description: "TrustyPCS is the secure marketplace built for military members and DoW families. Buy, sell, and connect with verified users during your PCS relocation.",
  base_page_title_template: "{{base_name}} Military PCS Marketplace | Buy & Sell Locally | TrustyPCS",
  base_page_description_template: "Buy and sell locally at {{base_name}}. TrustyPCS connects verified DoD families for safe PCS relocation sales near {{base_name}}.",
  primary_keywords: "military PCS marketplace, PCS relocation sales, military base classifieds, military yard sale online, military moving sale, DoD family marketplace",
  local_keywords: "military classifieds, Fort Liberty PCS sales, Fayetteville military marketplace, San Antonio PCS, Ramstein Air Base classifieds",
  trust_keywords: "DoD verified marketplace, secure military marketplace, trusted PCS sales, verified military families only, family-friendly PCS community",
};

/**
 * Helper function to render SEO settings in admin panel
 * Admin can edit these values which get stored in the settings table
 */
export const SEO_ADMIN_FIELDS = [
  {
    key: "primary_tagline",
    label: "Primary Tagline (SEO)",
    type: "textarea",
    description: "Used in homepage hero and meta descriptions",
    category: "SEO & Branding",
  },
  {
    key: "secondary_tagline",
    label: "Secondary Tagline (Visual)",
    type: "text",
    description: "Used under logo and in social sharing",
    category: "SEO & Branding",
  },
  {
    key: "homepage_meta_description",
    label: "Homepage Meta Description",
    type: "textarea",
    description: "160 characters shown in Google search results",
    category: "Homepage SEO",
  },
  {
    key: "base_page_title_template",
    label: "Base Page Title Template",
    type: "textarea",
    description: "Use {{base_name}} placeholder for dynamic titles",
    category: "Location SEO",
  },
  {
    key: "base_page_description_template",
    label: "Base Page Description Template",
    type: "textarea",
    description: "Use {{base_name}} placeholder for dynamic descriptions",
    category: "Location SEO",
  },
  {
    key: "primary_keywords",
    label: "Primary Keywords",
    type: "textarea",
    description: "Comma-separated keywords targeting buyers/sellers",
    category: "Keywords",
  },
  {
    key: "local_keywords",
    label: "Local/Geographic Keywords",
    type: "textarea",
    description: "Comma-separated keywords for location-based SEO",
    category: "Keywords",
  },
  {
    key: "trust_keywords",
    label: "Trust & Community Keywords",
    type: "textarea",
    description: "Comma-separated keywords for trust/credibility",
    category: "Keywords",
  },
];

/**
 * Get SEO config from settings or use defaults
 */
export function getSEOConfig(settings: Record<string, string>): SEOConfig {
  return {
    primary_tagline: settings.primary_tagline || DEFAULT_SEO_CONFIG.primary_tagline,
    secondary_tagline: settings.secondary_tagline || DEFAULT_SEO_CONFIG.secondary_tagline,
    homepage_meta_description: settings.homepage_meta_description || DEFAULT_SEO_CONFIG.homepage_meta_description,
    base_page_title_template: settings.base_page_title_template || DEFAULT_SEO_CONFIG.base_page_title_template,
    base_page_description_template: settings.base_page_description_template || DEFAULT_SEO_CONFIG.base_page_description_template,
    primary_keywords: settings.primary_keywords || DEFAULT_SEO_CONFIG.primary_keywords,
    local_keywords: settings.local_keywords || DEFAULT_SEO_CONFIG.local_keywords,
    trust_keywords: settings.trust_keywords || DEFAULT_SEO_CONFIG.trust_keywords,
  };
}

/**
 * Replace template placeholders with actual values
 */
export function renderTemplate(template: string, replacements: Record<string, string>): string {
  let result = template;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
}
