import { Route } from '../types';
import cheerio from 'cheerio';
import { AxiosError } from 'axios';

export const players: Route = (app, axios) => {
  // Rank
  app.get('/ddnet/players', async (request, reply) => {
    const server = (request.query as any).server || '';
    const response = await axios.get(`/ranks/${server}`);
    const $ = cheerio.load(response.data);

    const playerTable: [string, number][] = [
      ['points', 0],
      ['teamRank', 1],
      ['rank', 2],
      ['monthlyPoints', 3],
      ['weeklyPoints', 4],
    ];

    const result: any = {};
    const query = $(`#global .ladder .tight`);
    for (let [category, index] of playerTable) {
      result[category] = [];
      query
        .eq(index)
        .find('tr')
        .each((index, e) => {
          if (!server) {
            result[category].push({
              rank: parseInt($(`.rankglobal`, e).text()),
              name: $(`a`, e).text(),
              points: parseInt($(`.points`, e).text()),
              server: $(`img`, e).attr('alt'),
            });
          } else {
            result[category].push({
              rank: parseInt($(`.rankglobal`, e).text()),
              name: $(`a`, e).text(),
              points: parseInt($(`.points`, e).text()),
            });
          }
        });
    }

    return reply.send(result);
  });

  // Player
  app.get('/ddnet/players/:player', async (request, reply) => {
    const player: string = (request.params as any).player;

    try {
      const response = await axios.get(`/players`, {
        params: {
          json2: player,
        },
      });

      if (!response.data.player) {
        return reply.status(404).send({ error: 'Player not found' });
      }
      return reply.send(response.data);
    } catch (e) {
      const err = e as AxiosError;
      return reply.status(err?.response?.status || 500).send({ error: 'Internal Server Error' });
    }
  });
};
