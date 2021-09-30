import { connectToDatabase, Domain, Vulnerability } from '../models';
import getIps from './helpers/getIps';
import { CommandOptions } from './ecs-client';
import { plainToClass } from 'class-transformer';
import saveVulnerabilitiesToDb from './helpers/saveVulnerabilitiesToDb';
import { spawnSync } from 'child_process';
import { Client } from 'pg';

async function runDNSTwist(domain: Domain) {
  const child = spawnSync(
    'dnstwist',
    [
      '-r',
      '-s',
      '--tld',
      './worker/common_tlds.dict',
      '-f',
      'json',
      domain.name
    ],
    {
      stdio: 'pipe',
      encoding: 'utf-8'
    }
  );
  const savedOutput = child.stdout;
  const finalResults = JSON.parse(savedOutput);
  console.log(
    `Got ${Object.keys(finalResults).length} similar domains for domain ${
      domain.name
    }`
  );
  return finalResults;
}

export const handler = async (commandOptions: CommandOptions) => {
  const { organizationId, organizationName } = commandOptions;
  await connectToDatabase();

  // connect to the PE Database.
  const client = new Client({
    user: process.env.PE_DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.PE_DB_NAME,
    password: process.env.PE_DB_PASSWORD
  });
  client.connect();
  // Select the PE database org information
  const selectQuery = `SELECT (organizations_uid,name) FROM organizations`;
  await client.query(selectQuery, (err: any, res: any) => {
    console.log(err, res);
    client.end();
  });

  const dateNow = new Date(Date.now());
  console.log('Running dnstwist on organization', organizationName);
  const domainsWithIPs = await getIps(organizationId);
  const vulns: Vulnerability[] = [];
  // for (const domain of domainsWithIPs) {
  //   try {
  //     const results = await runDNSTwist(domain);
  //     // Fetch existing dnstwist vulnerability
  //     const existingVuln = await Vulnerability.findOne({
  //       domain: { id: domain.id },
  //       source: 'dnstwist'
  //     });
  //     // Map date-first-observed to any domain-name that already exists
  //     const existingVulnsMap = {};
  //     if (existingVuln) {
  //       for (const domain of existingVuln.structuredData['domains']) {
  //         existingVulnsMap[domain['domain-name']] =
  //           domain['date-first-observed'];
  //       }
  //     }
  //     // If an existing domain-name is in the new results, set date-first-observed to the mapped value
  //     // Else, set date-first-observed to today's date (dateNow)
  //     for (const domain of results) {
  //       domain['date-first-observed'] =
  //         existingVulnsMap[domain['domain-name']] || dateNow;
  //     }
  //     if (Object.keys(results).length !== 0) {
  //       vulns.push(
  //         plainToClass(Vulnerability, {
  //           domain: domain,
  //           lastSeen: new Date(Date.now()),
  //           title: 'DNS Twist Domains',
  //           state: 'open',
  //           source: 'dnstwist',
  //           severity: 'Low',
  //           needsPopulation: false,
  //           structuredData: { domains: results },
  //           description: `Registered domains similar to ${domain.name}.`
  //         })
  //       );
  //       await saveVulnerabilitiesToDb(vulns, false);
  //       console.log(results);
  //     } else {
  //       continue;
  //     }
  //   } catch (e) {
  //     console.error(e);
  //     continue;
  //   }
  // }
};
