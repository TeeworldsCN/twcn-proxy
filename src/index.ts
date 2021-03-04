import nhp from 'http-proxy';
import { MIRROR } from './config';

for (let [site, port] of MIRROR) {
  console.log(`proxying: "${site} at ${port}"`);
  nhp
    .createProxyServer({
      target: site,
      xfwd: true,
      changeOrigin: true,
      autoRewrite: true,
    })
    .listen(port);
}
