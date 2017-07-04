import _ from 'lodash'
import { formatLocation } from './location_helpers'
import { getStepMessage } from './step_result_helpers'
import indentString from 'indent-string'
import Status from '../../status'
import figures from 'figures'
import Table from 'cli-table'
import util from 'util'

const CHARACTERS = {
  [Status.AMBIGUOUS]: figures.cross,
  [Status.FAILED]: figures.cross,
  [Status.PASSED]: figures.tick,
  [Status.PENDING]: '?',
  [Status.SKIPPED]: '-',
  [Status.UNDEFINED]: '?'
}

function formatDataTable(arg) {
  const rows = arg.rows.map(row => {
    return row.cells.map(cell => {
      return cell.value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')
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

function formatDocString(arg) {
  return '"""\n' + arg.content + '\n"""'
}

function formatStep({
  colorFns,
  snippetBuilder,
  testStep,
  stepLineToKeywordMapping,
  stepLineToPickledStepMapping
}) {
  const { status } = testStep.result
  const colorFn = colorFns[status]

  let identifier, pickledStep
  if (testStep.sourceLocation) {
    pickledStep = stepLineToPickledStepMapping[testStep.sourceLocation.line]
    const keyword = _.chain(pickledStep.locations)
      .map(({ line }) => stepLineToKeywordMapping[line])
      .compact()
      .first()
      .value()
    identifier = keyword + (pickledStep.text || '')
  } else {
    identifier = 'Hook'
  }

  let text = colorFn(CHARACTERS[status] + ' ' + identifier)

  const { actionLocation } = testStep
  if (actionLocation) {
    text += ' # ' + colorFns.location(formatLocation(actionLocation))
  }
  text += '\n'

  if (pickledStep) {
    _.each(pickledStep.arguments, arg => {
      let str
      if (arg.hasOwnProperty('rows')) {
        str = formatDataTable(arg)
      } else if (arg.hasOwnProperty('content')) {
        str = formatDocString(arg)
      } else {
        throw new Error('Unknown argument type: ' + util.inspect(arg))
      }
      text += indentString(colorFn(str) + '\n', 4)
    })
  }
  const message = getStepMessage({
    colorFns,
    pickledStep,
    snippetBuilder,
    testStep
  })
  if (message) {
    text += indentString(message, 4) + '\n'
  }
  return text
}

export function formatIssue({
  colorFns,
  gherkinDocument,
  number,
  pickle,
  snippetBuilder,
  testCase
}) {
  const prefix = number + ') '
  let text = prefix
  const scenarioLocation = formatLocation(testCase.sourceLocation)
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
  _.each(testCase.steps, testStep => {
    const formattedStep = formatStep({
      colorFns,
      snippetBuilder,
      stepLineToKeywordMapping,
      stepLineToPickledStepMapping,
      testStep
    })
    text += indentString(formattedStep, prefix.length)
  })
  return text + '\n'
}
