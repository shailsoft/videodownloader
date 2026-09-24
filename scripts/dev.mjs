import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();
let shuttingDown = false;

function stop(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

function run(name, directory) {
  const child = spawn(npm, ['run', 'dev'], {
    cwd: path.join(root, directory),
    stdio: 'inherit',
  });

  children.add(child);
  child.on('error', (error) => {
    console.error(`[dev] Could not start ${name}: ${error.message}`);
    process.exitCode = 1;
    stop();
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.error(`[dev] ${name} exited with ${reason}; stopping the other service.`);
      process.exitCode = code || 1;
      stop();
    }
  });
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

console.log('Starting API at http://localhost:5050 and web app at http://localhost:5173 ...');
run('API', 'server');
run('web app', 'client');
