import { APP_INITIALIZER, NgModule, NO_ERRORS_SCHEMA } from '@angular/core'
import { NativeScriptModule } from '@nativescript/angular'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { ItemsComponent } from './item/items.component'
import { DatabaseService, initDatabase } from './core/services/database.service'
import { SubscriptionService } from './core/services/subscription.service'

@NgModule({
  bootstrap: [AppComponent],
  imports: [NativeScriptModule, AppRoutingModule],
  declarations: [AppComponent, ItemsComponent],
  providers: [
    // {
    //   provide: APP_INITIALIZER,
    //   useFactory: () => initDatabase,
    //   multi: true,
    //   deps: []
    // },
  DatabaseService, SubscriptionService],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {}
