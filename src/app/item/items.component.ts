import { Component } from "@angular/core";
import { Dialogs, isAndroid } from "@nativescript/core";
import {
  DatabaseService,
  initDatabase,
} from "../core/services/database.service";

@Component({
  selector: "ns-items",
  templateUrl: "./items.component.html",
})
export class ItemsComponent {
  constructor(public databaseService: DatabaseService) {
    initDatabase();
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
        } as any);
      }
    });
  }

  editHero(hero) {
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
        } as any);
      }
    });
  }

  removeHero(hero) {
    console.log('Removing: ', hero.name);
    hero.remove();
  }
}
