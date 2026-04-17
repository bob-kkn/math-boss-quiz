import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const blockedDevOnlyText = [
  '개발 QA',
  '최종 보스 바로가기',
  '보너스 바로가기',
  'QA 초기화',
];

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }

      return entryPath;
    }),
  );

  return files.flat();
}

const bundleFiles = (await collectFiles(distDir)).filter((file) =>
  /\.(html|js|css)$/.test(file),
);

const violations = [];

for (const file of bundleFiles) {
  const content = await readFile(file, 'utf8');

  for (const text of blockedDevOnlyText) {
    if (content.includes(text)) {
      violations.push(`${file}: ${text}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Production bundle contains dev-only QA text:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Production bundle check passed.');
