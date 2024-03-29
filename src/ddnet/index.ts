import { setup } from 'axios-cache-adapter';
import { RouteSetup } from '../types';
import { maps } from './maps';
import { players } from './players';
import { queries } from './queries';

export const ddnet: RouteSetup = (app, store, db) => {
  const axios = setup({
    baseURL: 'https://ddnet.tw',
    headers: {
      'Accept-Encoding': 'gzip, deflate',
    },
    decompress: true,
    timeout: 10000,
    cache: {
      maxAge: 10 * 60 * 1000,
      exclude: { query: false },
      store,
    },
  });

  players(app, axios, db);
  maps(app, axios, db);
  queries(app, axios, db);
};
