import { Hono } from 'hono';
import { mkdir } from 'node:fs/promises';
import { deploy } from './deploy';
import { getAll, getById, remove } from './registry';
import { removeRoute } from './caddy';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

app.get('/deployments', (c) => {
  return c.json(getAll());
});

app.delete('/deployments/:id', async (c) => {
  const id = c.req.param('id');
  const deployment = getById(id);
  if (!deployment) {
    return c.json({ error: 'Deployment not found' }, 404);
  }

  // 1. Stop and remove container
  try {
    const proc = Bun.spawn(['docker', 'rm', '-f', deployment.containerName]);
    await proc.exited;
  } catch (err: any) {
    console.warn(`[cleanup] Failed to remove Docker container: ${err.message}`);
  }

  // 2. Remove route in Caddy
  try {
    await removeRoute(`${deployment.name}.localhost`);
  } catch (err: any) {
    console.warn(`[cleanup] Failed to remove Caddy route: ${err.message}`);
  }

  // 3. Remove from registry
  remove(id);
  return c.json({ success: true, message: `Deployment ${id} stopped and removed.` });
});

app.post('/deploy', async (c) => {
  let source = "";

  // Check contentType
  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const repoUrl = formData.get('repoUrl');

    if (file && file instanceof File) {
      const uploadID = crypto.randomUUID();
      const zipPath = `/tmp/uploads/${uploadID}.zip`;
      await mkdir('/tmp/uploads', { recursive: true });
      await Bun.write(zipPath, file);
      source = zipPath;
    } else if (repoUrl && typeof repoUrl === 'string') {
      source = repoUrl;
    }
  } else {
    // Try reading JSON body
    try {
      const json = await c.req.json();
      source = json.repoUrl || "";
    } catch {
      // Ignore parse issues, fallback to query
    }
  }

  // Fallback to query param
  if (!source) {
    source = c.req.query('repoUrl') || "";
  }

  if (!source) {
    return c.json({ error: 'Please provide either a "file" upload or a "repoUrl".' }, 400);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const deployGen = deploy(source);
        for await (const log of deployGen) {
          controller.enqueue(encoder.encode(`data: ${log}\n\n`));
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: Deployment failed: ${err.message}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

export default app;
