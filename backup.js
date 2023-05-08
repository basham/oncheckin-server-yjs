import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { LeveldbPersistence } from 'y-leveldb';

const outFolder = '.data';
const dbFolder = 'db';
const docsFolder = 'docs';
const docNamespace = 'oncheckin-';
const docRoot = 'data';
const currentFileName = 'current.json';
const backupInterval = 1000 * 60 * 2; // 2 minutes

setInterval(backupAllDocs, backupInterval);

async function backupAllDocs () {
	// Duplicate database, since LevelDB is limited to just one process.
	const dbSource = path.join(outFolder, dbFolder);
	const dbTmp = path.join(outFolder, `${dbFolder}-tmp`);
	fs.cpSync(dbSource, dbTmp, { recursive: true });

	// Backup each doc.
	const persistence = new LeveldbPersistence(dbTmp);
	const backups = (await persistence.getAllDocNames())
		.filter((name) => name.startsWith(docNamespace))
		.map((name) => backupDoc({ name, persistence }));
	await Promise.all(backups);

	// Remove temporary copy of the database.
	fs.rmSync(dbTmp, { recursive: true, force: true });

	console.log('Backup complete.')
}

async function backupDoc ({ name, persistence }) {
	// Get the doc data as JSON.
	const doc = await persistence.getYDoc(name);
	const data = JSON.stringify(doc.getMap(docRoot).toJSON());

	// Create a folder for the doc's backup files.
	const docOutFolder = path.join(outFolder, docsFolder, name);
	if (!fs.existsSync(docOutFolder)) {
		fs.mkdirSync(docOutFolder, { recursive: true });
	}

	// Abort backup if the content has not changed since last backup.
	const currFilePath = path.join(docOutFolder, currentFileName);
	if (fs.existsSync(currFilePath)) {
		const curr = fs.readFileSync(currFilePath);
		if (curr.equals(Buffer.from(data))) {
			return;
		}
	}

	// Compress the new data as gzip JSON.
	// Keep the last data for any given day.
	const time = (new Date()).toJSON()
		.slice(0, 10);
	const fileName = path.join(docOutFolder, `${time}.json.gz`);
	const gz = zlib.gzipSync(data)
	fs.writeFileSync(fileName, gz);

	// Write the new data to the "current" file.
	fs.writeFileSync(currFilePath, data);
}
