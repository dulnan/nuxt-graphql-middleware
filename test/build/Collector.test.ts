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

  type Mutation {
    setText(text: String): String
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
 *
 * The documents options of the app and the layer are merged like Nuxt does,
 * together with documents from inline module options.
 */
function createCollector(
  filePaths: string[],
  documents: { app?: string[]; layer?: string[]; inline?: string[] } = {},
): Collector {
  const layerDir = join(rootDir, 'layers/base')
  const helper = {
    nuxt: {
      options: {
        rootDir,
        srcDir: join(rootDir, 'app'),
        alias: {},
        _layers: [
          {
            cwd: rootDir,
            // Nuxt gives the config file of the app like this.
            configFile: 'nuxt.config',
            config: {
              rootDir,
              srcDir: join(rootDir, 'app'),
              graphqlMiddleware: { documents: documents.app },
            },
          },
          {
            cwd: layerDir,
            configFile: join(layerDir, 'nuxt.config.ts'),
            config: {
              rootDir: layerDir,
              srcDir: join(layerDir, 'app'),
              graphqlMiddleware: { documents: documents.layer },
            },
          },
        ],
      },
      callHook: () => Promise.resolve(),
    },
    options: {
      codegenConfig: {},
      documents: [
        ...(documents.app ?? []),
        ...(documents.layer ?? []),
        ...(documents.inline ?? []),
      ],
      logOnlyErrors: true,
    },
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

  test('documents of the nuxt.config of a layer rank as the layer', async () => {
    const appFragment = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { other }',
    )
    const collector = createCollector([appFragment], {
      app: ['query overridable { foobar }'],
      layer: [
        'fragment data on Data { text }',
        'query layerQuery { data { ...data } }\nquery overridable { text }',
      ],
      inline: ['query inline { text }'],
    })
    await collector.init()

    const appConfig = join(rootDir, 'nuxt.config.ts')
    const layerConfig = join(rootDir, 'layers/base/nuxt.config.ts')
    expect(collector.getFragment('data')?.filePath).toBe(appFragment)
    expect(getOperation(collector, 'overridable')?.filePath).toBe(appConfig)
    expect(getOperation(collector, 'layerQuery')?.filePath).toBe(layerConfig)
    expect(getOperation(collector, 'layerQuery')?.sourceFull).toContain('other')
    // Documents from inline module options can't be matched to a layer.
    expect(getOperation(collector, 'inline')?.filePath).toBe(appConfig)
  })

  test('documents and files from hooks rank between the app and layers', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
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

  test('overriding a definition of a module logs a warning', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const moduleFile = writeFile(
      'node_modules/some-module/fragment.fromModuleFile.graphql',
      'fragment fromModuleFile on Data { text }',
    )
    const collector = createCollector([
      writeFile(
        'app/fragments.graphql',
        `fragment fromModuleDocument on Data { other }
         fragment fromModuleFile on Data { other }
         fragment fromLayer on Data { other }`,
      ),
      writeFile(
        'layers/base/app/fragments.graphql',
        `fragment fromLayer on Data { text }
         fragment overriddenByModule on Data { text }`,
      ),
    ])
    collector.addHookDocument(
      'module',
      `fragment fromModuleDocument on Data { text }
       fragment overriddenByModule on Data { other }`,
    )
    collector.addHookFile(moduleFile)
    await collector.init()

    // Logged even with logOnlyErrors and during prepare, see createCollector().
    // Overrides of layer definitions are not warned about.
    expect(warn).toHaveBeenCalledTimes(2)
    const messages = warn.mock.calls.map((v) => String(v[0]))
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('fragment fromModuleDocument (hook:module)'),
        expect.stringContaining('fragment fromModuleFile (./'),
      ]),
    )

    // Not logged again when an unrelated file changes.
    const query = writeFile('app/query.graphql', 'query foo { text }')
    await collector.handleWatchEvent('add', query)
    expect(warn).toHaveBeenCalledTimes(2)
  })

  test('duplicates with the same priority fail', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const collector = createCollector([
      writeFile('app/a.graphql', 'fragment data on Data { text }'),
      writeFile('app/b.graphql', 'fragment data on Data { other }'),
    ])
    await expect(collector.init()).rejects.toThrow()
    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0]![0]).toContain(
      'Multiple GraphQL definitions with the same name',
    )
    expect(error.mock.calls[0]![0]).toContain('fragment data (./')
  })

  test.each([
    ['the app and a layer', 'app/mutation.foo.graphql'],
    ['a layer and the app', 'layers/base/app/mutation.foo.graphql'],
  ])(
    'operations of different types with the same name fail: %s',
    async (_label, mutationPath) => {
      const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
      const queryPath = mutationPath.startsWith('app/')
        ? 'layers/base/app/query.foo.graphql'
        : 'app/query.foo.graphql'
      const collector = createCollector([
        writeFile(queryPath, 'query foo { text }'),
        writeFile(mutationPath, 'mutation foo { setText(text: "x") }'),
      ])
      await expect(collector.init()).rejects.toThrow()
      expect(error).toHaveBeenCalledOnce()
      const message = error.mock.calls[0]![0] as string
      expect(message).toContain(
        'Operations with the same name must be of the same type',
      )
      expect(message).toContain('query foo (./')
      expect(message).toContain('mutation foo (./')
    },
  )

  test('definitions of two modules with the same name fail', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const moduleFile = writeFile(
      'node_modules/some-module/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const collector = createCollector([])
    collector.addHookDocument('other-module', 'fragment data on Data { other }')
    collector.addHookFile(moduleFile)
    await expect(collector.init()).rejects.toThrow()
    expect(error.mock.calls[0]![0]).toContain(
      'fragment data (hook:other-module)',
    )
  })

  test('a duplicate added during watch is reported until it is fixed', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    const fragment = writeFile(
      'app/fragment.data.graphql',
      'fragment data on Data { text }',
    )
    const collector = createCollector([fragment])
    await collector.init()

    const duplicate = writeFile(
      'app/fragment.duplicate.graphql',
      'fragment data on Data { other }',
    )
    const result = await collector.handleWatchEvent('add', duplicate)
    expect(result.error?.message).toContain('fragment data')

    // Still reported when an unrelated file changes.
    const query = writeFile('app/query.graphql', 'query foo { text }')
    const unrelated = await collector.handleWatchEvent('add', query)
    expect(unrelated.error?.message).toContain('fragment data')

    writeFile(
      'app/fragment.duplicate.graphql',
      'fragment other on Data { other }',
    )
    const fixed = await collector.handleWatchEvent('change', duplicate)
    expect(fixed.error).toBeUndefined()
    expect(collector.getFragment('data')?.filePath).toBe(fragment)
    expect(collector.getFragment('data')?.source).toContain('text')
    expect(collector.getFragment('other')?.filePath).toBe(duplicate)
    expect(getOperation(collector, 'foo')).toBeDefined()
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
