import { AfterViewInit, Component, OnInit } from '@angular/core'
import { Dialogs, isAndroid } from '@nativescript/core';
import { DatabaseService, initDatabase } from '../core/services/database.service'

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
    this.databaseService.db.hero.insert({ "id": this.uuid(), name: 'SPODERMEN', color: 'grey' } as any);
  }
}
