import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-child',
  standalone: true,
  imports: [],
  templateUrl: './child.component.html',
  styleUrl: './child.component.css'
})
export class ChildComponent {

  // Receive data from Parent-Comp
  // @Input() parentData: any
  @Input('parentData') data: any

  // Send data to Parent-Comp
  @Output() testEvent = new EventEmitter();

  sendData(){
    let product = {
      name: "Heineken",
      price: 22000
    }

    this.testEvent.emit(product)

  }

}
