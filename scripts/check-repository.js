const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'settings.gradle.kts',
  'gradlew.bat',
  'app/build.gradle.kts',
  'app/src/main/AndroidManifest.xml',
  'app/src/main/java/com/appindex/webapp/GotoWebActivity.kt',
  'app/src/main/java/com/appindex/webapp/GOTOAndroidBridge.kt',
  'app/src/main/assets/goto_page/index.html',
  'modules/goto-engine-kotlin/app/build.gradle.kts',
  'modules/goto-engine-kotlin/app/src/main/AndroidManifest.xml',
  'modules/goto-engine-kotlin/src/main/java/com/appindex/component/Versions.kt',
];

const missing = required.filter((relative) => !fs.existsSync(path.join(root, relative)));
const settings = fs.readFileSync(path.join(root, 'settings.gradle.kts'), 'utf8');
const externalReferences = settings.match(/\.\.\/GOTO Engine|\.\.\\GOTO Engine|GOTO Engine[\\/]Kotlin/g) || [];
const engineSources = fs.existsSync(path.join(root, 'modules/goto-engine-kotlin/src/main/java'))
  ? walk(path.join(root, 'modules/goto-engine-kotlin/src/main/java')).filter((file) => file.endsWith('.kt')).length
  : 0;
const pageAssets = fs.existsSync(path.join(root, 'app/src/main/assets/goto_page'))
  ? walk(path.join(root, 'app/src/main/assets/goto_page')).length
  : 0;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

console.log(`[repo] engine-kotlin-sources=${engineSources} page-assets=${pageAssets}`);
for (const file of missing) console.error(`[missing] ${file}`);
if (externalReferences.length) console.error('[external] settings.gradle.kts still references an external GOTO Engine path');

if (missing.length || externalReferences.length || engineSources === 0 || pageAssets === 0) {
  process.exit(1);
}
console.log('[repo] GOTO 目录具备独立解析所需的核心代码、模块与 Page 资产');
