import { lookup } from 'node:dns/promises'

/**
 * Thin DNS wrapper so tests can mock resolution through a single module.
 * `all: true` makes us inspect every A/AAAA record rather than a single
 * load-balancer-selected answer.
 */
export async function resolveAll(hostname) {
  return lookup(hostname, { all: true, verbatim: true })
}
