import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateParticipanteRequest {
  nome: string;
  password: string;
  setor: string;
  email: string;
  telefone_whatsapp?: string;
  convite_token: string;
}

export interface CreateParticipanteResponse {
  id: string;
  nome: string;
  email: string;
  setor: string;
  telefone_whatsapp: string;
  ativo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CadastroService {
  private readonly baseUrl = environment.BASE_URL;
  private readonly apiUrl = this.baseUrl + '/api/v1';

  constructor(private http: HttpClient) {}

  criarParticipante(
    data: CreateParticipanteRequest
  ): Observable<ApiResponse<CreateParticipanteResponse>> {
    return this.http.post<ApiResponse<CreateParticipanteResponse>>(
      `${this.apiUrl}/participantes`,
      data
    );
  }
}