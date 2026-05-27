const CADDY_ADMIN = `http://caddy:2019`;

async function caddyFetch(
  url: string,
  options: RequestInit,
  retries = 10,
  delay = 1000,
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Caddy error: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (i < retries - 1) {
        console.warn(`[caddy] Connection failed, retrying (${i + 1}/${retries})...`);
        await Bun.sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

export async function addRoute(subdomain: string, upstreamPort: number) {
  const url = `${CADDY_ADMIN}/config/apps/http/servers/caddy/routes`;
  const route = {
    match: [{ host: [subdomain] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: `localhost:${upstreamPort}` }], // ← fixed
      },
    ],
  };
  return caddyFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route),
  });
}

export async function removeRoute(subdomain: string) {
  // Find the route index first
  const routes: any[] = await listRoutes();
  const index = routes.findIndex((r) =>
    r.match?.some((m: any) => m.host?.includes(subdomain)),
  );
  if (index === -1) {
    throw new Error(`Route for ${subdomain} not found`);
  }
  return caddyFetch(`${CADDY_ADMIN}/config/apps/http/servers/caddy/routes/${index}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}

export async function listRoutes(): Promise<any[]> {
  return caddyFetch(`${CADDY_ADMIN}/config/apps/http/servers/caddy/routes`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}