import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-binding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './binding.component.html',
  styleUrl: './binding.component.css',
})
export class BindingComponent {
  framework: string = 'Angular';

  name: string = "Peter"
  email: string = "test@gmail.com"
  address: string = ""

  primary: string = "t-primary"
  error: string = "t-error"
  normal: string = "t-normal"

  err: boolean = true

  multiClass = {
    "t-primary": true,
    "t-normal": true
  }


  test() {
    return 'Sample Text';
  }

  clickMe(event: any){
    console.log(event)
  }

  process(email: string){
    console.log("Email: " + email)
  }

}
