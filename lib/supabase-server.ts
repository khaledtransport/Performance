import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

// استخدام Service Role Key مؤقتاً لحل مشاكل الصلاحيات
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Admin client (يستخدم Service Role Key لتجاوز RLS)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
