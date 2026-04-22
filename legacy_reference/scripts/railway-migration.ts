#!/usr/bin/env tsx
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { readFileSync } from 'fs';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function railwayMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  console.log('🚀 Starting Railway Migration...');
  console.log('🔄 Connecting to database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  try {
    // Step 1: Push schema
    console.log('📋 Pushing database schema...');
    // Note: This would normally use drizzle-kit push, but we'll handle it in the deploy command

    // Step 2: Import data
    console.log('📁 Importing seed data...');
    const exportPath = 'scripts/data-export.json';

    if (!readFileSync) {
      console.log('⚠️ No seed data found, skipping import');
      return;
    }

    const fileContent = readFileSync(exportPath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log('🗄️ Importing data...');

    // Import in correct order to respect foreign key constraints

    // 1. Platforms (no dependencies)
    if (data.platforms?.length > 0) {
      console.log(`   📌 Importing ${data.platforms.length} platforms...`);
      await db.insert(schema.platforms).values(data.platforms).onConflictDoNothing();
    }

    // 2. User Settings (no dependencies)
    if (data.userSettings?.length > 0) {
      console.log(`   ⚙️ Importing ${data.userSettings.length} settings...`);
      await db.insert(schema.userSettings).values(data.userSettings).onConflictDoNothing();
    }

    // 3. Investments (depends on platforms)
    if (data.investments?.length > 0) {
      console.log(`   💰 Importing ${data.investments.length} investments...`);
      await db.insert(schema.investments).values(data.investments).onConflictDoNothing();
    }

    // 4. Cashflows (depends on investments)
    if (data.cashflows?.length > 0) {
      console.log(`   💵 Importing ${data.cashflows.length} cashflows...`);
      await db.insert(schema.cashflows).values(data.cashflows).onConflictDoNothing();
    }

    // 5. Custom Distributions (depends on investments)
    if (data.customDistributions?.length > 0) {
      console.log(`   📊 Importing ${data.customDistributions.length} custom distributions...`);
      await db.insert(schema.customDistributions).values(data.customDistributions).onConflictDoNothing();
    }

    // 6. Alerts (depends on investments)
    if (data.alerts?.length > 0) {
      console.log(`   🔔 Importing ${data.alerts.length} alerts...`);
      await db.insert(schema.alerts).values(data.alerts).onConflictDoNothing();
    }

    // 7. Cash Transactions (depends on investments)
    if (data.cashTransactions?.length > 0) {
      console.log(`   💳 Importing ${data.cashTransactions.length} cash transactions...`);
      await db.insert(schema.cashTransactions).values(data.cashTransactions).onConflictDoNothing();
    }

    // 8. Saved Scenarios (no dependencies)
    if (data.savedScenarios?.length > 0) {
      console.log(`   💾 Importing ${data.savedScenarios.length} saved scenarios...`);
      await db.insert(schema.savedScenarios).values(data.savedScenarios).onConflictDoNothing();
    }

    // 9. Portfolio Snapshots (no dependencies)
    if (data.portfolioSnapshots?.length > 0) {
      console.log(`   📸 Importing ${data.portfolioSnapshots.length} portfolio snapshots...`);
      await db.insert(schema.portfolioSnapshots).values(data.portfolioSnapshots).onConflictDoNothing();
    }

    // 10. Portfolio History (no dependencies)
    if (data.portfolioHistory?.length > 0) {
      console.log(`   📈 Importing ${data.portfolioHistory.length} portfolio history entries...`);
      await db.insert(schema.portfolioHistory).values(data.portfolioHistory).onConflictDoNothing();
    }

    // 11. Vision Targets (no dependencies)
    if (data.visionTargets?.length > 0) {
      console.log(`   🎯 Importing ${data.visionTargets.length} vision targets...`);
      await db.insert(schema.visionTargets).values(data.visionTargets).onConflictDoNothing();
    }

    console.log('✅ Railway Migration completed successfully!');
    console.log('📊 Migration Summary:');
    console.log(`   - Platforms: ${data.platforms?.length || 0}`);
    console.log(`   - Investments: ${data.investments?.length || 0}`);
    console.log(`   - Cashflows: ${data.cashflows?.length || 0}`);
    console.log(`   - Alerts: ${data.alerts?.length || 0}`);
    console.log(`   - Settings: ${data.userSettings?.length || 0}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

railwayMigration().catch(console.error);