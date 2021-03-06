import { Route } from '../types';
import { players } from './players';

export const ddnet: Route = (app, axios) => {
  players(app, axios);
};
