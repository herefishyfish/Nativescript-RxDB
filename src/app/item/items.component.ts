import { AfterViewInit, Component, OnInit } from '@angular/core'
import { isAndroid } from '@nativescript/core';
import { DatabaseService, initDatabase } from '../cores/services/database.service'

@Component({
  selector: 'ns-items',
  templateUrl: './items.component.html',
})
export class ItemsComponent {
  constructor(public databaseService: DatabaseService) {
    initDatabase();
  }

  uuid() {
    if( isAndroid ) {
      return java.util.UUID.randomUUID().toString();
    } else {
      return NSUUID.UUID().UUIDString.toLowerCase();
    }
  }

  addHero() {
    this.databaseService.db.hero.insert({ "id": this.uuid(), name: 'SPODERMEN' } as any);
    this.databaseService.db.hero.$
      .subscribe(ev => {
      console.log('hero collection.$ emitted:' );
      console.dir(ev);
    });
  }
}
