import { Injectable, isDevMode } from "@angular/core";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";

import { getRxStorageMemory } from "rxdb/plugins/memory";

import { RxHeroesDatabase, RxHeroesCollections } from "../../RxDB.d";

import {
  RxDatabase,
  createRxDatabase,
  removeRxDatabase,
  addRxPlugin,
  RxStorage,
} from "rxdb";

import { addPouchPlugin, getRxStoragePouch } from "rxdb/plugins/pouchdb";

import { RxDBLocalDocumentsPlugin } from "rxdb/plugins/local-documents";

import { createPlugin } from "../../../../packages/ns-pdb-adapter";

import { RxDBJsonDumpPlugin } from "rxdb/plugins/json-dump";

import mapreduce from "pouchdb-mapreduce";
import HttpPouch from "pouchdb-adapter-http";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";

import { RxDBMigrationPlugin } from "rxdb/plugins/migration";

import { filter } from "rxjs/operators";

import {
  RxDBReplicationGraphQLPlugin,
  RxGraphQLReplicationState,
} from "rxdb/plugins/replication-graphql";
import { SubscriptionService } from "./subscription.service";

import { HERO_SCHEMA } from "../../schemas/hero.schema";

export const HERO_COLLECTION_NAME = "hero";

const batchSize = 5;

export const getPushQuery = () => {
  return (doc) => {
    // remove rxdb columns before push
    doc["deleted"] = doc._deleted;
    delete doc._deleted;
    delete doc._attachments;
    delete doc._rev;
    const query = `mutation
      hero ($doc: [hero_insert_input!]!) {
        insert_hero(
          objects: $doc,
          on_conflict: {
            constraint: hero_pkey,
            update_columns: [
              name, color, deleted, updatedAt, createdAt
            ]
        }){
          returning {
            id name color updatedAt
          }
        }
      }`;

    const variables = {
      doc,
    };

    return {
      query,
      variables,
    };
  };
};

export const getPullQuery = () => {
  const queryBuilder = (doc) => {
    console.log("Manually syncing @", new Date().toISOString());
    // the first pull does not have a start-document
    const sortByValue = doc ? doc["updatedAt"] : new Date(0).toISOString();
    const query = `{
      hero(
        where: {updatedAt: {_gt: "${sortByValue}"}},
        order_by: {updatedAt: asc}
        ){
          id name color updatedAt createdAt deleted
        }
      }`;

    return {
      query,
      variables: {},
    };
  };
  return queryBuilder;
};

const hasuraProject = "working-oriole-73.hasura.app/v1/graphql";
let replicationState: RxGraphQLReplicationState<any, any>;

/**
 * Loads RxDB plugins
 */
async function loadRxDBPlugins(): Promise<void> {
  const SQLiteAdapter = createPlugin();

  addPouchPlugin(HttpPouch);
  addPouchPlugin(SQLiteAdapter);
  addPouchPlugin(mapreduce);
  addRxPlugin(RxDBUpdatePlugin);
  addRxPlugin(RxDBReplicationGraphQLPlugin);
  addRxPlugin(RxDBLocalDocumentsPlugin);
  addRxPlugin(RxDBMigrationPlugin);
}

let db = null;
let storage: RxStorage<any, any> = null;

/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {
  await loadRxDBPlugins();

  storage = getRxStoragePouch("nativescript-sqlite");

  if (isDevMode()) {
    // we use the schema-validation only in dev-mode
    // this validates each document if it is matching the jsonschema
    storage = wrappedValidateAjvStorage({ storage });
    await addRxPlugin(RxDBDevModePlugin);
  }

  // Need to remove db when using PouchDB storage
  console.log("remove db");
  await removeRxDatabase("nssqlitehero13", storage);
  console.log("removed db");

  console.log("DatabaseService: creating database");

  db = await createRxDatabase<RxHeroesCollections>({
    name: "nssqlitehero13",
    storage,
    multiInstance: false,
    eventReduce: false,
  });

  console.log("DatabaseService: creating collections");

  await db.addCollections({
    [HERO_COLLECTION_NAME]: {
      schema: HERO_SCHEMA,
    },
  });

  console.log("DatabaseService: created collections");

  db.hero.$.pipe(filter((ev: any) => !ev.isLocal)).subscribe((ev) => {
    console.log("collection.$ emitted:");
    console.dir(ev);
  });

  try {
    console.log("DatabaseService: Create replicator..");
    console.log("https://" + hasuraProject);
    replicationState = db.hero.syncGraphQL({
      url: {
        http: "https://" + hasuraProject,
      },
      headers: {
        "x-hasura-admin-secret":
          "2zWIdFAkt9O9OGnxqXTkPw14xkQC0jVCSWKRf9hB7OAkrlzz1l8idW9w7SfUPkZE",
      },
      push: {
        batchSize,
        queryBuilder: getPushQuery(),
      },
      pull: {
        batchSize,
        queryBuilder: getPullQuery,
      },
      live: true,
      deletedFlag: "deleted",
    });

    // show replication-errors in logs
    replicationState.error$.subscribe((err) => {
      console.error("replication error:");
      console.dir(err);
    });

    replicationState.send$.subscribe((doc) => {
      console.log("Sending:", doc);
    });

    replicationState.received$.subscribe((doc) => {
      console.log("Received:", doc);
    });

    console.log("Database service: Create websocket");

    const endpointUrl = "wss://" + hasuraProject;
    const wsClient = sub.getWSClient(
      endpointUrl,
      {
        lazy: true,
        reconnect: true,
        connectionParams: async () => {
          return {
            headers: {
              "x-hasura-admin-secret":
                "2zWIdFAkt9O9OGnxqXTkPw14xkQC0jVCSWKRf9hB7OAkrlzz1l8idW9w7SfUPkZE",
            },
          };
        },
        reconnectionAttempts: 999,
      },
      WebSocket
    ) as any;

    const query = `
  subscription HeroSubscription {
    hero {
      name
      id
      updatedAt
      createdAt
      deleted
      color
    }
  }
  `;

    console.log("Database service: request subscription.");

    const ret = wsClient.request({
      query,
    });

    ret.subscribe({
      next: async (data) => {
        console.log("subscription emitted => trigger run()");
        await replicationState.start();
        console.log("Ran replicator...");
      },
      error(error) {
        console.log("run() got error:");
        console.dir(error);
      },
    });
  } catch (error) {}

  // log all collection events for debugging
  db.hero.$.pipe(filter((ev: any) => !ev.isLocal)).subscribe((ev) => {
    console.log("colection.$ emitted:");
    console.dir(ev);
  });

  console.log("DatabaseService: created");

  return db;
}

let initState: null | Promise<any> = null;
let DB_INSTANCE: RxHeroesDatabase;
let sub = null;
/**
 * This is run via APP_INITIALIZER in app.module.ts
 * to ensure the database exists before the angular-app starts up
 */
export async function initDatabase() {
  if (!initState) {
    console.log("initDatabase()");
    initState = _create().then((db) => (DB_INSTANCE = db));
  }
  await initState;
}

@Injectable()
export class DatabaseService {
  constructor(private subscriptionService: SubscriptionService) {
    sub = this.subscriptionService;
  }
  get db(): RxHeroesDatabase {
    return DB_INSTANCE;
  }
}
