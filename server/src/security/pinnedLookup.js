/**
 * Build a `lookup` implementation that only ever returns addresses that have
 * already passed the SSRF policy. Node's HTTP agent, TLS stack and net module
 * will use this lookup instead of performing their own DNS resolution, which
 * is what pins the actual TCP connection to a validated destination.
 */
export function createPinnedLookup(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('createPinnedLookup requires at least one validated address')
  }

  const entries = addresses.map((entry) => {
    const address = String(entry.address)
    const family = entry.family === 6 || address.includes(':') ? 6 : 4
    return { address, family }
  })

  return function pinnedLookup(_hostname, options, callback) {
    let opts = options
    let cb = callback
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    opts = opts || {}

    // Node's Happy Eyeballs path asks for every address.
    if (opts.all) {
      cb(null, entries.map((entry) => ({ ...entry })))
      return
    }

    const requestedFamily = opts.family === 4 || opts.family === 6 ? opts.family : 0
    const chosen =
      entries.find((entry) => requestedFamily === 0 || entry.family === requestedFamily) || entries[0]

    cb(null, chosen.address, chosen.family)
  }
}
