import { AxiosError } from 'axios';
import { setup } from 'axios-cache-adapter';
import { RouteSetup } from './types';

export const webhook: RouteSetup = (app, store, db) => {
  const axios = setup({
    headers: {
      'Accept-Encoding': 'gzip, deflate',
    },
    decompress: true,
    timeout: 10000,
    cache: {
      maxAge: 10 * 60 * 1000,
      exclude: { query: false },
      store,
    },
  });

  app.all('/webhook/:token/*', async (request, reply) => {
    if ((request.params as any).token != process.env.TWCN_TOKEN) {
      return reply.status(404).send();
    }

    const url = request.url.slice(10 + process.env.TWCN_TOKEN.length).split('?')[0];
    const urlObject = new URL(url);
    const hostName = urlObject.hostname;
    request.headers.host = hostName;
    axios
      .request({
        method: request.method as any,
        url,
        params: request.query,
        data: request.body,
        headers: request.headers,
      })
      .then(res => {
        reply.status(res.status).headers(res.headers).send(res.data);
      })
      .catch(err => {
        const e = err as AxiosError;
        if (e.isAxiosError) {
          reply
            .status(e.response?.status || 500)
            .headers(e.response?.headers || {})
            .send(e.response?.data || '');
        } else {
          reply.status(500).send('you died');
        }
      });
  });
};
