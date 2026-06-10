import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Cadastro } from './pages/cadastro/cadastro';
import { Dashboard } from './pages/dashboard/dashboard';
import { Jogos } from './pages/jogos/jogos';
import { JogoDetalhe } from './pages/jogo-detalhe/jogo-detalhe';
import { Palpites } from './pages/palpites/palpites';
import { SuperPalpiteDetalhe } from './pages/super-palpite-detalhe/super-palpite-detalhe';
import { Classificacao } from './pages/classificacao/classificacao';
import { Perfil } from './pages/perfil/perfil';
import { MainLayout } from './shared/main-layout/main-layout';
import { authGuard } from './core/guards/auth-guard';
import { ParticipanteDetalhe } from './pages/participante-detalhe/participante-detalhe';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'cadastro',
    component: Cadastro
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'jogos',
        component: Jogos
      },
      {
        path: 'jogos/:id',
        component: JogoDetalhe
      },
      {
        path: 'palpites',
        component: Palpites
      },
      {
        path: 'palpites/super/:id',
        component: SuperPalpiteDetalhe
      },
      {
        path: 'classificacao',
        component: Classificacao
      },
      {
        path: 'perfil',
        component: Perfil
      },
      {
        path: 'votacoes',
        redirectTo: 'palpites',
        pathMatch: 'full'
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'participantes/:id',
        component: ParticipanteDetalhe
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];