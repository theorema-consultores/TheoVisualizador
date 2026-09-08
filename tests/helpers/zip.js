import { strToU8, zipSync } from 'fflate';

export function zipOf(entries) {
  return zipSync(Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, strToU8(value)])));
}
