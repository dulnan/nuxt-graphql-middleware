import type { GeneratorOutput } from 'graphql-typescript-deluxe'
import type { ModuleHelper } from '../ModuleHelper'
import type { Collector } from '../Collector'

type TemplateOptions = {
  path: string
  virtual?: boolean
  isFullPath?: boolean
}

type GeneratorTemplateCallback = (
  output: GeneratorOutput,
  helper: ModuleHelper,
  collector: Collector,
) => string

type StaticTemplateCallback = (helper: ModuleHelper) => string

export type GeneratorTemplate = {
  type: 'generator'
  options: TemplateOptions
  build: GeneratorTemplateCallback | null
  buildTypes: GeneratorTemplateCallback | null
  virtual?: boolean
}

export type StaticTemplate = {
  type: 'static'
  options: TemplateOptions
  build: StaticTemplateCallback | null
  buildTypes: StaticTemplateCallback | null
  virtual?: boolean
}

export type ModuleTemplate = GeneratorTemplate | StaticTemplate

export function defineGeneratorTemplate(
  options: TemplateOptions,
  build: GeneratorTemplateCallback | null,
  buildTypes: GeneratorTemplateCallback | null,
): GeneratorTemplate {
  return {
    type: 'generator',
    options,
    build,
    buildTypes,
  }
}

export function defineStaticTemplate(
  options: TemplateOptions,
  build: StaticTemplateCallback | null,
  buildTypes: StaticTemplateCallback | null,
): StaticTemplate {
  return {
    type: 'static',
    options,
    build,
    buildTypes,
  }
}
