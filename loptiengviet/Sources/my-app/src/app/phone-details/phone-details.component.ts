import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';

@Component({
  selector: 'app-phone-details',
  standalone: true,
  imports: [],
  templateUrl: './phone-details.component.html',
  styleUrl: './phone-details.component.css',
})
export class PhoneDetailsComponent implements OnInit {
  selectedId: any;

  constructor(private activate: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.activate.paramMap.subscribe((param) => {
      let id = param.get('id');
      if (id != null) this.selectedId = parseInt(id);
    });
  }

  goBack() {
    this.router.navigate(['/phone', { id: this.selectedId }]);
  }
}
