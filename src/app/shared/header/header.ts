import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { Auth } from '../../core/services/auth';
import { PerfilService, PerfilUsuario } from '../../core/services/perfil';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit, OnDestroy {
  perfil: PerfilUsuario | null = null;
  carregandoPerfil = false;

  private perfilSubscription: Subscription | null = null;

  constructor(
    private auth: Auth,
    private perfilService: PerfilService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.perfilSubscription = this.perfilService.perfil$.subscribe((perfil) => {
      this.perfil = perfil;
    });

    this.carregarPerfil();
  }

  ngOnDestroy(): void {
    this.perfilSubscription?.unsubscribe();
  }

  carregarPerfil(): void {
    this.carregandoPerfil = true;

    this.perfilService.buscarMeuPerfil().subscribe({
      next: () => {
        this.carregandoPerfil = false;
      },
      error: (error) => {
        console.warn('[Header] Não foi possível carregar perfil:', error);
        this.carregandoPerfil = false;
      }
    });
  }

  sair(): void {
    this.logout();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.perfilService.limparPerfil();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.auth.clearTokens();
        this.perfilService.limparPerfil();
        this.router.navigate(['/login']);
      }
    });
  }

  get nomePerfil(): string {
    return this.perfil?.nome || 'Meu perfil';
  }

  get emailPerfil(): string {
    return this.perfil?.email || '';
  }

  get fotoPerfilUrl(): string {
    return this.normalizarFotoUrl(this.perfil?.foto_url || '');
  }

  private normalizarFotoUrl(url: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (url.startsWith('/')) {
      return url;
    }

    return `/${url}`;
  }

  get iniciaisPerfil(): string {
    const base = this.perfil?.nome || this.perfil?.email || 'Usuário';

    const partes = base
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean);

    if (partes.length === 0) {
      return 'US';
    }

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }
}