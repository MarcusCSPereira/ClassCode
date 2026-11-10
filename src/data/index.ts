import { createClient } from '@supabase/supabase-js';
import { createDemoRepository } from './demoRepository';
import { browserStorage, createDemoStore } from './demoStore';
import { createSupabaseRepository } from './supabaseRepository';

export const demoStore = createDemoStore(browserStorage());
const requestedMode = import.meta.env.VITE_DATA_MODE?.trim() || 'demo';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const dataMode = requestedMode === 'remote' ? 'remote' : 'demo';
export const dataConfigurationError = !['demo', 'remote'].includes(requestedMode)
  ? 'VITE_DATA_MODE deve ser demo ou remote.'
  : dataMode === 'remote' && (!url || !publishableKey)
    ? 'O modo remoto exige VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
    : null;
export const supabase =
  dataMode === 'remote' && !dataConfigurationError
    ? createClient(url!, publishableKey!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
export const repository = supabase
  ? createSupabaseRepository({
      async rpc(fn, args) {
        const { data, error } = await supabase.rpc(fn, args);
        return {
          data,
          error: error ? { message: error.message, code: error.code } : null,
        };
      },
    })
  : createDemoRepository(demoStore);
