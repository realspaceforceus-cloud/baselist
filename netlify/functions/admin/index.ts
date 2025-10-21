import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-credentials": "true",
    },
    body: JSON.stringify({
      ok: true,
      method: event.httpMethod,
      path: event.path,
      rawUrl: event.rawUrl,
      qs: event.queryStringParameters,
      body: event.body ? "present" : "empty",
    }),
  };
};
