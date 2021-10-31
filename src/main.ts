import { platformNativeScript, runNativeScriptAngularApp } from '@nativescript/angular';

import { AppModule } from './app/app.module';

import { decode, encode } from 'base-64';
import { initDatabase } from './app/cores/services/database.service';

global.process = {
  nextTick: function (cb) { setTimeout(cb, 0) },
  platform: "Nativescript",
  version: "v0.0.1",
  browser: true,
} as any;


if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}

// initDatabase();

runNativeScriptAngularApp({
  appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
});

