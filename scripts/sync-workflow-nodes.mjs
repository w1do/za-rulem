/**
 * Переносит код Code-узлов из `scripts/workflow-nodes/*.js` в экспорт воркфлоу n8n.
 * Внутри JSON код хранится одной строкой и не поддаётся ревью, поэтому источником
 * истины считаются отдельные файлы.
 *
 * Запуск:
 *   node scripts/sync-workflow-nodes.mjs --check
 *   node scripts/sync-workflow-nodes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CHECK_ONLY = process.argv.includes('--check');
const WORKFLOW = new URL('../workflows/Za Rulem - gas prices by all (stations + areas).json', import.meta.url);
const NODES = {
	'Aggregate snapshots': new URL('./workflow-nodes/aggregate-snapshots.js', import.meta.url),
	'Save snapshots and stations': new URL('./workflow-nodes/save-snapshots-and-stations.js', import.meta.url),
};

const workflow = JSON.parse(readFileSync(WORKFLOW, 'utf8'));
const missing = [];
let changed = false;

for (const [name, source] of Object.entries(NODES)) {
	const node = workflow.nodes.find((item) => item.name === name);
	if (!node) {
		missing.push(name);
		continue;
	}
	const code = readFileSync(source, 'utf8').replace(/\s+$/, '\n');
	if (node.parameters.jsCode === code) continue;
	changed = true;
	if (CHECK_ONLY) {
		console.error(`Узел "${name}" в JSON отличается от ${source.pathname}`);
		continue;
	}
	node.parameters.jsCode = code;
	console.log(`Узел "${name}" обновлён из ${source.pathname}`);
}

if (missing.length > 0) {
	console.error(`Узлы не найдены в воркфлоу: ${missing.join(', ')}`);
	process.exit(1);
}

if (CHECK_ONLY) {
	console.log(changed ? 'Требуется npm run workflow:sync' : 'Код узлов синхронизирован.');
	process.exit(changed ? 1 : 0);
}

if (changed) writeFileSync(WORKFLOW, `${JSON.stringify(workflow, null, 2)}\n`);
console.log(changed ? 'Готово: импортируйте воркфлоу в n8n.' : 'Изменений нет.');
