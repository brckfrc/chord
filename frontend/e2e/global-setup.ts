import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start Docker Compose test environment
 * This is called by Playwright before all tests
 */
async function globalSetup() {
  console.log('Starting Docker Compose test environment...');
  try {
    execSync('docker compose -f docker-compose.test.yml up -d', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('Waiting for services to be healthy...');
    
    // Wait for backend health check
    let backendReady = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!backendReady && attempts < maxAttempts) {
      try {
        const response = await fetch('http://localhost:5049/health');
        if (response.ok) {
          backendReady = true;
          console.log('Backend is ready');
        }
      } catch (error) {
        // Service not ready yet
      }
      if (!backendReady) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
    
    if (!backendReady) {
      throw new Error('Backend did not become healthy within timeout');
    }
    
    // Wait for frontend
    let frontendReady = false;
    attempts = 0;
    
    while (!frontendReady && attempts < maxAttempts) {
      try {
        const response = await fetch('http://localhost:5173/');
        if (response.ok) {
          frontendReady = true;
          console.log('Frontend is ready');
        }
      } catch (error) {
        // Service not ready yet
      }
      if (!frontendReady) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
    
    if (!frontendReady) {
      throw new Error('Frontend did not become ready within timeout');
    }
    
    console.log('Test environment is ready');
  } catch (error) {
    console.error('Failed to start test environment:', error);
    throw error;
  }
}

export default globalSetup;
