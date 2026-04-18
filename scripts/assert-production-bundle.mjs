import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const indexHtmlPath = join(distDir, 'index.html');
const blockedDevOnlyText = [
  '개발 QA',
  '최종 보스 바로가기',
  '보너스 바로가기',
  'QA 초기화',
];
const requiredProductionText = ['수학 보스전', '자동 저장', '저장 초기화', '콤보'];
const requiredAssets = ['assets/boss.svg'];

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
const bundleContents = [];

for (const file of bundleFiles) {
  const content = await readFile(file, 'utf8');
  bundleContents.push(content);

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

const fullBundleText = bundleContents.join('\n');
const missingProductionText = requiredProductionText.filter(
  (text) => !fullBundleText.includes(text),
);

if (missingProductionText.length > 0) {
  console.error('Production bundle is missing required user-facing text:');
  missingProductionText.forEach((text) => console.error(`- ${text}`));
  process.exit(1);
}

const indexHtml = await readFile(indexHtmlPath, 'utf8');
const referencedAssets = Array.from(
  indexHtml.matchAll(/(?:href|src)="\/([^"]+)"/g),
  (match) => match[1],
).filter((assetPath) => assetPath.startsWith('assets/'));
const assetsToCheck = new Set([...referencedAssets, ...requiredAssets]);
const missingAssets = [];

for (const assetPath of assetsToCheck) {
  try {
    await access(join(distDir, assetPath));
  } catch {
    missingAssets.push(assetPath);
  }
}

if (missingAssets.length > 0) {
  console.error('Production bundle references missing assets:');
  missingAssets.forEach((assetPath) => console.error(`- ${assetPath}`));
  process.exit(1);
}

console.log('Production bundle check passed.');
