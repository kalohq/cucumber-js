import _ from 'lodash'
import { formatIssue, formatSummary } from './helpers'
import Formatter from './'
import Status from '../status'

export default class SummaryFormatter extends Formatter {
  constructor(options) {
    super(options)
    options.eventBroadcaster
      .on('gherkin-document', this.onGherkinDocument.bind(this))
      .on('pickle', this.onGherkinDocument.bind(this))
      .on('test-case-started', this.onTestCaseStarted.bind(this))
      .on('test-step-finished', this.onTestStepFinished.bind(this))
      .on('test-case-finished', this.onTestCaseFinished.bind(this))
      .on('test-run-finished', this.onTestRunFinished.bind(this))
    this.gherkinDocuments = new Map()
    this.pickles = new Map()
    this.testCases = new Map()
  }

  onGherkinDocument({ document, uri }) {
    this.gherkinDocuments.set(uri, document)
  }

  onPickle({ pickle, uri }) {
    this.pickles.set(uri + ':' + pickle.location[0].line, pickle)
  }

  onTestCaseStarted({ testCase }) {
    this.testCases.set(testCase, { stepResults: [] })
  }

  onTestStepFinished({ testCase, result }) {
    this.testCases.get(testCase).stepResults.push(result)
  }

  onTestCaseFinished({ testCase, result }) {
    this.testCases.get(testCase).result = result
  }

  onTestRunFinished() {
    const failures = []
    const warnings = []
    this.testCases.forEach(({ result, stepResults }, testCase) => {
      if (_.includes([Status.AMBIGUOUS, Status.FAILED], result.status)) {
        failures.push({ testCase, stepResults })
      } else if (
        _.includes([Status.PENDING, Status.UNDEFINED], result.status)
      ) {
        warnings.push({ testCase, stepResults })
      }
    })
    if (failures.length > 0) {
      this.logIssues({ issues: failures, title: 'Failures' })
    }
    if (warnings.length > 0) {
      this.logIssues({ issues: warnings, title: 'Warnings' })
    }
    this.log(
      formatSummary({
        colorFns: this.colorFns,
        testCases: this.testCases
      })
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
