import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, retry, throwError } from 'rxjs';
import { iTodo } from '../interfaces/todo';

@Injectable({
  providedIn: 'root',
})
export class ExampleService {
  todoApiUrl: string = 'https://jsonplaceholder.typicode.com/todos';
  productApiUrl: string = 'https://fakestoreapi.com/products';
  phoneApiUrl: string = 'https://dummyjson.com/products/category/smartphones';

  myAPI: string = 'http://localhost:3000/';

  constructor(private _http: HttpClient) {}

  getAllTask(): Observable<iTodo[]> {
    return this._http.get<iTodo[]>(this.todoApiUrl);
  }

  getAllProduct(): Observable<any> {
    return this._http.get<any>(this.productApiUrl);
  }

  getAllPhones(): Observable<any> {
    return this._http
      .get<any>(this.phoneApiUrl)
      .pipe(retry(2), catchError(this.handleError));
  }

  handleError(err: HttpErrorResponse) {
    return throwError(() => new Error(err.message));
  }

  getBeerList(): Observable<any> {
    return this._http
      .get(this.myAPI + 'products')
      .pipe(retry(2), catchError(this.handleError));
  }
}
