import _ from 'lodash'
import { formatLocation } from './location_helpers'
import { getStepMessage } from './step_result_helpers'
import indentString from 'indent-string'
import Status from '../../status'
import figures from 'figures'
import Table from 'cli-table'
import DataTable from '../../models/step_arguments/data_table'
import DocString from '../../models/step_arguments/doc_string'

const CHARACTERS = {
  [Status.AMBIGUOUS]: figures.cross,
  [Status.FAILED]: figures.cross,
  [Status.PASSED]: figures.tick,
  [Status.PENDING]: '?',
  [Status.SKIPPED]: '-',
  [Status.UNDEFINED]: '?'
}

function formatDataTable(dataTable) {
  const rows = dataTable.raw().map(row => {
    return row.map(cell => {
      return cell.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')
    })
  })
  const table = new Table({
    chars: {
      bottom: '',
      'bottom-left': '',
      'bottom-mid': '',
      'bottom-right': '',
      left: '|',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      middle: '|',
      right: '|',
      'right-mid': '',
      top: '',
      'top-left': '',
      'top-mid': '',
      'top-right': ''
    },
    style: {
      border: [],
      'padding-left': 1,
      'padding-right': 1
    }
  })
  table.push.apply(table, rows)
  return table.toString()
}

function formatDocString(docString) {
  return '"""\n' + docString.content + '\n"""'
}

function formatStep({
  colorFns,
  cwd,
  step,
  stepLineToKeywordMapping,
  stepLineToPickledStepMapping
}) {
  const { status } = step.result
  const colorFn = colorFns[status]
  const pickledStep = stepLineToPickledStepMapping[step.sourceLocation.line]

  const symbol = CHARACTERS[status]
  const keyword = _.chain(pickledStep.locations)
    .map(({ line }) => stepLineToKeywordMapping[line])
    .compact()
    .first()
    .value()
  const identifier = colorFn(symbol + ' ' + keyword + (pickledStep.text || ''))
  let text = identifier

  const { actionLocation } = step
  if (actionLocation) {
    text += ' # ' + colorFns.location(formatLocation(cwd, actionLocation))
  }
  text += '\n'

  // _.each(step.arguments, arg => {
  //   let str
  //   if (arg instanceof DataTable) {
  //     str = formatDataTable(arg)
  //   } else if (arg instanceof DocString) {
  //     str = formatDocString(arg)
  //   } else {
  //     throw new Error('Unknown argument type: ' + arg)
  //   }
  //   text += indentString(colorFn(str) + '\n', 4)
  // })
  return text
}

export function formatIssue({
  colorFns,
  cwd,
  gherkinDocument,
  number,
  pickle,
  snippetBuilder,
  steps,
  testCase
}) {
  const prefix = number + ') '
  let text = prefix
  const scenarioLocation = formatLocation(cwd, testCase)
  text +=
    'Scenario: ' +
    pickle.name +
    ' # ' +
    colorFns.location(scenarioLocation) +
    '\n'
  const stepLineToKeywordMapping = _.chain(gherkinDocument.feature.children)
    .map('steps')
    .flatten()
    .map(step => [step.location.line, step.keyword])
    .fromPairs()
    .value()
  const stepLineToPickledStepMapping = _.chain(pickle.steps)
    .map(step => [step.locations[0].line, step])
    .fromPairs()
    .value()
  _.each(steps, step => {
    const identifier = formatStep({
      colorFns,
      cwd,
      step,
      stepLineToKeywordMapping,
      stepLineToPickledStepMapping
    })
    text += indentString(identifier, prefix.length)
    const message = getStepMessage({
      colorFns,
      cwd,
      snippetBuilder,
      step
    })
    if (message) {
      text += indentString(message, prefix.length + 4) + '\n'
    }
  })
  return text + '\n'
}
