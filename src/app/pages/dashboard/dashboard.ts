import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { JogosService, Jogo } from '../../core/services/jogos';
import {
  PalpiteDTO,
  PalpitesService,
  ResultadoPalpite
} from '../../core/services/palpites';
import {
  ClassificacaoItem,
  ClassificacaoResumo,
  ClassificacaoService
} from '../../core/services/classificacao';
import {
  PerfilService,
  PerfilUsuario
} from '../../core/services/perfil';

interface RankingHomeItem {
  posicao: number;
  nome: string;
  pontos: number;
  percentual: number;
  iniciais: string;
  tendencia: string;
  email: string;
  meu: boolean;
  foto_url: string;
}

interface DashboardMetric {
  label: string;
  value: string | number;
  helper: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  jogos: Jogo[] = [];
  proximosJogos: Jogo[] = [];

  meusPalpites: PalpiteDTO[] = [];
  ultimosPalpites: PalpiteDTO[] = [];

  classificacao: ClassificacaoItem[] = [];
  minhaClassificacao: ClassificacaoItem | null = null;
  resumoClassificacao: ClassificacaoResumo | null = null;
  perfilUsuario: PerfilUsuario | null = null;

  loadingJogos = false;
  carregandoPalpites = false;
  carregandoClassificacao = false;

  errorMessage = '';
  palpitesErrorMessage = '';
  classificacaoErrorMessage = '';

  constructor(
    private router: Router,
    private jogosService: JogosService,
    private palpitesService: PalpitesService,
    private classificacaoService: ClassificacaoService,
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarJogos();
    this.carregarUltimosPalpites();
    this.carregarClassificacao();
  }

  carregarJogos(): void {
    this.loadingJogos = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.jogosService.listarJogos().subscribe({
      next: (response) => {
        const jogosRecebidos = response.data || [];

        this.jogos = [...jogosRecebidos].sort((a, b) => {
          const dataA = this.timestampJogo(a);
          const dataB = this.timestampJogo(b);

          return dataA - dataB;
        });

        const jogosFuturos = this.jogos.filter((jogo) => {
          const data = this.timestampJogo(jogo);

          if (!data || data === Number.MAX_SAFE_INTEGER) {
            return false;
          }

          return data >= Date.now() || !this.jogoFinalizado(jogo);
        });

        this.proximosJogos = jogosFuturos.length > 0
          ? jogosFuturos.slice(0, 8)
          : this.jogos.slice(0, 8);

        this.loadingJogos = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Dashboard] Erro ao carregar jogos:', error);

        this.jogos = [];
        this.proximosJogos = [];
        this.errorMessage = 'Não foi possível carregar os jogos.';
        this.loadingJogos = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarUltimosPalpites(): void {
    this.carregandoPalpites = true;
    this.palpitesErrorMessage = '';
    this.cdr.detectChanges();

    this.palpitesService.listarMeusPalpites().subscribe({
      next: (response) => {
        const palpitesRecebidos = response.data || [];

        this.meusPalpites = palpitesRecebidos;

        this.ultimosPalpites = [...palpitesRecebidos]
          .sort((a, b) => {
            const dataA = new Date(a.atualizado_em || a.criado_em || '').getTime();
            const dataB = new Date(b.atualizado_em || b.criado_em || '').getTime();

            return dataB - dataA;
          })
          .slice(0, 4);

        this.carregandoPalpites = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Dashboard] Erro ao carregar palpites:', error);

        this.meusPalpites = [];
        this.ultimosPalpites = [];
        this.palpitesErrorMessage = 'Não foi possível carregar seus palpites.';
        this.carregandoPalpites = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarClassificacao(): void {
    this.carregandoClassificacao = true;
    this.classificacaoErrorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      classificacao: this.classificacaoService.listarClassificacao(),

      minha: this.classificacaoService.buscarMinhaClassificacao().pipe(
        catchError((error) => {
          console.warn('[Dashboard] Minha classificação indisponível:', error);

          return of({
            success: false,
            message: '',
            data: null as ClassificacaoItem | null
          });
        })
      ),

      resumo: this.classificacaoService.buscarResumoClassificacao().pipe(
        catchError((error) => {
          console.warn('[Dashboard] Resumo da classificação indisponível:', error);

          return of({
            success: false,
            message: '',
            data: null as ClassificacaoResumo | null
          });
        })
      ),

      perfil: this.perfilService.buscarMeuPerfil().pipe(
        catchError((error) => {
          console.warn('[Dashboard] Perfil indisponível:', error);

          return of({
            success: false,
            message: '',
            data: null as PerfilUsuario | null
          });
        })
      )
    }).subscribe({
      next: (response) => {
        this.classificacao = response.classificacao.data || [];
        this.minhaClassificacao = response.minha.data || null;
        this.resumoClassificacao = response.resumo.data || null;
        this.perfilUsuario = response.perfil.data || null;

        this.carregandoClassificacao = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Dashboard] Erro ao carregar classificação:', error);

        this.classificacao = [];
        this.minhaClassificacao = null;
        this.resumoClassificacao = null;
        this.perfilUsuario = null;
        this.classificacaoErrorMessage = 'Não foi possível carregar a classificação.';
        this.carregandoClassificacao = false;
        this.cdr.detectChanges();
      }
    });
  }

  get jogoDestaque(): Jogo | null {
    const proximaOportunidade = this.proximosJogos.find((jogo) => {
      return this.podePalpitarNoJogo(jogo) && !this.usuarioJaPalpitouNoJogo(jogo);
    });

    if (proximaOportunidade) {
      return proximaOportunidade;
    }

    const proximoSemPalpite = this.proximosJogos.find((jogo) => {
      return !this.usuarioJaPalpitouNoJogo(jogo);
    });

    if (proximoSemPalpite) {
      return proximoSemPalpite;
    }

    return this.proximosJogos[0] || this.jogos[0] || null;
  }

  get jogosDaHome(): Jogo[] {
    return this.proximosJogos.slice(0, 6);
  }

  get classificacaoOrdenada(): ClassificacaoItem[] {
    return [...this.classificacao].sort((a, b) => a.posicao - b.posicao);
  }

  get maiorPontuacaoRanking(): number {
    const maior = Math.max(
      0,
      ...this.classificacaoOrdenada.map((item) => item.total_pontos || 0)
    );

    return maior <= 0 ? 1 : maior;
  }

  get rankingHome(): RankingHomeItem[] {
    return this.classificacaoOrdenada
      .slice(0, 5)
      .map((item) => this.converterRankingHome(item));
  }

  get liderRanking(): RankingHomeItem {
    const lider = this.rankingHome[0];

    if (lider) {
      return lider;
    }

    return {
      posicao: 0,
      nome: 'Aguardando',
      pontos: 0,
      percentual: 0,
      iniciais: '--',
      tendencia: '0',
      email: '',
      meu: false,
      foto_url: ''
    };
  }

  get rankingTemDados(): boolean {
    return this.rankingHome.length > 0;
  }

  get resumoRankingTexto(): string {
    if (!this.resumoClassificacao) {
      return 'Ranking atualizado automaticamente com os pontos já apurados.';
    }

    return `Máximo possível: ${this.resumoClassificacao.pontos_maximos_total} pts · ${this.resumoClassificacao.jogos_finalizados} de ${this.resumoClassificacao.total_jogos} jogos finalizados.`;
  }

  get metricas(): DashboardMetric[] {
    return [
      {
        label: 'Jogos no bolão',
        value: this.jogos.length,
        helper: 'partidas disponíveis'
      },
      {
        label: 'Votações abertas',
        value: this.jogosComVotacaoAberta,
        helper: 'prontas para palpitar'
      },
      {
        label: 'Meus palpites',
        value: this.meusPalpites.length,
        helper: 'palpites enviados'
      },
      {
        label: 'Líder atual',
        value: this.carregandoClassificacao ? '...' : this.liderRanking.nome,
        helper: this.rankingTemDados
          ? `${this.liderRanking.pontos} pontos`
          : 'aguardando ranking'
      }
    ];
  }

  get jogosComVotacaoAberta(): number {
    return this.jogos.filter((jogo) => this.podePalpitarNoJogo(jogo)).length;
  }

  abrirJogo(jogo: Jogo): void {
    const codigo = jogo.codigo_externo || (jogo as any).id;

    if (!codigo) {
      return;
    }

    this.router.navigate(['/jogos', codigo]);
  }

  irParaJogos(): void {
    this.router.navigate(['/jogos']);
  }

  irParaClassificacao(): void {
    this.router.navigate(['/classificacao']);
  }

  abrirParticipante(email: string): void {
    if (!email) {
      return;
    }

    this.router.navigate(['/participantes', encodeURIComponent(email)]);
  }


  irParaVotacoes(): void {
    this.router.navigate(['/palpites']);
  }

  nomeTimeCasa(jogo: Jogo): string {
    return jogo.time_casa?.nome || 'Time casa';
  }

  nomeTimeFora(jogo: Jogo): string {
    return jogo.time_fora?.nome || 'Time fora';
  }

  siglaTimeCasa(jogo: Jogo): string {
    return jogo.time_casa?.sigla || this.gerarSigla(this.nomeTimeCasa(jogo));
  }

  siglaTimeFora(jogo: Jogo): string {
    return jogo.time_fora?.sigla || this.gerarSigla(this.nomeTimeFora(jogo));
  }

  brasaoTimeCasa(jogo: Jogo): string {
    return jogo.time_casa?.brasao_url || '';
  }

  brasaoTimeFora(jogo: Jogo): string {
    return jogo.time_fora?.brasao_url || '';
  }

  dataHoraJogo(jogo: Jogo): string {
    if (jogo.data_jogo && jogo.hora_jogo) {
      return `${jogo.data_jogo} • ${jogo.hora_jogo}`;
    }

    if (!jogo.data_hora_jogo) {
      return 'Data a definir';
    }

    const data = new Date(jogo.data_hora_jogo);

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

  faseJogo(jogo: Jogo): string {
    return (
      (jogo as any).fase ||
      (jogo as any).Fase ||
      jogo.grupo ||
      'Copa do Mundo'
    );
  }

  grupoJogo(jogo: Jogo): string {
    return jogo.grupo || 'Grupo não informado';
  }

  statusJogo(jogo: Jogo): string {
    const status = (jogo as any).status;

    if (status && typeof status === 'object') {
      return status.exibicao || status.api || 'Agendado';
    }

    if (jogo.em_andamento) {
      return 'Ao vivo';
    }

    if (jogo.finalizado) {
      return 'Finalizado';
    }

    return status || (jogo as any).status_api || 'Agendado';
  }

  statusApiJogo(jogo: Jogo): string {
    const status = (jogo as any).status;

    if (status && typeof status === 'object') {
      return status.api || 'TIMED';
    }

    return (jogo as any).status_api || status || 'TIMED';
  }

  jogoFinalizado(jogo: Jogo): boolean {
    const status = (jogo as any).status;

    if (status && typeof status === 'object') {
      return status.finalizado === true;
    }

    return jogo.finalizado === true || this.statusApiJogo(jogo) === 'FINISHED';
  }

  jogoAoVivo(jogo: Jogo): boolean {
    const status = (jogo as any).status;

    if (status && typeof status === 'object') {
      return status.em_andamento === true;
    }

    return jogo.em_andamento === true;
  }

  podePalpitarNoJogo(jogo: Jogo): boolean {
    const controle = (jogo as any).controle;
    const votacaoAberta = controle?.votacao_aberta ?? true;
    const statusPermitidos = ['SCHEDULED', 'TIMED'];
    const statusOk = statusPermitidos.includes(this.statusApiJogo(jogo));

    if (!jogo.data_hora_jogo) {
      return votacaoAberta && statusOk;
    }

    const data = new Date(jogo.data_hora_jogo).getTime();

    if (Number.isNaN(data)) {
      return votacaoAberta && statusOk;
    }

    return votacaoAberta && statusOk && Date.now() < data;
  }

  usuarioJaPalpitouNoJogo(jogo: Jogo): boolean {
    const codigoJogo = jogo.codigo_externo || (jogo as any).id;

    if (!codigoJogo) {
      return false;
    }

    return this.meusPalpites.some((palpite) => {
      return palpite.codigo_jogo === codigoJogo;
    });
  }

  textoAcaoJogo(jogo: Jogo): string {
    if (this.podePalpitarNoJogo(jogo) && !this.usuarioJaPalpitouNoJogo(jogo)) {
      return 'Palpitar';
    }

    if (this.usuarioJaPalpitouNoJogo(jogo)) {
      return 'Ver palpite';
    }

    if (this.jogoFinalizado(jogo)) {
      return 'Ver resultado';
    }

    return 'Ver jogo';
  }

  placarOuVersus(jogo: Jogo): string {
    const casa = jogo.placar?.casa;
    const fora = jogo.placar?.fora;

    if (casa !== null && casa !== undefined && fora !== null && fora !== undefined) {
      return `${casa} x ${fora}`;
    }

    return 'x';
  }

  resultadoPalpite(palpite: PalpiteDTO): ResultadoPalpite | null {
    const resultado =
      palpite.palpite?.resultado ||
      palpite.palpite?.resultado_palpite ||
      (palpite as any).resultado_palpite ||
      (palpite as any).resultado;

    if (resultado === 'CASA' || resultado === 'EMPATE' || resultado === 'FORA') {
      return resultado;
    }

    return null;
  }

  descricaoPalpite(palpite: PalpiteDTO): string {
    const descricaoBase = this.descricaoResultadoPalpite(palpite);
    const placar = palpite.placar_palpite;

    if (
      placar &&
      placar.casa !== null &&
      placar.casa !== undefined &&
      placar.fora !== null &&
      placar.fora !== undefined
    ) {
      return `${descricaoBase} · Placar ${placar.casa} x ${placar.fora}`;
    }

    return descricaoBase;
  }

  descricaoResultadoPalpite(palpite: PalpiteDTO): string {
    if (palpite.palpite?.descricao) {
      return palpite.palpite.descricao;
    }

    const resultado = this.resultadoPalpite(palpite);

    if (resultado === 'CASA') {
      return `Vitória de ${palpite.jogo.time_casa}`;
    }

    if (resultado === 'FORA') {
      return `Vitória de ${palpite.jogo.time_fora}`;
    }

    if (resultado === 'EMPATE') {
      return 'Empate';
    }

    return 'Palpite registrado';
  }

  classePalpite(palpite: PalpiteDTO): string {
    const resultado = this.resultadoPalpite(palpite);

    if (!resultado) {
      return 'indefinido';
    }

    return resultado.toLowerCase();
  }

  dataPalpite(palpite: PalpiteDTO): string {
    const data = new Date(palpite.atualizado_em || palpite.criado_em || '');

    if (Number.isNaN(data.getTime())) {
      return 'Atualizado recentemente';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }

  private converterRankingHome(item: ClassificacaoItem): RankingHomeItem {
    return {
      posicao: item.posicao,
      nome: this.nomeParticipanteItem(item),
      pontos: item.total_pontos || 0,
      percentual: this.percentualRanking(item),
      iniciais: this.iniciaisParticipante(item.participante_email),
      tendencia: this.diferencaParaLider(item),
      email: item.participante_email,
      meu: this.ehMinhaClassificacao(item),
      foto_url: this.fotoParticipanteItem(item)
    };
  }

  private percentualRanking(item: ClassificacaoItem): number {
    const pontos = item.total_pontos || 0;

    if (pontos <= 0) {
      return 0;
    }

    const percentual = (pontos / this.maiorPontuacaoRanking) * 100;

    return Math.max(8, Math.min(100, percentual));
  }

  private diferencaParaLider(item: ClassificacaoItem): string {
    const lider = this.classificacaoOrdenada[0];

    if (!lider) {
      return '0';
    }

    if (lider.participante_email === item.participante_email) {
      return 'Líder';
    }

    const diferenca = (lider.total_pontos || 0) - (item.total_pontos || 0);

    if (diferenca <= 0) {
      return '0';
    }

    return `-${diferenca}`;
  }

  private ehMinhaClassificacao(item: ClassificacaoItem): boolean {
    if (!this.minhaClassificacao) {
      return false;
    }

    return item.participante_email === this.minhaClassificacao.participante_email;
  }

  private nomeParticipanteItem(item: ClassificacaoItem): string {
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

  private fotoParticipanteItem(item: ClassificacaoItem): string {
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

  private nomeParticipante(email: string): string {
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

  private iniciaisParticipante(email: string): string {
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

  private timestampJogo(jogo: Jogo): number {
    if (!jogo.data_hora_jogo) {
      return Number.MAX_SAFE_INTEGER;
    }

    const data = new Date(jogo.data_hora_jogo).getTime();

    return Number.isNaN(data) ? Number.MAX_SAFE_INTEGER : data;
  }

  private gerarSigla(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 3)
      .toUpperCase();
  }

  private normalizarFotoUrl(url: string): string {
    return this.perfilService.normalizarFotoUrl(url);
  }
}