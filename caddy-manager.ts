async function listRoutes() {
  const response = await fetch('http://localhost:2019/config/apps/http/servers/srv0/routes');
  const data = await response.json();
  if (data === null) {
    console.log("Null")
  }
  console.log(JSON.stringify(data, null, 2));
}

async function addRoute(subdomain: string, upstreamPort: number) {
  const route = {
    match: [{
      host: [subdomain]
    }],
    handle: [{
      handler: "reverse_proxy",
      upstreams: [{ dial: `localhost:${upstreamPort}` }]
    }]
  };
  const response = await fetch('http://localhost:2019/config/apps/http/servers/srv0/routes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(route),
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

type CaddyRoute = {
  match?: { host: string[] }[];
  handle: object[];
}
async function removeRoute(subdomain: string) {
  const data = await fetch('http://localhost:2019/config/apps/http/servers/srv0/routes'); 
  const routes = await data.json() as CaddyRoute[];
  for (let i = routes.length - 1; i >= 0; i--) {
    if (routes[i].match?.[0]?.host?.[0] === subdomain) {
      await fetch(`http://localhost:2019/config/apps/http/servers/srv0/routes/${i}`, {
        method: 'DELETE',
      });
    }
  }
}

async function main() {
  await listRoutes();
  await addRoute("myapp.localhost", 3000);
  await listRoutes();
  await removeRoute("myapp.localhost");
  await listRoutes();
}

main();
