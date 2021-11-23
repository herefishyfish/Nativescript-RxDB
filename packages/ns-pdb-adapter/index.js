'use strict'

var WebSqlPouchCore = require('../ns-pdb-web-core').default
import { openOrCreate } from '@nativescript-community/sqlite';
import { knownFolders, path } from '@nativescript/core';

function WebSQLRows(array) {
  this._array = array;
  this.length = array.length;
}

WebSQLRows.prototype.item = function (i) {
  return this._array[i];
};

function WebSQLResultSet(insertId, rowsAffected, rows) {
  this.insertId = insertId;
  this.rowsAffected = rowsAffected;
  this.rows = new WebSQLRows(rows);
}

function createOpenDBFunction(opts) {
  return function (name, version, description, size) {
    // The SQLite Plugin started deviating pretty heavily from the
    // standard openDatabase() function, as they started adding more features.
    // It's better to just use their "new" format and pass in a big ol'
    // options object. Also there are many options here that may come from
    // the PouchDB constructor, so we have to grab those.
    var openOpts = Object.assign({}, opts, {
      name: name,
      version: version,
      description: description,
      size: size
    })
    function onError (err) {
      console.error(err)
      if (typeof opts.onError === 'function') {
        opts.onError(err)
      }
    }

    console.log("Opening ", openOpts.name);

    const db = openOrCreate(path.join(knownFolders.documents().getFolder('db').path, `${openOpts.name}.sqlite`), {
      transformBlobs: true,
    });

    // db._transaction = db.transaction;
    // db.transaction = async (txnCallback, errorCallback, successCallback) => {
    //   console.log('transaction');
    //   await db._transaction( async (cancel) => {
    //     try {
    //       console.log('txn func');
    //       await txnCallback(db);
    //       if( typeof(successCallback) === 'function' ) {
    //         console.log('txn success');
    //         await successCallback();
    //       }
    //     } catch (err) {
    //       console.log(err);
    //       if( typeof(errorCallback) === 'function' ) {
    //         await errorCallback(err);
    //       }
    //     }
    //   });
    // }

    // db.executeSql = async (sql, args, sqlCallBack, sqlErrorCallBack) => {
    //   console.log('executeSql', sql, args);

    //   let prevChanges = (await db.select('SELECT total_changes()'))[0]['total_changes()'];
    //   let rows = [];
    //   let insertId = 0;
    //   let rowsAffected = 0;

    //   if( sql.startsWith('SELECT') ) {
    //     rows = await db.select(sql, args);
    //   } else if( sql.startsWith('INSERT')) {
    //     await db.execute(sql, args);
    //     let totalChanges = (await db.select('SELECT total_changes()'))[0]['total_changes()'];
    //     insertId = (await db.select("SELECT last_insert_rowid()"))[0]['last_insert_rowid()'];
    //     rowsAffected = totalChanges - prevChanges;
    //   } else {
    //     await db.execute(sql, args);
    //   }

    //   if (/^\s*UPDATE\b/i.test(sql)) {
    //     // insertId is always undefined for "UPDATE" statements
    //     insertId = void 0;
    //   } else if (/^\s*CREATE\s+TABLE\b/i.test(sql)) {
    //     // WebSQL always returns an insertId of 0 for "CREATE TABLE" statements
    //     insertId = 0;
    //     rowsAffected = 0;
    //   } else if (/^\s*DROP\s+TABLE\b/i.test(sql)) {
    //     // WebSQL always returns insertId=undefined and rowsAffected=0
    //     // for "DROP TABLE" statements. Go figure.
    //     insertId = void 0;
    //     rowsAffected = 0;
    //   } else if (!/^\s*INSERT\b/i.test(sql)) {
    //     // for all non-inserts (deletes, etc.) insertId is always undefined
    //     // ¯\_(ツ)_/¯
    //     insertId = void 0;
    //   }

    //   try {
    //     const result = new WebSQLResultSet(insertId, rowsAffected, rows);
    //     console.log(result);
    //     if( sqlCallBack.length == 2 ) {
    //       await sqlCallBack(db, result);
    //     } else if( sqlCallBack.length == 1 ) {
    //       sqlCallBack(db);
    //     } else {
    //       console.log(sqlCallBack);
    //       await sqlCallBack();
    //     }
    //   } catch (error) {
    //     await sqlErrorCallBack(db, result);
    //   }
    // }

    console.log( 'db is : ', db.isOpen );

    return db;
  }
}

function NativescriptSQLitePouch (opts, callback) {
  var websql = createOpenDBFunction(opts)
  var _opts = Object.assign({
    websql: websql
  }, opts)

  WebSqlPouchCore.call(this, _opts, callback)
}

NativescriptSQLitePouch.valid = function () {
  // if you're using ReactNative, we assume you know what you're doing because you control the environment
  return true
}

// no need for a prefix in ReactNative (i.e. no need for `_pouch_` prefix
NativescriptSQLitePouch.use_prefix = false

function nativescriptSqlitePlugin(PouchDB) {
  console.log('pouch plugin');
  PouchDB.adapter('nativescript-sqlite', NativescriptSQLitePouch, true)
  console.log('pouch plugin done');
}

export function createPlugin() {
  console.log("create Plugin!")
  return nativescriptSqlitePlugin
}

