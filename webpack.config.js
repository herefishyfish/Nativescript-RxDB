const webpack = require('@nativescript/webpack');
const path = require('path');
const { ProvidePlugin, NormalModuleReplacementPlugin } = require('webpack');

module.exports = (env) => {
  webpack.init(env);
  webpack.useConfig('angular');

  webpack.chainWebpack((config) => {
    // we add the plugin

    const fallback = config.resolve.get('fallback');
    config.resolve.set(
      'fallback',
      webpack.Utils.merge(fallback || {}, {
        timers: require.resolve('@nativescript/core/'),
        fs: require.resolve('@nativescript/core/'),
        module: require.resolve('@nativescript/core/'),
        path: require.resolve('@nativescript/core/'),
        assert: require.resolve("browser-assert"),
        buffer: require.resolve("buffer/"),
        events: require.resolve("events/"),
        // tty: require.resolve("tty-browserify"),
        process: require.resolve('process/browser'),
        os: require.resolve('os-browserify/browser'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve("util/"),
        // url: require.resolve('url/'),
        // BroadcastChannel: false,
        crypto: require.resolve('crypto-browserify'),
        // // crypto: require.resolve('../libs/crypto/crypto-browserify.js'),
        // ws: require.resolve('@master.technology/websockets'),
        zlib: false,
        // zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        vm: require.resolve('vm-browserify'),
      })
    );

    config.resolve.alias.set(
      'pouchdb-md5',
      path.resolve(__dirname, './packages/pouchdb-md5')
    );
    config.resolve.alias.set(
      'pouchdb-binary-utils',
      '@craftzdog/pouchdb-binary-utils-react-native'
    );
    // config.resolve.alias.set(
    //   'pouchdb-core',
    //   '@craftzdog/pouchdb-core-react-native'
    // );
    // config.resolve.alias.set('crypto', 'crypto-browserify');

    config
      .plugin('NormalModuleReplacement|WebsocketPlugin')
      .use(
        new NormalModuleReplacementPlugin(
          /^ws$/,
          '@master.technology/websockets'
        )
      );
    config.plugin('ProvidePlugin|Polyfills').use(ProvidePlugin, [
      {
        Buffer: [require.resolve('buffer/'), 'Buffer'],
        crypto: [require.resolve('crypto-browserify/'), 'crypto'],
      },
    ]);

    config.plugin('DefinePlugin').tap((args) => {
      Object.assign(args[0], {
        "process": "global.process",
        'process.platform': JSON.stringify('nativescript'),
        'process.env': 'global',
        'process.env.NODE_DEBUG': false,
        'process.version': JSON.stringify('0.0.0'),
        'process.browser': true,
      });

      return args;
    });
  });

  return webpack.resolveConfig();
};
