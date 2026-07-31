import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const DEFAULT_VAULT = join(projectRoot, 'vault');
const PLUGIN_ID = 'property-board';

const positionalVault = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const vaultPath = resolve(positionalVault ?? process.env.OBSIDIAN_VAULT ?? DEFAULT_VAULT);
const pluginDir = join(vaultPath, '.obsidian', 'plugins', PLUGIN_ID);

const requiredFiles = ['main.js', 'manifest.json', 'styles.css'];

function runBuild() {
	console.log('Building plugin…');
	const result = spawnSync('npm', ['run', 'build'], {
		cwd: projectRoot,
		stdio: 'inherit',
		shell: process.platform === 'win32',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function deploy() {
	for (const file of requiredFiles) {
		const source = join(projectRoot, file);
		if (!existsSync(source)) {
			console.error(`Missing required file: ${source}`);
			console.error('Run "npm run build" first.');
			process.exit(1);
		}
	}

	mkdirSync(pluginDir, { recursive: true });

	for (const file of requiredFiles) {
		const source = join(projectRoot, file);
		const target = join(pluginDir, file);
		cpSync(source, target);
		console.log(`Copied ${file} -> ${target}`);
	}

	console.log(`\nDeployed to ${pluginDir}`);
	console.log('Enable "Property Board" in Obsidian: Settings -> Community plugins');
}

const skipBuild = process.argv.includes('--skip-build');

console.log(`Vault: ${vaultPath}`);
if (!skipBuild) {
	runBuild();
}
deploy();
