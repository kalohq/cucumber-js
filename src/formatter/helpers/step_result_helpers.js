import { formatLocation } from './location_helpers'
import { formatError } from './error_helpers'
import Status from '../../status'
import Table from 'cli-table'
import indentString from 'indent-string'

function getAmbiguousStepResultMessage({ colorFns, cwd, stepResult }) {
  const { actionLocations } = step
  const table = new Table({
    chars: {
      bottom: '',
      'bottom-left': '',
      'bottom-mid': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      middle: ' - ',
      right: '',
      'right-mid': '',
      top: '',
      'top-left': '',
      'top-mid': '',
      'top-right': ''
    },
    style: {
      border: [],
      'padding-left': 0,
      'padding-right': 0
    }
  })
  table.push.apply(
    table,
    ambiguousStepDefinitions.map(stepDefinition => {
      const pattern = stepDefinition.pattern.toString()
      return [pattern, formatLocation(cwd, stepDefinition)]
    })
  )
  const message =
    'Multiple step definitions match:' +
    '\n' +
    indentString(table.toString(), 2)
  return colorFns.ambiguous(message)
}

function getFailedStepResultMessage({ colorFns, step }) {
  const { exception } = step.result
  return formatError(exception, colorFns)
}

function getPendingStepResultMessage({ colorFns }) {
  return colorFns.pending('Pending')
}

export function getStepMessage({ colorFns, cwd, snippetBuilder, step }) {
  switch (step.result.status) {
    case Status.AMBIGUOUS:
      return getAmbiguousStepResultMessage({ colorFns, cwd, step })
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
