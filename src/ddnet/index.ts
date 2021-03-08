import { Route } from '../types';
import { maps } from './maps';
import { players } from './players';

export const ddnet: Route = (app, axios, db) => {
  players(app, axios, db);
  maps(app, axios, db);
};
