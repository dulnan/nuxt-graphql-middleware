import type { ReturnSameValueQueryVariables } from '#graphql-operations'
import { useAsyncGraphqlQuery, type ComputedRef } from '#imports'

export async function useWrappedGraphqlQuery(
  variables: ComputedRef<ReturnSameValueQueryVariables>,
) {
  const result = await useAsyncGraphqlQuery('returnSameValue', variables, {
    transform: function (data) {
      return data.data.returnSameValue
    },
    default: function () {
      return 0
    },
    graphqlCaching: {
      client: true,
    },
  })

  return result
}
