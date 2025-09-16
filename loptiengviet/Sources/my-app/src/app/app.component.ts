import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { ContentComponent } from './content/content.component';
import { FooterComponent } from './footer/footer.component';
import { BindingComponent } from './binding/binding.component';
import { DirectiveComponent } from './directive/directive.component';
import { ChildComponent } from './child/child.component';
import { CommonModule } from '@angular/common';
import { ListComponent } from './list/list.component';
import { DetailsComponent } from './details/details.component';
import { TodoComponent } from './todo/todo.component';
import { FashionComponent } from './fashion/fashion.component';
import { NavbarComponent } from './navbar/navbar.component';
import { BeerComponent } from './beer/beer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    ContentComponent,
    FooterComponent,
    BindingComponent,
    DirectiveComponent,
    ChildComponent,
    CommonModule,
    ListComponent,
    DetailsComponent,
    TodoComponent,
    FashionComponent,
    NavbarComponent,
    BeerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'my-app';

  messageToChild = 'Hello from Parent Comp!';

  dataFromChild: any;

  receiveData(event: any) {
    console.log(event);
    this.dataFromChild = event;
  }
}
