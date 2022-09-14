# NativeScript Node Compatibility

A NativeScript module providing node compatibility

## License

This is released under the MIT License, meaning you are free to include this in any type of program -- However for entities that need a support and/or a commercial license please contact me (nathan@master-technology.com).

## Installation

Run `npm install nativescript-node --save` from inside your project's `app` directory:

```
.
├── app <------------------------------ run npm install from inside here
│   ├── app.css
│   ├── app.js
│   ├── main-page.js
│   ├── main-page.xml
│   ├── node_modules
│   │   └── nativescript-node <-- The install will place the module's code here
│   │       └── ...
│   ├── package.json <----------------- The install will register “nativescript-node” as a dependency here
│   ├── App_Resources  
│   └── tns_modules
│       └── ...
├── lib
└── platforms
    ├── android
    └── ios
```

As is, using npm within NativeScript is still experimental, so it's possible that you'll run into some issues. A more complete solution is in the works, and you can check out [this issue](https://github.com/NativeScript/nativescript-cli/issues/362) for an update on its progress and to offer feedback.

If npm doesn't end up working for you, you can just copy and paste this repo's *.js into your app and reference them directly.

## Usage

To use the sqlite module you must first `require()` it from your project's `node_modules` directory:

```js
var fs = require( "./node_modules/nativescript-node/fs" );
```

### exists
```js

fs.exists('blah', callback);

```
