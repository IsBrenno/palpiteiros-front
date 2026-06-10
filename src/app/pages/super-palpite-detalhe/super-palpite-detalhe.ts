import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TimeCopa, TimesService } from '../../core/services/times';
import {
  ResponderSuperPalpiteRequest,
  SuperPalpite,
  SuperPalpiteOpcao,
  SuperPalpitesService
} from '../../core/services/super-palpites';

@Component({
  selector: 'app-super-palpite-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './super-palpite-detalhe.html',
  styleUrl: './super-palpite-detalhe.scss'
})
export class SuperPalpiteDetalhe implements OnInit {
  superPalpiteId = 0;

  superPalpite: SuperPalpite | null = null;
  times: TimeCopa[] = [];

  carregando = true;
  carregandoTimes = false;
  salvando = false;

  erro = '';
  erroResposta = '';
  sucessoResposta = '';

  filtroTimes = '';

  timeSelecionadoId: number | null = null;
  opcaoSelecionadaId: number | null = null;
  valorNumero: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private superPalpitesService: SuperPalpitesService,
    private timesService: TimesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.superPalpiteId = Number(idParam);

    if (!this.superPalpiteId || Number.isNaN(this.superPalpiteId)) {
      this.erro = 'Super palpite não encontrado.';
      this.carregando = false;
      this.cdr.detectChanges();
      return;
    }

    this.carregarSuperPalpite();
  }

  carregarSuperPalpite(): void {
    this.carregando = true;
    this.erro = '';

    this.superPalpitesService.buscarSuperPalpite(this.superPalpiteId).subscribe({
      next: (response) => {
        this.superPalpite = response.data;
        this.preencherRespostaAtual();

        this.carregando = false;

        if (this.superPalpite.tipo === 'TIME' || this.superPalpite.usa_lista_times) {
          this.carregarTimes();
        }

        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[SuperPalpiteDetalhe] Erro ao carregar:', error);

        if (error.status === 404) {
          this.erro = 'Super palpite não encontrado.';
        } else {
          this.erro = 'Não foi possível carregar esse super palpite.';
        }

        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarTimes(): void {
    this.carregandoTimes = true;

    this.timesService.listarTimes().subscribe({
      next: (response) => {
        this.times = response.data || [];
        this.carregandoTimes = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[SuperPalpiteDetalhe] Erro ao carregar times:', error);

        this.times = [];
        this.carregandoTimes = false;
        this.cdr.detectChanges();
      }
    });
  }

  get timesFiltrados(): TimeCopa[] {
    const filtro = this.filtroTimes
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (!filtro) {
      return this.times;
    }

    return this.times.filter((time) => {
      const nome = (time.nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      const sigla = (time.sigla || '').toLowerCase();

      return nome.includes(filtro) || sigla.includes(filtro);
    });
  }

  get podeResponder(): boolean {
    return this.superPalpite?.esta_aberto === true;
  }

  get respostaAtualTexto(): string {
    if (!this.superPalpite?.minha_resposta) {
      return 'Você ainda não respondeu este super palpite.';
    }

    const resposta = this.superPalpite.minha_resposta;

    if (resposta.tipo === 'TIME') {
      return resposta.time_nome || 'Seleção escolhida';
    }

    if (resposta.tipo === 'OPCAO') {
      return resposta.opcao_label || 'Opção escolhida';
    }

    if (resposta.tipo === 'NUMERO') {
      return resposta.valor_numero !== null && resposta.valor_numero !== undefined
        ? String(resposta.valor_numero)
        : 'Número informado';
    }

    return 'Resposta registrada';
  }

  get textoStatus(): string {
    if (!this.superPalpite) {
      return '';
    }

    if (this.superPalpite.esta_aberto) {
      return 'Aberto';
    }

    if (this.superPalpite.status === 'APURADO') {
      return 'Apurado';
    }

    if (this.superPalpite.status === 'CANCELADO') {
      return 'Cancelado';
    }

    return 'Fechado';
  }

  get textoBotaoSalvar(): string {
    if (this.salvando) {
      return 'Salvando resposta...';
    }

    if (this.superPalpite?.minha_resposta) {
      return 'Atualizar super palpite';
    }

    return 'Confirmar super palpite';
  }

  get formularioValido(): boolean {
    if (!this.superPalpite || !this.podeResponder) {
      return false;
    }

    if (this.superPalpite.tipo === 'TIME') {
      return !!this.timeSelecionadoId;
    }

    if (this.superPalpite.tipo === 'OPCAO') {
      return !!this.opcaoSelecionadaId;
    }

    if (this.superPalpite.tipo === 'NUMERO') {
      return this.valorNumero !== null && this.valorNumero !== undefined && this.valorNumero >= 0;
    }

    return false;
  }

  selecionarTime(time: TimeCopa): void {
    if (!this.podeResponder) {
      return;
    }

    this.timeSelecionadoId = time.id;
    this.erroResposta = '';
    this.sucessoResposta = '';
  }

  selecionarOpcao(opcao: SuperPalpiteOpcao): void {
    if (!this.podeResponder) {
      return;
    }

    this.opcaoSelecionadaId = opcao.id;
    this.erroResposta = '';
    this.sucessoResposta = '';
  }

  salvarResposta(): void {
    if (!this.superPalpite || !this.formularioValido) {
      return;
    }

    const payload: ResponderSuperPalpiteRequest = {};

    if (this.superPalpite.tipo === 'TIME') {
      payload.time_id = Number(this.timeSelecionadoId);
    }

    if (this.superPalpite.tipo === 'OPCAO') {
      payload.opcao_id = Number(this.opcaoSelecionadaId);
    }

    if (this.superPalpite.tipo === 'NUMERO') {
      payload.valor_numero = Number(this.valorNumero);
    }

    this.salvando = true;
    this.erroResposta = '';
    this.sucessoResposta = '';

    this.superPalpitesService
      .responderSuperPalpite(this.superPalpite.id, payload)
      .subscribe({
        next: (response) => {
          this.superPalpite = response.data;
          this.preencherRespostaAtual();

          this.sucessoResposta = response.message || 'Super palpite respondido com sucesso.';
          this.salvando = false;
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          console.error('[SuperPalpiteDetalhe] Erro ao responder:', error);

          this.salvando = false;

          if (error.status === 403) {
            this.erroResposta = 'Este super palpite já está fechado.';
            this.cdr.detectChanges();
            return;
          }

          if (error.status === 400) {
            this.erroResposta = 'Resposta inválida para este super palpite.';
            this.cdr.detectChanges();
            return;
          }

          if (error.status === 404) {
            this.erroResposta = 'Super palpite não encontrado.';
            this.cdr.detectChanges();
            return;
          }

          this.erroResposta = 'Não foi possível salvar sua resposta.';
          this.cdr.detectChanges();
        }
      });
  }

  voltarParaPalpites(): void {
    this.router.navigate(['/palpites']);
  }

  formatarData(dataTexto: string | null): string {
    if (!dataTexto) {
      return 'Não informado';
    }

    const data = new Date(dataTexto);

    if (Number.isNaN(data.getTime())) {
      return 'Data inválida';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }

  siglaTime(time: TimeCopa): string {
    return time.sigla || this.gerarSigla(time.nome);
  }

  private preencherRespostaAtual(): void {
    if (!this.superPalpite?.minha_resposta) {
      this.timeSelecionadoId = null;
      this.opcaoSelecionadaId = null;
      this.valorNumero = null;
      return;
    }

    const resposta = this.superPalpite.minha_resposta;

    this.timeSelecionadoId = resposta.time_id;
    this.opcaoSelecionadaId = resposta.opcao_id;
    this.valorNumero = resposta.valor_numero;
  }

  private gerarSigla(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 3)
      .toUpperCase();
  }
}