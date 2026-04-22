#!/usr/bin/env node

/**
 * Railway Deployment Script
 * Automated deployment to Railway platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Railway Deployment...\n');

// Check if Railway CLI is installed
try {
  execSync('railway --version', { stdio: 'pipe' });
  console.log('✅ Railway CLI is installed');
} catch (error) {
  console.error('❌ Railway CLI is not installed. Please run: npm install -g @railway/cli');
  process.exit(1);
}

// Check if user is logged in
try {
  execSync('railway whoami', { stdio: 'pipe' });
  console.log('✅ User is logged in to Railway');
} catch (error) {
  console.error('❌ User is not logged in. Please run: railway login');
  process.exit(1);
}

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('⚠️  .env file not found. Creating from .env.example...');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ .env file created. Please update with your values.');
  } else {
    console.error('❌ .env.example file not found');
    process.exit(1);
  }
}

// Build the application
console.log('🔨 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Application built successfully');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Check if project exists
let projectExists = false;
try {
  execSync('railway status', { stdio: 'pipe' });
  projectExists = true;
  console.log('✅ Railway project found');
} catch (error) {
  console.log('📁 No Railway project found. Creating new project...');
}

// Create project if it doesn't exist
if (!projectExists) {
  try {
    execSync('railway init --name "az-finance-hub"', { stdio: 'inherit' });
    console.log('✅ Railway project created');
  } catch (error) {
    console.error('❌ Failed to create Railway project');
    process.exit(1);
  }
}

// Add PostgreSQL database
console.log('🗄️ Setting up database...');
try {
  execSync('railway add postgresql', { stdio: 'inherit' });
  console.log('✅ PostgreSQL database added');
} catch (error) {
  console.log('⚠️  Database setup may have failed or already exists');
}

// Set environment variables
console.log('🔧 Setting environment variables...');
const envVars = [
  'NODE_ENV=production',
  'PORT=5000',
];

envVars.forEach(envVar => {
  try {
    const [key, value] = envVar.split('=');
    execSync(`railway variables set ${key}="${value}"`, { stdio: 'pipe' });
    console.log(`✅ Set ${key}`);
  } catch (error) {
    console.log(`⚠️  Failed to set ${key} or already exists`);
  }
});

// Deploy the application
console.log('🚀 Deploying application...');
try {
  execSync('railway deploy', { stdio: 'inherit' });
  console.log('✅ Application deployed successfully');
} catch (error) {
  console.error('❌ Deployment failed');
  process.exit(1);
}

// Wait for deployment to be ready
console.log('⏳ Waiting for deployment to be ready...');
setTimeout(() => {
  // Check deployment status
  try {
    const output = execSync('railway status', { encoding: 'utf8' });
    console.log('📊 Deployment Status:');
    console.log(output);
  } catch (error) {
    console.log('⚠️  Could not get deployment status');
  }

  console.log('\n🎉 Deployment completed!');
  console.log('📋 Next steps:');
  console.log('1. Run migration: railway run npx tsx scripts/railway-migration.ts');
  console.log('2. Check health: curl https://your-app-url/health');
  console.log('3. Access your app at the Railway URL shown above');

}, 10000);