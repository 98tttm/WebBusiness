import { Routes } from '@angular/router';
import { LaptopComponent } from './laptop/laptop.component';
import { PhoneComponent } from './phone/phone.component';
import { FashionComponent } from './fashion/fashion.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { PhoneDetailsComponent } from './phone-details/phone-details.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: FashionComponent },
  { path: 'laptop', component: LaptopComponent },
  { path: 'phone', component: PhoneComponent },
  { path: 'phone/:id', component: PhoneDetailsComponent },
  { path: '**', component: PageNotFoundComponent },
];
