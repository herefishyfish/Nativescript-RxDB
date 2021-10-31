import { Component, OnInit } from '@angular/core'
import { DatabaseService } from './cores/services/database.service';
@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private databaseService: DatabaseService) {}
  ngOnInit(): void {
    // initDatabase().then(() => {
      // this.databaseService.db.collections.hero.find().$.subscribe((hero) => {
      //   console.log('heros', hero);
      // })
    // });
  }


}
