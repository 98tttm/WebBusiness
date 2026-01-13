import { Component, OnInit } from '@angular/core';
import { ExampleService } from '../services/example.service';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-phone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phone.component.html',
  styleUrl: './phone.component.css',
})
export class PhoneComponent implements OnInit {
  phones: any;
  errMsg: string = '';

  selectedId: any;

  constructor(
    private _service: ExampleService,
    private router: Router,
    private activate: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this._service.getAllPhones().subscribe({
      next: (data) => (this.phones = data.products),
      error: (err) => (this.errMsg = err.message),
    });

    this.activate.paramMap.subscribe((param) => {
      let id = param.get('id');
      if (id != null) this.selectedId = parseInt(id);
    });
  }

  onActive(p: any) {
    return p.id == this.selectedId;
  }

  onItemClick(p: any) {
    this.router.navigate(['/phone', p.id]);
  }
}
