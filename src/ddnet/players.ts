import { Route } from '../types';
import cheerio from 'cheerio';

export const players: Route = (app, axios) => {
  app.get('/ddnet/players', async (request, reply) => {
    const response = await axios.get('https://ddnet.tw/ranks');
    const $ = cheerio.load(response.data);

    const playerTable: [string, number][] = [
      ['points', 0],
      ['teamRank', 1],
      ['rank', 2],
      ['monthlyPoints', 3],
      ['weeklyPoints', 4],
    ];

    const result: any = {};
    for (let [category, index] of playerTable) {
      result[category] = [];

      $(`#global .ladder .tight`)
        .eq(index)
        .find('tr')
        .each((index, e) => {
          result[category].push({
            position: index + 1,
            name: $(`a`, e).text(),
            points: parseInt($(`.points`, e).text()),
            country: $(`img`, e).attr('alt'),
          });
        });
    }

    reply.send(result);
  });
};
