import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hvsizlpfawzdootzaink.supabase.co';
const supabaseAnonKey = 'sb_publishable_HFrIN03jki5AhvMt1H-DcA_Wk7NJG3F';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
