import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stop Docker Compose test environment
 * This is called by Playwright after all tests
 */
async function globalTeardown() {
  console.log('Stopping Docker Compose test environment...');
  try {
    execSync('docker compose -f docker-compose.test.yml down -v', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('Test environment stopped');
  } catch (error) {
    console.error('Failed to stop test environment:', error);
  }
}

export default globalTeardown;
