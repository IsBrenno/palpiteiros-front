import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { JogosService, Jogo } from '../../core/services/jogos';
import {
  PalpiteDTO,
  PalpitesService,
  ResultadoPalpite
} from '../../core/services/palpites';
import {
  SuperPalpite,
  SuperPalpitesService,
  SuperPalpiteTipo
} from '../../core/services/super-palpites';

interface PalpiteMetric {
  label: string;
  value: string | number;
  helper: string;
}

@Component({
  selector: 'app-palpites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './palpites.html',
  styleUrl: './palpites.scss'
})
export class Palpites implements OnInit {
  jogos: Jogo[] = [];
  meusPalpites: PalpiteDTO[] = [];
  superPalpites: SuperPalpite[] = [];

  carregandoJogos = false;
  carregandoPalpites = false;
  carregandoSuperPalpites = false;

  erroJogos = '';
  erroPalpites = '';
  erroSuperPalpites = '';

  bannerAtivoIndex = 0;

  /**
   * Quando você gerar as imagens, salve em:
   * public/assets/super-palpites/
   *
   * Depois vincule aqui pela regra_apuracao.
   *
   * Exemplo:
   * CAMPEAO: '/assets/super-palpites/campeao.webp'
   */
  private readonly bannerImages: Record<string, string> = {
    CAMPEAO: '',
    VICE_CAMPEAO: '',
    MELHOR_CAMPANHA_GRUPOS: '',
    PENALTIS_FINAL: '',
    TOTAL_GOLS_FASE_GRUPOS: ''
  };

  constructor(
    private router: Router,
    private jogosService: JogosService,
    private palpitesService: PalpitesService,
    private superPalpitesService: SuperPalpitesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarJogos();
    this.carregarMeusPalpites();
    this.carregarSuperPalpites();
  }

  carregarJogos(): void {
    this.carregandoJogos = true;
    this.erroJogos = '';

    this.jogosService.listarJogos().subscribe({
      next: (response) => {
        this.jogos = [...(response.data || [])].sort((a, b) => {
          return this.timestampJogo(a) - this.timestampJogo(b);
        });

        this.carregandoJogos = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Palpites] Erro ao carregar jogos:', error);

        this.jogos = [];
        this.erroJogos = 'Não foi possível carregar os jogos.';
        this.carregandoJogos = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarMeusPalpites(): void {
    this.carregandoPalpites = true;
    this.erroPalpites = '';

    this.palpitesService.listarMeusPalpites().subscribe({
      next: (response) => {
        this.meusPalpites = response.data || [];
        this.carregandoPalpites = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Palpites] Erro ao carregar meus palpites:', error);

        this.meusPalpites = [];
        this.erroPalpites = 'Não foi possível carregar seus palpites.';
        this.carregandoPalpites = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarSuperPalpites(): void {
    this.carregandoSuperPalpites = true;
    this.erroSuperPalpites = '';

    this.superPalpitesService.listarSuperPalpites().subscribe({
      next: (response) => {
        this.superPalpites = response.data || [];
        this.bannerAtivoIndex = 0;
        this.carregandoSuperPalpites = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Palpites] Erro ao carregar super palpites:', error);

        this.superPalpites = [];
        this.erroSuperPalpites = 'Não foi possível carregar os super palpites.';
        this.carregandoSuperPalpites = false;
        this.cdr.detectChanges();
      }
    });
  }

  get metricas(): PalpiteMetric[] {
    return [
      {
        label: 'Jogos para palpitar',
        value: this.jogosAbertosSemPalpite.length,
        helper: 'partidas abertas sem palpite'
      },
      {
        label: 'Meus palpites',
        value: this.meusPalpites.length,
        helper: 'palpites enviados'
      },
      {
        label: 'Super palpites',
        value: this.superPalpites.length,
        helper: 'desafios especiais'
      },
      {
        label: 'Super respondidos',
        value: this.superPalpitesRespondidos.length,
        helper: 'respostas registradas'
      }
    ];
  }

  get jogosParaExibir(): Jogo[] {
    const abertosSemPalpite = this.jogosAbertosSemPalpite;
    const proximos = this.jogos.filter((jogo) => !this.jogoFinalizado(jogo));

    if (abertosSemPalpite.length > 0) {
      return abertosSemPalpite.slice(0, 10);
    }

    return proximos.slice(0, 10);
  }

  get jogosAbertosSemPalpite(): Jogo[] {
    return this.jogos.filter((jogo) => {
      return this.podePalpitarNoJogo(jogo) && !this.usuarioJaPalpitouNoJogo(jogo);
    });
  }

  get superPalpitesRespondidos(): SuperPalpite[] {
    return this.superPalpites.filter((item) => !!item.minha_resposta);
  }

  get superPalpitesBanner(): SuperPalpite[] {
    const pendentesAbertos = this.superPalpites.filter((item) => {
      return item.esta_aberto && !item.minha_resposta;
    });

    const respondidos = this.superPalpites.filter((item) => {
      return item.minha_resposta;
    });

    const fechados = this.superPalpites.filter((item) => {
      return !item.esta_aberto && !item.minha_resposta;
    });

    return [...pendentesAbertos, ...respondidos, ...fechados];
  }

  get bannerTransform(): string {
    return `translateX(-${this.bannerAtivoIndex * 100}%)`;
  }

  bannerAnterior(): void {
    if (this.superPalpitesBanner.length === 0) {
      return;
    }

    this.bannerAtivoIndex =
      this.bannerAtivoIndex === 0
        ? this.superPalpitesBanner.length - 1
        : this.bannerAtivoIndex - 1;
  }

  proximoBanner(): void {
    if (this.superPalpitesBanner.length === 0) {
      return;
    }

    this.bannerAtivoIndex =
      this.bannerAtivoIndex === this.superPalpitesBanner.length - 1
        ? 0
        : this.bannerAtivoIndex + 1;
  }

  selecionarBanner(index: number): void {
    this.bannerAtivoIndex = index;
  }

  imagemBannerSuperPalpite(superPalpite: SuperPalpite): string {
    const imagem = this.bannerImages[superPalpite.regra_apuracao];

    if (!imagem) {
      return '';
    }

    return `
      linear-gradient(90deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.54), rgba(15, 23, 42, 0.2)),
      url("${imagem}")
    `;
  }

  abrirJogo(jogo: Jogo): void {
    const codigo = jogo.codigo_externo || (jogo as any).id;

    if (!codigo) {
      return;
    }

    this.router.navigate(['/jogos', codigo]);
  }

  abrirSuperPalpite(superPalpite: SuperPalpite): void {
    this.router.navigate(['/palpites/super', superPalpite.id]);
  }

  irParaJogos(): void {
    this.router.navigate(['/jogos']);
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

  palpiteDoJogo(jogo: Jogo): PalpiteDTO | null {
    const codigoJogo = jogo.codigo_externo || (jogo as any).id;

    if (!codigoJogo) {
      return null;
    }

    return this.meusPalpites.find((palpite) => palpite.codigo_jogo === codigoJogo) || null;
  }

  textoAcaoJogo(jogo: Jogo): string {
    if (this.podePalpitarNoJogo(jogo) && !this.usuarioJaPalpitouNoJogo(jogo)) {
      return 'Palpitar';
    }

    if (this.usuarioJaPalpitouNoJogo(jogo)) {
      return 'Ver palpite';
    }

    return 'Ver jogo';
  }

  descricaoPalpiteJogo(jogo: Jogo): string {
    const palpite = this.palpiteDoJogo(jogo);

    if (!palpite) {
      return 'Você ainda não palpitou nesse jogo.';
    }

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

  textoTipoSuperPalpite(tipo: SuperPalpiteTipo): string {
    if (tipo === 'TIME') {
      return 'Escolha uma seleção';
    }

    if (tipo === 'OPCAO') {
      return 'Escolha uma opção';
    }

    return 'Informe um número';
  }

  classeTipoSuperPalpite(tipo: SuperPalpiteTipo): string {
    return tipo.toLowerCase();
  }

  textoStatusSuperPalpite(superPalpite: SuperPalpite): string {
    if (superPalpite.esta_aberto) {
      return 'Aberto';
    }

    if (superPalpite.status === 'APURADO') {
      return 'Apurado';
    }

    if (superPalpite.status === 'CANCELADO') {
      return 'Cancelado';
    }

    return 'Fechado';
  }

  textoRespostaSuperPalpite(superPalpite: SuperPalpite): string {
    const resposta = superPalpite.minha_resposta;

    if (!resposta) {
      return 'Ainda não respondido';
    }

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

    return 'Respondido';
  }

  textoAcaoSuperPalpite(superPalpite: SuperPalpite): string {
    if (!superPalpite.esta_aberto) {
      return 'Ver resposta';
    }

    if (superPalpite.minha_resposta) {
      return 'Alterar resposta';
    }

    return 'Responder agora';
  }

  dataFechamentoSuperPalpite(superPalpite: SuperPalpite): string {
    if (!superPalpite.fecha_em) {
      return 'Sem prazo definido';
    }

    const data = new Date(superPalpite.fecha_em);

    if (Number.isNaN(data.getTime())) {
      return 'Prazo inválido';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
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
}