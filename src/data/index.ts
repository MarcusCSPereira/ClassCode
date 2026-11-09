import { createDemoRepository } from './demoRepository';
import { browserStorage, createDemoStore } from './demoStore';

/** Demo is the only mode until CC-03 adds the Supabase repository. */
export const demoStore = createDemoStore(browserStorage());
export const repository = createDemoRepository(demoStore);
