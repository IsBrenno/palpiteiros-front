import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { JogosService, Jogo } from '../../core/services/jogos';

interface FiltrosJogos {
  rodada: string;
  fase: string;
  time: string;
  data: string;
}

interface DiaCalendario {
  chave: string;
  dia: number;
  data: string;
  foraDoMes: boolean;
  hoje: boolean;
  selecionado: boolean;
}

type DropdownFiltro = 'rodada' | 'fase' | null;

@Component({
  selector: 'app-jogos',
  imports: [FormsModule],
  templateUrl: './jogos.html',
  styleUrl: './jogos.scss'
})
export class Jogos implements OnInit {
  jogos: Jogo[] = [];
  loadingJogos = true;
  errorMessage = '';

  filtros: FiltrosJogos = {
    rodada: '',
    fase: '',
    time: '',
    data: ''
  };

  paginaAtual = 1;
  itensPorPagina = 24;

  mostrarSugestoesTime = false;
  dropdownAberto: DropdownFiltro = null;

  calendarioAberto = false;
  mesCalendario = new Date().getMonth();
  anoCalendario = new Date().getFullYear();

  meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];

  constructor(
    private jogosService: JogosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarJogos();
  }

  @HostListener('document:click', ['$event'])
  fecharDropdownAoClicarFora(event: MouseEvent): void {
    const elemento = event.target as HTMLElement;

    if (!elemento.closest('.custom-select')) {
      this.dropdownAberto = null;
    }

    if (!elemento.closest('.date-picker')) {
      this.calendarioAberto = false;
    }
  }

  carregarJogos(): void {
    this.loadingJogos = true;
    this.errorMessage = '';
    this.jogos = [];

    this.jogosService.listarJogos().subscribe({
      next: (response) => {
        console.log('[Jogos] Resposta jogos:', response);

        const jogosRecebidos = response.data || [];

        if (!Array.isArray(jogosRecebidos)) {
          console.warn('[Jogos] response.data não trouxe um array de jogos:', response);
          this.errorMessage = 'Formato inesperado ao carregar jogos.';
          this.loadingJogos = false;
          this.cdr.detectChanges();
          return;
        }

        this.jogos = jogosRecebidos
          .map((jogo: any) => this.normalizarJogo(jogo))
          .sort((a, b) => {
            const dataA = new Date(a.data_hora_jogo).getTime();
            const dataB = new Date(b.data_hora_jogo).getTime();

            return dataA - dataB;
          });

        this.loadingJogos = false;

        console.log('[Jogos] Jogos carregados:', this.jogos);

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Jogos] Erro ao carregar jogos:', error);

        this.errorMessage = `Erro ao carregar jogos. Status: ${
          error.status || 'desconhecido'
        }`;

        this.loadingJogos = false;
        this.cdr.detectChanges();
      }
    });
  }

  get jogosFiltrados(): Jogo[] {
    return this.jogos.filter((jogo) => {
      const rodadaOk =
        !this.filtros.rodada ||
        String(jogo.rodada_grupo) === this.filtros.rodada;

      const faseOk =
        !this.filtros.fase ||
        this.normalizarTexto(jogo.fase || 'Fase de Grupos') ===
          this.normalizarTexto(this.filtros.fase);

      const timeDigitado = this.normalizarTexto(this.filtros.time);

      const timeOk =
        !timeDigitado ||
        this.normalizarTexto(jogo.time_casa.nome).includes(timeDigitado) ||
        this.normalizarTexto(jogo.time_fora.nome).includes(timeDigitado) ||
        this.normalizarTexto(jogo.time_casa.sigla).includes(timeDigitado) ||
        this.normalizarTexto(jogo.time_fora.sigla).includes(timeDigitado);

      const dataOk =
        !this.filtros.data ||
        this.formatarDataParaInput(jogo.data_hora_jogo) === this.filtros.data;

      return rodadaOk && faseOk && timeOk && dataOk;
    });
  }

  get jogosPaginados(): Jogo[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.jogosFiltrados.slice(inicio, fim);
  }

  get totalPaginas(): number {
    return Math.ceil(this.jogosFiltrados.length / this.itensPorPagina) || 1;
  }

  get paginasDisponiveis(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, index) => index + 1);
  }

  get mostrandoInicio(): number {
    if (this.jogosFiltrados.length === 0) {
      return 0;
    }

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get mostrandoFim(): number {
    const fim = this.paginaAtual * this.itensPorPagina;

    return Math.min(fim, this.jogosFiltrados.length);
  }

  get rodadasDisponiveis(): number[] {
    return [...new Set(this.jogos.map((jogo) => jogo.rodada_grupo))]
      .filter((rodada) => rodada !== null && rodada !== undefined)
      .sort((a, b) => a - b);
  }

  get fasesDisponiveis(): string[] {
    return [...new Set(this.jogos.map((jogo) => jogo.fase || 'Fase de Grupos'))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  get timesDisponiveis(): string[] {
    const times = this.jogos.flatMap((jogo) => [
      jogo.time_casa.nome,
      jogo.time_fora.nome
    ]);

    return [...new Set(times)]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  get sugestoesTime(): string[] {
    const busca = this.normalizarTexto(this.filtros.time);

    if (!busca) {
      return this.timesDisponiveis.slice(0, 8);
    }

    return this.timesDisponiveis
      .filter((time) => this.normalizarTexto(time).includes(busca))
      .slice(0, 8);
  }

  get temFiltrosAtivos(): boolean {
    return Boolean(
      this.filtros.rodada ||
      this.filtros.fase ||
      this.filtros.time ||
      this.filtros.data
    );
  }

  get rotuloRodada(): string {
    if (!this.filtros.rodada) {
      return 'Todas';
    }

    return `Rodada ${this.filtros.rodada}`;
  }

  get rotuloFase(): string {
    return this.filtros.fase || 'Todas';
  }

  get rotuloData(): string {
    if (!this.filtros.data) {
      return 'Selecionar data';
    }

    const [ano, mes, dia] = this.filtros.data.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  get tituloCalendario(): string {
    return `${this.meses[this.mesCalendario]} de ${this.anoCalendario}`;
  }

  get diasCalendario(): DiaCalendario[] {
    const dias: DiaCalendario[] = [];

    const primeiroDiaMes = new Date(this.anoCalendario, this.mesCalendario, 1);
    const ultimoDiaMes = new Date(this.anoCalendario, this.mesCalendario + 1, 0);

    const diaSemanaInicio = primeiroDiaMes.getDay();
    const totalDiasMes = ultimoDiaMes.getDate();

    const ultimoDiaMesAnterior = new Date(
      this.anoCalendario,
      this.mesCalendario,
      0
    ).getDate();

    const hojeFormatado = this.formatarDataLocal(new Date());

    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const dia = ultimoDiaMesAnterior - i;
      const data = new Date(this.anoCalendario, this.mesCalendario - 1, dia);
      const dataFormatada = this.formatarDataLocal(data);

      dias.push({
        chave: `prev-${dataFormatada}`,
        dia,
        data: dataFormatada,
        foraDoMes: true,
        hoje: dataFormatada === hojeFormatado,
        selecionado: dataFormatada === this.filtros.data
      });
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const data = new Date(this.anoCalendario, this.mesCalendario, dia);
      const dataFormatada = this.formatarDataLocal(data);

      dias.push({
        chave: `current-${dataFormatada}`,
        dia,
        data: dataFormatada,
        foraDoMes: false,
        hoje: dataFormatada === hojeFormatado,
        selecionado: dataFormatada === this.filtros.data
      });
    }

    const diasRestantes = 42 - dias.length;

    for (let dia = 1; dia <= diasRestantes; dia++) {
      const data = new Date(this.anoCalendario, this.mesCalendario + 1, dia);
      const dataFormatada = this.formatarDataLocal(data);

      dias.push({
        chave: `next-${dataFormatada}`,
        dia,
        data: dataFormatada,
        foraDoMes: true,
        hoje: dataFormatada === hojeFormatado,
        selecionado: dataFormatada === this.filtros.data
      });
    }

    return dias;
  }

  alternarDropdown(dropdown: Exclude<DropdownFiltro, null>, event: MouseEvent): void {
    event.stopPropagation();

    this.calendarioAberto = false;
    this.dropdownAberto = this.dropdownAberto === dropdown ? null : dropdown;
  }

  selecionarRodada(rodada: string, event: MouseEvent): void {
    event.stopPropagation();

    this.filtros.rodada = rodada;
    this.dropdownAberto = null;
    this.aoMudarFiltros();
  }

  selecionarFase(fase: string, event: MouseEvent): void {
    event.stopPropagation();

    this.filtros.fase = fase;
    this.dropdownAberto = null;
    this.aoMudarFiltros();
  }

  abrirCalendario(event: MouseEvent): void {
    event.stopPropagation();

    this.dropdownAberto = null;
    this.calendarioAberto = !this.calendarioAberto;

    if (this.filtros.data) {
      const [ano, mes] = this.filtros.data.split('-').map(Number);

      this.anoCalendario = ano;
      this.mesCalendario = mes - 1;
    }
  }

  mesAnterior(event: MouseEvent): void {
    event.stopPropagation();

    if (this.mesCalendario === 0) {
      this.mesCalendario = 11;
      this.anoCalendario--;
      return;
    }

    this.mesCalendario--;
  }

  proximoMes(event: MouseEvent): void {
    event.stopPropagation();

    if (this.mesCalendario === 11) {
      this.mesCalendario = 0;
      this.anoCalendario++;
      return;
    }

    this.mesCalendario++;
  }

  selecionarData(data: string, event: MouseEvent): void {
    event.stopPropagation();

    this.filtros.data = data;
    this.calendarioAberto = false;
    this.aoMudarFiltros();
  }

  limparData(event: MouseEvent): void {
    event.stopPropagation();

    this.filtros.data = '';
    this.aoMudarFiltros();
  }

  selecionarHoje(event: MouseEvent): void {
    event.stopPropagation();

    const hoje = new Date();

    this.filtros.data = this.formatarDataLocal(hoje);
    this.mesCalendario = hoje.getMonth();
    this.anoCalendario = hoje.getFullYear();
    this.calendarioAberto = false;
    this.aoMudarFiltros();
  }

  aoMudarFiltros(): void {
    this.paginaAtual = 1;
  }

  selecionarTime(time: string): void {
    this.filtros.time = time;
    this.mostrarSugestoesTime = false;
    this.aoMudarFiltros();
  }

  abrirSugestoesTime(): void {
    this.mostrarSugestoesTime = true;
  }

  fecharSugestoesTime(): void {
    setTimeout(() => {
      this.mostrarSugestoesTime = false;
      this.cdr.detectChanges();
    }, 120);
  }

  limparFiltros(): void {
    this.filtros = {
      rodada: '',
      fase: '',
      time: '',
      data: ''
    };

    this.paginaAtual = 1;
    this.mostrarSugestoesTime = false;
    this.dropdownAberto = null;
    this.calendarioAberto = false;
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaAtual = pagina;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  abrirDetalhesJogo(jogo: Jogo): void {
    if (!jogo.codigo_externo) {
      console.warn('Jogo sem codigo_externo:', jogo);
      return;
    }

    this.router.navigate(['/jogos', jogo.codigo_externo]);
  }

  private normalizarJogo(jogo: any): Jogo {
    const nomeCasa = jogo.time_casa?.nome ?? jogo.TimeCasa ?? 'Time casa';
    const nomeFora = jogo.time_fora?.nome ?? jogo.TimeFora ?? 'Time fora';

    return {
      codigo_externo: jogo.codigo_externo ?? jogo.CodigoExterno,

      copa: jogo.copa ?? jogo.Copa ?? 'Copa do Mundo 2026',
      fase: jogo.fase ?? jogo.Fase ?? 'Fase de Grupos',

      grupo: jogo.grupo ?? jogo.Grupo ?? 'Grupo não informado',
      rodada_grupo: jogo.rodada_grupo ?? jogo.RodadaGrupo ?? 0,

      time_casa: {
        nome: nomeCasa,
        sigla: jogo.time_casa?.sigla ?? this.gerarSigla(nomeCasa),
        brasao_url: jogo.time_casa?.brasao_url ?? ''
      },

      time_fora: {
        nome: nomeFora,
        sigla: jogo.time_fora?.sigla ?? this.gerarSigla(nomeFora),
        brasao_url: jogo.time_fora?.brasao_url ?? ''
      },

      placar: {
        casa: jogo.placar?.casa ?? jogo.GolsTimeCasa ?? null,
        fora: jogo.placar?.fora ?? jogo.GolsTimeFora ?? null
      },

      status: jogo.status ?? jogo.Status ?? 'Agendado',
      status_api: jogo.status_api ?? jogo.StatusAPI ?? '',
      em_andamento: jogo.em_andamento ?? false,
      finalizado: jogo.finalizado ?? false,

      data_jogo: jogo.data_jogo ?? jogo.DataJogo ?? '',
      hora_jogo: jogo.hora_jogo ?? jogo.HoraJogo ?? '',
      data_hora_jogo: jogo.data_hora_jogo ?? jogo.DataHoraJogo ?? ''
    };
  }

  private gerarSigla(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 3)
      .toUpperCase();
  }

  private normalizarTexto(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private formatarDataParaInput(dataIso: string): string {
    if (!dataIso) {
      return '';
    }

    return dataIso.slice(0, 10);
  }

  private formatarDataLocal(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }
}