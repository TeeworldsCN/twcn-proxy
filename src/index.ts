import { AxiosError } from 'axios';
import fastify from 'fastify';
import { ddnet } from './ddnet';
import cheerio from 'cheerio';
import { setup, RedisDefaultStore } from 'axios-cache-adapter';
import redis from 'redis';

require('dotenv').config();

let store;
if (process.env.REDIS_URL) {
  const client = redis.createClient({
    url: process.env.REDIS_URL,
  });
  store = new RedisDefaultStore(client, {
    prefix: 'api',
  });
}

const app = fastify({ logger: false });
const ddnetAxios = setup({
  baseURL: 'https://ddnet.tw',
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 10000,
  cache: {
    maxAge: 10 * 60 * 1000,
    store,
  },
});

ddnet(app, ddnetAxios);

app.setErrorHandler(function (error, request, reply) {
  if ((error as any).isAxiosError) {
    let e = error as AxiosError;

    if (request.routerPath.startsWith('/ddnet')) {
      reply.status(e.response.status).send({
        statusCode: e.response.status,
        error: cheerio.load(e.response.data)('title').text().replace(' - DDraceNetwork', ''),
        message: e.message,
      });
      return;
    }
  }

  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: error.message,
  });
});

// Run the server!
const start = async () => {
  try {
    await app.listen(3000);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
