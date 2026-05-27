import { Hono } from 'hono'
import { mkdir } from 'node:fs/promises'

const app = new Hono()

app.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file found in request'}, 400);
  }
  const uploadID = crypto.randomUUID();
  const zipPath = `/tmp/uploads/${uploadID}.zip`;
  const extractDir = `/tmp/builds/${uploadID}`;

  await mkdir('/tmp/uploads', { recursive: true });
  await mkdir(extractDir, { recursive: true });
  await Bun.write(zipPath, file);

  const proc = Bun.spawn(['unzip', zipPath, '-d', extractDir], {
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text();
    return c.json({ error: "Extraction failed", details: errText }, 500);
  }

  const lsproc = Bun.spawn(['find', extractDir, '-type', 'f'], {
    stderr: 'pipe',
  });
  await lsproc.exited;
  const fileList = (await new Response(lsproc.stdout).text()).trim().split('/n').filter(Boolean);
  return c.json({ extractionPath: extractDir, files: fileList, });
});

app.post('/clone', async (c) => {
  const body = await c.req.json();
  const repoUrl: string = body.repoUrl;
  if (!repoUrl || !repoUrl.startsWith('https://')) {
    return c.json({ error: 'repoUrl must be a valid HTTPS URL'}, 400);
  }  

  const cloneID = crypto.randomUUID();
  const cloneDir = `/tmp/builds/${cloneID}`;
  await mkdir(cloneDir, { recursive: true});

  const proc = Bun.spawn(['git', 'clone', '--depth', '1', repoUrl, cloneDir], {
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text();
    return c.json({ error: 'git clone failed', details: errText }, 500);
  }
  return c.json({ clonePath: cloneDir, repoUrl });
});