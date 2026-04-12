import { HttpOptions } from '@app/interfaces/http-options.interface';
import { Observable } from 'rxjs';

export interface HttpClientPort {
    get<T>(url: string, options?: HttpOptions): Observable<T>;
    post<T, B>(url: string, body: B, options?: HttpOptions): Observable<T>;
    put<T, B>(url: string, body: B, options?: HttpOptions): Observable<T>;
    patch<T, B>(url: string, body: B, options?: HttpOptions): Observable<T>;
    delete<T>(url: string, options?: HttpOptions): Observable<T>;
}
