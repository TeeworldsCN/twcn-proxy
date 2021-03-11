import { Route } from '../types';

export const queries: Route = (app, axios) => {
  // Map query
  app.get('/ddnet/fuzzy/maps/:map', async (request, reply) => {
    const map: string = (request.params as any).map;
    if (!map) return reply.send([]);
    const response = await axios.get(`/maps/?query=${encodeURIComponent(map)}`);
    return reply.send(response.data);
  });

  // Player query
  app.get('/ddnet/fuzzy/players/:player', async (request, reply) => {
    const player: string = (request.params as any).player;
    if (!player) return reply.send([]);
    const response = await axios.get(`/players/?query=${encodeURIComponent(player)}`);
    return reply.send(response.data);
  });
};
