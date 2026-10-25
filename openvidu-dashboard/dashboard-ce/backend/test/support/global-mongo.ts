import { getContainerRuntimeClient } from 'testcontainers';
import type { TestProject } from 'vitest/node';
import { type MongoHandle, startMongo } from './mongo-container.js';

let mongo: MongoHandle | undefined;

/**
 * Provides `mongoUri` to the integration suites: DASHBOARD_TEST_MONGO_URI when set, otherwise a MongoDB container.
 * Without Docker the URI is empty and the suites report themselves as skipped.
 */
export async function setup(project: TestProject): Promise<void> {
	const external = process.env.DASHBOARD_TEST_MONGO_URI;

	if (external !== undefined && external !== '') {
		project.provide('mongoUri', external);

		return;
	}

	try {
		await getContainerRuntimeClient();
	} catch {
		console.warn('Docker is not available: MongoDB integration suites are skipped');
		project.provide('mongoUri', '');

		return;
	}

	mongo = await startMongo();
	project.provide('mongoUri', mongo.uri);
}

export async function teardown(): Promise<void> {
	await mongo?.stop();
}

declare module 'vitest' {
	export interface ProvidedContext {
		mongoUri: string;
	}
}
