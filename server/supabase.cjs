// ============================================================
// FILE: server/supabase.cjs
// ✅ Supabase client initialization for document storage
// ============================================================

let supabase = null;

try {
  const { createClient } = require('@supabase/supabase-js');
  
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.log('⚠️ Supabase credentials not found in environment variables');
    console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable cloud storage');
  }
} catch (error) {
  console.log('⚠️ Supabase client not available:', error.message);
}

module.exports = supabase;