import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import 'moment/locale/es';
import * as moment from 'moment';

if (environment.production) {
  enableProdMode();
}

// Establecer el locale global de Moment a español
moment.locale('es');

// Silenciar logs según configuración de entorno
if (!environment.enableConsoleLogs) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  // Deja warn y error activos para diagnósticos críticos
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
