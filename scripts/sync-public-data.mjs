import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public", "data");
const inputs = ["data/real", "data/news"];

async function filesUnder(directory) {
  const entries = await readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(relative) : [relative];
    })
  );
  return nested.flat().sort();
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const input of inputs) {
  await cp(path.join(root, input), path.join(output, path.basename(input)), {
    recursive: true,
  });
}

const files = (await Promise.all(inputs.map(filesUnder))).flat().sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(path.join(root, file)));
}

const live = JSON.parse(
  await readFile(path.join(root, "data/real/live.json"), "utf8")
);
const snapshot = JSON.parse(
  await readFile(path.join(root, "data/real/snapshot.json"), "utf8")
);
const officialCloseDate = Object.values(snapshot).reduce(
  (latest, quote) => quote.asOfDate > latest ? quote.asOfDate : latest,
  ""
);
await writeFile(
  path.join(output, "version.json"),
  `${JSON.stringify({
    version: hash.digest("hex"),
    liveUpdatedAt: live.updatedAt,
    officialCloseDate,
  }, null, 2)}\n`,
  "utf8"
);

console.log(`Données publiques WARIBA synchronisées (${files.length} fichiers).`);
