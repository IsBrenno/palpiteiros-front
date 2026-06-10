import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TimeJogo {
  nome: string;
  sigla: string;
  brasao_url?: string | null;
}

export interface PlacarJogo {
  casa: number | null;
  fora: number | null;
  resultado_final?: string | null;
  confirmado?: boolean;
}

export interface ControleJogo {
  votacao_aberta: boolean;
}

export interface Jogo {
  id?: string;

  codigo_externo: string;
  codigo_api_football_data?: number | string | null;

  fonte?: string;
  copa?: string;
  Copa?: string;

  fase?: string;
  Fase?: string;

  grupo?: string;
  rodada_api?: string | null;
  rodada_grupo?: number | null;

  time_casa: TimeJogo;
  time_fora: TimeJogo;

  placar: PlacarJogo;

  status?: string;
  status_api?: string;
  status_exibicao?: string;

  em_andamento?: boolean;
  finalizado?: boolean;

  data_jogo?: string;
  hora_jogo?: string;
  data_hora_jogo: string;

  timezone_exibicao?: string;
  local?: string | null;

  controle?: ControleJogo;

  criado_em?: string;
  atualizado_em?: string;
}

export interface StatusDetalheJogo {
  exibicao: string;
  api: string;
  em_andamento: boolean;
  finalizado: boolean;
}

export interface JogoDetalheDTO {
  id: string;

  codigo_externo: string;
  codigo_api_football_data?: number | string | null;

  fonte?: string;
  copa?: string;
  fase?: string;
  grupo?: string;

  rodada_api?: string | null;
  rodada_grupo?: number | null;

  time_casa: TimeJogo;
  time_fora: TimeJogo;

  data_jogo: string;
  hora_jogo: string;
  data_hora_jogo: string;

  timezone_exibicao?: string;
  local?: string | null;

  status: StatusDetalheJogo;
  placar: PlacarJogo;
  controle: ControleJogo;

  criado_em?: string;
  atualizado_em?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JogosService {
  private readonly baseUrl = environment.BASE_URL;
  private readonly apiUrl = this.baseUrl + '/api/v1';

  constructor(private http: HttpClient) {}

  listarJogos(): Observable<ApiResponse<Jogo[]>> {
    return this.http.get<ApiResponse<Jogo[]>>(`${this.apiUrl}/jogos`);
  }

  buscarJogoPorId(id: string): Observable<ApiResponse<JogoDetalheDTO>> {
    return this.http.get<ApiResponse<JogoDetalheDTO>>(
      `${this.apiUrl}/jogos/${id}`
    );
  }
}