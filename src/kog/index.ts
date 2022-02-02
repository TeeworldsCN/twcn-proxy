import { setup } from 'axios-cache-adapter';
import { RouteSetup } from '../types';
import { players } from './players';

export const kog: RouteSetup = (app, store, db) => {
  const axios = setup({
    baseURL: 'https://kog.tw',
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
};
