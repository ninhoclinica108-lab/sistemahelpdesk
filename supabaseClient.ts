import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = 'https://dxgspnjhrwiiztwnyrkb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Z3NwbmpocndpaXp0d255cmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTQ3ODksImV4cCI6MjA4MTQ3MDc4OX0.lEh_60pWP_BepBFIltxoqV-jTs8xfCsCViBqz7DMyI0';

export const supabase = createClient(supabaseUrl, supabaseKey);