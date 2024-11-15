import { useRoute, computed } from '#imports'

type Langcode = 'en' | 'de' | 'fr'

const LANGUAGES: Langcode[] = ['en', 'de', 'fr']

function isValidLangcode(value: unknown): value is Langcode {
  return typeof value === 'string' && LANGUAGES.includes(value as Langcode)
}

export default function () {
  const route = useRoute()

  const language = computed<Langcode>(() => {
    const v = route.params.lang
    if (isValidLangcode(v)) {
      return v
    }

    return 'en'
  })

  return language
}
