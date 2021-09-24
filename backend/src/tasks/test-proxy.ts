import axios from 'axios';
import { CommandOptions } from './ecs-client';
import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';

const WEBHOOK_URL_HTTPS =
  'https://webhook.site/fef89312-ab36-46fc-bb9b-8a9943f01e55';
const WEBHOOK_ADMIN_URL =
  'https://webhook.site/#!/0f3e7e8f-ffe4-46df-aad1-d017b2c27921';
const WEBHOOK_URL_HTTP = WEBHOOK_URL_HTTPS.replace('https://', 'http://');

const WEBSCRAPER_DIRECTORY = '/app/worker/webscraper';

/**
 * Integration test to make sure that the proxies work properly.
 * This test should be run manually whenever worker dependencies
 * that might affect the proxy are upgraded or new scans are added
 * which require proxy integration (such as adding code in a
 * new language).
 *
 *
 * To run the test, first go to https://webhook.site/, create a new webhook URL,
 * and replace the WEBHOOK_URL_HTTPS and WEBHOOK_ADMIN_URL constants accordingly.
 * Then run:
 * npm start (from the root directory)
 * cd backend && npm run build-worker && docker run -e WORKER_TEST=true -e ELASTICSEARCH_ENDPOINT=http://es:9200 --network="crossfeed_backend" -t crossfeed-worker
 *
 * Results should be checked at WEBHOOK_ADMIN_URL. All the requests made below
 * should display at the admin URL, and they should all be signed and have a
 * Crossfeed test user agent.
 *
 * TODO: Point these URLs to a locally running web server
 * in order to make this test be able to be automatically run on CI.
 */
export const handler = async (commandOptions: CommandOptions) => {
  await axios.get(WEBHOOK_URL_HTTP + '?source=axios');
  await axios.get(WEBHOOK_URL_HTTPS + '?source=axios');

  spawnSync(
    'intrigue-ident',
    ['--uri', WEBHOOK_URL_HTTP + '?source=intrigue-ident', '--json'],
    {
      env: {
        ...process.env,
        HTTP_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY,
        HTTPS_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY
      }
    }
  );

  spawnSync(
    'intrigue-ident',
    ['--uri', WEBHOOK_URL_HTTPS + '?source=intrigue-ident', '--json'],
    {
      env: {
        ...process.env,
        HTTP_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY,
        HTTPS_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY
      }
    }
  );

  writeFileSync('/test-domains-http.txt', WEBHOOK_URL_HTTP + '?source=scrapy');

  spawnSync(
    'scrapy',
    ['crawl', 'main', '-a', `domains_file=/test-domains-http.txt`],
    {
      cwd: WEBSCRAPER_DIRECTORY,
      env: {
        ...process.env,
        HTTP_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY,
        HTTPS_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY
      }
    }
  );

  writeFileSync(
    '/test-domains-https.txt',
    WEBHOOK_URL_HTTPS + '?source=scrapy'
  );

  spawnSync(
    'scrapy',
    ['crawl', 'main', '-a', `domains_file=/test-domains-https.txt`],
    {
      cwd: WEBSCRAPER_DIRECTORY,
      env: {
        ...process.env,
        HTTP_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY,
        HTTPS_PROXY: process.env.GLOBAL_AGENT_HTTP_PROXY
      }
    }
  );
};
