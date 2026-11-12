import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const STORED = 0;

/** The entries of a ZIP file by name, read through its central directory; stored and deflated entries only. */
function unzip(zip: Buffer): Map<string, string> {
	const entries = new Map<string, string>();
	let end = zip.length - 22;

	while (end >= 0 && zip.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) {
		end -= 1;
	}

	let offset = zip.readUInt32LE(end + 16);

	for (let index = 0; index < zip.readUInt16LE(end + 10); index += 1) {
		if (zip.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
			throw new Error('Not a ZIP central directory entry');
		}

		const method = zip.readUInt16LE(offset + 10);
		const size = zip.readUInt32LE(offset + 20);
		const nameLength = zip.readUInt16LE(offset + 28);
		const extraLength = zip.readUInt16LE(offset + 30);
		const commentLength = zip.readUInt16LE(offset + 32);
		const local = zip.readUInt32LE(offset + 42);
		const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
		const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
		const data = zip.subarray(start, start + size);

		entries.set(name, (method === STORED ? data : inflateRawSync(data)).toString('utf8'));
		offset += 46 + nameLength + extraLength + commentLength;
	}

	return entries;
}

/** The sheet names of an `.xlsx` and the XML of all its parts, to look for strings and number formats. */
export async function readXlsx(path: string): Promise<{ sheets: string[]; xml: string }> {
	const parts = unzip(await readFile(path));
	const workbook = parts.get('xl/workbook.xml') ?? '';

	return {
		sheets: [...workbook.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((match) => match[1] ?? ''),
		xml: [...parts.values()].join('\n')
	};
}
