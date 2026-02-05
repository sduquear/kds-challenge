const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tryCommand = (cmd, args) => {
  const result = spawnSync(cmd, args, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
    shell: true,
  });
  return result.status === 0;
};

const dockerUp = () =>
  tryCommand('docker', ['compose', 'up', '-d']) ||
  tryCommand('docker-compose', ['up', '-d']);

function hasMongoUriInEnv() {
  const envPath = path.resolve(__dirname, '..', 'apps', 'api', '.env');
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf8');
  return content.split(/\r?\n/).some((line) => /^\s*MONGODB_URI\s*=/.test(line));
}

const hasEnvUri = hasMongoUriInEnv();
const dockerOk = dockerUp();

if (!dockerOk && !hasEnvUri) {
  console.error('');
  console.error('  MONGODB_URI es obligatorio cuando Docker no está disponible.');
  console.error('  Define MONGODB_URI en apps/api/.env (ej. MongoDB Atlas) o levanta MongoDB con: docker-compose up -d');
  console.error('');
  process.exit(1);
}

// El mensaje debe reflejar a qué se conectará la API realmente.
// Solo se conecta a Docker si NO está MONGODB_URI en .env (el .env tiene prioridad).
const message = hasEnvUri
  ? 'MongoDB: conectando con MONGODB_URI de .env (Atlas/otro). Docker ignorado.'
  : 'MongoDB: conectando con Docker (localhost:27017).';

const statusPath = path.resolve(__dirname, '..', '.docker-status.txt');
fs.writeFileSync(statusPath, message, 'utf8');

process.exit(0);
