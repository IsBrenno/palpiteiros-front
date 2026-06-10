import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import {
  ClassificacaoItem,
  ClassificacaoResumo,
  ClassificacaoService,
  JogoClassificacaoApi
} from '../../core/services/classificacao';
import {
  PerfilService,
  PerfilUsuario
} from '../../core/services/perfil';

interface TimeJogoView {
  nome: string;
  nome_curto: string;
  sigla: string;
  brasao_url: string;
}

interface PlacarJogoView {
  casa: number | null;
  fora: number | null;
  confirmado: boolean;
}

interface JogoClassificacaoView {
  codigo_externo: string;
  fase: string;
  grupo: string;
  rodada: string;
  time_casa: TimeJogoView;
  time_fora: TimeJogoView;
  placar: PlacarJogoView;
  status_api: string;
  status_exibicao: string;
  em_andamento: boolean;
  finalizado: boolean;
  data_jogo: string;
  hora_jogo: string;
  data_hora_jogo: string;
}

@Component({
  selector: 'app-classificacao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './classificacao.html',
  styleUrl: './classificacao.scss'
})
export class Classificacao implements OnInit, OnDestroy {
  carregando = true;
  erro = '';

  ranking: ClassificacaoItem[] = [];
  minhaClassificacao: ClassificacaoItem | null = null;
  resumo: ClassificacaoResumo | null = null;
  perfilUsuario: PerfilUsuario | null = null;

  jogos: JogoClassificacaoView[] = [];

  bannerAtivoIndex = 0;

  private bannerAutoplayId: ReturnType<typeof setInterval> | null = null;
  private readonly bannerAutoplayDelay = 5500;

  private readonly bannerBackgrounds = {
    live: '/assets/banner.png',
    finished: '/assets/banner.png',
    default: '/assets/banner.png'
  };

  constructor(
    private classificacaoService: ClassificacaoService,
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarClassificacao();
  }

  ngOnDestroy(): void {
    this.pararAutoplayBanner();
  }

  carregarClassificacao(): void {
    this.carregando = true;
    this.erro = '';

    forkJoin({
      classificacao: this.classificacaoService.listarClassificacao(),

      minha: this.classificacaoService.buscarMinhaClassificacao().pipe(
        catchError((error: HttpErrorResponse) => {
          console.warn('[Classificacao] Minha classificação indisponível:', error);

          return of({
            success: false,
            message: '',
            data: null as ClassificacaoItem | null
          });
        })
      ),

      resumo: this.classificacaoService.buscarResumoClassificacao().pipe(
        catchError((error: HttpErrorResponse) => {
          console.warn('[Classificacao] Resumo indisponível:', error);

          return of({
            success: false,
            message: '',
            data: null as ClassificacaoResumo | null
          });
        })
      ),

      jogos: this.classificacaoService.listarJogos().pipe(
        catchError((error: HttpErrorResponse) => {
          console.warn('[Classificacao] Jogos indisponíveis:', error);

          return of({
            success: false,
            message: '',
            data: [] as JogoClassificacaoApi[]
          });
        })
      ),

      perfil: this.perfilService.buscarMeuPerfil().pipe(
        catchError((error: HttpErrorResponse) => {
          console.warn('[Classificacao] Perfil indisponível:', error);

          return of({
            success: false,
            message: '',
            data: null as PerfilUsuario | null
          });
        })
      )
    }).subscribe({
      next: (response) => {
        this.ranking = response.classificacao.data || [];
        this.minhaClassificacao = response.minha.data || null;
        this.resumo = response.resumo.data || null;
        this.perfilUsuario = response.perfil.data || null;

        this.jogos = (response.jogos.data || []).map((jogo) =>
          this.normalizarJogo(jogo)
        );

        this.ajustarBannerAtivo();
        this.iniciarAutoplayBanner();

        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[Classificacao] Erro ao carregar classificação:', error);

        this.erro = 'Não foi possível carregar a classificação agora.';
        this.carregando = false;
        this.pararAutoplayBanner();
        this.cdr.detectChanges();
      }
    });
  }

  get rankingOrdenado(): ClassificacaoItem[] {
    return [...this.ranking].sort((a, b) => a.posicao - b.posicao);
  }

  get rankingVisual(): ClassificacaoItem[] {
    return this.rankingOrdenado.slice(0, 8);
  }

  get lider(): ClassificacaoItem | null {
    return this.rankingOrdenado[0] || null;
  }

  get maiorPontuacao(): number {
    const maior = Math.max(
      0,
      ...this.rankingOrdenado.map((item) => item.total_pontos || 0)
    );

    return maior <= 0 ? 1 : maior;
  }

  get jogosResultados(): JogoClassificacaoView[] {
    return this.jogos
      .filter((jogo) => this.jogoDeveAparecerNoPainel(jogo))
      .sort((a, b) => {
        if (a.em_andamento && !b.em_andamento) {
          return -1;
        }

        if (!a.em_andamento && b.em_andamento) {
          return 1;
        }

        return this.timestampJogo(b) - this.timestampJogo(a);
      })
      .slice(0, 8);
  }

  get bannersJogos(): JogoClassificacaoView[] {
    return this.jogosResultados;
  }

  get possuiMultiplosBanners(): boolean {
    return this.bannersJogos.length > 1;
  }

  get bannerTransform(): string {
    return `translateX(-${this.bannerAtivoIndex * 100}%)`;
  }

  get totalJogosAoVivo(): number {
    return this.jogos.filter((jogo) => jogo.em_andamento).length;
  }

  get totalJogosComResultado(): number {
    return this.jogos.filter(
      (jogo) => jogo.finalizado || jogo.placar.confirmado
    ).length;
  }

  get totalPlacaresExatos(): number {
    return this.ranking.reduce(
      (total, item) => total + (item.placares_exatos || 0),
      0
    );
  }

  nomeParticipanteItem(item: ClassificacaoItem): string {
    if (item.participante_nome && item.participante_nome.trim()) {
      return item.participante_nome.trim();
    }

    if (
      this.perfilUsuario &&
      item.participante_email === this.perfilUsuario.email &&
      this.perfilUsuario.nome
    ) {
      return this.perfilUsuario.nome;
    }

    return this.nomeParticipante(item.participante_email);
  }

  fotoParticipanteItem(item: ClassificacaoItem): string {
    if (item.participante_foto_url) {
      return this.normalizarFotoUrl(item.participante_foto_url);
    }

    if (
      this.perfilUsuario &&
      item.participante_email === this.perfilUsuario.email &&
      this.perfilUsuario.foto_url
    ) {
      return this.normalizarFotoUrl(this.perfilUsuario.foto_url);
    }

    return '';
  }

  nomeParticipante(email: string): string {
    if (!email) {
      return 'Participante';
    }

    const nome = email.split('@')[0] || email;

    return nome
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ');
  }

  iniciaisParticipante(email: string): string {
    const nome = this.nomeParticipante(email);
    const partes = nome.split(' ').filter(Boolean);

    if (partes.length === 0) {
      return '?';
    }

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  minhaLinha(item: ClassificacaoItem): boolean {
    if (!this.minhaClassificacao) {
      return false;
    }

    return item.participante_email === this.minhaClassificacao.participante_email;
  }

  textoPosicao(posicao: number): string {
    return `${posicao}º`;
  }

  larguraBarra(item: ClassificacaoItem): number {
    const percentual = (item.total_pontos / this.maiorPontuacao) * 100;

    if (item.total_pontos <= 0) {
      return 0;
    }

    return Math.max(8, Math.min(100, percentual));
  }

  diferencaParaLider(item: ClassificacaoItem): string {
    const lider = this.lider;

    if (!lider) {
      return '0';
    }

    if (item.participante_email === lider.participante_email) {
      return 'Líder';
    }

    const diferenca = lider.total_pontos - item.total_pontos;

    if (diferenca <= 0) {
      return '0';
    }

    return `-${diferenca}`;
  }

  aproveitamentoResultado(item: ClassificacaoItem): number {
    if (!item.palpites_jogos_feitos) {
      return 0;
    }

    const percentual = (item.acertos_jogos / item.palpites_jogos_feitos) * 100;

    return Math.round(percentual);
  }

  posicaoClasse(item: ClassificacaoItem): string {
    if (item.posicao === 1) {
      return 'gold';
    }

    if (item.posicao === 2) {
      return 'silver';
    }

    if (item.posicao === 3) {
      return 'bronze';
    }

    return '';
  }

  textoPlacarJogo(jogo: JogoClassificacaoView): string {
    if (
      jogo.placar.casa !== null &&
      jogo.placar.casa !== undefined &&
      jogo.placar.fora !== null &&
      jogo.placar.fora !== undefined
    ) {
      return `${jogo.placar.casa} x ${jogo.placar.fora}`;
    }

    return 'x';
  }

  vencedorJogo(jogo: JogoClassificacaoView): string {
    const casa = jogo.placar.casa;
    const fora = jogo.placar.fora;

    if (casa === null || casa === undefined || fora === null || fora === undefined) {
      return 'Aguardando placar';
    }

    if (casa > fora) {
      return `${jogo.time_casa.nome_curto} venceu`;
    }

    if (fora > casa) {
      return `${jogo.time_fora.nome_curto} venceu`;
    }

    return 'Empate';
  }

  statusJogoClasse(jogo: JogoClassificacaoView): string {
    if (jogo.em_andamento) {
      return 'live';
    }

    if (jogo.finalizado || jogo.placar.confirmado) {
      return 'finished';
    }

    return 'scheduled';
  }

  imagemBanner(jogo: JogoClassificacaoView): string {
    if (jogo.em_andamento) {
      return this.bannerBackgrounds.live;
    }

    if (jogo.finalizado || jogo.placar.confirmado) {
      return this.bannerBackgrounds.finished;
    }

    return this.bannerBackgrounds.default;
  }

  estiloBackgroundBanner(jogo: JogoClassificacaoView): string {
    const imagem = this.imagemBanner(jogo);

    return `
      linear-gradient(
        135deg,
        rgba(15, 23, 42, 0.82),
        rgba(15, 23, 42, 0.58)
      ),
      url('${imagem}')
    `;
  }

  selecionarBanner(index: number): void {
    if (index < 0 || index >= this.bannersJogos.length) {
      return;
    }

    this.bannerAtivoIndex = index;
    this.reiniciarAutoplayBanner();
  }

  proximoBanner(): void {
    if (this.bannersJogos.length <= 1) {
      return;
    }

    this.bannerAtivoIndex =
      (this.bannerAtivoIndex + 1) % this.bannersJogos.length;

    this.reiniciarAutoplayBanner();
  }

  bannerAnterior(): void {
    if (this.bannersJogos.length <= 1) {
      return;
    }

    this.bannerAtivoIndex =
      (this.bannerAtivoIndex - 1 + this.bannersJogos.length) %
      this.bannersJogos.length;

    this.reiniciarAutoplayBanner();
  }

  pausarAutoplayBanner(): void {
    this.pararAutoplayBanner();
  }

  retomarAutoplayBanner(): void {
    this.iniciarAutoplayBanner();
  }

  private ajustarBannerAtivo(): void {
    if (this.bannersJogos.length === 0) {
      this.bannerAtivoIndex = 0;
      return;
    }

    if (this.bannerAtivoIndex >= this.bannersJogos.length) {
      this.bannerAtivoIndex = 0;
    }
  }

  private iniciarAutoplayBanner(): void {
    this.pararAutoplayBanner();

    if (this.bannersJogos.length <= 1) {
      return;
    }

    this.bannerAutoplayId = setInterval(() => {
      this.bannerAtivoIndex =
        (this.bannerAtivoIndex + 1) % this.bannersJogos.length;
      this.cdr.detectChanges();
    }, this.bannerAutoplayDelay);
  }

  private pararAutoplayBanner(): void {
    if (this.bannerAutoplayId) {
      clearInterval(this.bannerAutoplayId);
      this.bannerAutoplayId = null;
    }
  }

  private reiniciarAutoplayBanner(): void {
    this.iniciarAutoplayBanner();
    this.cdr.detectChanges();
  }

  private jogoDeveAparecerNoPainel(jogo: JogoClassificacaoView): boolean {
    if (jogo.em_andamento) {
      return true;
    }

    if (jogo.finalizado) {
      return true;
    }

    if (jogo.placar.confirmado) {
      return true;
    }

    return (
      jogo.placar.casa !== null &&
      jogo.placar.casa !== undefined &&
      jogo.placar.fora !== null &&
      jogo.placar.fora !== undefined
    );
  }

  private timestampJogo(jogo: JogoClassificacaoView): number {
    const timestamp = new Date(jogo.data_hora_jogo).getTime();

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }

    return 0;
  }

  private normalizarJogo(jogo: JogoClassificacaoApi): JogoClassificacaoView {
    const statusObjeto =
      jogo.status && typeof jogo.status === 'object'
        ? jogo.status
        : null;

    const statusTexto =
      typeof jogo.status === 'string'
        ? jogo.status
        : '';

    const statusApi =
      statusObjeto?.api ||
      jogo.status_api ||
      statusTexto ||
      'TIMED';

    const emAndamento =
      statusObjeto?.em_andamento ??
      jogo.em_andamento ??
      ['LIVE', 'IN_PLAY', 'PAUSED'].includes(statusApi);

    const finalizado =
      statusObjeto?.finalizado ??
      jogo.finalizado ??
      ['FINISHED', 'AWARDED'].includes(statusApi);

    const placarCasa = this.numeroOuNull(jogo.placar?.casa);
    const placarFora = this.numeroOuNull(jogo.placar?.fora);

    return {
      codigo_externo: jogo.codigo_externo || String(jogo.id || ''),
      fase: jogo.fase || 'Fase não informada',
      grupo: jogo.grupo || 'Grupo não informado',
      rodada: String(jogo.rodada_grupo || jogo.rodada_api || '-'),

      time_casa: {
        nome: jogo.time_casa?.nome || 'Time casa',
        nome_curto:
          jogo.time_casa?.nome_curto ||
          jogo.time_casa?.nome ||
          'Casa',
        sigla:
          jogo.time_casa?.sigla ||
          this.gerarSigla(jogo.time_casa?.nome || 'CAS'),
        brasao_url: jogo.time_casa?.brasao_url || ''
      },

      time_fora: {
        nome: jogo.time_fora?.nome || 'Time fora',
        nome_curto:
          jogo.time_fora?.nome_curto ||
          jogo.time_fora?.nome ||
          'Fora',
        sigla:
          jogo.time_fora?.sigla ||
          this.gerarSigla(jogo.time_fora?.nome || 'FOR'),
        brasao_url: jogo.time_fora?.brasao_url || ''
      },

      placar: {
        casa: placarCasa,
        fora: placarFora,
        confirmado: jogo.placar?.confirmado ?? finalizado
      },

      status_api: statusApi,
      status_exibicao:
        statusObjeto?.exibicao ||
        this.textoStatusPorApi(statusApi, emAndamento, finalizado),

      em_andamento: emAndamento,
      finalizado,

      data_jogo: jogo.data_jogo || '',
      hora_jogo: jogo.hora_jogo || '',
      data_hora_jogo: jogo.data_hora_jogo || ''
    };
  }

  private textoStatusPorApi(
    statusApi: string,
    emAndamento: boolean,
    finalizado: boolean
  ): string {
    if (emAndamento) {
      return 'Ao vivo';
    }

    if (finalizado) {
      return 'Encerrado';
    }

    if (statusApi === 'TIMED' || statusApi === 'SCHEDULED') {
      return 'Agendado';
    }

    return statusApi;
  }

  private numeroOuNull(valor: unknown): number | null {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return null;
    }

    return numero;
  }

  private gerarSigla(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 2)
      .toUpperCase();
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
}