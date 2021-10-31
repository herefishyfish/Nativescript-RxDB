import {
  Injectable,
  isDevMode
} from '@angular/core';

// import typings
/**
 * custom typings so typescript knows about the schema-fields
 */

 import type {
  RxDocument,
  RxCollection,
  RxDatabase
} from 'rxdb/plugins/core';

import { RxDBValidatePlugin } from 'rxdb/plugins/validate';

export type RxHeroDocumentType = {
  name: string;
  color: string;
  maxHP: number;
  hp: number;
  team?: string;
  skills: Array<{
      name?: string;
      damage?: number;
  }>;
};

// ORM methods
type RxHeroDocMethods = {
  hpPercent(): number;
};

export type RxHeroDocument = RxDocument<RxHeroDocumentType, RxHeroDocMethods>;

export type RxHeroCollection = RxCollection<RxHeroDocumentType, RxHeroDocMethods, {}>;

export type RxHeroesCollections = {
  hero: RxHeroCollection;
};

export type RxHeroesDatabase = RxDatabase<RxHeroesCollections>;

/**
* Instead of using the default rxdb-import,
* we do a custom build which lets us cherry-pick
* only the modules that we need.
* A default import would be: import RxDB from 'rxdb';
*/
import {
  createRxDatabase,
  addRxPlugin
} from 'rxdb/plugins/core';

import {
  addPouchPlugin, getRxStoragePouch
} from 'rxdb/plugins/pouchdb';

import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBLocalDocumentsPlugin } from 'rxdb/plugins/local-documents';

import { createPlugin } from '../../../../packages/nativescript-pouchdb-adapter';
import mapreduce from 'pouchdb-mapreduce';
import HttpPouch from 'pouchdb-adapter-http';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

import { filter } from 'rxjs/operators';

import {
  pullQueryBuilderFromRxSchema,
  pushQueryBuilderFromRxSchema,
  RxDBReplicationGraphQLPlugin
} from 'rxdb/plugins/replication-graphql';
// import { SubscriptionService } from './subscription.service';

export const  heroSchema = {
  version: 0,
  title: 'hero schema',
  description: 'describes a simple hero',
  primaryKey: 'name',
  type: 'object',
  properties: {
      name: {
          type: 'string'
      },
      color: {
          type: 'string',
      },
  },
  required: ['color'],
};

export const graphQLGenerationInput = {
  hero: {
    schema: heroSchema,
    feedKeys: [
      'id',
      'updated_at'
    ],
    deletedFlag: 'deleted',
    subscriptionParams: {
      token: 'String!'
    }
  }
};

const collectionMethods = {
  getAllDocuments: async function (
    this: any
  ): Promise<any> {
    const allDocs = await this.find().exec();
    console.log('find all docs:', allDocs);
    return allDocs;
  },
};

const batchSize = 5;

const pullQueryBuilder = pullQueryBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero,
    batchSize
);
const pushQueryBuilder = pushQueryBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero
);

const hasuraProject = 'working-oriole-73.hasura.app/v1/graphql';

/**
* Loads RxDB plugins
*/
async function loadRxDBPlugins(): Promise<void> {
  const SQLiteAdapter = createPlugin()

  addPouchPlugin(HttpPouch);
  addPouchPlugin(SQLiteAdapter);
  addPouchPlugin(mapreduce)
  addRxPlugin(RxDBReplicationGraphQLPlugin);
  addRxPlugin(RxDBLocalDocumentsPlugin);
  addRxPlugin(RxDBValidatePlugin);
  addRxPlugin(RxDBJsonDumpPlugin);
  addRxPlugin(RxDBDevModePlugin);
  /**
   * to reduce the build-size,
   * we use some modules in dev-mode only
   */
  // if (isDevMode()) {
      // await Promise.all([

      //     // add dev-mode plugin
      //     // which does many checks and add full error-messages
      //     import('rxdb/plugins/dev-mode').then(
      //         module => addRxPlugin(module as any)
      //     ),

      //     // we use the schema-validation only in dev-mode
      //     // this validates each document if it is matching the jsonschema
      //     import('rxdb/plugins/validate').then(
      //         module => addRxPlugin(module as any)
      //     )
      // ]);
  // } else {
      // in production we use the no-validate module instead of the schema-validation
      // to reduce the build-size
      // addRxPlugin(RxDBNoValidatePlugin);
  // }

}

/**
* creates the database
*/
async function _create(): Promise<RxHeroesDatabase> {

  await loadRxDBPlugins();

  console.log('---- DatabaseService: creating database..');
  const db = await createRxDatabase<RxHeroesCollections>({
    name: 'nssqlite',
    storage: getRxStoragePouch('nativescript-sqlite'),
    multiInstance: false,
  });
  console.log('---- DatabaseService: created database');

  console.log('---- DatabaseService: create collections');
  const heroCollection = await db.addCollections({
    hero: {
      schema: {
        title: 'hero',
        description: `describes hero`,
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          is_deleted: {
            type: 'boolean',
          },
          created_dtm: {
            type: 'string',
          },
          updated_dtm: {
            type: 'string',
          },
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
        required: ['id'],
      },
      statics: collectionMethods,
    },
  });

  console.log('hero collections');

  // db.hero.$
  //   //.pipe(filter((ev: any) => !ev.isLocal))
  //   .subscribe(ev => {
  //   console.log('colection.$ emitted:');
  //   console.dir(ev);
  // });

  return db;

  console.log("DatabaseService: Create replicator..");
  const replicationState = db.hero.syncGraphQL({
    url: 'https://' + hasuraProject,
    headers: {
        /* optional, set an auth header */
        Authorization: 'Bearer ' + 'JWT_BEARER_TOKEN'
    },
    push: {
        batchSize,
        queryBuilder: pushQueryBuilder
    },
    pull: {
        queryBuilder: pullQueryBuilder
    },
    live: true,
    /**
     * Because the websocket is used to inform the client
     * when something has changed,
     * we can set the liveIntervall to a high value
     */
    liveInterval: 1000 * 60 * 10, // 10 minutes
    deletedFlag: 'deleted'
  });
  // show replication-errors in logs
  replicationState.error$.subscribe(err => {
      console.error('replication error:');
      console.dir(err);
  });

  const endpointUrl = 'ws://' + hasuraProject;
  console.log('Database service: Create websocket');
  const wsClient = this.subscriptionService.getWSClient(endpointUrl, {
    // uri: socketUrl,
    lazy: true,
    reconnect: true,
    options: {
        reconnect: true,
        connectionParams: {
            authorization: 'Bearer',
        },
    },
    connectionParams: async () => {
        return {
            authorization: 'Bearer'
        };
    },
    // webSocketImpl: WebSocket,
    reconnectionAttempts: 99,
  }, WebSocket) as any;

  const query = `
    subscription onChangedHero($token: String!) {
      hero {
        id
      }
    }
  `;

  console.log('Database service: request subscription.');
  const ret = wsClient.request(
      {
          query,
          /**
           * there is no method in javascript to set custom auth headers
           * at websockets. So we send the auth header directly as variable
           * @link https://stackoverflow.com/a/4361358/3443137
           */
          variables: {
              token: 'JWT_BEARER_TOKEN'
          }
      }
  );
  ret.subscribe({
      next: async (data) => {
          console.log('subscription emitted => trigger run()');
          console.dir(data);
          await replicationState.run();
          console.log('run() done');
      },
      error(error) {
          console.log('run() got error:');
          console.dir(error);
      }
  });

  // log all collection events for debugging
  db.hero.$.pipe(filter((ev: any) => !ev.isLocal)).subscribe(ev => {
      console.log('colection.$ emitted:');
      console.dir(ev);
  });

  console.log('DatabaseService: created');

  return db;
}


let initState: null | Promise<any> = null;;
let DB_INSTANCE: RxHeroesDatabase;

/**
* This is run via APP_INITIALIZER in app.module.ts
* to ensure the database exists before the angular-app starts up
*/
export async function initDatabase() {
  if (!initState) {
      console.log('initDatabase()');
      initState = _create().then(db => DB_INSTANCE = db);
  }
  await initState;
}

@Injectable()
export class DatabaseService {

  constructor() {

  }

  get db(): RxHeroesDatabase {
      return DB_INSTANCE;
  }
}
