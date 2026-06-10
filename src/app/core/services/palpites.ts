import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type ResultadoPalpite = 'CASA' | 'EMPATE' | 'FORA';

export interface CriarPalpiteRequest {
  codigo_jogo: string;
  resultado_palpite: ResultadoPalpite;
  gols_time_casa?: number;
  gols_time_fora?: number;
}

export interface ResultadoPalpiteDTO {
  resultado?: ResultadoPalpite;
  resultado_palpite?: ResultadoPalpite;
  descricao?: string;

  casa?: number | null;
  fora?: number | null;
}

export interface PlacarDTO {
  casa: number | null;
  fora: number | null;
}

export interface PalpiteDTO {
  id: number;
  codigo_jogo: string;
  participante_email: string;
  jogo: {
    time_casa: string;
    time_fora: string;
    data_jogo: string;
    hora_jogo: string;
  };
  palpite: ResultadoPalpiteDTO;
  placar_palpite?: PlacarDTO | null;
  resultado_real: ResultadoPalpiteDTO | null;
  placar_real: PlacarDTO;
  pontos: number | null;
  placar_exato: boolean;
  acertou_resultado: boolean;
  status: string;
  status_api: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ResumoPalpitesResponse {
  codigo_jogo: string;
  fase: string;
  grupo: string;
  permite_empate: boolean;
  total_palpites: number;
  opcoes: OpcaoResumoPalpite[];
}

export interface OpcaoResumoPalpite {
  resultado: ResultadoPalpite;
  label: string;
  descricao: string;
  quantidade: number;
  percentual: number;
}

@Injectable({
  providedIn: 'root'
})
export class PalpitesService {
  private readonly baseUrl = environment.BASE_URL;
  private readonly apiUrl = this.baseUrl + '/api/v1';

  constructor(private http: HttpClient) {}

  salvarPalpite(data: CriarPalpiteRequest): Observable<ApiResponse<PalpiteDTO>> {
    return this.http.post<ApiResponse<PalpiteDTO>>(
      `${this.apiUrl}/palpites`,
      data
    );
  }

  listarMeusPalpites(): Observable<ApiResponse<PalpiteDTO[]>> {
    return this.http.get<ApiResponse<PalpiteDTO[]>>(
      `${this.apiUrl}/palpites/meus`
    );
  }

  buscarMeuPalpiteDoJogo(codigoJogo: string): Observable<ApiResponse<PalpiteDTO>> {
    return this.http.get<ApiResponse<PalpiteDTO>>(
      `${this.apiUrl}/jogos/${codigoJogo}/meu-palpite`
    );
  }

  buscarResumoPalpites(codigoJogo: string): Observable<ApiResponse<ResumoPalpitesResponse>> {
    return this.http.get<ApiResponse<ResumoPalpitesResponse>>(
      `${this.apiUrl}/jogos/${codigoJogo}/palpites/resumo`
    );
  }
}