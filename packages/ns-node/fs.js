/************************************************************************
 * (c) 2015, Master Technology
 * Licensed under the MIT license
 * Any questions please feel free to email me or put a issue up on github
 * Version 0.0.1
 ************************************************************************/

var FileSystemAccess =
  require("file-system/file-system-access").FileSystemAccess;
var Folder = require("file-system/file-system").Folder;
var File = require("file-system/file-system").File;
var FSN = require("./fs-native");
var fa = new FileSystemAccess();

("use strict");

var fs = {
  // Node 0.12 Mode Constants
  F_OK: 0,
  X_OK: 1,
  W_OK: 2,
  R_OK: 4,

  rename: function (oldPath, newPath, callback) {
    // node replaces existing files, {N} fa doesn't, so remove if it exist. Only do that if there is a file to rename.
    if (fs.existsSync(oldPath) && fs.existsSync(newPath)) {
      // this is synchronous
      fa.deleteFile(newPath);
    }

    // fa.rename is synchronous
    var error = undefined;
    fa.rename(oldPath, newPath, function (err) {
      error = err;
    });
    if (typeof callback === "function") {
      callback(error);
    }
  },
  renameSync: function (oldPath, newPath) {
    fs.rename(oldPath, newPath, null);
  },
  exists: function (path, callback) {
    callback(fs.existsSync(path));
  },
  existsSync: function (path) {
    return fa.fileExists(path);
  },
  access: function (path, mode, callback) {
    if (typeof mode === "function") {
      callback = mode;
      mode = fs.F_OK;
    }

    if (!fs._accessSync(path, mode)) {
      callback("No Access");
    } else {
      callback();
    }
  },
  accessSync: function (path, mode) {
    if (!fs._accessSync(path, mode)) {
      throw new Error("No Access");
    }
  },
  _accessSync: function (path, mode) {
    var result = FSN.access(path);

    // F_OK
    if (result === -1) return false;

    // Check the other access modes
    return (result & mode) == mode;
  },
  unlink: function (path, callback) {
    try {
      FSN.unlink(path);
    } catch (err) {
      return callback(err);
    }
    callback();
  },
  unlinkSync: function (path) {
    try {
      FSN.unlink(path);
    } catch (err) {
      return false;
    }
    return true;
  },

  truncate: function (path, len, callback) {
    throw new Error("Not Implemented");
  },
  truncateSync: function (path, len) {
    fs.truncate(path, len);
  },
  chown: function (path, uid, gid, callback) {
    throw new Error("Not Implemented");
  },
  chownSync: function (path, uid, gid) {
    fs.chown(path, uid, gid);
  },
  chmod: function (path, mode, callback) {
    throw new Error("Not Implemeted");
  },
  chmodSync: function (path, mode) {
    fs.chmod(path, mode, null);
  },
  stat: function (path, callback) {
    if (typeof callback === "function") {
      if (fs.existsSync(path)) {
        callback(
          undefined,
          // this data is not related to the file, but should be ok for regular 'does the file exist?' usage
          {
            dev: 16777220,
            mode: 33188,
            nlink: 1,
            uid: 501,
            gid: 20,
            rdev: 0,
            blksize: 4096,
            ino: 22488095,
            size: 101,
            blocks: 8,
            atime: "2017-04-02T10:21:33.000Z",
            mtime: "2017-04-02T10:21:31.000Z",
            ctime: "2017-04-02T10:21:31.000Z",
            birthtime: "2017-04-02T10:21:31.000Z",
            isDirectory: function () {
              return fa.folderExists(path);
            },
          }
        );
      } else {
        callback(
          { errno: -2, code: "ENOENT", syscall: "stat", path: path },
          undefined
        );
      }
    }
  },
  statSync: function (path) {
    console.log("statSync not implemented, called with params: " + path);
    return {};
  },
  open: function (path, flags, mode, callback) {
    if (typeof mode === "function" && !callback) {
      callback = mode;
    }
    if (typeof callback === "function") {
      callback();
    }
  },
  openSync: function (path, options) {
    return null;
  },
  close: function (fd, callback) {
    if (typeof callback === "function") {
      callback();
    }
  },
  fsync: function (fd, callback) {
    if (typeof callback === "function") {
      callback();
    }
  },
  closeSync: function (fd) {},
  futimesSync: function (fd, atime, mtime) {
    console.log(
      "futimesSync not implemented, called with params: " +
        fd +
        ", " +
        atime +
        ", " +
        mtime
    );
  },
  // note that our impl expects text, doesn't do binary atm
  readFile: function (path, options, callback) {
    if (typeof options === "function" && !callback) {
      callback = options;
    }
    // fa.readText is synchronous
    var error = undefined;
    var contents = fa.readText(path, function (err) {
      error = err;
    });
    if (typeof callback === "function") {
      callback(error, contents);
    }
  },
  readFileSync: function (path) {
    return fa.readText(path);
  },
  write: function (file, data, position, encoding, callback) {
    fs.writeFile(file, data, null, callback);
  },
  // note that our impl expects text, doesn't do binary atm
  writeFile: function (path, data, options, callback) {
    if (typeof options === "function" && !callback) {
      callback = options;
    }

    if (!fs.existsSync(path)) {
      File.fromPath(path);
    }

    // fa.writeText is synchronous
    var error = undefined;
    fa.writeText(path, data, function (err) {
      error = err;
    });
    if (typeof callback === "function") {
      callback(error);
    }
  },
  writeFileSync: function (file, data) {
    fa.writeText(file, data);
    return undefined;
  },
  mkdir: function (path, mode, callback) {
    if (typeof mode === "function" && !callback) {
      callback = mode;
    }
    try {
      var folder = Folder.fromPath(path);
      if (typeof callback === "function") {
        callback();
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback(err);
      }
    }
  },
  readdir: function (path, options, callback) {
    const folder = Folder.fromPath(path);
    folder
      .getEntities()
      .then((entities) => {
        if (typeof callback === "function") {
          callback(null, entities);
        }
      })
      .catch((err) => {
        // Failed to obtain folder's contents.
        if (typeof callback === "function") {
          callback(err);
        }
      });
  },
  // note that our impl expects text, doesn't do binary atm
  appendFile: function (path, data, options, callback) {
    if (typeof options === "function" && !callback) {
      callback = options;
    }

    if (!fs.existsSync(path)) {
      File.fromPath(path);
    }

    var contents = fs.readFileSync(path);
    var newContents = contents ? contents + data : data;

    // fa.writeText is synchronous
    var error = undefined;
    fa.writeText(path, newContents, function (err) {
      error = err;
    });
    if (typeof callback === "function") {
      callback(error);
    }
  },
};

module.exports = fs;
