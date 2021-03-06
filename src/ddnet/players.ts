import { Route } from '../types';
import { DateTime } from 'luxon';
import cheerio from 'cheerio';

export const toTimestamp = (ddnetTime: string) => {
  const time = DateTime.fromISO(`${ddnetTime.slice(0, 10)}T${ddnetTime.slice(11, 16)}+0100`);
  if (time.isValid) return time.toMillis();
  return 0;
};

export const players: Route = (app, axios) => {
  // Rank
  app.get('/ddnet/players', async (request, reply) => {
    const response = await axios.get('/ranks');
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
          result[category].push({
            rank: index + 1,
            name: $(`a`, e).text(),
            points: parseInt($(`.points`, e).text()),
            server: $(`img`, e).attr('alt'),
          });
        });
    }

    reply.send(result);
  });

  app.get('/ddnet/players/:player', async (request, reply) => {
    const player: string = (request.params as any).player;
    const playerQuery = encodeURIComponent(player.replace(/-/g, '-45-'));

    const response = await axios.get(`/players/${playerQuery}`);

    const $ = cheerio.load(response.data);

    const result: any = {
      name: player,
    };

    const playerTable: [string, number][] = [
      ['points', 0],
      ['teamRank', 1],
      ['rank', 2],
      ['monthlyPoints', 3],
      ['weeklyPoints', 4],
    ];

    const queryBlock2 = $(`#global .block2.ladder .pers-result`);
    for (let [category, index] of playerTable) {
      const data = queryBlock2.eq(index).text().split(' ');

      if (data.length == 4) {
        result[category] = {
          rank: parseInt(data[0]),
          points: parseInt(data[2]),
        };
      }
    }

    result.server = queryBlock2.eq(5).find('img').attr('alt');

    const queryFirstFinish = $(`#global .block2.ladder .personal-result`)
      .text()
      .match(/([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}): (.*) \((.*):(.*)\)/);

    if (queryFirstFinish) {
      result.firstFinish = {
        timestamp: toTimestamp(queryFirstFinish[1]),
        map: queryFirstFinish[2],
        time: parseInt(queryFirstFinish[3]) * 60 + parseInt(queryFirstFinish[4]),
      };
    }

    const queryBlock6 = $(`#global .block6.ladder .tight`);
    const queryLastFinishes = queryBlock6.eq(0).find('td');

    const lastFinishes: any = [];

    queryLastFinishes.each((index, e) => {
      const queryLine = $(e)
        .text()
        .match(/([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}):  ([^:]*): (.*) \((.*):(.*)\)/);

      lastFinishes.push({
        timestamp: toTimestamp(queryLine[1]),
        type: queryLine[2],
        map: queryLine[3],
        time: parseInt(queryLine[4]) * 60 + parseInt(queryLine[5]),
        server: $('img', e).attr('alt'),
      });
    });

    result['lastFinishes'] = lastFinishes;

    const queryFavoritePartners = queryBlock6.eq(1).find('td');

    const favoritePartners: any = [];

    queryFavoritePartners.each((index, e) => {
      const queryLine = $(e)
        .text()
        .match(/[0-9]*. (.*): ([0-9]*)/);

      favoritePartners.push({
        name: queryLine[1],
        ranks: parseInt(queryLine[2]),
      });
    });

    result['favoritePartners'] = favoritePartners;
    reply.send(result);
  });
};
