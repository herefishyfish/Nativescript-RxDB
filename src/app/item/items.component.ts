import { Component } from "@angular/core";
import { Dialogs, isAndroid } from "@nativescript/core";

import { RxDocument } from "rxdb";
import { Observable } from "rxjs";

import { RxHeroDocument } from "../RxDB";

import {
  DatabaseService,
  initDatabase,
} from "../core/services/database.service";

@Component({
  selector: "ns-items",
  templateUrl: "./items.component.html",
})
export class ItemsComponent {
  public heroes$: Observable<RxHeroDocument[]>;

  constructor(public databaseService: DatabaseService) {}

  async ngOnInit() {
    await initDatabase();
  }

  uuid() {
    if (isAndroid) {
      return java.util.UUID.randomUUID().toString();
    } else {
      return NSUUID.UUID().UUIDString.toLowerCase();
    }
  }

  addHero() {
    Dialogs.prompt("Enter hero name", "").then((response) => {
      if (response.result) {
        this.databaseService.db.hero.insert({
          id: this.uuid(),
          name: response.text,
          color:
            "#" +
            (0x1000000 + Math.random() * 0xffffff).toString(16).substr(1, 6),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  editHero(hero: RxDocument<RxHeroDocument>) {
    Dialogs.prompt("Enter hero name", hero?.name).then((response) => {
      if (response.result) {
        // Alternative
        // hero.update({
        //   $set: {
        //     name: response.text,
        //   }
        // } as any);
        this.databaseService.db.hero.upsert({
          id: hero.id,
          name: response.text,
          color: hero.color,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  removeHero(hero: RxDocument<RxHeroDocument>) {
    console.log("Removing: ", hero.name);
    hero.remove().catch((e) => console.log(e));
  }
}
