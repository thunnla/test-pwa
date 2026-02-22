#!/usr/bin/env node

/**
 * Generate Map Tiles for Offline Testing
 *
 * Downloads real OpenStreetMap tiles around Lam Thuong (22.283, 104.775)
 * for zoom levels 14–18 and stores them in static/map-tiles/z{z}/{x}/{y}.png
 *
 * Usage:
 *   node scripts/download-map-tiles.js
 *
 * If downloading fails (e.g., no internet), generates placeholder PNG tiles instead.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TILES_DIR = join(__dirname, '..', 'static', 'map-tiles');

// Lam Thuong center
const LAT = 22.283;
const LON = 104.775;

// Zoom levels to download
const ZOOM_LEVELS = [14, 15, 16, 17, 18];
// How many tiles around center per axis at each zoom
const RADIUS = 2; // 5×5 = 25 tiles per zoom → 125 tiles total

// ── Coordinate helpers ──

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} zoom
 * @returns {{ x: number, y: number }}
 */
function latLonToTile(lat, lon, zoom) {
	const n = 2 ** zoom;
	const x = Math.floor(((lon + 180) / 360) * n);
	const latRad = (lat * Math.PI) / 180;
	const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
	return { x, y };
}

// ── Minimal PNG generator (1×1 pixel placeholder) ──

function createPlaceholderPNG() {
	// Minimal valid 1×1 gray PNG
	const header = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
	]);
	const ihdr = createChunk('IHDR', Buffer.from([
		0x00, 0x00, 0x00, 0x01, // width = 1
		0x00, 0x00, 0x00, 0x01, // height = 1
		0x08,                   // bit depth = 8
		0x02,                   // color type = RGB
		0x00, 0x00, 0x00        // compression, filter, interlace
	]));
	// Raw image data: filter byte (0) + R G B
	const raw = Buffer.from([0x00, 0xcc, 0xcc, 0xcc]);
	const deflated = deflateRaw(raw);
	const idat = createChunk('IDAT', deflated);
	const iend = createChunk('IEND', Buffer.alloc(0));
	return Buffer.concat([header, ihdr, idat, iend]);
}

/**
 * @param {string} type
 * @param {Buffer} data
 * @returns {Buffer}
 */
function createChunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const typeB = Buffer.from(type, 'ascii');
	const crcData = Buffer.concat([typeB, data]);
	const crc = crc32(crcData);
	const crcB = Buffer.alloc(4);
	crcB.writeUInt32BE(crc >>> 0);
	return Buffer.concat([len, typeB, data, crcB]);
}

/**
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
	let crc = 0xffffffff;
	for (const byte of buf) {
		crc ^= byte;
		for (let j = 0; j < 8; j++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Minimal zlib deflate wrapper (stored block, no compression)
 * @param {Buffer} data
 * @returns {Buffer}
 */
function deflateRaw(data) {
	// zlib header: CM=8, CINFO=0, FCHECK
	const header = Buffer.from([0x78, 0x01]);
	// Stored block: BFINAL=1, BTYPE=00
	const len = data.length;
	const block = Buffer.alloc(5);
	block[0] = 0x01; // final block, stored
	block.writeUInt16LE(len, 1);
	block.writeUInt16LE(len ^ 0xffff, 3);
	// Adler-32
	let a = 1, b = 0;
	for (const byte of data) {
		a = (a + byte) % 65521;
		b = (b + a) % 65521;
	}
	const adler = Buffer.alloc(4);
	adler.writeUInt32BE(((b << 16) | a) >>> 0);
	return Buffer.concat([header, block, data, adler]);
}

// ── Download with fetch ──

/**
 * @param {string} url
 * @returns {Promise<Buffer | null>}
 */
async function downloadTile(url) {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'LamThuongPWATest/1.0 (offline tile caching)' }
		});
		if (!res.ok) return null;
		const arrayBuf = await res.arrayBuffer();
		return Buffer.from(arrayBuf);
	} catch {
		return null;
	}
}

// ── Main ──

async function main() {
	console.log('╔══════════════════════════════════════════════╗');
	console.log('║   Map Tile Downloader — Lam Thuong Area      ║');
	console.log('╚══════════════════════════════════════════════╝');
	console.log();

	let downloaded = 0;
	let placeholders = 0;
	let skipped = 0;
	let total = 0;

	for (const z of ZOOM_LEVELS) {
		const center = latLonToTile(LAT, LON, z);
		console.log(`▸ Zoom ${z}: center tile (${center.x}, ${center.y}), radius ${RADIUS}`);

		for (let dx = -RADIUS; dx <= RADIUS; dx++) {
			for (let dy = -RADIUS; dy <= RADIUS; dy++) {
				const x = center.x + dx;
				const y = center.y + dy;
				total++;

				const dir = join(TILES_DIR, `z${z}`);
				mkdirSync(dir, { recursive: true });
				const filepath = join(dir, `${x}`, `${y}.png`);
				mkdirSync(dirname(filepath), { recursive: true });

				if (existsSync(filepath)) {
					skipped++;
					continue;
				}

				const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
				const data = await downloadTile(url);

				if (data && data.length > 0) {
					writeFileSync(filepath, data);
					downloaded++;
				} else {
					// Write placeholder
					writeFileSync(filepath, createPlaceholderPNG());
					placeholders++;
				}

				// Respect OSM tile usage policy: max 1 req/sec
				await new Promise((r) => setTimeout(r, 1100));
			}
		}

		console.log(`  ✓ Zoom ${z} done`);
	}

	console.log();
	console.log('─────────────────────────────────────────────');
	console.log(`  Downloaded:    ${downloaded} tiles`);
	console.log(`  Placeholders:  ${placeholders} tiles`);
	console.log(`  Skipped:       ${skipped} tiles (already exist)`);
	console.log(`  Total:         ${total} tiles`);
	console.log(`  Location:      ${TILES_DIR}`);
	console.log('─────────────────────────────────────────────');
	console.log('✓ Done');
}

main();
