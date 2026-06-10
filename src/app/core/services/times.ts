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
  sigla?: string | null;
  brasao_url?: string | null;
  grupo?: string | null;

  codigo_externo?: string | null;
  codigo_api_football_data?: number | string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TimesService {
  private readonly baseUrl = environment.BASE_URL;
  private readonly apiUrl = this.baseUrl + '/api/v1';

  constructor(private http: HttpClient) {}

  listarTimes(): Observable<ApiResponse<TimeCopa[]>> {
    return this.http.get<ApiResponse<TimeCopa[]>>(`${this.apiUrl}/times`);
  }

  buscarTimePorId(id: number): Observable<ApiResponse<TimeCopa>> {
    return this.http.get<ApiResponse<TimeCopa>>(`${this.apiUrl}/times/${id}`);
  }
}