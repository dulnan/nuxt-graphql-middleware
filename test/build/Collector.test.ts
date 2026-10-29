import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'
import { buildSchema } from 'graphql'
import { Collector } from '../../src/build/Collector'
import type { ModuleHelper } from '../../src/build/ModuleHelper'
import { logger } from '../../src/build/helpers'

const schema = buildSchema(`
  type Query {
    text: String
    foobar: String
    data: Data
  }

  type Data {
    text: String
    other: String
  }
`)

let rootDir = ''

function writeFile(path: string, contents: string): string {
  const filePath = join(rootDir, path)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
  return filePath
}

/**
 * Create a collector for an app in rootDir that extends a layer in
 * rootDir/layers/base.
 */
function createCollector(filePaths: string[]): Collector {
  const layerDir = join(rootDir, 'layers/base')
  const helper = {
    nuxt: {
      options: {
        rootDir,
        srcDir: join(rootDir, 'app'),
        alias: {},
        _layers: [
          { cwd: rootDir, config: { rootDir, srcDir: join(rootDir, 'app') } },
          {
            cwd: layerDir,
            config: { rootDir: layerDir, srcDir: join(layerDir, 'app') },
          },
        ],
      },
      callHook: () => Promise.resolve(),
    },
    options: { codegenConfig: {}, documents: [], logOnlyErrors: true },
    paths: {
      nuxtConfig: join(rootDir, 'nuxt.config.ts'),
      moduleBuildDir: join(rootDir, '.nuxt/nuxt-graphql-middleware'),
    },
    isDev: true,
    isPrepare: true,
    toModuleBuildRelative: (path: string) => path,
    getImportPatternFiles: () => Promise.resolve(filePaths),
    matchesImportPattern: () => true,
    prompt: { confirm: () => Promise.resolve('no') },
  }
  return new Collector(schema, helper as unknown as ModuleHelper)
}

function getOperation(collector: Collector, name: string) {
  return collector.getOperations().find((v) => v.name === name)
}

describe('Collector', () => {
  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), 'nuxt-graphql-middleware-'))
  })

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  test('the app overrides fragments and operations of a layer', async () => {
    const appFragment = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { other }',
    )
    const layerFragment = writeFile(
      'layers/base/app/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const layerQueries = writeFile(
      'layers/base/app/queries.graphql',
      'query layerQuery { data { ...data } }\nquery overridable { text }',
    )
    const appQuery = writeFile(
      'app/query.overridable.graphql',
      'query overridable { foobar }',
    )
    const collector = createCollector([
      appFragment,
      layerFragment,
      layerQueries,
      appQuery,
    ])
    await collector.init()

    expect(collector.getFragment('data')?.filePath).toBe(appFragment)
    expect(getOperation(collector, 'overridable')?.filePath).toBe(appQuery)

    // The query of the layer is kept and uses the fragment of the app.
    const layerQuery = getOperation(collector, 'layerQuery')
    expect(layerQuery?.filePath).toBe(layerQueries)
    expect(layerQuery?.sourceFull).toContain('other')
    expect(layerQuery?.sourceFull).not.toContain('text')
  })

  test('removing an override restores the definition of the layer', async () => {
    const layerFragment = writeFile(
      'layers/base/app/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const appFragment = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { other }',
    )
    const collector = createCollector([layerFragment, appFragment])
    await collector.init()
    expect(collector.getFragment('data')?.filePath).toBe(appFragment)

    rmSync(appFragment)
    await collector.handleWatchEvent('unlink', appFragment)
    expect(collector.getFragment('data')?.filePath).toBe(layerFragment)

    writeFile('app/fragment.data.graphql', 'fragment data on Data { other }')
    await collector.handleWatchEvent('add', appFragment)
    expect(collector.getFragment('data')?.filePath).toBe(appFragment)
  })

  test('documents and files from hooks rank between the app and layers', async () => {
    const layerQueries = writeFile(
      'layers/base/app/queries.graphql',
      'query fromHookDocument { text }\nquery fromHookFile { text }',
    )
    const appQueries = writeFile(
      'app/queries.graphql',
      'query fromApp { text }\nquery fromAppFile { text }',
    )
    const moduleFile = writeFile(
      'node_modules/some-module/queries.graphql',
      'query fromHookFile { foobar }\nquery fromAppFile { foobar }',
    )
    const collector = createCollector([layerQueries, appQueries])
    collector.addHookDocument(
      'module',
      'query fromHookDocument { foobar }\nquery fromApp { foobar }',
    )
    collector.addHookFile(moduleFile)
    await collector.init()

    expect(getOperation(collector, 'fromApp')?.filePath).toBe(appQueries)
    expect(getOperation(collector, 'fromAppFile')?.filePath).toBe(appQueries)
    expect(getOperation(collector, 'fromHookDocument')?.filePath).toBe(
      'hook:module',
    )
    expect(getOperation(collector, 'fromHookFile')?.filePath).toBe(moduleFile)
  })

  test('duplicates with the same priority are logged as a warning', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const collector = createCollector([
      writeFile('app/a.graphql', 'fragment data on Data { text }'),
      writeFile('app/b.graphql', 'fragment data on Data { other }'),
    ])
    await collector.init()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toContain('fragment data')

    // Not logged again when an unrelated file changes.
    const query = writeFile('app/query.graphql', 'query foo { text }')
    await collector.handleWatchEvent('add', query)
    expect(warn).toHaveBeenCalledOnce()
  })

  test('a syntax error keeps the last valid version of the file', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    const layerFragment = writeFile(
      'layers/base/app/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const appFragment = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { other }',
    )
    const collector = createCollector([layerFragment, appFragment])
    await collector.init()

    writeFile('app/fragment.data.graphql', 'fragment data on Data {')
    const result = await collector.handleWatchEvent('change', appFragment)
    expect(result.error?.message).toContain('Failed to parse')

    // Trigger a rebuild to check the state of the generator.
    const query = writeFile(
      'app/query.graphql',
      'query foo { data { ...data } }',
    )
    await collector.handleWatchEvent('add', query)
    expect(collector.getFragment('data')?.filePath).toBe(appFragment)
    expect(collector.getFragment('data')?.source).toContain('other')
  })

  test('emptying an overriding file restores the definition of the layer', async () => {
    const layerFragment = writeFile(
      'layers/base/app/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const appFragment = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { other }',
    )
    const collector = createCollector([layerFragment, appFragment])
    await collector.init()

    writeFile('app/fragment.data.graphql', '')
    const result = await collector.handleWatchEvent('change', appFragment)
    expect(result.error).toBeUndefined()
    expect(collector.getFragment('data')?.filePath).toBe(layerFragment)
  })

  test('an add event for a tracked file updates its contents', async () => {
    const file = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const collector = createCollector([file])
    await collector.init()

    writeFile('app/fragment.data.graphql', 'fragment data on Data { other }')
    await collector.handleWatchEvent('add', file)
    expect(collector.getFragment('data')?.source).toContain('other')
  })

  test('removing a folder keeps files in folders with the same prefix', async () => {
    const collector = createCollector([
      writeFile(
        'app/Foo/fragment.foo.graphql',
        'fragment foo on Data { text }',
      ),
      writeFile(
        'app/FooBar/fragment.fooBar.graphql',
        'fragment fooBar on Data { text }',
      ),
    ])
    await collector.init()

    rmSync(join(rootDir, 'app/Foo'), { recursive: true })
    await collector.handleWatchEvent('unlinkDir', join(rootDir, 'app/Foo'))
    expect(collector.getFragment('foo')).toBeUndefined()
    expect(collector.getFragment('fooBar')).toBeDefined()
  })
})
