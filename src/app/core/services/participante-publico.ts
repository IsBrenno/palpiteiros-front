import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ParticipantePublico {
  id: string;
  nome: string;
  email: string;
  setor: string;
  foto_url: string;
}

export type ResultadoPalpitePublico = 'CASA' | 'EMPATE' | 'FORA';

export interface TimePalpitePublico {
  nome: string;
  sigla: string;
  brasao_url: string;
}

export interface JogoPalpitePublico {
  time_casa: TimePalpitePublico;
  time_fora: TimePalpitePublico;
  data_jogo: string;
  hora_jogo: string;
  data_hora_jogo: string;
}

export interface ResultadoPalpiteDTO {
  resultado: ResultadoPalpitePublico;
  descricao: string;
}

export interface PlacarPublicoDTO {
  casa: number | null;
  fora: number | null;
}

export interface PalpitePublico {
  id: number;
  codigo_jogo: string;

  fase: string;
  grupo: string;
  rodada_grupo: number;

  jogo: JogoPalpitePublico;
  palpite: ResultadoPalpiteDTO;

  placar_palpite?: PlacarPublicoDTO | null;

  pontos: number | null;
  placar_exato: boolean;
  acertou_resultado: boolean;

  status: string;
  status_api: string;

  criado_em: string;
  atualizado_em: string;
}

export type SuperPalpiteTipoPublico = 'TIME' | 'OPCAO' | 'NUMERO';

export interface SuperPalpiteRespostaPublica {
  time_id: number | null;
  time_nome: string | null;
  time_sigla: string | null;
  time_brasao_url: string | null;

  opcao_id: number | null;
  opcao_label: string | null;

  valor_numero: number | null;
}

export interface SuperPalpitePublico {
  id: number;
  pergunta_id: number;

  titulo: string;
  descricao: string;
  tipo: SuperPalpiteTipoPublico;
  regra_apuracao: string;

  pontos_acerto: number;
  pontos_parcial: number;

  status: string;
  fecha_em: string;

  resposta: SuperPalpiteRespostaPublica;

  pontos: number | null;
  acertou: boolean;

  criado_em: string;
  atualizado_em: string;
}

export interface ResumoPalpitesParticipante {
  participante: ParticipantePublico;
  palpites: PalpitePublico[];
  super_palpites: SuperPalpitePublico[];
}

export interface PalpitesParticipanteResponse {
  participante: ParticipantePublico;
  palpites: PalpitePublico[];
}

export interface SuperPalpitesParticipanteResponse {
  participante: ParticipantePublico;
  super_palpites: SuperPalpitePublico[];
}

@Injectable({
  providedIn: 'root'
})
export class ParticipantePublicoService {
  private readonly baseUrl = environment.BASE_URL.replace(/\/$/, '');
  private readonly apiUrl = `${this.baseUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  buscarPerfilPublico(
    participanteIdOuEmail: string
  ): Observable<ApiResponse<ParticipantePublico>> {
    const id = encodeURIComponent(participanteIdOuEmail);

    return this.http.get<ApiResponse<ParticipantePublico>>(
      `${this.apiUrl}/participantes/${id}/perfil-publico`
    );
  }

  listarPalpites(
    participanteIdOuEmail: string
  ): Observable<ApiResponse<PalpitesParticipanteResponse>> {
    const id = encodeURIComponent(participanteIdOuEmail);

    return this.http.get<ApiResponse<PalpitesParticipanteResponse>>(
      `${this.apiUrl}/participantes/${id}/palpites`
    );
  }

  listarSuperPalpites(
    participanteIdOuEmail: string
  ): Observable<ApiResponse<SuperPalpitesParticipanteResponse>> {
    const id = encodeURIComponent(participanteIdOuEmail);

    return this.http.get<ApiResponse<SuperPalpitesParticipanteResponse>>(
      `${this.apiUrl}/participantes/${id}/super-palpites`
    );
  }

  buscarResumoPalpites(
    participanteIdOuEmail: string
  ): Observable<ApiResponse<ResumoPalpitesParticipante>> {
    const id = encodeURIComponent(participanteIdOuEmail);

    return this.http.get<ApiResponse<ResumoPalpitesParticipante>>(
      `${this.apiUrl}/participantes/${id}/palpites-resumo`
    );
  }
}