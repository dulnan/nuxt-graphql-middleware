import { ConfirmPrompt, type State } from '@clack/core'
import color from 'picocolors'
import isUnicodeSupported from 'is-unicode-supported'

const unicode = isUnicodeSupported()
const s = (c: string, fallback: string) => (unicode ? c : fallback)

const S_BAR = s('│', '|')
const S_STEP_ACTIVE = s('◆', '*')
const S_STEP_CANCEL = s('■', 'x')
const S_STEP_ERROR = s('▲', 'x')
const S_STEP_SUBMIT = s('◇', 'o')
const S_RADIO_ACTIVE = s('●', '>')
const S_RADIO_INACTIVE = s('○', ' ')
const S_BAR_END = s('└', '—')

const symbol = (state: State) => {
  switch (state) {
    case 'initial':
    case 'active':
      return color.cyan(S_STEP_ACTIVE)
    case 'cancel':
      return color.red(S_STEP_CANCEL)
    case 'error':
      return color.yellow(S_STEP_ERROR)
    case 'submit':
      return color.green(S_STEP_SUBMIT)
  }
}

export class ConsolePrompt {
  private abortController: AbortController | null = null

  public confirm(message: string): Promise<'yes' | 'no' | 'cancel'> {
    this.abort()

    this.abortController = new AbortController()

    const active = 'Yes'
    const inactive = 'No'
    return new ConfirmPrompt({
      active,
      inactive,
      initialValue: true,
      signal: this.abortController.signal,
      render() {
        const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${message}\n`
        const value = this.value ? active : inactive

        switch (this.state) {
          case 'submit':
            return `${title}${color.gray(S_BAR)}  ${color.dim(value)}`
          case 'cancel':
            return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
              color.dim(value),
            )}\n${color.gray(S_BAR)}`
          default: {
            return `${title}${color.cyan(S_BAR)}  ${
              this.value
                ? `${color.green(S_RADIO_ACTIVE)} ${active}`
                : `${color.dim(S_RADIO_INACTIVE)} ${color.dim(active)}`
            } ${color.dim('/')} ${
              !this.value
                ? `${color.green(S_RADIO_ACTIVE)} ${inactive}`
                : `${color.dim(S_RADIO_INACTIVE)} ${color.dim(inactive)}`
            }\n${color.cyan(S_BAR_END)}\n`
          }
        }
      },
    })
      .prompt()
      .then((v) => {
        const result = v as any
        if (result === true) {
          return 'yes'
        } else if (result === false) {
          return 'no'
        }
        return 'cancel'
      })
  }

  public abort() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}
