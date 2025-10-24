import { Router, RequestHandler } from "express";
import { handler as ratingsHandler } from "../../netlify/functions/ratings";

const router = Router();

// Proxy GET and POST requests to the Netlify function
const handleRatings: RequestHandler = async (req, res) => {
  try {
    console.log("[Ratings Router] Request received");
    console.log("[Ratings Router] Method:", req.method);
    console.log("[Ratings Router] Query params:", req.query);
    console.log("[Ratings Router] Body:", req.body);

    // Build rawQueryString from Express query object
    const queryParams = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    });
    const rawQueryString = queryParams.toString();

    console.log("[Ratings Router] rawQueryString:", rawQueryString);

    // Convert Express request to Netlify function event format
    const event = {
      httpMethod: req.method,
      path: req.path,
      rawQueryString: rawQueryString,
      body: req.method === "GET" ? null : JSON.stringify(req.body),
      headers: req.headers as Record<string, string>,
    };

    console.log("[Ratings Router] Event:", JSON.stringify(event, null, 2));

    const response = await ratingsHandler(event as any, {} as any);

    console.log("[Ratings Router] Response status:", response.statusCode);

    res.status(response.statusCode || 200);
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.set(key, String(value));
      });
    }
    res.send(response.body);
  } catch (error) {
    console.error("[Ratings Router] Error:", error);
    res.status(500).json({ error: "Failed to process ratings request" });
  }
};

router.get("/", handleRatings);
router.post("/", handleRatings);
router.options("/", (_req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.status(204).send();
});

export { router as ratingsRouter };
