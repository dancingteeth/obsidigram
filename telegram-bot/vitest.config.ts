import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		fileParallelism: false, // avoid DATA_DIR races between storage.test and users.test
		env: {
			DATA_DIR: resolve(__dirname, 'test-data'),
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
});
