import { Route } from '../types';
import { AxiosError } from 'axios';

export const players: Route = (app, axios) => {
  // Rank
  app.get('/kog/players/:player', async (request, reply) => {
    const player: string = (request.params as any).player;
    try {
      const { data } = await axios.post('/api.php', {
        type: 'players',
        player,
      });

      if (!data?.data || data.data.length === 0) {
        return reply.status(404).send({ error: 'Player not found' });
      }

      return reply.send(JSON.parse(data.data));
    } catch (e) {
      const err = e as AxiosError;
      return reply.status(err?.response?.status || 500).send({ error: 'Internal Server Error' });
    }
  });
};
