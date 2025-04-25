import process from 'node:process';

// Define the list of environment variables that are required.
// TODO: Populate this array with the actual required environment variable names.
const REQUIRED_ENV: string[] = [];

console.log('🔑 Verifying required environment variables...');

let missing = false;

for (const envVar of REQUIRED_ENV) {
  if (!process.env[envVar]) {
    console.error(`❌ Error: Required environment variable "${envVar}" is not set.`);
    missing = true;
  }
}

if (missing) {
  console.error('🚨 Halting due to missing required environment variables.');
  process.exit(1);
}

console.log('✅ All required environment variables are present.');
process.exit(0); 