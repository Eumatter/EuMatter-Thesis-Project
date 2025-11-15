/**
 * Script to generate VAPID keys for push notifications
 * Run: node scripts/generateVapidKeys.js
 */

import webpush from 'web-push';

console.log('Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated!\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@eumatter.com\n`);
console.log('⚠️  Keep these keys secure! Do not commit them to version control.\n');

