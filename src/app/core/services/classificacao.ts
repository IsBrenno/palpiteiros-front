import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ClassificacaoItem {
  posicao: number;
  participante_email: string;

  participante_nome?: string;
  participante_foto_url?: string;

  pontos_jogos: number;
  pontos_super_palpites: number;
  total_pontos: number;

  palpites_jogos_feitos: number;
  super_palpites_feitos: number;
  palpites_com_placar: number;

  acertos_jogos: number;
  placares_exatos: number;
  acertos_super_palpites: number;
}

export interface ClassificacaoResumo {
  total_jogos: number;
  jogos_finalizados: number;

  pontos_resultado_por_jogo: number;
  bonus_placar_exato_por_jogo: number;
  pontos_maximos_por_jogo: number;

  pontos_maximos_jogos: number;
  pontos_maximos_super_palpites: number;
  pontos_maximos_total: number;
}

export interface TimeJogoClassificacao {
  nome: string;
  nome_curto?: string | null;
  sigla?: string | null;
  brasao_url?: string | null;
}

export interface PlacarJogoClassificacao {
  casa: number | null;
  fora: number | null;
  confirmado?: boolean;
  resultado_final?: string | null;
}

export interface StatusJogoClassificacao {
  exibicao?: string;
  api?: string;
  em_andamento?: boolean;
  finalizado?: boolean;
}

export interface JogoClassificacaoApi {
  id?: string | number;
  codigo_externo: string;
  copa?: string;
  fase?: string;
  grupo?: string;
  rodada_grupo?: string | number;
  rodada_api?: string | number;

  time_casa: TimeJogoClassificacao;
  time_fora: TimeJogoClassificacao;

  placar?: PlacarJogoClassificacao;

  status?: string | StatusJogoClassificacao;
  status_api?: string;
  em_andamento?: boolean;
  finalizado?: boolean;

  data_jogo?: string;
  hora_jogo?: string;
  data_hora_jogo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClassificacaoService {
  private readonly apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  listarClassificacao(): Observable<ApiResponse<ClassificacaoItem[]>> {
    return this.http.get<ApiResponse<ClassificacaoItem[]>>(
      `${this.apiUrl}/classificacao`
    );
  }

  buscarMinhaClassificacao(): Observable<ApiResponse<ClassificacaoItem | null>> {
    return this.http.get<ApiResponse<ClassificacaoItem | null>>(
      `${this.apiUrl}/classificacao/minha`
    );
  }

  buscarResumoClassificacao(): Observable<ApiResponse<ClassificacaoResumo | null>> {
    return this.http.get<ApiResponse<ClassificacaoResumo | null>>(
      `${this.apiUrl}/classificacao/resumo`
    );
  }

  listarJogos(): Observable<ApiResponse<JogoClassificacaoApi[]>> {
    return this.http.get<ApiResponse<JogoClassificacaoApi[]>>(
      `${this.apiUrl}/jogos`
    );
  }
}