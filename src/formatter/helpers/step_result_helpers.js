import { formatError } from './error_helpers'
import Status from '../../status'
import indentString from 'indent-string'

function getAmbiguousStepResultMessage({ colorFns, step }) {
  return colorFns.ambiguous(step.result.exception)
}

function getFailedStepResultMessage({ colorFns, step }) {
  return formatError(step.result.exception, colorFns)
}

function getPendingStepResultMessage({ colorFns }) {
  return colorFns.pending('Pending')
}

export function getStepMessage({ colorFns, snippetBuilder, step }) {
  switch (step.result.status) {
    case Status.AMBIGUOUS:
      return getAmbiguousStepResultMessage({ colorFns, step })
    case Status.FAILED:
      return getFailedStepResultMessage({ colorFns, step })
    case Status.UNDEFINED:
      return getUndefinedStepResultMessage({
        colorFns,
        snippetBuilder,
        step
      })
    case Status.PENDING:
      return getPendingStepResultMessage({ colorFns })
  }
}

function getUndefinedStepResultMessage({ colorFns, snippetBuilder, step }) {
  const snippet = snippetBuilder.build(step)
  const message =
    'Undefined. Implement with the following snippet:' +
    '\n\n' +
    indentString(snippet, 2) +
    '\n'
  return colorFns.undefined(message)
}
