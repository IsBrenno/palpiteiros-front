import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PerfilService } from '../../core/services/perfil';
import {
  PalpitePublico,
  ParticipantePublico,
  ParticipantePublicoService,
  ResumoPalpitesParticipante,
  SuperPalpitePublico
} from '../../core/services/participante-publico';

type AbaParticipante = 'palpites' | 'super-palpites';

@Component({
  selector: 'app-participante-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './participante-detalhe.html',
  styleUrl: './participante-detalhe.scss'
})
export class ParticipanteDetalhe implements OnInit {
  participanteId = '';

  resumo: ResumoPalpitesParticipante | null = null;
  participante: ParticipantePublico | null = null;

  abaAtiva: AbaParticipante = 'palpites';

  carregando = true;
  mensagemErro = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private participantePublicoService: ParticipantePublicoService,
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';

      this.participanteId = this.decodificarId(id);

      if (!this.participanteId) {
        this.mensagemErro = 'Participante inválido.';
        this.carregando = false;
        this.cdr.detectChanges();
        return;
      }

      this.carregarParticipante();
    });
  }

  carregarParticipante(): void {
    this.carregando = true;
    this.mensagemErro = '';
    this.resumo = null;
    this.participante = null;

    this.participantePublicoService
      .buscarResumoPalpites(this.participanteId)
      .subscribe({
        next: (response) => {
          this.resumo = response.data;
          this.participante = response.data.participante;
          this.carregando = false;
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          console.error('[ParticipanteDetalhe] Erro ao carregar participante:', error);

          if (error.status === 404) {
            this.mensagemErro = 'Participante não encontrado.';
          } else if (error.status === 400) {
            this.mensagemErro = 'Participante inválido.';
          } else {
            this.mensagemErro = 'Não foi possível carregar os dados do participante.';
          }

          this.carregando = false;
          this.cdr.detectChanges();
        }
      });
  }

  trocarAba(aba: AbaParticipante): void {
    this.abaAtiva = aba;
  }

  voltar(): void {
    this.router.navigate(['/classificacao']);
  }

  get fotoParticipanteUrl(): string {
    return this.perfilService.normalizarFotoUrl(this.participante?.foto_url || '');
  }

  get iniciaisParticipante(): string {
    const base = this.participante?.nome || this.participante?.email || 'Participante';

    const partes = base
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean);

    if (partes.length === 0) {
      return 'PA';
    }

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  get palpites(): PalpitePublico[] {
    return [...(this.resumo?.palpites || [])].sort((a, b) => {
      return this.timestampPalpite(a) - this.timestampPalpite(b);
    });
  }

  get superPalpites(): SuperPalpitePublico[] {
    return [...(this.resumo?.super_palpites || [])].sort((a, b) => {
      return a.id - b.id;
    });
  }

  get totalPalpites(): number {
    return this.palpites.length;
  }

  get totalSuperPalpites(): number {
    return this.superPalpites.length;
  }

  get totalPontosJogos(): number {
    return this.palpites.reduce((total, item) => {
      return total + (item.pontos || 0);
    }, 0);
  }

  get totalPontosSuperPalpites(): number {
    return this.superPalpites.reduce((total, item) => {
      return total + (item.pontos || 0);
    }, 0);
  }

  get totalPontos(): number {
    return this.totalPontosJogos + this.totalPontosSuperPalpites;
  }

  textoPontos(pontos: number | null): string {
    if (pontos === null || pontos === undefined) {
      return 'Aguardando apuração';
    }

    if (pontos === 1) {
      return '1 ponto';
    }

    return `${pontos} pontos`;
  }

  textoPlacarPalpite(palpite: PalpitePublico): string {
    const placar = palpite.placar_palpite;

    if (
      !placar ||
      placar.casa === null ||
      placar.casa === undefined ||
      placar.fora === null ||
      placar.fora === undefined
    ) {
      return 'Sem placar informado';
    }

    return `${placar.casa} x ${placar.fora}`;
  }

  temPlacarPalpite(palpite: PalpitePublico): boolean {
    const placar = palpite.placar_palpite;

    return !!(
      placar &&
      placar.casa !== null &&
      placar.casa !== undefined &&
      placar.fora !== null &&
      placar.fora !== undefined
    );
  }

  classeResultadoPalpite(palpite: PalpitePublico): string {
    const resultado = palpite.palpite?.resultado;

    if (resultado === 'CASA') {
      return 'casa';
    }

    if (resultado === 'FORA') {
      return 'fora';
    }

    if (resultado === 'EMPATE') {
      return 'empate';
    }

    return 'indefinido';
  }

  textoRespostaSuperPalpite(item: SuperPalpitePublico): string {
    if (item.tipo === 'TIME') {
      return item.resposta.time_nome || 'Sem resposta';
    }

    if (item.tipo === 'OPCAO') {
      return item.resposta.opcao_label || 'Sem resposta';
    }

    if (item.tipo === 'NUMERO') {
      return item.resposta.valor_numero !== null &&
        item.resposta.valor_numero !== undefined
        ? String(item.resposta.valor_numero)
        : 'Sem resposta';
    }

    return 'Sem resposta';
  }

  imagemRespostaSuperPalpite(item: SuperPalpitePublico): string {
    if (item.tipo !== 'TIME') {
      return '';
    }

    return item.resposta.time_brasao_url || '';
  }

  siglaRespostaSuperPalpite(item: SuperPalpitePublico): string {
    if (item.tipo === 'TIME') {
      return item.resposta.time_sigla || this.gerarSigla(item.resposta.time_nome || '');
    }

    if (item.tipo === 'OPCAO') {
      return 'OP';
    }

    if (item.tipo === 'NUMERO') {
      return 'Nº';
    }

    return '?';
  }

  dataFechamentoSuperPalpite(item: SuperPalpitePublico): string {
    if (!item.fecha_em) {
      return 'Sem data de fechamento';
    }

    const data = new Date(item.fecha_em);

    if (Number.isNaN(data.getTime())) {
      return item.fecha_em;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }

  dataPalpite(palpite: PalpitePublico): string {
    if (palpite.jogo?.data_jogo && palpite.jogo?.hora_jogo) {
      return `${palpite.jogo.data_jogo} · ${palpite.jogo.hora_jogo}`;
    }

    if (!palpite.jogo?.data_hora_jogo) {
      return 'Data a definir';
    }

    const data = new Date(palpite.jogo.data_hora_jogo);

    if (Number.isNaN(data.getTime())) {
      return 'Data a definir';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }

  private timestampPalpite(palpite: PalpitePublico): number {
    const data = new Date(palpite.jogo?.data_hora_jogo || '').getTime();

    if (Number.isNaN(data)) {
      return Number.MAX_SAFE_INTEGER;
    }

    return data;
  }

  private decodificarId(id: string): string {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  }

  private gerarSigla(nome: string): string {
    if (!nome) {
      return '?';
    }

    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 3)
      .toUpperCase();
  }
}