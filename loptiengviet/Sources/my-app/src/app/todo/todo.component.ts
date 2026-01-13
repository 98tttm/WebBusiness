import { Component, OnInit } from '@angular/core';
import { ExampleService } from '../services/example.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.css',
})
export class TodoComponent implements OnInit {
  todoList: any;
  errMsg: string = '';

  constructor(private _service: ExampleService) {}

  ngOnInit(): void {
    this._service
      .getAllTask()
      .subscribe({
        next: (tasks) => (this.todoList = tasks),
        error: (err) => (this.errMsg = err.message),
      });
  }
}
