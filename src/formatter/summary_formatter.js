import _ from 'lodash'
import { formatIssue, formatSummary } from './helpers'
import Formatter from './'
import Status from '../status'

export default class SummaryFormatter extends Formatter {
  constructor(options) {
    super(options)
    options.eventBroadcaster
      .on('gherkin-document', ::this.storeGherkinDocument)
      .on('pickle-accepted', ::this.storePickle)
      .on('test-case-started', ::this.storeTestCase)
      .on('test-step-finished', ::this.storeTestStepResult)
      .on('test-case-finished', ::this.storeTestCaseResult)
      .on('test-run-finished', ::this.logSummary)
    this.gherkinDocuments = new Map()
    this.pickles = new Map()
    this.testCases = new Map()
  }

  storeGherkinDocument({ document, uri }) {
    this.gherkinDocuments.set(uri, document)
  }

  storePickle({ pickle, uri }) {
    this.pickles.set(uri + ':' + pickle.location[0].line, pickle)
  }

  storeTestCase({ testCase, steps }) {
    this.testCases.set(testCase, { steps })
  }

  storeTestStepResult({ index, testCase, result }) {
    this.testCases.get(testCase).steps[index].push(result)
  }

  storeTestCaseResult({ testCase, result }) {
    this.testCases.get(testCase).result = result
  }

  logSummary() {
    const failures = []
    const warnings = []
    this.testCases.forEach(({ result, steps, stepResults }, testCase) => {
      if (_.includes([Status.AMBIGUOUS, Status.FAILED], result.status)) {
        failures.push({ testCase, steps, stepResults })
      } else if (
        _.includes([Status.PENDING, Status.UNDEFINED], result.status)
      ) {
        warnings.push({ testCase, steps, stepResults })
      }
    })
    if (failures.length > 0) {
      this.logIssues({ issues: failures, title: 'Failures' })
    }
    if (warnings.length > 0) {
      this.logIssues({ issues: warnings, title: 'Warnings' })
    }
    this.log(
      formatSummary({ colorFns: this.colorFns, testCases: this.testCases })
    )
  }

  logIssues({ issues, title }) {
    this.log(title + ':\n\n')
    issues.forEach(({ stepResults, testCase }, index) => {
      this.log(
        formatIssue({
          colorFns: this.colorFns,
          cwd: this.cwd,
          gherkinDocument: this.gherkinDocuments.get(testCase.uri),
          number: index + 1,
          pickle: this.pickles.get(testCase.uri + ':' + testCase.line),
          snippetBuilder: this.snippetBuilder,
          stepResults,
          testCase
        })
      )
    })
  }
}
