/**
 * Testing strategy — AngularHttpClientAdapter
 *
 * Approach:
 * - Mock Angular `HttpClient` methods for each HTTP verb and assert adapter response mapping.
 * - Validate request-option translation (headers, params, credentials) and standardized `HttpError` conversion.
 *
 * Edge cases covered:
 * - Headers-only option objects keep params undefined without losing credentials.
 * - Nested server error payloads still expose extracted top-level error codes.
 */
import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AngularHttpClientAdapter } from '@app/http/angular-http-client-adapter';
import { HttpError } from '@app/interfaces/http-error.interface';
import { ErrorCode } from '@common/error-codes';
import { firstValueFrom, of, throwError } from 'rxjs';

const AUTHORIZATION_HEADER = 'Authorization';

describe('AngularHttpClientAdapter', () => {
    let service: AngularHttpClientAdapter;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post', 'put', 'patch', 'delete']);

        TestBed.configureTestingModule({
            providers: [AngularHttpClientAdapter, { provide: HttpClient, useValue: httpClientSpy }],
        });

        service = TestBed.inject(AngularHttpClientAdapter);
    });

    it('maps GET responses and forwards mapped options', async () => {
        // Nominal case
        httpClientSpy.get.and.returnValue(of(new HttpResponse({ body: { ok: true } })));

        const result = await firstValueFrom(
            service.get<{ ok: boolean }>('/games', {
                headers: { [AUTHORIZATION_HEADER]: 'token' },
                params: { page: '1', q: 'test' },
                withCredentials: true,
            }),
        );

        expect(result).toEqual({ ok: true });
        const options = httpClientSpy.get.calls.mostRecent().args[1] as {
            observe: string;
            params?: HttpParams;
            withCredentials?: boolean;
            headers?: Record<string, string>;
        };
        expect(options.observe).toBe('response');
        expect(options.headers).toEqual({ [AUTHORIZATION_HEADER]: 'token' });
        expect(options.withCredentials).toBeTrue();
        expect(options.params?.get('page')).toBe('1');
        expect(options.params?.get('q')).toBe('test');
    });

    it('maps options with headers-only object and keeps params undefined', async () => {
        // Edge case: options exist but params are intentionally omitted.
        httpClientSpy.get.and.returnValue(of(new HttpResponse({ body: { ok: true } })));

        await firstValueFrom(
            service.get<{ ok: boolean }>('/games', {
                headers: { [AUTHORIZATION_HEADER]: 'token' },
                withCredentials: false,
            }),
        );

        const options = httpClientSpy.get.calls.mostRecent().args[1] as {
            params?: HttpParams;
            withCredentials?: boolean;
            headers?: Record<string, string>;
        };
        expect(options.params).toBeUndefined();
        expect(options.withCredentials).toBeFalse();
        expect(options.headers).toEqual({ [AUTHORIZATION_HEADER]: 'token' });
    });

    it('maps POST, PUT, PATCH, and DELETE responses', async () => {
        // Nominal case
        httpClientSpy.post.and.returnValue(of(new HttpResponse({ body: { created: true } })));
        httpClientSpy.put.and.returnValue(of(new HttpResponse({ body: { updated: true } })));
        httpClientSpy.patch.and.returnValue(of(new HttpResponse({ body: { patched: true } })));
        httpClientSpy.delete.and.returnValue(of(new HttpResponse({ body: { deleted: true } })));

        await expectAsync(firstValueFrom(service.post('/games', { title: 'A' }))).toBeResolvedTo({ created: true });
        await expectAsync(firstValueFrom(service.put('/games/1', { title: 'B' }))).toBeResolvedTo({ updated: true });
        await expectAsync(firstValueFrom(service.patch('/games/1', { title: 'C' }))).toBeResolvedTo({ patched: true });
        await expectAsync(firstValueFrom(service.delete('/games/1'))).toBeResolvedTo({ deleted: true });

        expect(httpClientSpy.post).toHaveBeenCalled();
        expect(httpClientSpy.put).toHaveBeenCalled();
        expect(httpClientSpy.patch).toHaveBeenCalled();
        expect(httpClientSpy.delete).toHaveBeenCalled();
    });

    it('returns mapped HttpError with extracted top-level error codes', async () => {
        // Edge case
        const backendError = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            url: '/games/404',
            error: { errorCodes: [ErrorCode.GameNotFound] },
        });
        httpClientSpy.get.and.returnValue(throwError(() => backendError));

        await expectAsync(firstValueFrom(service.get('/games/404'))).toBeRejectedWith(
            jasmine.objectContaining<HttpError>({
                status: 404,
                url: '/games/404',
                errorCodes: [ErrorCode.GameNotFound],
                originalError: backendError,
            }),
        );
    });

    it('returns mapped HttpError with extracted nested error codes', async () => {
        // Edge case
        const wrappedError = new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            url: '/games',
            error: {
                originalError: {
                    error: {
                        errorCodes: [ErrorCode.RouteNotFound],
                    },
                },
            },
        });
        httpClientSpy.delete.and.returnValue(throwError(() => wrappedError));

        await expectAsync(firstValueFrom(service.delete('/games'))).toBeRejectedWith(
            jasmine.objectContaining<HttpError>({
                status: 400,
                errorCodes: [ErrorCode.RouteNotFound],
            }),
        );
    });

    it('maps PUT, PATCH, and DELETE errors and uses Unknown error fallback message', async () => {
        // Edge case: HttpErrorResponse message is empty string -> fallback should be used.
        const unknownError = {
            status: 500,
            message: '',
            error: {},
        } as HttpErrorResponse;

        httpClientSpy.put.and.returnValue(throwError(() => unknownError));
        httpClientSpy.patch.and.returnValue(throwError(() => unknownError));
        httpClientSpy.delete.and.returnValue(throwError(() => unknownError));

        await expectAsync(firstValueFrom(service.put('/games/1', { title: 'X' }))).toBeRejectedWith(
            jasmine.objectContaining<HttpError>({ status: 500, message: 'Unknown error' }),
        );
        await expectAsync(firstValueFrom(service.patch('/games/1', { title: 'Y' }))).toBeRejectedWith(
            jasmine.objectContaining<HttpError>({ status: 500, message: 'Unknown error' }),
        );
        await expectAsync(firstValueFrom(service.delete('/games/1'))).toBeRejectedWith(
            jasmine.objectContaining<HttpError>({ status: 500, message: 'Unknown error' }),
        );
    });

    it('maps POST errors through the shared HttpError mapper', async () => {
        // Edge case: cover the remaining post() catchError callback path.
        const unknownError = {
            status: 500,
            message: '',
            error: {},
        } as HttpErrorResponse;
        httpClientSpy.post.and.returnValue(throwError(() => unknownError));

        await expectAsync(firstValueFrom(service.post('/games', { title: 'X' }))).toBeRejectedWith(
            jasmine.objectContaining<HttpError>({ status: 500, message: 'Unknown error' }),
        );
    });
});
