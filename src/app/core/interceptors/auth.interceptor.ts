import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const isAuthRoute =
    req.url.includes('/api/v1/login') ||
    req.url.includes('/api/v1/auth/refresh') ||
    req.url.includes('/api/v1/logout');

  const authorizationHeader = auth.getAuthorizationHeader();

  let authReq = req;

  if (authorizationHeader && !isAuthRoute) {
    authReq = req.clone({
      setHeaders: {
        Authorization: authorizationHeader
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthRoute) {
        return throwError(() => error);
      }

      const refreshToken = auth.getRefreshToken();

      if (!refreshToken) {
        auth.clearTokens();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      return auth.refreshToken().pipe(
        switchMap(() => {
          const newAuthorizationHeader = auth.getAuthorizationHeader();

          if (!newAuthorizationHeader) {
            auth.clearTokens();
            router.navigate(['/login']);
            return throwError(() => error);
          }

          const retryReq = req.clone({
            setHeaders: {
              Authorization: newAuthorizationHeader
            }
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          auth.clearTokens();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};