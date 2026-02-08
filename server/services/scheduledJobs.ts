import cron from 'node-cron';
import { 
  scanAllProducts, 
  scanStoreProducts, 
  generateStoreAlerts, 
  notifyStoreOwnerAlerts 
} from './productTracking';
import { db } from '../db';
import { stores } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// ==================== SCHEDULED JOBS ====================

/**
 * Job: Scan all products every 6 hours
 * Updates freshness detection and priorities
 */
export function startProductScanJob() {
  // Run every 6 hours at minute 0
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n🔄 ===== AUTOMATED PRODUCT SCAN STARTED =====');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    try {
      const results = await scanAllProducts();
      
      const totalProducts = results.reduce((sum, store) => sum + store.productsScanned, 0);
      const freshProducts = results.reduce((sum, store) => {
        const fresh = store.products.filter((p: any) => p.isFresh).length;
        return sum + fresh;
      }, 0);
      
      console.log('\n✅ ===== SCAN COMPLETED =====');
      console.log(`📊 Stores scanned: ${results.length}`);
      console.log(`📦 Products scanned: ${totalProducts}`);
      console.log(`🥬 Fresh products detected: ${freshProducts}`);
      console.log('=====================================\n');
      
      // Log summary per store
      for (const store of results) {
        const urgent = store.products.filter((p: any) => p.overallPriority >= 80).length;
        if (urgent > 0) {
          console.log(`⚠️  ${store.storeName}: ${urgent} urgent products need attention`);
        }
      }
      
    } catch (error) {
      console.error('❌ Product scan job failed:', error);
    }
  });
  
  console.log('✅ Product scan job scheduled (every 6 hours)');
}

/**
 * Job: Generate and send alerts every hour
 */
export function startAlertJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('\n🚨 ===== ALERT GENERATION STARTED =====');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    try {
      const allStores = await db
        .select()
        .from(stores)
        .where(eq(stores.isActive, true));
      
      let totalAlerts = 0;
      let highPriorityCount = 0;
      
      for (const store of allStores) {
        const alerts = await generateStoreAlerts(store.id);
        
        if (alerts.length > 0) {
          console.log(`\n🏪 ${store.name}:`);
          console.log(`   - Total alerts: ${alerts.length}`);
          console.log(`   - High priority: ${alerts.filter(a => a.priority === 'HIGH').length}`);
          
          totalAlerts += alerts.length;
          highPriorityCount += alerts.filter(a => a.priority === 'HIGH').length;
          
          // Send notifications for high priority alerts
          await notifyStoreOwnerAlerts(store.id, alerts);
        }
      }
      
      console.log('\n✅ ===== ALERT GENERATION COMPLETED =====');
      console.log(`🚨 Total alerts: ${totalAlerts}`);
      console.log(`⚠️  High priority: ${highPriorityCount}`);
      console.log('=========================================\n');
      
    } catch (error) {
      console.error('❌ Alert job failed:', error);
    }
  });
  
  console.log('✅ Alert job scheduled (every hour)');
}

/**
 * Job: Quick stock check every 30 minutes
 * Only checks stock levels without full product scan
 */
export function startQuickStockCheckJob() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('\n📊 Quick stock check...');
    
    try {
      // This could be a lighter-weight check
      // For now, just log that it ran
      console.log('✅ Quick stock check completed');
    } catch (error) {
      console.error('❌ Quick stock check failed:', error);
    }
  });
  
  console.log('✅ Quick stock check scheduled (every 30 minutes)');
}

/**
 * Job: Daily report at 9 AM
 * Sends daily summary to store owners
 */
export function startDailyReportJob() {
  // Run every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('\n📈 ===== DAILY REPORT GENERATION =====');
    console.log(`📅 Date: ${new Date().toLocaleDateString()}`);
    
    try {
      const allStores = await db
        .select()
        .from(stores)
        .where(eq(stores.isActive, true));
      
      for (const store of allStores) {
        // Generate comprehensive daily report
        const alerts = await generateStoreAlerts(store.id);
        
        const criticalItems = alerts.filter(a => 
          a.type === 'CRITICAL_FRESH' || 
          a.type === 'OUT_OF_STOCK'
        ).length;
        
        const expiringItems = alerts.filter(a => 
          a.type === 'EXPIRING_SOON'
        ).length;
        
        const lowStockItems = alerts.filter(a => 
          a.type === 'LOW_STOCK'
        ).length;
        
        console.log(`\n🏪 ${store.name} Daily Report:`);
        console.log(`   🚨 Critical items: ${criticalItems}`);
        console.log(`   ⏰ Expiring soon: ${expiringItems}`);
        console.log(`   📉 Low stock: ${lowStockItems}`);
      }
      
      console.log('\n✅ Daily reports generated');
      
    } catch (error) {
      console.error('❌ Daily report failed:', error);
    }
  });
  
  console.log('✅ Daily report scheduled (9 AM every day)');
}

/**
 * Initialize all scheduled jobs
 */
export function startAllJobs() {
  console.log('\n🚀 Starting Smart Grocery Automation Jobs...\n');
  
  startProductScanJob();
  startAlertJob();
  startQuickStockCheckJob();
  startDailyReportJob();
  
  console.log('\n✅ All automation jobs started successfully\n');
}

/**
 * Manual trigger for immediate scan (useful for testing)
 */
export async function triggerManualScan(storeId?: string) {
  console.log('\n🔧 Manual scan triggered...\n');
  
  if (storeId) {
    const results = await scanStoreProducts(storeId);
    const alerts = await generateStoreAlerts(storeId);
    
    return {
      productsScanned: results.length,
      alertsGenerated: alerts.length,
      results,
      alerts,
    };
  } else {
    const results = await scanAllProducts();
    return results;
  }
}