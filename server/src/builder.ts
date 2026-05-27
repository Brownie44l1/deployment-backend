import { spawn } from "bun";
import { readLines } from "./utils";

export function build(
  sourcePath: string,
  imageTag: string,
): ReadableStream<string> {
  let controller!: ReadableStreamDefaultController<string>;

  const stream = new ReadableStream<string>({
    start(c) {
      controller = c;
    },
  });

  (async () => {
    const proc = spawn(["railpack", "build", "--name", imageTag, sourcePath], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stderrChunks: string[] = [];
    const decoder = new TextDecoder();

    try {
      await Promise.all([
        readLines(proc.stdout, (line) => controller.enqueue(line)),
        readLines(proc.stderr, (line) => { controller.enqueue(line); stderrChunks.push(line); }),
      ]);

      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        throw new Error(stderrChunks.join("\n"));
      }
      controller.close();
    } catch (err) {
      controller.error(err);
    }
  })();

  return stream;
}
