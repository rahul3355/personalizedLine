import type { NextApiRequest, NextApiResponse } from "next";

function getNormalizedBaseUrl() {
  const targetBaseUrl = process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_URL;

  if (!targetBaseUrl) {
    throw new Error(
      "API proxy is misconfigured. Set API_PROXY_TARGET or NEXT_PUBLIC_API_URL so requests can be forwarded to the backend."
    );
  }

  return targetBaseUrl.endsWith("/")
    ? targetBaseUrl.slice(0, -1)
    : targetBaseUrl;
}

function buildTargetUrl(req: NextApiRequest) {
  const { path = [] } = req.query;
  const pathname = Array.isArray(path) ? path.join("/") : path;

  const searchParams = new URLSearchParams();
  Object.entries(req.query).forEach(([key, value]) => {
    if (key === "path") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        searchParams.append(key, item);
      });
      return;
    }

    if (typeof value === "string") {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  const baseUrl = getNormalizedBaseUrl();

  return `${baseUrl}/${pathname}${queryString ? `?${queryString}` : ""}`;
}

async function readRequestBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const headers: Record<string, string> = {};

  Object.entries(req.headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (key.toLowerCase() === "host") {
      return;
    }

    if (Array.isArray(value)) {
      headers[key] = value.join(",");
    } else {
      headers[key] = value;
    }
  });

  let body: Buffer | undefined;
  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    body = await readRequestBody(req);
  }

  try {
    const targetUrl = buildTargetUrl(req);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") {
        return;
      }

      res.setHeader(key, value);
    });

    const responseBuffer = Buffer.from(await response.arrayBuffer());
    res.send(responseBuffer);
  } catch (error) {
    console.error("API proxy error", error);
    const message =
      error instanceof Error ? error.message : "Failed to reach backend service";
    const statusCode = message.includes("misconfigured") ? 500 : 502;

    res.status(statusCode).json({ error: message });
  }
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
