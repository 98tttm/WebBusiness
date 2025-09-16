import { Component, OnInit } from '@angular/core';
import { ExampleService } from '../services/example.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-beer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './beer.component.html',
  styleUrl: './beer.component.css',
})
export class BeerComponent implements OnInit {
  beers: any;
  errMsg: string = '';

  constructor(private _service: ExampleService) {}

  ngOnInit(): void {
    this._service.getBeerList().subscribe({
      next: (data) => (this.beers = data),
      error: (err) => (this.errMsg = err.message),
    });
  }
}
