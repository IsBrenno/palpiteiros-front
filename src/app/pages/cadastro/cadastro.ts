import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CadastroService } from '../../core/services/cadastro';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss'
})
export class Cadastro implements OnInit {
  token = '';

  nome = '';
  email = '';
  setor = '';
  telefoneWhatsapp = '';
  password = '';
  confirmarPassword = '';

  carregando = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cadastroService: CadastroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.mensagemErro = 'Link de convite inválido. Solicite um novo convite.';
    }
  }

  get conviteValido(): boolean {
    return !!this.token;
  }

  get formularioBloqueado(): boolean {
    return !this.conviteValido || this.carregando || !!this.mensagemSucesso;
  }

  get textoBotaoCadastro(): string {
    return this.carregando ? 'Criando conta...' : 'Criar conta';
  }

  criarConta(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    const erroValidacao = this.validarFormulario();

    if (erroValidacao) {
      this.mensagemErro = erroValidacao;
      this.cdr.detectChanges();
      return;
    }

    this.carregando = true;
    this.cdr.detectChanges();

    this.cadastroService.criarParticipante({
      nome: this.nome.trim(),
      email: this.email.trim().toLowerCase(),
      setor: this.setor.trim(),
      telefone_whatsapp: this.telefoneWhatsapp.trim(),
      password: this.password,
      convite_token: this.token
    }).subscribe({
      next: () => {
        this.carregando = false;
        this.mensagemSucesso = 'Conta criada com sucesso! Redirecionando para o login...';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: {
              cadastro: 'sucesso'
            }
          });
        }, 1300);
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Cadastro] Erro ao criar conta:', error);

        this.carregando = false;
        this.tratarErroCadastro(error);
        this.cdr.detectChanges();
      }
    });
  }

  irParaLogin(): void {
    this.router.navigate(['/login']);
  }

  private validarFormulario(): string {
    if (!this.token) {
      return 'Convite inválido. Solicite um novo convite.';
    }

    if (!this.nome.trim()) {
      return 'Informe seu nome.';
    }

    if (!this.email.trim()) {
      return 'Informe seu e-mail.';
    }

    if (!this.emailValido(this.email.trim())) {
      return 'Informe um e-mail válido.';
    }

    if (!this.setor.trim()) {
      return 'Informe seu setor.';
    }

    if (!this.password.trim()) {
      return 'Informe sua senha.';
    }

    if (this.password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (this.password !== this.confirmarPassword) {
      return 'As senhas não conferem.';
    }

    return '';
  }

  private emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private tratarErroCadastro(error: HttpErrorResponse): void {
    const code = error.error?.code;
    const details = error.error?.details;
    const message = error.error?.message;

    if (code === 'INVALID_REGISTER') {
      this.mensagemErro = details || message || 'Preencha todos os campos obrigatórios.';
      return;
    }

    if (code === 'INVALID_INVITE_TOKEN') {
      this.mensagemErro = details || 'Convite inválido. Solicite um novo convite.';
      return;
    }

    if (code === 'EXPIRED_INVITE_TOKEN') {
      this.mensagemErro = details || 'Este convite expirou. Solicite um novo convite.';
      return;
    }

    if (code === 'INVITE_TOKEN_ALREADY_USED') {
      this.mensagemErro = details || 'Este convite já foi usado para criar uma conta.';
      return;
    }

    if (code === 'EMAIL_ALREADY_EXISTS') {
      this.mensagemErro = details || 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
      return;
    }

    if (error.status === 409) {
      this.mensagemErro = 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
      return;
    }

    if (error.status === 400) {
      this.mensagemErro = details || message || 'Cadastro inválido. Confira os dados e tente novamente.';
      return;
    }

    this.mensagemErro = 'Erro ao criar conta. Tente novamente.';
  }
}