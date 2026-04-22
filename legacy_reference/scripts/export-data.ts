#!/usr/bin/env tsx
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { writeFileSync } from 'fs';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function exportData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  console.log('🔄 Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  try {
    console.log('📊 Exporting data...');

    const data = {
      platforms: await db.select().from(schema.platforms),
      investments: await db.select().from(schema.investments),
      cashflows: await db.select().from(schema.cashflows),
      customDistributions: await db.select().from(schema.customDistributions),
      alerts: await db.select().from(schema.alerts),
      userSettings: await db.select().from(schema.userSettings),
      cashTransactions: await db.select().from(schema.cashTransactions),
      savedScenarios: await db.select().from(schema.savedScenarios),
      portfolioSnapshots: await db.select().from(schema.portfolioSnapshots),
      portfolioHistory: await db.select().from(schema.portfolioHistory),
      visionTargets: await db.select().from(schema.visionTargets),
    };

    const exportPath = 'scripts/data-export.json';
    writeFileSync(exportPath, JSON.stringify(data, null, 2));

    console.log('✅ Data exported successfully!');
    console.log(`📁 Export file: ${exportPath}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Platforms: ${data.platforms.length}`);
    console.log(`   - Investments: ${data.investments.length}`);
    console.log(`   - Cashflows: ${data.cashflows.length}`);
    console.log(`   - Custom Distributions: ${data.customDistributions.length}`);
    console.log(`   - Alerts: ${data.alerts.length}`);
    console.log(`   - Settings: ${data.userSettings.length}`);
    console.log(`   - Cash Transactions: ${data.cashTransactions.length}`);
    console.log(`   - Saved Scenarios: ${data.savedScenarios.length}`);
    console.log(`   - Portfolio Snapshots: ${data.portfolioSnapshots.length}`);
    console.log(`   - Portfolio History: ${data.portfolioHistory.length}`);
    console.log(`   - Vision Targets: ${data.visionTargets.length}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    await pool.end();
    process.exit(1);
  }
}

exportData();
