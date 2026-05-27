import { mkdir } from 'node:fs/promises';
import { build } from './builder';
import { runContainer } from './runner';
import { addRoute } from './caddy';
import { create, findAvailablePort } from './registry';

async function cloneRepo(repoUrl: string): Promise<string> {
  if (!repoUrl || !repoUrl.startsWith('https://')) {
    throw new Error('repoUrl must be a valid HTTPS URL');
  }  

  const cloneID = crypto.randomUUID();
  const cloneDir = `/tmp/builds/${cloneID}`;
  await mkdir(cloneDir, { recursive: true });

  const proc = Bun.spawn(['git', 'clone', '--depth', '1', repoUrl, cloneDir], {
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text();
    const error = new Error('git clone failed');
    (error as any).cause = errText;
    throw error;
  }
  return cloneDir;
}

async function extractZip(zipFilePath: string): Promise<string> {
  const uploadID = crypto.randomUUID();
  const extractDir = `/tmp/builds/${uploadID}`;
  await mkdir(extractDir, { recursive: true });

  const proc = Bun.spawn(['unzip', zipFilePath, '-d', extractDir], {
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text();
    const error = new Error('Extraction failed');
    (error as any).cause = errText;
    throw error;
  }
  return extractDir;
}

export async function* deploy(source: string): AsyncGenerator<string, void, unknown> {
  const deploymentId = crypto.randomUUID();
  yield `[orchestrator] Starting deployment process (ID: ${deploymentId})`;

  let buildDir = "";
  if (source.startsWith("http://") || source.startsWith("https://")) {
    yield `[orchestrator] Cloned repository from Git URL...`;
    try {
      buildDir = await cloneRepo(source);
      yield `[orchestrator] Repository cloned successfully to ${buildDir}`;
    } catch (err: any) {
      yield `[orchestrator] Git clone failed: ${err.message}`;
      if (err.cause) yield `[stderr] ${err.cause}`;
      throw err;
    }
  } else {
    yield `[orchestrator] Extracting source from zip path: ${source}...`;
    try {
      buildDir = await extractZip(source);
      yield `[orchestrator] Zip extracted successfully to ${buildDir}`;
    } catch (err: any) {
      yield `[orchestrator] Zip extraction failed: ${err.message}`;
      if (err.cause) yield `[stderr] ${err.cause}`;
      throw err;
    }
  }

  const imageTag = `app-${deploymentId}`;
  yield `[orchestrator] Initiating Railpack build for image: ${imageTag}...`;

  try {
    const buildStream = build(buildDir, imageTag);
    const reader = buildStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield `[builder] ${value.trim()}`;
    }
  } catch (err: any) {
    yield `[orchestrator] Build process failed: ${err.message}`;
    throw err;
  }

  yield `[orchestrator] Allocating network resources and assigning port...`;
  try {
    const hostPort = findAvailablePort();
    const containerName = `app-${deploymentId}`;
    const subdomain = `${imageTag}.localhost`; // Reachable host under Caddy reverse-proxy

    yield `[orchestrator] Running container "${containerName}" on port ${hostPort} (internal: 3000)...`;
    await runContainer(imageTag, String(hostPort), "3000", containerName);

    yield `[orchestrator] Registering route in Caddy for http://${subdomain} -> localhost:${hostPort}...`;
    await addRoute(subdomain, hostPort);

    yield `[orchestrator] Registering deployment in memory database...`;
    create(
      deploymentId,
      imageTag,
      source,
      hostPort,
      containerName,
      "running",
      new Date()
    );

    yield `[orchestrator] Deployment completed successfully!`;
    yield `[orchestrator] URL: http://${subdomain}`;
  } catch (err: any) {
    yield `[orchestrator] Runtime orchestration failed: ${err.message}`;
    throw err;
  }
}