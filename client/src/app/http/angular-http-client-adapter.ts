import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClientPort, HttpError, HttpOptions } from './http-interface';

interface MappedHttpOptions {
    headers?: Record<string, string>;
    params?: HttpParams;
    responseType?: 'json';
    withCredentials?: boolean;
}

@Injectable()
export class AngularHttpClientAdapter implements HttpClientPort {
    private readonly http = inject(HttpClient);

    get<T>(url: string, options?: HttpOptions): Observable<T> {
        return this.http.get<T>(url, { ...this.mapOptions(options), observe: 'response' }).pipe(
            map((response: HttpResponse<T>) => {
                return response.body as T;
            }),
            catchError((error) => this.handleError(error, url)),
        );
    }

    post<T, B = unknown>(url: string, body: B, options?: HttpOptions): Observable<T> {
        return this.http.post<T>(url, body, { ...this.mapOptions(options), observe: 'response' }).pipe(
            map((response: HttpResponse<T>) => response.body as T),
            catchError((error) => this.handleError(error, url)),
        );
    }

    put<T, B = unknown>(url: string, body: B, options?: HttpOptions): Observable<T> {
        return this.http.put<T>(url, body, { ...this.mapOptions(options), observe: 'response' }).pipe(
            map((response: HttpResponse<T>) => response.body as T),
            catchError((error) => this.handleError(error, url)),
        );
    }

    patch<T, B = unknown>(url: string, body: B, options?: HttpOptions): Observable<T> {
        return this.http.patch<T>(url, body, { ...this.mapOptions(options), observe: 'response' }).pipe(
            map((response: HttpResponse<T>) => response.body as T),
            catchError((error) => this.handleError(error, url)),
        );
    }

    delete<T>(url: string, options?: HttpOptions): Observable<T> {
        return this.http.delete<T>(url, { ...this.mapOptions(options), observe: 'response' }).pipe(
            map((response: HttpResponse<T>) => response.body as T),
            catchError((error) => this.handleError(error, url)),
        );
    }

    private mapOptions(options?: HttpOptions): MappedHttpOptions {
        if (!options) return {};
        return {
            headers: options.headers,
            params: options.params ? new HttpParams({ fromObject: options.params as Record<string, string> }) : undefined,
            withCredentials: options.withCredentials,
        };
    }

    private handleError(error: HttpErrorResponse, url: string): Observable<never> {
        const httpError: HttpError = {
            status: error.status,
            message: error.message || 'Unknown error',
            url,
            timestamp: new Date(),
            originalError: error,
        };
        return throwError(() => httpError);
    }
}
