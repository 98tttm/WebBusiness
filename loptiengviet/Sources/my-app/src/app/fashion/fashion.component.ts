import { Component, OnInit } from '@angular/core';
import { ExampleService } from '../services/example.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fashion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fashion.component.html',
  styleUrl: './fashion.component.css',
})
export class FashionComponent implements OnInit {
  fashions: any;

  constructor(private _service: ExampleService) {}

  ngOnInit(): void {
    this._service.getAllProduct().subscribe({
      next: (data) => {
        this.fashions = data;
        console.log(this.fashions);
      },
    });
  }
}
