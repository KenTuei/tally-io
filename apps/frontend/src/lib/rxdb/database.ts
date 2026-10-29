import {
  createRxDatabase,
  addRxPlugin,
  type RxDatabase,
  type RxCollection,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import {
  localSaleSchema,
  outboxSchema,
  cachedProductSchema,
  syncMetaSchema,
  type LocalSaleDoc,
  type OutboxDoc,
  type CachedProductDoc,
  type SyncMetaDoc,
} from './schemas';

// Add plugins
if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

export type TallyCollections = {
  local_sales: RxCollection<LocalSaleDoc>;
  outbox: RxCollection<OutboxDoc>;
  cached_products: RxCollection<CachedProductDoc>;
  sync_meta: RxCollection<SyncMetaDoc>;
};

export type TallyDatabase = RxDatabase<TallyCollections>;

let dbInstance: TallyDatabase | null = null;
let initPromise: Promise<TallyDatabase> | null = null;

export async function getDatabase(): Promise<TallyDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await createRxDatabase<TallyCollections>({
      name: 'tally_local_v1',
      storage: getRxStorageDexie(),
      ignoreDuplicate: true,
    });

    await db.addCollections({
      local_sales: {
        schema: localSaleSchema,
      },
      outbox: {
        schema: outboxSchema,
      },
      cached_products: {
        schema: cachedProductSchema,
      },
      sync_meta: {
        schema: syncMetaSchema,
      },
    });

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    initPromise = null;
  }
}
