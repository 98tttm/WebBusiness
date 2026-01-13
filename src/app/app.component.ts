import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LunarYearComponent } from './lunar-year/lunar-year.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LunarYearComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'ex10';
}
