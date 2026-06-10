import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  setor: string;
  telefone_whatsapp: string;
  foto_url: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface AtualizarPerfilRequest {
  nome?: string;
  setor?: string;
  telefone_whatsapp?: string;
}

export interface AlterarSenhaRequest {
  senha_atual: string;
  nova_senha: string;
}

export interface FotoPerfilResponse {
  foto_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private readonly apiUrl = '/api/v1';

  private readonly perfilSubject = new BehaviorSubject<PerfilUsuario | null>(null);

  perfil$ = this.perfilSubject.asObservable();

  constructor(private http: HttpClient) {}

  buscarMeuPerfil(): Observable<ApiResponse<PerfilUsuario>> {
    return this.http.get<ApiResponse<PerfilUsuario>>(
      `${this.apiUrl}/me`
    ).pipe(
      tap((response) => {
        this.perfilSubject.next(response.data);
      })
    );
  }

  atualizarMeuPerfil(
    data: AtualizarPerfilRequest
  ): Observable<ApiResponse<PerfilUsuario>> {
    return this.http.patch<ApiResponse<PerfilUsuario>>(
      `${this.apiUrl}/me`,
      data
    ).pipe(
      tap((response) => {
        this.perfilSubject.next(response.data);
      })
    );
  }

  alterarSenha(
    data: AlterarSenhaRequest
  ): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(
      `${this.apiUrl}/me/senha`,
      data
    );
  }

  atualizarFoto(file: File): Observable<ApiResponse<FotoPerfilResponse>> {
    const formData = new FormData();
    formData.append('foto', file);

    return this.http.post<ApiResponse<FotoPerfilResponse>>(
      `${this.apiUrl}/me/foto`,
      formData
    ).pipe(
      tap((response) => {
        const perfilAtual = this.perfilSubject.value;

        if (perfilAtual) {
          this.perfilSubject.next({
            ...perfilAtual,
            foto_url: response.data.foto_url
          });
        }
      })
    );
  }

  removerFoto(): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/me/foto`
    ).pipe(
      tap(() => {
        const perfilAtual = this.perfilSubject.value;

        if (perfilAtual) {
          this.perfilSubject.next({
            ...perfilAtual,
            foto_url: ''
          });
        }
      })
    );
  }

  atualizarPerfilLocal(perfil: PerfilUsuario): void {
    this.perfilSubject.next(perfil);
  }

  limparPerfil(): void {
    this.perfilSubject.next(null);
  }

  get perfilAtual(): PerfilUsuario | null {
    return this.perfilSubject.value;
  }
}