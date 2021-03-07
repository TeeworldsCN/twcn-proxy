import { AxiosError } from 'axios';
import fastify from 'fastify';
import { ddnet } from './ddnet';
import cheerio from 'cheerio';
import { setup, RedisDefaultStore } from 'axios-cache-adapter';
import redis from 'redis';
import fastifyStatic from 'fastify-static';
import path from 'path';

require('dotenv').config();

let store;
if (process.env.REDIS_URL) {
  console.log('Using redis cache');
  const client = redis.createClient({
    url: process.env.REDIS_URL,
  });
  store = new RedisDefaultStore(client, {
    prefix: 'api',
  });
}

const app = fastify({ logger: true, ignoreTrailingSlash: true });
app.register(fastifyStatic, {
  root: path.resolve(process.env.TWCN_API_STATIC_PATH),
  prefix: '/static',
});

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
  if (error && (error as any).isAxiosError) {
    let e = error as AxiosError;

    if (request.routerPath.startsWith('/ddnet')) {
      return reply.status(e.response?.status || 500).send({
        statusCode: e.response?.status || 500,
        error:
          typeof e.response?.data == 'string'
            ? cheerio.load(e.response.data)('title').text().replace(' - DDraceNetwork', '')
            : 'Internal Server Error',
        message: e.message,
      });
      return;
    }
  }

  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: error?.message,
  });

  console.error('Internal error:');
  if (error?.stack) console.error(error.stack);
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
