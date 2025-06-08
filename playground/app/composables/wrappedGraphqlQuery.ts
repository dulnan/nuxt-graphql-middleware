import type { ReturnSameValueQueryVariables } from '#graphql-operations'
import { useAsyncGraphqlQuery, type ComputedRef } from '#imports'

export async function useWrappedGraphqlQuery(
  variables: ComputedRef<ReturnSameValueQueryVariables>,
) {
  const result = await useAsyncGraphqlQuery('returnSameValue', variables, {
    transform: function (data) {
      return data.data
    },
    default: function () {
      return {
        returnSameValue: 0,
        returnRandomNumber: 0,
      }
    },
    graphqlCaching: {
      client: true,
    },
  })

  return result
}
