import { Route } from '../types';
import { maps } from './maps';
import { players } from './players';
import { queries } from './queries';

export const ddnet: Route = (app, axios, db) => {
  players(app, axios, db);
  maps(app, axios, db);
  queries(app, axios, db);
};
