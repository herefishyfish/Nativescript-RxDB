import { Injectable, NgZone, OnInit } from "@angular/core";

// import typings
/**
 * custom typings so typescript knows about the schema-fields
 */

import type { RxDocument, RxCollection, RxDatabase } from "rxdb/plugins/core";

import { RxDBValidatePlugin } from "rxdb/plugins/validate";

export type RxHeroDocumentType = {
  id: string;
  name: string;
  color: string;
  deleted: boolean;
};

export type RxHeroDocument = RxDocument<RxHeroDocumentType>;

export type RxHeroCollection = RxCollection<RxHeroDocumentType, {}>;

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
import { createRxDatabase, addRxPlugin } from "rxdb/plugins/core";

import { addPouchPlugin, getRxStoragePouch } from "rxdb/plugins/pouchdb";

import { RxDBLocalDocumentsPlugin } from "rxdb/plugins/local-documents";

import { createPlugin } from "../../../../packages/ns-pdb-adapter";
import mapreduce from "pouchdb-mapreduce";
import HttpPouch from "pouchdb-adapter-http";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";

import { filter } from "rxjs/operators";

import { RxDBReplicationGraphQLPlugin } from "rxdb/plugins/replication-graphql";
import { SubscriptionService } from "./subscription.service";

export const heroSchema = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    name: {
      type: "string",
    },
    color: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
  },
  indexes: ["name", "color", "updatedAt", "createdAt"],
  required: ["id", "color"],
};

const batchSize = 5;

export const getPushQuery = () => {
  return (doc) => {
    // remove rxdb columns before push
    doc['deleted'] = doc._deleted;
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
    console.log('Manually syncing @', new Date().toISOString());
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
let replicationState;
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
  addRxPlugin(RxDBValidatePlugin);
  addRxPlugin(RxDBDevModePlugin);
}

/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {
  await loadRxDBPlugins();

  console.log("DatabaseService: creating database..");
  const db = await createRxDatabase<RxHeroesCollections>({
    name: "nssqlitehero",
    storage: getRxStoragePouch("nativescript-sqlite"),
    multiInstance: false,
  });
  console.log("DatabaseService: created database");

  console.log("DatabaseService: create collections");
  await db.addCollections({
    hero: {
      schema: heroSchema,
    },
  });

  console.log("hero collection");

  db.hero.$.pipe(filter((ev: any) => !ev.isLocal)).subscribe((ev) => {
    console.log("collection.$ emitted:");
    console.dir(ev);
  });

  console.log("DatabaseService: Create replicator..");
  console.log("https://" + hasuraProject);
  replicationState = db.hero.syncGraphQL({
    url: "https://" + hasuraProject,
    headers: {
      "x-hasura-admin-secret":
        "2zWIdFAkt9O9OGnxqXTkPw14xkQC0jVCSWKRf9hB7OAkrlzz1l8idW9w7SfUPkZE",
    },
    push: {
      batchSize,
      queryBuilder: getPushQuery(),
    },
    pull: {
      queryBuilder: getPullQuery(),
    },
    live: true,
    /**
     * Because the websocket is used to inform the client
     * when something has changed,
     * we can set the liveInterval to a high value
     */
    liveInterval: 1000 * 60 * 10, // 10 minutes
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

  // Initial pull: sometimes the websocket takes a while to startup...
  replicationState.run(true);
  // replicationState.runPull();

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
      await replicationState.run(true);
      console.log("Ran replicator...");
    },
    error(error) {
      console.log("run() got error:");
      console.dir(error);
    },
  });
  // log all collection events for debugging
  // db.hero.$.pipe(filter((ev: any) => !ev.isLocal)).subscribe((ev) => {
  //   console.log("colection.$ emitted:");
  //   console.dir(ev);
  // });

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
