import { platformNativeScript, runNativeScriptAngularApp } from '@nativescript/angular';

import { AppModule } from './app/app.module';

global.process = {
  nextTick: function (cb) { setTimeout(cb, 0) },
  platform: "NativeScript",
  version: "v0.0.0",
  browser: true,
} as any;

runNativeScriptAngularApp({
  appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
});

