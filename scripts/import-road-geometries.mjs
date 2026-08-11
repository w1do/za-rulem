import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const SOURCE_PATH = process.argv[2];
const OUTPUT_DIRECTORY = resolve('src/features/road-gas-stations/model/geometries');
const SIMPLIFICATION_TOLERANCE = 0.0025;

if (!SOURCE_PATH) {
	throw new Error('Usage: node scripts/import-road-geometries.mjs <overpass-response.json>');
}

const slugByCode = new Map([
	['А-113', 'a-113'],
	['А-121', 'a-121'],
	['А-147', 'a-147'],
	['А-181', 'a-181'],
	['А-290', 'a-290'],
	['А-370', 'a-370'],
	['М-1', 'm-1'],
	['М-10', 'm-10'],
	['М-11', 'm-11'],
	['М-12', 'm-12'],
	['М-2', 'm-2'],
	['М-4', 'm-4'],
	['М-5', 'm-5'],
	['М-7', 'm-7'],
	['М-8', 'm-8'],
	['М-9', 'm-9'],
	['Р-132', 'r-132'],
	['Р-176', 'r-176'],
	['Р-21', 'r-21'],
	['Р-217', 'r-217'],
	['Р-22', 'r-22'],
	['Р-23', 'r-23'],
	['Р-254', 'r-254'],
	['Р-255', 'r-255'],
	['Р-256', 'r-256'],
	['Р-257', 'r-257'],
	['Р-258', 'r-258'],
	['Р-297', 'r-297'],
	['Р-504', 'r-504'],
]);

const squareDistanceToSegment = (point, start, end) => {
	let x = start[0];
	let y = start[1];
	let dx = end[0] - x;
	let dy = end[1] - y;

	if (dx !== 0 || dy !== 0) {
		const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
		if (t > 1) {
			x = end[0];
			y = end[1];
		} else if (t > 0) {
			x += dx * t;
			y += dy * t;
		}
	}

	dx = point[0] - x;
	dy = point[1] - y;
	return dx * dx + dy * dy;
};

const simplifyLine = (points, tolerance) => {
	if (points.length <= 2) return points;

	const squareTolerance = tolerance * tolerance;
	const first = points[0];
	const last = points.at(-1);
	let maxDistance = squareTolerance;
	let splitIndex = 0;

	for (let index = 1; index < points.length - 1; index += 1) {
		const distance = squareDistanceToSegment(points[index], first, last);
		if (distance > maxDistance) {
			maxDistance = distance;
			splitIndex = index;
		}
	}

	if (splitIndex === 0) return [first, last];

	const left = simplifyLine(points.slice(0, splitIndex + 1), tolerance);
	const right = simplifyLine(points.slice(splitIndex), tolerance);
	return [...left.slice(0, -1), ...right];
};

const payload = JSON.parse(await readFile(resolve(SOURCE_PATH), 'utf8'));
const linesBySlug = new Map([...slugByCode.values()].map((slug) => [slug, new Map()]));

for (const relation of payload.elements ?? []) {
	const slug = slugByCode.get(relation.tags?.ref);
	if (!slug) continue;

	for (const member of relation.members ?? []) {
		if (member.type !== 'way' || !Array.isArray(member.geometry) || member.geometry.length < 2) {
			continue;
		}

		const line = member.geometry.map(({ lon, lat }) => [lon, lat]);
		linesBySlug.get(slug).set(member.ref, simplifyLine(line, SIMPLIFICATION_TOLERANCE));
	}
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

for (const [code, slug] of slugByCode) {
	const lines = [...linesBySlug.get(slug).values()];
	if (lines.length === 0) throw new Error(`No geometry found for ${code}`);

	const geometry = {
		type: 'MultiLineString',
		coordinates: lines,
	};
	await writeFile(resolve(OUTPUT_DIRECTORY, `${slug}.json`), `${JSON.stringify(geometry)}\n`);
}

console.log(`Generated ${slugByCode.size} road geometries from ${basename(SOURCE_PATH)}`);
