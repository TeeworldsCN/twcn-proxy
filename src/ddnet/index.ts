import { Route } from '../types';
import { maps } from './maps';
import { players } from './players';

export const ddnet: Route = (app, axios) => {
  players(app, axios);
  maps(app, axios);
};
