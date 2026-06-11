import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { JogosService } from '../../core/services/jogos';
import {
  CriarPalpiteRequest,
  OpcaoResumoPalpite,
  PalpiteDTO,
  PalpitesService,
  PlacarDTO,
  ResultadoPalpite,
  ResumoPalpitesResponse
} from '../../core/services/palpites';

interface TimeDetalheView {
  nome: string;
  nome_curto: string;
  sigla: string;
  brasao_url: string;
}

interface LocalDetalheView {
  estadio: string;
  cidade: string;
}

interface StatusDetalheView {
  exibicao: string;
  api: string;
  em_andamento: boolean;
  finalizado: boolean;
}

interface PlacarDetalheView {
  casa: number | null;
  fora: number | null;
  resultado_final: string | null;
  confirmado: boolean;
}

interface ControleDetalheView {
  votacao_aberta: boolean;
}

interface JogoDetalheView {
  id: string;
  codigo_externo: string;
  codigo_api_football_data: number | string | null;
  fonte: string;
  copa: string;
  fase: string;
  grupo: string;
  rodada_api: string;
  rodada_grupo: number | string;
  time_casa: TimeDetalheView;
  time_fora: TimeDetalheView;
  data_jogo: string;
  hora_jogo: string;
  data_hora_jogo: string;
  timezone_exibicao: string;
  local: LocalDetalheView;
  status: StatusDetalheView;
  placar: PlacarDetalheView;
  controle: ControleDetalheView;
  criado_em: string;
  atualizado_em: string;
}

interface ValidacaoPlacarPalpite {
  valido: boolean;
  mensagem: string;
  temPlacar: boolean;
  golsCasa: number | null;
  golsFora: number | null;
}

@Component({
  selector: 'app-jogo-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './jogo-detalhe.html',
  styleUrl: './jogo-detalhe.scss'
})
export class JogoDetalhe implements OnInit {
  codigoJogo = '';

  carregando = true;
  erro = '';

  carregandoPalpite = true;
  salvandoPalpite = false;

  carregandoResumo = true;
  erroResumo = '';

  jogo: JogoDetalheView | null = null;
  meuPalpite: PalpiteDTO | null = null;

  resumoPalpites: ResumoPalpitesResponse | null = null;
  opcoesResumo: OpcaoResumoPalpite[] = [];

  palpiteSelecionado: ResultadoPalpite | null = null;

  golsTimeCasa: number | string | null = null;
  golsTimeFora: number | string | null = null;

  erroPalpite = '';

  constructor(
    private route: ActivatedRoute,
    private jogosService: JogosService,
    private palpitesService: PalpitesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.codigoJogo = this.route.snapshot.paramMap.get('id') || '';

    if (!this.codigoJogo) {
      this.erro = 'Jogo não encontrado.';
      this.carregando = false;
      this.carregandoPalpite = false;
      this.carregandoResumo = false;
      this.cdr.detectChanges();
      return;
    }

    this.carregarJogo();
    this.carregarMeuPalpite();
    this.carregarResumoPalpites();
  }

  carregarJogo(): void {
    this.carregando = true;
    this.erro = '';

    this.jogosService.buscarJogoPorId(this.codigoJogo).subscribe({
      next: (response) => {
        this.jogo = this.normalizarJogoDetalhe(response.data);
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[JogoDetalhe] Erro ao carregar jogo:', error);

        this.erro = 'Não foi possível carregar os dados da partida.';
        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarMeuPalpite(): void {
    this.carregandoPalpite = true;

    this.palpitesService.buscarMeuPalpiteDoJogo(this.codigoJogo).subscribe({
      next: (response) => {
        this.aplicarPalpiteRecebido(response.data);
        this.carregandoPalpite = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.meuPalpite = null;
          this.palpiteSelecionado = this.recuperarResultadoLocal();

          const placarLocal = this.recuperarPlacarLocal();

          if (placarLocal) {
            this.golsTimeCasa = placarLocal.casa;
            this.golsTimeFora = placarLocal.fora;
          }

          this.carregandoPalpite = false;
          this.cdr.detectChanges();
          return;
        }

        console.error('[JogoDetalhe] Erro ao buscar palpite:', error);

        this.meuPalpite = null;
        this.palpiteSelecionado = this.recuperarResultadoLocal();

        const placarLocal = this.recuperarPlacarLocal();

        if (placarLocal) {
          this.golsTimeCasa = placarLocal.casa;
          this.golsTimeFora = placarLocal.fora;
        }

        this.carregandoPalpite = false;
        this.cdr.detectChanges();
      }
    });
  }

  carregarResumoPalpites(): void {
    this.carregandoResumo = true;
    this.erroResumo = '';

    this.palpitesService.buscarResumoPalpites(this.codigoJogo).subscribe({
      next: (response) => {
        this.resumoPalpites = response.data;
        this.opcoesResumo = response.data.opcoes || [];
        this.carregandoResumo = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[JogoDetalhe] Erro ao buscar resumo de palpites:', error);

        this.resumoPalpites = null;
        this.opcoesResumo = [];
        this.erroResumo = 'Não foi possível carregar o resumo dos palpites.';
        this.carregandoResumo = false;
        this.cdr.detectChanges();
      }
    });
  }

  get opcoesDePalpite(): OpcaoResumoPalpite[] {
    if (this.opcoesResumo.length > 0) {
      return this.opcoesResumo;
    }

    if (!this.jogo) {
      return [];
    }

    const opcoes: OpcaoResumoPalpite[] = [
      {
        resultado: 'CASA',
        label: this.jogo.time_casa.nome_curto || this.jogo.time_casa.nome,
        descricao: `Vitória de ${this.jogo.time_casa.nome_curto || this.jogo.time_casa.nome}`,
        quantidade: 0,
        percentual: 0
      }
    ];

    if (this.empatePermitido) {
      opcoes.push({
        resultado: 'EMPATE',
        label: 'Empate',
        descricao: 'Empate',
        quantidade: 0,
        percentual: 0
      });
    }

    opcoes.push({
      resultado: 'FORA',
      label: this.jogo.time_fora.nome_curto || this.jogo.time_fora.nome,
      descricao: `Vitória de ${this.jogo.time_fora.nome_curto || this.jogo.time_fora.nome}`,
      quantidade: 0,
      percentual: 0
    });

    return opcoes;
  }

  get totalPalpites(): number {
    return this.resumoPalpites?.total_palpites || 0;
  }

  get gridResumoTemplate(): string {
    const quantidade = this.opcoesDePalpite.length || 1;

    return `repeat(${quantidade}, minmax(0, 1fr))`;
  }

  get textoPlacar(): string {
    if (!this.jogo) {
      return 'x';
    }

    const casa = this.jogo.placar.casa;
    const fora = this.jogo.placar.fora;

    if (casa !== null && casa !== undefined && fora !== null && fora !== undefined) {
      return `${casa} x ${fora}`;
    }

    return 'x';
  }

  get votacaoBloqueada(): boolean {
    if (!this.jogo) {
      return true;
    }

    const statusPermitidos = ['SCHEDULED', 'TIMED'];
    const statusOk = statusPermitidos.includes(this.jogo.status.api);
    const votacaoAberta = this.jogo.controle.votacao_aberta === true;
    const jogoAindaNaoComecou = new Date() < new Date(this.jogo.data_hora_jogo);

    return !(votacaoAberta && statusOk && jogoAindaNaoComecou);
  }

  get textoStatusVotacao(): string {
    if (this.carregandoPalpite) {
      return 'Carregando';
    }

    if (this.votacaoBloqueada) {
      return 'Votação fechada';
    }

    return 'Votação aberta';
  }

  get empatePermitido(): boolean {
    if (this.resumoPalpites) {
      return this.resumoPalpites.permite_empate === true;
    }

    return true;
  }

  get textoAjudaPlacar(): string {
    if (this.empatePermitido) {
      return 'Na fase de grupos, o placar precisa combinar com o resultado escolhido.';
    }

    return 'No mata-mata, o placar pode empatar, mas você escolhe quem avança.';
  }

  get formularioPalpiteValido(): boolean {
    if (!this.palpiteSelecionado || this.votacaoBloqueada || this.salvandoPalpite) {
      return false;
    }

    return this.validarPlacarPalpite(false).valido;
  }

  get descricaoMeuPalpite(): string {
    if (!this.meuPalpite) {
      return '';
    }

    const descricao = this.meuPalpite.palpite?.descricao;

    if (descricao) {
      return descricao;
    }

    const resultado = this.extrairResultadoPalpite(this.meuPalpite);

    if (!resultado) {
      return 'Palpite registrado';
    }

    return this.descricaoResultado(resultado);
  }

  get textoPlacarPalpiteSalvo(): string {
    const placar = this.meuPalpite?.placar_palpite;

    if (
      placar &&
      placar.casa !== null &&
      placar.casa !== undefined &&
      placar.fora !== null &&
      placar.fora !== undefined
    ) {
      return `${placar.casa} x ${placar.fora}`;
    }

    return 'Sem placar informado';
  }

  get textoPontosPalpite(): string {
    if (!this.meuPalpite) {
      return '';
    }

    if (this.meuPalpite.pontos === null || this.meuPalpite.pontos === undefined) {
      return 'Aguardando apuração';
    }

    if (this.meuPalpite.pontos === 1) {
      return '1 ponto';
    }

    return `${this.meuPalpite.pontos} pontos`;
  }

  get classeResultadoSalvo(): string {
    const resultado = this.extrairResultadoPalpite(this.meuPalpite);

    return resultado ? resultado.toLowerCase() : '';
  }

  selecionarPalpite(resultado: ResultadoPalpite): void {
    if (this.votacaoBloqueada || this.salvandoPalpite) {
      return;
    }

    this.palpiteSelecionado = resultado;
    this.erroPalpite = '';

    this.cdr.detectChanges();
  }

  aoAlterarPlacar(): void {
    this.erroPalpite = '';
  }

  limparPlacar(): void {
    if (this.votacaoBloqueada || this.salvandoPalpite) {
      return;
    }

    this.golsTimeCasa = null;
    this.golsTimeFora = null;
    this.limparPlacarLocal();
    this.erroPalpite = '';
    this.cdr.detectChanges();
  }

  confirmarPalpite(): void {
    if (!this.jogo || !this.palpiteSelecionado || this.votacaoBloqueada) {
      return;
    }

    const validacao = this.validarPlacarPalpite(true);

    if (!validacao.valido) {
      this.erroPalpite = validacao.mensagem;
      this.cdr.detectChanges();
      return;
    }

    const resultadoEscolhido = this.palpiteSelecionado;

    const payload: CriarPalpiteRequest = {
      codigo_jogo: this.jogo.codigo_externo,
      resultado_palpite: resultadoEscolhido
    };

    if (
      validacao.temPlacar &&
      validacao.golsCasa !== null &&
      validacao.golsFora !== null
    ) {
      payload.gols_time_casa = validacao.golsCasa;
      payload.gols_time_fora = validacao.golsFora;
    }

    this.salvandoPalpite = true;
    this.erroPalpite = '';

    this.palpitesService.salvarPalpite(payload).subscribe({
      next: (response) => {
        this.aplicarPalpiteRecebido(response.data);

        this.salvarResultadoLocal(this.palpiteSelecionado || resultadoEscolhido);

        if (
          validacao.temPlacar &&
          validacao.golsCasa !== null &&
          validacao.golsFora !== null
        ) {
          this.salvarPlacarLocal(validacao.golsCasa, validacao.golsFora);
        } else {
          this.limparPlacarLocal();
        }

        this.salvandoPalpite = false;

        this.carregarResumoPalpites();

        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('[JogoDetalhe] Erro ao salvar palpite:', error);

        this.salvandoPalpite = false;

        if (error.status === 401) {
          this.erroPalpite = 'Sua sessão expirou. Faça login novamente.';
          this.cdr.detectChanges();
          return;
        }

        if (error.status === 403) {
          this.erroPalpite = 'Votação fechada para este jogo.';
          this.cdr.detectChanges();
          return;
        }

        if (error.status === 400) {
          this.erroPalpite =
            error.error?.details ||
            error.error?.message ||
            'Palpite inválido para este jogo. Confira o resultado e o placar.';
          this.cdr.detectChanges();
          return;
        }

        if (error.status === 404) {
          this.erroPalpite = 'Jogo não encontrado.';
          this.cdr.detectChanges();
          return;
        }

        this.erroPalpite = 'Não foi possível salvar seu palpite.';
        this.cdr.detectChanges();
      }
    });
  }

  textoBotaoOpcao(opcao: OpcaoResumoPalpite): string {
    if (opcao.resultado === 'EMPATE') {
      return 'Empate';
    }

    return `${opcao.label} vence`;
  }

  classeResultado(resultado: ResultadoPalpite): string {
    return resultado.toLowerCase();
  }

  percentualOpcao(opcao: OpcaoResumoPalpite): number {
    if (opcao.percentual === null || opcao.percentual === undefined) {
      return 0;
    }

    return Math.max(0, Math.min(100, Number(opcao.percentual)));
  }

  private aplicarPalpiteRecebido(palpite: PalpiteDTO | null): void {
    this.meuPalpite = palpite;

    const resultadoBackend = this.extrairResultadoPalpite(palpite);
    const resultadoLocal = this.recuperarResultadoLocal();

    this.palpiteSelecionado = resultadoBackend || resultadoLocal;

    if (this.palpiteSelecionado) {
      this.salvarResultadoLocal(this.palpiteSelecionado);
    }

    const placarBackend = palpite?.placar_palpite;

    if (
      placarBackend &&
      placarBackend.casa !== null &&
      placarBackend.casa !== undefined &&
      placarBackend.fora !== null &&
      placarBackend.fora !== undefined
    ) {
      this.golsTimeCasa = placarBackend.casa;
      this.golsTimeFora = placarBackend.fora;
      this.salvarPlacarLocal(placarBackend.casa, placarBackend.fora);
      return;
    }

    const placarLocal = this.recuperarPlacarLocal();

    if (placarLocal) {
      this.golsTimeCasa = placarLocal.casa;
      this.golsTimeFora = placarLocal.fora;
      return;
    }

    this.golsTimeCasa = null;
    this.golsTimeFora = null;
  }

  private validarPlacarPalpite(mostrarMensagem: boolean): ValidacaoPlacarPalpite {
    const golsCasaPreenchido = this.campoGolPreenchido(this.golsTimeCasa);
    const golsForaPreenchido = this.campoGolPreenchido(this.golsTimeFora);

    if (!golsCasaPreenchido && !golsForaPreenchido) {
      return {
        valido: true,
        mensagem: '',
        temPlacar: false,
        golsCasa: null,
        golsFora: null
      };
    }

    if (golsCasaPreenchido !== golsForaPreenchido) {
      return {
        valido: false,
        mensagem: 'Para informar placar, preencha os gols dos dois times.',
        temPlacar: true,
        golsCasa: null,
        golsFora: null
      };
    }

    const golsCasa = this.normalizarGol(this.golsTimeCasa);
    const golsFora = this.normalizarGol(this.golsTimeFora);

    if (golsCasa === null || golsFora === null) {
      return {
        valido: false,
        mensagem: 'Informe um placar válido usando apenas números.',
        temPlacar: true,
        golsCasa: null,
        golsFora: null
      };
    }

    if (golsCasa < 0 || golsFora < 0) {
      return {
        valido: false,
        mensagem: 'O placar não pode ter gols negativos.',
        temPlacar: true,
        golsCasa,
        golsFora
      };
    }

    if (!Number.isInteger(golsCasa) || !Number.isInteger(golsFora)) {
      return {
        valido: false,
        mensagem: 'O placar precisa usar números inteiros.',
        temPlacar: true,
        golsCasa,
        golsFora
      };
    }

    if (!this.palpiteSelecionado) {
      return {
        valido: false,
        mensagem: 'Escolha o resultado antes de confirmar o palpite.',
        temPlacar: true,
        golsCasa,
        golsFora
      };
    }

    if (!this.empatePermitido && this.palpiteSelecionado === 'EMPATE') {
      return {
        valido: false,
        mensagem: 'Em jogos de mata-mata, escolha o time que avança.',
        temPlacar: true,
        golsCasa,
        golsFora
      };
    }

    if (this.empatePermitido) {
      const placarCombina = this.placarCombinaComResultado(
        golsCasa,
        golsFora,
        this.palpiteSelecionado
      );

      if (!placarCombina) {
        return {
          valido: false,
          mensagem: mostrarMensagem
            ? 'O placar informado não combina com o resultado escolhido.'
            : 'Placar incompatível com o resultado.',
          temPlacar: true,
          golsCasa,
          golsFora
        };
      }
    }

    return {
      valido: true,
      mensagem: '',
      temPlacar: true,
      golsCasa,
      golsFora
    };
  }

  private placarCombinaComResultado(
    golsCasa: number,
    golsFora: number,
    resultado: ResultadoPalpite
  ): boolean {
    if (resultado === 'CASA') {
      return golsCasa > golsFora;
    }

    if (resultado === 'FORA') {
      return golsFora > golsCasa;
    }

    return golsCasa === golsFora;
  }

  private campoGolPreenchido(valor: unknown): boolean {
    return valor !== null && valor !== undefined && String(valor).trim() !== '';
  }

  private normalizarGol(valor: unknown): number | null {
    if (!this.campoGolPreenchido(valor)) {
      return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return null;
    }

    return numero;
  }

  private extrairResultadoPalpite(palpite: any): ResultadoPalpite | null {
    if (!palpite) {
      return null;
    }

    const candidatosDiretos = [
      palpite?.palpite?.resultado,
      palpite?.palpite?.resultado_palpite,
      palpite?.palpite?.Resultado,
      palpite?.palpite?.ResultadoPalpite,
      palpite?.resultado_palpite,
      palpite?.resultado,
      palpite?.Resultado,
      palpite?.ResultadoPalpite
    ];

    for (const candidato of candidatosDiretos) {
      const resultado = this.normalizarResultadoPalpite(candidato);

      if (resultado) {
        return resultado;
      }
    }

    return this.buscarResultadoRecursivo(palpite);
  }

  private buscarResultadoRecursivo(valor: unknown): ResultadoPalpite | null {
    const resultadoDireto = this.normalizarResultadoPalpite(valor);

    if (resultadoDireto) {
      return resultadoDireto;
    }

    if (Array.isArray(valor)) {
      for (const item of valor) {
        const resultado = this.buscarResultadoRecursivo(item);

        if (resultado) {
          return resultado;
        }
      }

      return null;
    }

    if (valor && typeof valor === 'object') {
      const objeto = valor as Record<string, unknown>;

      const chavesPreferenciais = [
        'resultado_palpite',
        'resultado',
        'ResultadoPalpite',
        'Resultado',
        'palpite'
      ];

      for (const chave of chavesPreferenciais) {
        if (chave in objeto) {
          const resultado = this.buscarResultadoRecursivo(objeto[chave]);

          if (resultado) {
            return resultado;
          }
        }
      }

      for (const chave of Object.keys(objeto)) {
        const resultado = this.buscarResultadoRecursivo(objeto[chave]);

        if (resultado) {
          return resultado;
        }
      }
    }

    return null;
  }

  private normalizarResultadoPalpite(valor: unknown): ResultadoPalpite | null {
    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    if (
      texto === 'CASA' ||
      texto === 'TIME_CASA' ||
      texto === 'VITORIA_CASA' ||
      texto === 'VITORIA DE CASA' ||
      texto === 'VITORIA DO TIME DA CASA'
    ) {
      return 'CASA';
    }

    if (
      texto === 'FORA' ||
      texto === 'VISITANTE' ||
      texto === 'TIME_FORA' ||
      texto === 'VITORIA_FORA' ||
      texto === 'VITORIA FORA' ||
      texto === 'VITORIA_VISITANTE' ||
      texto === 'VITORIA DO TIME VISITANTE'
    ) {
      return 'FORA';
    }

    if (texto === 'EMPATE' || texto === 'DRAW') {
      return 'EMPATE';
    }

    return null;
  }

  private descricaoResultado(resultado: ResultadoPalpite): string {
    if (!this.jogo) {
      return resultado;
    }

    if (resultado === 'CASA') {
      return `Vitória de ${this.jogo.time_casa.nome_curto || this.jogo.time_casa.nome}`;
    }

    if (resultado === 'FORA') {
      return `Vitória de ${this.jogo.time_fora.nome_curto || this.jogo.time_fora.nome}`;
    }

    return 'Empate';
  }

  private salvarResultadoLocal(resultado: ResultadoPalpite): void {
    localStorage.setItem(this.chavePalpiteLocal(), resultado);
  }

  private recuperarResultadoLocal(): ResultadoPalpite | null {
    const valor = localStorage.getItem(this.chavePalpiteLocal());

    return this.normalizarResultadoPalpite(valor);
  }

  private chavePalpiteLocal(): string {
    return `palpite_resultado_${this.codigoJogo}`;
  }

  private salvarPlacarLocal(casa: number, fora: number): void {
    localStorage.setItem(
      this.chavePlacarLocal(),
      JSON.stringify({
        casa,
        fora
      })
    );
  }

  private recuperarPlacarLocal(): PlacarDTO | null {
    const valor = localStorage.getItem(this.chavePlacarLocal());

    if (!valor) {
      return null;
    }

    try {
      const placar = JSON.parse(valor) as PlacarDTO;

      if (
        placar &&
        placar.casa !== null &&
        placar.casa !== undefined &&
        placar.fora !== null &&
        placar.fora !== undefined
      ) {
        return {
          casa: Number(placar.casa),
          fora: Number(placar.fora)
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private limparPlacarLocal(): void {
    localStorage.removeItem(this.chavePlacarLocal());
  }

  private chavePlacarLocal(): string {
    return `palpite_placar_${this.codigoJogo}`;
  }

  private normalizarJogoDetalhe(jogo: any): JogoDetalheView {
    const nomeCasa = jogo.time_casa?.nome ?? 'Time casa';
    const nomeFora = jogo.time_fora?.nome ?? 'Time fora';

    const localNormalizado = this.normalizarLocal(jogo.local);

    return {
      id: jogo.id ?? jogo.codigo_externo ?? '',
      codigo_externo: jogo.codigo_externo ?? '',
      codigo_api_football_data: jogo.codigo_api_football_data ?? null,
      fonte: jogo.fonte ?? 'API Football Data',
      copa: jogo.copa ?? 'Copa do Mundo 2026',
      fase: jogo.fase ?? 'Fase de Grupos',
      grupo: jogo.grupo ?? 'Grupo não informado',
      rodada_api: jogo.rodada_api ?? 'Rodada não informada',
      rodada_grupo: jogo.rodada_grupo ?? '-',

      time_casa: {
        nome: nomeCasa,
        nome_curto: jogo.time_casa?.nome_curto ?? nomeCasa,
        sigla: jogo.time_casa?.sigla ?? this.gerarSigla(nomeCasa),
        brasao_url: jogo.time_casa?.brasao_url ?? ''
      },

      time_fora: {
        nome: nomeFora,
        nome_curto: jogo.time_fora?.nome_curto ?? nomeFora,
        sigla: jogo.time_fora?.sigla ?? this.gerarSigla(nomeFora),
        brasao_url: jogo.time_fora?.brasao_url ?? ''
      },

      data_jogo: jogo.data_jogo ?? '',
      hora_jogo: jogo.hora_jogo ?? '',
      data_hora_jogo: jogo.data_hora_jogo ?? '',
      timezone_exibicao: jogo.timezone_exibicao ?? 'Horário local',

      local: localNormalizado,

      status: {
        exibicao: jogo.status?.exibicao ?? jogo.status ?? 'Agendado',
        api: jogo.status?.api ?? jogo.status_api ?? 'TIMED',
        em_andamento: jogo.status?.em_andamento ?? jogo.em_andamento ?? false,
        finalizado: jogo.status?.finalizado ?? jogo.finalizado ?? false
      },

      placar: {
        casa: jogo.placar?.casa ?? null,
        fora: jogo.placar?.fora ?? null,
        resultado_final: jogo.placar?.resultado_final ?? null,
        confirmado: jogo.placar?.confirmado ?? false
      },

      controle: {
        votacao_aberta: jogo.controle?.votacao_aberta ?? true
      },

      criado_em: jogo.criado_em ?? '',
      atualizado_em: jogo.atualizado_em ?? ''
    };
  }

  private normalizarLocal(local: any): LocalDetalheView {
    if (!local) {
      return {
        estadio: 'A definir',
        cidade: 'A definir'
      };
    }

    if (typeof local === 'string') {
      return {
        estadio: local,
        cidade: 'A definir'
      };
    }

    return {
      estadio: local.estadio ?? local.nome ?? 'A definir',
      cidade: local.cidade ?? 'A definir'
    };
  }

  private gerarSigla(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 3)
      .toUpperCase();
  }
}

