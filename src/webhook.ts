import { AxiosError } from 'axios';
import { Route } from './types';

export const webhook: Route = (app, axios, db) => {
  app.all('/webhook/*', async (request, reply) => {
    if ((request.query as any).__twcnt != process.env.TWCN_TOKEN) {
      return reply.status(404).send();
    }

    delete (request.query as any).__twcnt;

    const url = request.url.slice(9).split('?')[0];
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
