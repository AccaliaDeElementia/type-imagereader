'use sanity'

import { checkEnv, type CheckEnvInput } from '#tools/checkEnv.js'

const matching: CheckEnvInput = {
  pkg: { engines: { node: '24.12.0', npm: '11.6.2' }, devDependencies: { '@types/node': '^24.5.0' } },
  dockerfile: 'ARG NODE_VERSION=24.12.0\n',
  knexfile: { sqlite: { client: 'better-sqlite3' } },
  canResolveModule: () => true,
  actualNode: '24.12.0',
  actualNpm: '11.6.2',
}

describe('tools/checkEnv', () => {
  it('should return no problems when versions and Dockerfile are aligned', () => {
    expect(checkEnv(matching).problems).toEqual([])
  })

  it('should return no problems when Dockerfile is absent', () => {
    expect(checkEnv({ ...matching, dockerfile: null }).problems).toEqual([])
  })

  it('should report engines missing when engines.node is unset', () => {
    const input: CheckEnvInput = { ...matching, pkg: { engines: { npm: '11.6.2' } } }
    expect(checkEnv(input).problems).toEqual(['package.json engines.node and engines.npm must both be set'])
  })

  it('should report engines missing when engines.npm is unset', () => {
    const input: CheckEnvInput = { ...matching, pkg: { engines: { node: '24.12.0' } } }
    expect(checkEnv(input).problems).toEqual(['package.json engines.node and engines.npm must both be set'])
  })

  it('should report engines missing when engines field is entirely absent', () => {
    const input: CheckEnvInput = { ...matching, pkg: {} }
    expect(checkEnv(input).problems).toEqual(['package.json engines.node and engines.npm must both be set'])
  })

  it('should reject a caret-range engines.node', () => {
    const input: CheckEnvInput = { ...matching, pkg: { engines: { node: '^24.12.0', npm: '11.6.2' } } }
    expect(checkEnv(input).problems).toEqual(['engines.node and engines.npm must be exact versions, not ranges'])
  })

  it('should reject a tilde-range engines.npm', () => {
    const input: CheckEnvInput = { ...matching, pkg: { engines: { node: '24.12.0', npm: '~11.6.2' } } }
    expect(checkEnv(input).problems).toEqual(['engines.node and engines.npm must be exact versions, not ranges'])
  })

  it('should reject a wildcard pattern in engines', () => {
    const input: CheckEnvInput = { ...matching, pkg: { engines: { node: '24.12.x', npm: '11.6.2' } } }
    expect(checkEnv(input).problems).toEqual(['engines.node and engines.npm must be exact versions, not ranges'])
  })

  it('should report node mismatch when actual node differs from engines', () => {
    const input: CheckEnvInput = { ...matching, actualNode: '24.11.0' }
    expect(checkEnv(input).problems).toContain('  node: required 24.12.0, running 24.11.0')
  })

  it('should report npm mismatch when actual npm differs from engines', () => {
    const input: CheckEnvInput = { ...matching, actualNpm: '11.14.1' }
    expect(checkEnv(input).problems).toContain('  npm:  required 11.6.2, running 11.14.1')
  })

  it('should report Dockerfile drift when ARG NODE_VERSION differs from engines.node', () => {
    const input: CheckEnvInput = { ...matching, dockerfile: 'ARG NODE_VERSION=25.0.0\n' }
    expect(checkEnv(input).problems).toContain('  Dockerfile NODE_VERSION: required 24.12.0, declared 25.0.0')
  })

  it('should report missing Dockerfile ARG when NODE_VERSION line is absent', () => {
    const input: CheckEnvInput = { ...matching, dockerfile: '# Dockerfile without an ARG line\n' }
    expect(checkEnv(input).problems).toContain('  Dockerfile: ARG NODE_VERSION line not found')
  })

  it('should not report Dockerfile problems when dockerfile is null', () => {
    const input: CheckEnvInput = {
      ...matching,
      dockerfile: null,
      actualNode: '24.11.0',
    }
    const matchedProblems = checkEnv(input).problems.filter((p) => p.includes('Dockerfile'))
    expect(matchedProblems).toEqual([])
  })

  it('should report drift when the @types/node major is behind engines.node', () => {
    const input: CheckEnvInput = {
      ...matching,
      pkg: { engines: { node: '26.1.0', npm: '11.6.2' }, devDependencies: { '@types/node': '^25.7.0' } },
      dockerfile: 'ARG NODE_VERSION=26.1.0\n',
      actualNode: '26.1.0',
    }
    expect(checkEnv(input).problems).toContain('  @types/node: major 25 does not match engines.node major 26 (26.1.0)')
  })

  it('should report drift when the @types/node major is ahead of engines.node', () => {
    const input: CheckEnvInput = {
      ...matching,
      pkg: { engines: { node: '24.12.0', npm: '11.6.2' }, devDependencies: { '@types/node': '^25.0.0' } },
    }
    expect(checkEnv(input).problems).toContain('  @types/node: major 25 does not match engines.node major 24 (24.12.0)')
  })

  it('should accept a tilde-ranged @types/node whose major matches engines.node', () => {
    const input: CheckEnvInput = {
      ...matching,
      pkg: { engines: { node: '24.12.0', npm: '11.6.2' }, devDependencies: { '@types/node': '~24.0.1' } },
    }
    expect(checkEnv(input).problems).toEqual([])
  })

  it('should not report @types/node when it is absent from devDependencies', () => {
    const input: CheckEnvInput = { ...matching, pkg: { engines: { node: '24.12.0', npm: '11.6.2' } } }
    expect(checkEnv(input).problems).toEqual([])
  })

  it('should report an @types/node range with no readable major version', () => {
    const input: CheckEnvInput = {
      ...matching,
      pkg: { engines: { node: '24.12.0', npm: '11.6.2' }, devDependencies: { '@types/node': 'latest' } },
    }
    expect(checkEnv(input).problems).toContain('  @types/node: cannot read a major version from "latest"')
  })

  it('should report multiple problems when several conditions fail at once', () => {
    const input: CheckEnvInput = {
      ...matching,
      actualNode: '24.11.0',
      actualNpm: '11.14.1',
      dockerfile: 'ARG NODE_VERSION=25.0.0\n',
    }
    expect(checkEnv(input).problems.length).toBe(3)
  })

  it('should return no problems when knexfile is absent', () => {
    expect(checkEnv({ ...matching, knexfile: null }).problems).toEqual([])
  })

  it('should report the sqlite client when the module does not resolve', () => {
    const input: CheckEnvInput = { ...matching, canResolveModule: () => false }
    expect(checkEnv(input).problems).toEqual([
      '  better-sqlite3: knexfile.json names it as the sqlite client but it does not resolve',
    ])
  })

  it('should ask only about the client named in knexfile', () => {
    const asked: string[] = []
    checkEnv({
      ...matching,
      knexfile: { sqlite: { client: 'some-other-driver' } },
      canResolveModule: (name) => {
        asked.push(name)
        return true
      },
    })
    expect(asked).toEqual(['some-other-driver'])
  })

  it('should report an unset sqlite client', () => {
    const input: CheckEnvInput = { ...matching, knexfile: { sqlite: {} } }
    expect(checkEnv(input).problems).toEqual(['  knexfile.json: sqlite.client is not set'])
  })

  it('should report a missing sqlite section', () => {
    const input: CheckEnvInput = { ...matching, knexfile: {} }
    expect(checkEnv(input).problems).toEqual(['  knexfile.json: sqlite.client is not set'])
  })
})
