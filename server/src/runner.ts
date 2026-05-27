import { spawnAndLog } from "./utils";

export async function runContainer(
  tag: string,
  hostPort: string,
  containerPort: string,
  name: string,
): Promise<void> {
  const checkResult = await Bun.$`docker ps -a -q -f name=^/${name}$`.text();
  const containerExists = checkResult.trim().length > 0;

  if (containerExists) {
    console.log(`[cleanup] Found existing container "${name}". Removing...`);
    await spawnAndLog("docker", ["rm", "-f", name]);
  } else {
    console.log(
      `[cleanup] No existing container named "${name}". Skipping removal.`,
    );
  }
  await spawnAndLog("docker", [
    "run",
    "-d",
    "--name",
    name,
    "-p",
    `${hostPort}:${containerPort}`,
    tag,
  ]);
}