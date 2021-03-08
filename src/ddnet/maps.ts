import { Route } from '../types';
import cheerio from 'cheerio';
import { ddnetEncode, toRacetime, toTimestamp } from '../utils';
import fs, { promises as fsp } from 'fs';
import path from 'path';

const STARS: { [key: string]: number } = {
  '★✰✰✰✰': 1,
  '★★✰✰✰': 2,
  '★★★✰✰': 3,
  '★★★★✰': 4,
  '★★★★★': 5,
};

export const maps: Route = (app, axios, db) => {
  const downloadFile = async (url: string, path: string): Promise<void> => {
    const response = await axios.get(url, {
      responseType: 'stream',
    });
    const stream = fs.createWriteStream(path);
    response.data.pipe(stream);

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        stream.on('close', () => {
          resolve();
        });
        stream.close();
      });

      response.data.on('error', () => {
        stream.on('close', () => {
          fs.unlink(path, _ => {
            reject();
          });
        });
        stream.close();
      });
    });
  };

  // Map Releases
  app.get('/ddnet/maps', async (request, reply) => {
    const page = parseInt((request.query as any).page) || 1;

    const url = page <= 1 ? `https://ddnet.tw/releases/` : `https://ddnet.tw/releases/${page}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    return reply.send({
      page,
      totalPages: parseInt($('.longblock h3 a').last().text()) || page,
      maps: $('.blockreleases.release')
        .toArray()
        .map(e => {
          const span = $('h3 a span', e);
          // const mapSize = span.attr('title').match(/([0-9]*)x([0-9]*)$/);
          const desc = $('p', e).last();
          const descText = desc.text().match(/Difficulty: (.*), Points: (.*)/);
          const name = span.text();
          const safeName = $('.screenshot', e)
            .attr('src')
            .match(/\/ranks\/maps\/(.*).png/);
          return {
            server: $('h2 a', e).text().split(' ')[0].toLowerCase(),
            // mapWidth: parseInt(mapSize[1]),
            // mapHeight: parseInt(mapSize[2]),
            name: name,
            safeName: safeName ? safeName[1] : undefined,
            releaseDate: $('h3', e).first().text().slice(0, 10) || 'legacy',
            mapper: $('p strong a', e).text(),
            difficulty: STARS[descText[1]] || 0,
            points: parseInt(descText[2]) || 0,
            tiles: $('span a', e)
              .toArray()
              .map(
                e =>
                  $(e)
                    .attr('href')
                    .match(/\/tiles\/(.*)\//)[1]
              ),
          };
        }),
    });
  });

  // Map
  app.get('/ddnet/maps/:map', async (request, reply) => {
    const map: string = (request.params as any).map;
    const url = `https://ddnet.tw/maps/${ddnetEncode(map)}/`;
    const response = await axios.get(url);

    const $ = cheerio.load(response.data);

    const blocks = $('#global h2');
    const title = blocks
      .eq(1)
      .text()
      .match(/(.*) by (.*)/);

    const infoQuery = $('.block2.info p');
    const info = infoQuery
      .text()
      .match(
        /(?:Released: ([0-9-]*))?Difficulty: (.*), Points: ([0-9]*)\s*(?:([0-9]*) tees finished \(median time: ([0-9:]*)\))?\s*(?:([0-9]*) teams finished \(biggest team: ([0-9:]*)\))?/
      );

    if (!info) return reply.callNotFound();

    const finishes = infoQuery
      .find('span')
      .last()
      .attr('title')
      .match(/first finish: (.*), last finish: (.*), total finishes: (.*)/);

    const tableProcessor = (e: cheerio.Element) => {
      const players = $('a', e)
        .toArray()
        .map(e => $(e).text());
      if (players.length > 1) {
        return {
          rank: parseInt($(`.rank`, e).text()),
          players,
          time: toRacetime($('.time', e).text()),
          server: $(`img`, e).attr('alt'),
        };
      } else {
        return {
          rank: parseInt($(`.rank`, e).text()),
          player: players[0],
          time: toRacetime($('.time', e).text()),
          server: $(`img`, e).attr('alt'),
        };
      }
    };

    const safeName = infoQuery
      .find('.screenshot')
      .attr('src')
      .match(/\/ranks\/maps\/(.*).png/);
    return reply.send({
      server: blocks.eq(0).text().split(' ')[0].toLowerCase(),
      name: title[1],
      safeName: safeName ? safeName[1] : undefined,
      mapper: title[2],
      releaseDate: info[1] || 'legacy',
      difficulty: STARS[info[2]] || 0,
      points: parseInt(info[3]) || 0,
      tiles: infoQuery
        .find('span a')
        .toArray()
        .map(
          e =>
            $(e)
              .attr('href')
              .match(/\/tiles\/(.*)\//)[1]
        ),
      teesFinished: parseInt(info[4]) || 0,
      medianTime: toRacetime(info[5]),
      teamFinished: parseInt(info[6]) || undefined,
      biggestTeam: parseInt(info[7]) || undefined,
      firstFinish: finishes[1] ? toTimestamp(finishes[1]) : undefined,
      lastFinish: finishes[2] ? toTimestamp(finishes[2]) : undefined,
      totalFinishes: parseInt(finishes[3]) || undefined,
      teamRecords: $('.block2.teamrecords table tr').toArray().map(tableProcessor),
      records: $('.block2.records table tr').toArray().map(tableProcessor),
    });
  });

  // Map
  app.get('/ddnet/mapthumbs/:file', async (request, reply) => {
    const file: string = (request.params as any).file;
    if (!file.endsWith('.png')) return reply.callNotFound();

    const staticPath = path.resolve(process.env.TWCN_API_STATIC_PATH);
    const thumbsPath = path.join(staticPath, 'mapthumbs');
    const filePath = path.join(thumbsPath, file);
    const relativeFilePath = path.join('mapthumbs', file);

    try {
      await fsp.access(thumbsPath, fs.constants.R_OK);
    } catch {
      await fsp.mkdir(thumbsPath), { recursive: true };
    }

    try {
      await fsp.access(filePath, fs.constants.R_OK);
    } catch {
      await downloadFile(`https://ddnet.tw/ranks/maps/${encodeURIComponent(file)}`, filePath);
    }

    return reply.sendFile(relativeFilePath);
  });

  // MapData
  app.get('/ddnet/mapdata/:file', async (request, reply) => {
    const file: string = (request.params as any).file;
    if (!file.endsWith('.map')) return reply.callNotFound();

    const forceRefresh = (request.query as any).refresh == 'true';
    const staticPath = path.resolve(process.env.TWCN_API_STATIC_PATH);
    const thumbsPath = path.join(staticPath, 'mapdata');
    const filePath = path.join(thumbsPath, file);
    const relativeFilePath = path.join('mapdata', file);
    const fileName = path.basename(file, '.map');

    try {
      await fsp.access(thumbsPath, fs.constants.R_OK);
    } catch {
      await fsp.mkdir(thumbsPath), { recursive: true };
    }

    const cached = await db.get(`mapdata_${fileName}`);

    if (forceRefresh && !cached) {
      await downloadFile(`https://ddnet.tw/mappreview/${encodeURIComponent(file)}`, filePath);
      db.psetex(`mapdata_${fileName}`, 86400000, true);
    } else {
      try {
        await fsp.access(filePath, fs.constants.R_OK);
      } catch {
        await downloadFile(`https://ddnet.tw/mappreview/${encodeURIComponent(file)}`, filePath);
        db.psetex(`mapdata_${fileName}`, 86400000, true);
      }
    }

    return reply.download(relativeFilePath, {
      maxAge: 86400000,
    });
  });
};
