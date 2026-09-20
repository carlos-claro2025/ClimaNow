// CORS proxy for the CEMADEN public alerts API.
//
// painelalertas.cemaden.gov.br answers 200 with valid JSON but sends no
// Access-Control-Allow-Origin header, so browsers block it. This worker runs
// on Wasmer Edge, re-exposes the same paths under a CORS-enabled origin, and
// passes the upstream body through untouched.

const UPSTREAM = "https://painelalertas.cemaden.gov.br";
const ALLOWED_PATHS = ["/wsAlertas", "/wsAlertas2"];

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400",
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, CORS_HEADERS),
  });
}

async function handler(request) {
  if (request.method === "OPTIONS") {
    // `new Response(null, ...)` throws in WinterJS, so reply with a JSON body.
    return json({ ok: true }, 200);
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method not allowed" }, 405);
  }

  const path = new URL(request.url).pathname;

  if (path === "/" || path === "/health") {
    return json({ service: "cemaden-cors-proxy", upstream: UPSTREAM, paths: ALLOWED_PATHS }, 200);
  }
  if (ALLOWED_PATHS.indexOf(path) === -1) {
    return json({ error: "not found", allowed: ALLOWED_PATHS }, 404);
  }

  let upstream;
  try {
    upstream = await fetch(UPSTREAM + path, {
      headers: {
        accept: "application/json",
        origin: UPSTREAM,
        referer: UPSTREAM + "/",
        "user-agent": "climanow-cemaden-proxy/1.0",
      },
    });
  } catch (err) {
    return json({ error: "upstream unreachable", detail: String(err) }, 502);
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: Object.assign(
      {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
      CORS_HEADERS
    ),
  });
}

addEventListener("fetch", function (event) {
  event.respondWith(handler(event.request));
});