import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
})
export class ListComponent implements OnInit {
  products: any;

  errorMsg: string = '';

  constructor(private _pService: ProductService) {}

  ngOnInit(): void {
    // this.products = this._pService.getProductList();

    this._pService
      .getAllProducts()
      .subscribe({
        next: (data) => (this.products = data),
        error: (err) => (this.errorMsg = err.message),
      });
  }
}
