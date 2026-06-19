import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://llasuftjrngeexqegtoq.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYXN1ZnRqcm5nZWV4cWVndG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzcyNTQsImV4cCI6MjA5Njk1MzI1NH0.ZYhkcvCuJ-WYqg8NHOj3DOKlhgLtxY-RtSiXgL934uw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
