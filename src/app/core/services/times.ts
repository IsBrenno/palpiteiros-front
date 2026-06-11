import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TimeCopa {
  id: number;
  nome: string;
  sigla: string;
  brasao_url: string;
  grupo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimesService {
  private readonly baseUrl = environment.BASE_URL.replace(/\/$/, '');
  private readonly apiUrl = `${this.baseUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  listarTimes(): Observable<ApiResponse<TimeCopa[]>> {
    return this.http.get<ApiResponse<TimeCopa[]>>(
      `${this.apiUrl}/teams`
    );
  }

  buscarTimePorId(id: number | string): Observable<ApiResponse<TimeCopa>> {
    return this.http.get<ApiResponse<TimeCopa>>(
      `${this.apiUrl}/teams/${id}`
    );
  }
}