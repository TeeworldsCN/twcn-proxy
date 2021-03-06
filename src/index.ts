import axios from 'axios';
import fastify from 'fastify';
import { ddnet } from './ddnet';

const app = fastify({ logger: true });
const axiosInstance = axios.create({
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 10000,
});

ddnet(app, axiosInstance);

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
