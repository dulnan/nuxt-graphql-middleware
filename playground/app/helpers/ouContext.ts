import type { InjectionKey, ComputedRef } from 'vue'

export type OuContext = {
  ids: string[]
}

export const OU_CONTEXT_KEY = Symbol('ou_context') as InjectionKey<
  ComputedRef<OuContext>
>
