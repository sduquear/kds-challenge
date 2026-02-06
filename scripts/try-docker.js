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

const apiDir = path.resolve(__dirname, '..', 'apps', 'api');

function getMongoUriFromFile(file) {
  const envPath = path.join(apiDir, file);
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^\s*MONGODB_URI\s*=\s*(.+)/m);
  return match ? match[1].trim() : null;
}

function isLocalhostUri(uri) {
  if (!uri) return false;
  return /localhost|127\.0\.0\.1|::1/.test(uri);
}

function getEnvFileWithMongoUri() {
  const isProd = process.env.NODE_ENV === 'production';
  const files = isProd ? ['.env.production', '.env'] : ['.env.local', '.env'];
  for (const file of files) {
    const envPath = path.join(apiDir, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      if (content.split(/\r?\n/).some((line) => /^\s*MONGODB_URI\s*=/.test(line)))
        return file;
    }
  }
  return null;
}

const envFile = getEnvFileWithMongoUri();
const mongoUri = envFile ? getMongoUriFromFile(envFile) : null;
const uriIsLocalhost = isLocalhostUri(mongoUri);
const needDocker = !envFile || uriIsLocalhost;

console.log('');
if (envFile) {
  console.log(`  ✓ Usando MONGODB_URI de ${envFile}`);
} else {
  console.log('  🐳 Iniciando contenedores de Docker (puede tardar unos segundos)...');
}
console.log('  ⏳ Comprobando entorno (Docker / MongoDB)...');
console.log('');

const dockerOk = dockerUp();

if (needDocker && !dockerOk) {
  console.error('');
  console.error('  ❌ Docker no está disponible o no pudo iniciar.');
  console.error('  La API necesita MongoDB. Tienes dos opciones:');
  console.error('  Opción 1: Instala Docker y vuelve a ejecutar pnpm dev');
  console.error('  Opción 2: Usa MongoDB Atlas (u otro remoto) y define en apps/api/.env.local:');
  console.error('            MONGODB_URI=mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/kds_db');
  console.error('');
  process.exit(1);
}

const message = envFile
  ? `MongoDB: usando MONGODB_URI de ${envFile}`
  : 'MongoDB: usando Docker (localhost:27017)';

const statusPath = path.resolve(__dirname, '..', '.docker-status.txt');
fs.writeFileSync(statusPath, message, 'utf8');

process.exit(0);
