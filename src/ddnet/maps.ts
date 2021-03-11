import { Route } from '../types';
import cheerio from 'cheerio';
import { ddnetEncode, toRacetime, toTimestamp } from '../utils';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import sharp from 'sharp';

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

    const url = page <= 1 ? `/releases/` : `/releases/${page}/`;
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
    const server = (request.query as any).server;
    const url = server ? `/maps/${server}/${ddnetEncode(map)}/` : `/maps/${ddnetEncode(map)}/`;
    const response = await axios.get(url);

    const $ = cheerio.load(response.data);

    const blocks = $('#global h2');
    const title = blocks
      .eq(1)
      .text()
      .match(/(.*) by (.*)/);

    const infoQuery = $('.block2.info p');

    if (!infoQuery.text()) return reply.callNotFound();
    const lineBreak = infoQuery.find('br').get(0);

    const diffPoints =
      (lineBreak?.nextSibling?.data || '').match(/Difficulty: (.*), Points: ([0-9]*)/) || [];
    const releaseDate =
      (lineBreak?.previousSibling?.data || '').match(/(?:Released: ([0-9-]*))/) || [];
    const finishesQuery = infoQuery.find('span').last();
    const teeFinishes =
      finishesQuery.text().match(/([0-9]*) tees? finished\s\(median time: ([0-9:]*)\)/) || [];
    const finishes =
      finishesQuery
        .attr('title')
        .match(/first finish: (.*), last finish: (.*), total finishes: (.*)/) || [];
    const teamFinishes =
      (finishesQuery.get(0)?.nextSibling?.nextSibling?.data || '').match(
        /([0-9]*) teams? finished\s\(biggest team: ([0-9:]*)\)/
      ) || [];

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
      releaseDate: releaseDate[1] || 'legacy',
      difficulty: STARS[diffPoints[1]] || 0,
      points: parseInt(diffPoints[2]) || 0,
      tiles: infoQuery
        .find('span a')
        .toArray()
        .map(
          e =>
            $(e)
              .attr('href')
              .match(/\/tiles\/(.*)\//)[1]
        ),
      teesFinished: parseInt(teeFinishes[1]) || 0,
      medianTime: toRacetime(teeFinishes[2]) || undefined,
      teamFinished: parseInt(teamFinishes[1]) || undefined,
      biggestTeam: parseInt(teamFinishes[2]) || undefined,
      firstFinish: finishes[1] ? toTimestamp(finishes[1]) : undefined,
      lastFinish: finishes[2] ? toTimestamp(finishes[2]) : undefined,
      totalFinishes: parseInt(finishes[3]) || undefined,
      teamRecords: $('.block2.teamrecords table tr').toArray().map(tableProcessor),
      records: $('.block2.records table tr').toArray().map(tableProcessor),
    });
  });

  // Map thumbnails
  app.get('/ddnet/mapthumbs/:file', async (request, reply) => {
    const file: string = (request.params as any).file;
    const isSquare: boolean = (request.query as any).square == 'true';

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
      await downloadFile(`/ranks/maps/${encodeURIComponent(file)}`, filePath);
    }

    if (!isSquare) {
      return reply.sendFile(relativeFilePath);
    } else {
      const iconPath = path.join(thumbsPath, 'square');
      try {
        await fsp.access(iconPath, fs.constants.R_OK);
      } catch {
        await fsp.mkdir(iconPath), { recursive: true };
      }

      const squarePath = path.join(iconPath, file);
      const relativeSquarePath = path.join('mapthumbs', 'square', file);
      try {
        await fsp.access(squarePath, fs.constants.R_OK);
      } catch {
        await fsp.writeFile(squarePath, await sharp(filePath).resize(200, 200).png().toBuffer());
      }
      return reply.sendFile(relativeSquarePath);
    }
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
      await downloadFile(`/mappreview/${encodeURIComponent(file)}`, filePath);
      db.psetex(`mapdata_${fileName}`, 86400000, true);
    } else {
      try {
        await fsp.access(filePath, fs.constants.R_OK);
      } catch {
        await downloadFile(`/mappreview/${encodeURIComponent(file)}`, filePath);
        db.psetex(`mapdata_${fileName}`, 86400000, true);
      }
    }

    return reply.download(relativeFilePath, {
      maxAge: 86400000,
    });
  });
};
