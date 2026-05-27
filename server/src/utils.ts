import { spawn } from "bun";

export async function readLines(
  readable: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
) {
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line) onLine(line);
    }
  }
  if (buffer) onLine(buffer);
}

export async function spawnAndLog(cmd: string, args: string[]): Promise<void> {
  const proc = spawn([cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const decoder = new TextDecoder();

  await Promise.all([
    readLines(proc.stdout, (line) => console.log(`[stdout] ${line}`)),
    readLines(proc.stderr, (line) => console.log(`[stderr] ${line}`)),
  ]);

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")} (exit ${exitCode})`);
  }
}