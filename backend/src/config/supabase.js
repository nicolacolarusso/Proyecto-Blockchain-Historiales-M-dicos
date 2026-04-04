const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

let supabase = null;
let bucketName = null;

function initSupabase() {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    bucketName = process.env.SUPABASE_BUCKET || 'historiales';

    if (!url || !key) {
      logger.warn('Supabase: SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados en .env');
      return false;
    }

    supabase = createClient(url, key);
    logger.info(`Supabase Storage inicializado: ${url} (bucket: ${bucketName})`);
    return true;
  } catch (err) {
    logger.warn(`Supabase no disponible: ${err.message}`);
    return false;
  }
}

function getClient() {
  return supabase;
}

function getBucketName() {
  return bucketName;
}

function isAvailable() {
  return supabase !== null;
}

module.exports = { initSupabase, getClient, getBucketName, isAvailable };
