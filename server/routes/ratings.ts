import { Router, RequestHandler } from "express";
import { handler as ratingsHandler } from "../../netlify/functions/ratings";

const router = Router();

// Proxy GET and POST requests to the Netlify function
const handleRatings: RequestHandler = async (req, res) => {
  try {
    // Convert Express request to Netlify function event format
    const event = {
      httpMethod: req.method,
      path: req.path,
      rawQueryString: new URLSearchParams(
        req.query as Record<string, string>,
      ).toString(),
      body: req.method === "GET" ? null : JSON.stringify(req.body),
      headers: req.headers as Record<string, string>,
    };

    const response = await ratingsHandler(event as any, {} as any);

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
