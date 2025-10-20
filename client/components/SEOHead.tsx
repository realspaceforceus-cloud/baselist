import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
}

export const SEOHead = ({
  title,
  description,
  keywords,
  canonical,
  ogImage = "https://trustypcs.com/og-image.png",
}: SEOHeadProps): null => {
  useEffect(() => {
    // Update page title
    document.title = title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute("content", description);

    // Update keywords if provided
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute("content", keywords);
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink && canonical) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    if (canonicalLink && canonical) {
      canonicalLink.setAttribute("href", canonical);
    }

    // Update Open Graph tags
    const ogTags = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: ogImage },
      { property: "twitter:title", content: title },
      { property: "twitter:description", content: description },
      { property: "twitter:image", content: ogImage },
    ];

    ogTags.forEach(({ property, content }) => {
      let metaTag = document.querySelector(`meta[property="${property}"]`);
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("property", property);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute("content", content);
    });
  }, [title, description, keywords, canonical, ogImage]);

  return null;
};
