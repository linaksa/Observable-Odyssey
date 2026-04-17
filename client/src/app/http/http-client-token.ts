import { InjectionToken } from '@angular/core';
import { HttpClientPort } from '@app/interfaces/http-client-port.interface';

// creating an injection token for our framework agnostic interface
export const HTTP_CLIENT = new InjectionToken<HttpClientPort>('HttpClientPort');
