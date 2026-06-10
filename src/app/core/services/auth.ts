import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly baseUrl = environment.BASE_URL;
  private readonly apiUrl = this.baseUrl + '/api/v1';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<ApiResponse<AuthTokens>> {
    return this.http
      .post<ApiResponse<AuthTokens>>(`${this.apiUrl}/login`, data)
      .pipe(
        tap((response) => {
          this.saveTokens(response.data);
        })
      );
  }

  refreshToken(): Observable<ApiResponse<AuthTokens>> {
    const refreshToken = this.getRefreshToken();

    return this.http
      .post<ApiResponse<AuthTokens>>(`${this.apiUrl}/auth/refresh`, {
        refresh_token: refreshToken
      } as RefreshRequest)
      .pipe(
        tap((response) => {
          this.saveTokens(response.data);
        })
      );
  }

  logout(): Observable<ApiResponse<null>> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearTokens();

      return of({
        success: true,
        message: 'Logout local efetuado',
        data: null
      });
    }

    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/logout`, {
        refresh_token: refreshToken
      })
      .pipe(
        tap(() => {
          this.clearTokens();
        })
      );
  }

  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    localStorage.setItem('token_type', tokens.token_type);
    localStorage.setItem('expires_in', String(tokens.expires_in));

    /**
     * Limpa o token antigo, caso ainda exista de antes da mudança.
     */
    localStorage.removeItem('token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getTokenType(): string {
    return localStorage.getItem('token_type') || 'Bearer';
  }

  getAuthorizationHeader(): string | null {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return null;
    }

    return `${this.getTokenType()} ${accessToken}`;
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('expires_in');

    /**
     * Limpa também o token antigo.
     */
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  }
}
