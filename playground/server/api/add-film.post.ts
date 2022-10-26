interface InputBody {
  test: string
}
export default defineEventHandler(async (event) => {
  const body = await useBody<InputBody>(event)
  return { body }
})
