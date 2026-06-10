import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AtualizarPerfilRequest,
  PerfilService,
  PerfilUsuario
} from '../../core/services/perfil';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class Perfil implements OnInit {
  perfil: PerfilUsuario | null = null;

  formPerfil = {
    nome: '',
    setor: '',
    telefone_whatsapp: ''
  };

  senhaAtual = '';
  novaSenha = '';
  confirmarNovaSenha = '';

  carregando = true;
  salvandoPerfil = false;
  salvandoSenha = false;
  enviandoFoto = false;
  removendoFoto = false;

  mensagemErro = '';
  mensagemSucesso = '';

  readonly tamanhoMaximoFoto = 5 * 1024 * 1024;
  readonly tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarPerfil();
  }

  carregarPerfil(): void {
    this.carregando = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    this.perfilService.buscarMeuPerfil().subscribe({
      next: (response) => {
        this.perfil = response.data;
        this.preencherFormulario(response.data);
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Perfil] Erro ao carregar perfil:', error);

        if (error.status === 401) {
          this.mensagemErro = 'Sua sessão expirou. Faça login novamente.';
        } else if (error.status === 404) {
          this.mensagemErro = 'Perfil não encontrado.';
        } else {
          this.mensagemErro = 'Não foi possível carregar seu perfil.';
        }

        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  salvarPerfil(): void {
    if (!this.perfil || this.salvandoPerfil) {
      return;
    }

    const nome = this.formPerfil.nome.trim();

    if (!nome) {
      this.mensagemErro = 'O nome não pode ficar vazio.';
      this.mensagemSucesso = '';
      return;
    }

    const payload: AtualizarPerfilRequest = {
      nome,
      setor: this.formPerfil.setor.trim(),
      telefone_whatsapp: this.formPerfil.telefone_whatsapp.trim()
    };

    this.salvandoPerfil = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    this.perfilService.atualizarMeuPerfil(payload).subscribe({
      next: (response) => {
        this.perfil = response.data;
        this.preencherFormulario(response.data);
        this.mensagemSucesso = 'Perfil atualizado com sucesso.';
        this.salvandoPerfil = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Perfil] Erro ao salvar perfil:', error);

        if (error.status === 400) {
          this.mensagemErro =
            error.error?.details ||
            error.error?.message ||
            'Dados inválidos no perfil.';
        } else {
          this.mensagemErro = 'Não foi possível atualizar o perfil.';
        }

        this.salvandoPerfil = false;
        this.cdr.detectChanges();
      }
    });
  }

  alterarSenha(): void {
    if (this.salvandoSenha) {
      return;
    }

    if (!this.senhaAtual.trim()) {
      this.mensagemErro = 'Informe sua senha atual.';
      this.mensagemSucesso = '';
      return;
    }

    if (this.novaSenha.length < 6) {
      this.mensagemErro = 'A nova senha deve ter pelo menos 6 caracteres.';
      this.mensagemSucesso = '';
      return;
    }

    if (this.novaSenha !== this.confirmarNovaSenha) {
      this.mensagemErro = 'A confirmação da nova senha não confere.';
      this.mensagemSucesso = '';
      return;
    }

    this.salvandoSenha = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    this.perfilService.alterarSenha({
      senha_atual: this.senhaAtual,
      nova_senha: this.novaSenha
    }).subscribe({
      next: () => {
        this.senhaAtual = '';
        this.novaSenha = '';
        this.confirmarNovaSenha = '';

        this.mensagemSucesso = 'Senha alterada com sucesso.';
        this.salvandoSenha = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Perfil] Erro ao alterar senha:', error);

        if (error.status === 400) {
          this.mensagemErro =
            error.error?.details ||
            error.error?.message ||
            'Verifique a senha atual e a nova senha.';
        } else {
          this.mensagemErro = 'Não foi possível alterar a senha.';
        }

        this.salvandoSenha = false;
        this.cdr.detectChanges();
      }
    });
  }

  selecionarFoto(input: HTMLInputElement): void {
    if (this.enviandoFoto || this.removendoFoto) {
      return;
    }

    input.click();
  }

  enviarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    input.value = '';

    const erroValidacao = this.validarFoto(file);

    if (erroValidacao) {
      this.mensagemErro = erroValidacao;
      this.mensagemSucesso = '';
      return;
    }

    this.enviandoFoto = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    this.perfilService.atualizarFoto(file).subscribe({
      next: (response) => {
        if (this.perfil) {
          this.perfil = {
            ...this.perfil,
            foto_url: response.data.foto_url
          };

          this.perfilService.atualizarPerfilLocal(this.perfil);
        }

        this.mensagemSucesso = 'Foto atualizada com sucesso.';
        this.enviandoFoto = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Perfil] Erro ao enviar foto:', error);

        if (error.status === 400) {
          this.mensagemErro =
            error.error?.details ||
            error.error?.message ||
            'Envie uma imagem JPG, PNG ou WEBP de até 5MB.';
        } else {
          this.mensagemErro = 'Não foi possível atualizar a foto.';
        }

        this.enviandoFoto = false;
        this.cdr.detectChanges();
      }
    });
  }

  removerFoto(): void {
    if (!this.perfil || this.removendoFoto || this.enviandoFoto) {
      return;
    }

    this.removendoFoto = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    this.perfilService.removerFoto().subscribe({
      next: () => {
        if (this.perfil) {
          this.perfil = {
            ...this.perfil,
            foto_url: ''
          };

          this.perfilService.atualizarPerfilLocal(this.perfil);
        }

        this.mensagemSucesso = 'Foto removida com sucesso.';
        this.removendoFoto = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Perfil] Erro ao remover foto:', error);

        this.mensagemErro = 'Não foi possível remover a foto.';
        this.removendoFoto = false;
        this.cdr.detectChanges();
      }
    });
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
    const nome = this.perfil?.nome || this.perfil?.email || 'Usuário';
    const partes = nome
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

  get textoBotaoPerfil(): string {
    return this.salvandoPerfil ? 'Salvando perfil...' : 'Salvar alterações';
  }

  get textoBotaoSenha(): string {
    return this.salvandoSenha ? 'Alterando senha...' : 'Alterar senha';
  }

  private preencherFormulario(perfil: PerfilUsuario): void {
    this.formPerfil = {
      nome: perfil.nome || '',
      setor: perfil.setor || '',
      telefone_whatsapp: perfil.telefone_whatsapp || ''
    };
  }

  private validarFoto(file: File): string {
    if (!this.tiposPermitidos.includes(file.type)) {
      return 'Envie uma imagem JPG, PNG ou WEBP.';
    }

    if (file.size > this.tamanhoMaximoFoto) {
      return 'A imagem deve ter no máximo 5MB.';
    }

    return '';
  }
}