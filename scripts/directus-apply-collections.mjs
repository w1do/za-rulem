import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

async function loadEnv() {
	try {
		const envPath = resolve('.env');
		const content = await readFile(envPath, 'utf8');
		for (const line of content.split('\n')) {
			const stripped = line.trim();
			if (!stripped || stripped.startsWith('#')) continue;
			const firstEq = stripped.indexOf('=');
			if (firstEq === -1) continue;
			const key = stripped.substring(0, firstEq).trim();
			let value = stripped.substring(firstEq + 1).trim();
			if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
			if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
			if (!process.env[key]) process.env[key] = value;
		}
	} catch (error) {
		// .env might not exist
	}
}

await loadEnv();

const SCHEMA_DIRECTORY = resolve('directus/collections');
const REQUEST_TIMEOUT_MS = 30_000;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const itemsArgument = args.find((arg) => arg.startsWith('--items='));

const directusUrl = (process.env.DIRECTUS_URL || process.env.PUBLIC_DIRECTUS_URL || '').replace(
	/\/$/,
	'',
);
const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_GAS_PRICES_TOKEN || '';

if (!directusUrl || !adminToken) {
	throw new Error(
		'Set DIRECTUS_URL and DIRECTUS_ADMIN_TOKEN (or DIRECTUS_GAS_PRICES_TOKEN), e.g. in .env file or: DIRECTUS_URL=https://api.za-rulem.org DIRECTUS_ADMIN_TOKEN=xxx node scripts/directus-apply-collections.mjs',
	);
}

const request = async (method, path, body) => {
	const response = await fetch(`${directusUrl}${path}`, {
		method,
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${adminToken}`,
			...(body ? { 'Content-Type': 'application/json' } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});

	if (response.status === 204) return null;
	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		const message = payload?.errors?.[0]?.message || response.statusText;
		const error = new Error(`${method} ${path} → ${response.status}: ${message}`);
		error.status = response.status;
		throw error;
	}
	return payload;
};

const collectionExists = async (collection) => {
	try {
		await request('GET', `/collections/${collection}`);
		return true;
	} catch (error) {
		if (error.status === 403 || error.status === 404) return false;
		throw error;
	}
};

const listFieldNames = async (collection) => {
	const payload = await request('GET', `/fields/${collection}`);
	return new Set((payload?.data || []).map((field) => field.field));
};

const applyCollection = async (schema) => {
	const { collection, fields = [] } = schema;

	if (await collectionExists(collection)) {
		const existing = await listFieldNames(collection);
		const missing = fields.filter((field) => !existing.has(field.field));

		if (missing.length === 0) {
			console.log(`= ${collection}: актуальна, новых полей нет`);
			return;
		}

		for (const field of missing) {
			if (isDryRun) {
				console.log(`+ ${collection}.${field.field} (dry-run)`);
				continue;
			}
			await request('POST', `/fields/${collection}`, field);
			console.log(`+ ${collection}.${field.field}`);
		}
		return;
	}

	if (isDryRun) {
		console.log(`+ ${collection}: создание коллекции с ${fields.length} полями (dry-run)`);
		return;
	}

	await request('POST', '/collections', {
		collection,
		meta: schema.meta ?? {},
		schema: schema.schema ?? {},
		fields,
	});
	console.log(`+ ${collection}: создана (${fields.length} полей)`);
};

const importItems = async (collection, path) => {
	const items = JSON.parse(await readFile(resolve(path), 'utf8'));
	if (!Array.isArray(items)) throw new Error(`${path}: ожидается массив элементов`);

	const BATCH_SIZE = 50;
	for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
		const batch = items.slice(offset, offset + BATCH_SIZE);
		if (isDryRun) {
			console.log(`~ ${collection}: ${batch.length} записей (dry-run)`);
			continue;
		}
		await request('POST', `/items/${collection}`, batch);
		console.log(`~ ${collection}: загружено ${offset + batch.length}/${items.length}`);
	}
};

const files = (await readdir(SCHEMA_DIRECTORY))
	.filter((name) => name.endsWith('.json'))
	.sort();

for (const name of files) {
	const schema = JSON.parse(await readFile(resolve(SCHEMA_DIRECTORY, name), 'utf8'));
	console.log(`\n→ ${basename(name)}`);
	await applyCollection(schema);
}

if (itemsArgument) {
	const [collection, path] = itemsArgument.slice('--items='.length).split(':');
	if (!path) {
		// Legacy behavior for road_segments
		console.log(`\n→ импорт записей из ${collection} в road_segments`);
		await importItems('road_segments', collection);
	} else {
		console.log(`\n→ импорт записей из ${path} в ${collection}`);
		await importItems(collection, path);
	}
}

console.log('\nГотово.');
