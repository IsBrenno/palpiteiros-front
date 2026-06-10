import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type SuperPalpiteTipo = 'TIME' | 'OPCAO' | 'NUMERO';

export type SuperPalpiteStatus =
  | 'ABERTO'
  | 'FECHADO'
  | 'APURADO'
  | 'CANCELADO';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SuperPalpiteOpcao {
  id: number;
  label: string;
  valor: string;
}

export interface SuperPalpiteResposta {
  id: number;
  pergunta_id: number;
  tipo: SuperPalpiteTipo;

  time_id: number | null;
  time_nome: string | null;

  opcao_id: number | null;
  opcao_label: string | null;

  valor_numero: number | null;

  pontos: number | null;
  acertou: boolean;

  criado_em: string;
  atualizado_em: string;
}

export interface SuperPalpite {
  id: number;

  titulo: string;
  descricao: string;
  tipo: SuperPalpiteTipo;
  regra_apuracao: string;

  pontos_acerto: number;
  pontos_parcial: number;

  status: SuperPalpiteStatus;
  abre_em: string | null;
  fecha_em: string;
  esta_aberto: boolean;

  usa_lista_times: boolean;

  opcoes: SuperPalpiteOpcao[];

  minha_resposta: SuperPalpiteResposta | null;
}

export interface ResponderSuperPalpiteRequest {
  time_id?: number;
  opcao_id?: number;
  valor_numero?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SuperPalpitesService {
  private readonly apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  listarSuperPalpites(): Observable<ApiResponse<SuperPalpite[]>> {
    return this.http.get<ApiResponse<SuperPalpite[]>>(
      `${this.apiUrl}/super-palpites`
    );
  }

  buscarSuperPalpite(id: number): Observable<ApiResponse<SuperPalpite>> {
    return this.http.get<ApiResponse<SuperPalpite>>(
      `${this.apiUrl}/super-palpites/${id}`
    );
  }

  responderSuperPalpite(
    id: number,
    data: ResponderSuperPalpiteRequest
  ): Observable<ApiResponse<SuperPalpite>> {
    return this.http.post<ApiResponse<SuperPalpite>>(
      `${this.apiUrl}/super-palpites/${id}/resposta`,
      data
    );
  }

  listarMinhasRespostas(): Observable<ApiResponse<SuperPalpite[]>> {
    return this.http.get<ApiResponse<SuperPalpite[]>>(
      `${this.apiUrl}/super-palpites/minhas-respostas`
    );
  }
}