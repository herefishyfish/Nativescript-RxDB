import { Injectable, NgZone, OnInit } from "@angular/core";

// import typings
/**
 * custom typings so typescript knows about the schema-fields
 */

import type { RxDocument, RxCollection, RxDatabase } from "rxdb/plugins/core";

import { RxDBValidatePlugin } from "rxdb/plugins/validate";

export type RxHeroDocumentType = {
  name: string;
  color: string;
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
  },
  indexes: ["name", "color", "updatedAt"],
  required: ["id", "color"],

};

export const graphQLGenerationInput = {
  hero: {
    schema: heroSchema,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
  },
};

const batchSize = 5;

export const getPushQuery = () => {
  return (doc) => {
    // remove rxdb columns before push
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
              name, color, deleted, updatedAt
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
    console.log("pull request");
    // the first pull does not have a start-document
    const sortByValue = doc ? doc["updatedAt"] : new Date(0).toISOString();
    const query = `{
      hero(
        where: {updatedAt: {_gt: "${sortByValue}"}},
        order_by: {updatedAt: asc}
        ){
          id name color updatedAt deleted
        }
      }`;

    console.log(query);
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
    name: "nssqlite",
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
     * we can set the liveIntervall to a high value
     */
    liveInterval: 1000 * 60 * 1, // 1 minutes
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
  replicationState.runPull();
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
      /**
       * This is really scuffed an only submits data if websocket recieves data..
       * The standard timed push isn't working, this is..
       * The standard push also works on init...
       * TODO:
       *  - Get standard push's going.
       *  - Figure out what's causing these functions to fail. "Unhandled Promise rejection: 409"
       *    (It's most likely the root cause of the issues.)
       *  - Get replicationState.run() to handle update events. (AFAIK it should handle changes better)
       */

      // replicationState.run(true);
      setTimeout(() => {
        replicationState.runPull();
      }, 0);
      setTimeout(() => {
        replicationState.runPush();
      }, 0);
      console.log('Ran replicator...');
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
  repl_ = replicationState;
  constructor(
    private subscriptionService: SubscriptionService,
  ) {
    sub = this.subscriptionService;
  }

  get db(): RxHeroesDatabase {
    return DB_INSTANCE;
  }
}
