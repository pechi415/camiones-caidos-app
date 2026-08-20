import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nxcrkztjbttcjutrbfnt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3JrenRqYnR0Y2p1dHJiZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTI4MTksImV4cCI6MjEwMjc2ODgxOX0.zwqz8AAlpdP-e93WtivljSKaxc4cCrLdo33Fyl62Gio';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
