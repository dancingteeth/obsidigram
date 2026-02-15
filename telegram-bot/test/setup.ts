import { rm, mkdir } from 'fs/promises';

export async function cleanTestData(): Promise<void> {
	const testData = process.env.DATA_DIR ?? './test-data';
	try {
		await rm(testData, { recursive: true });
	} catch {
		// ignore
	}
	await mkdir(testData, { recursive: true });
}
