/* claudebomb accounts use the shared HMR family account (Supabase project "HMR Family"), loaded by /hmr-auth.js.
   The publishable key is meant to be public in web pages; row level security in supabase/schema.sql keeps each
   person's rows private to them. Never put a secret key here. */
window.CB_CONFIG = { supabaseUrl: 'https://tudawxduevejltgmyrqm.supabase.co', supabaseAnonKey: 'sb_publishable_B1u0-Wf5UbWPX6QstfVbGQ_VpmEDpkn', auth: '/hmr-auth.js?v=1' };
