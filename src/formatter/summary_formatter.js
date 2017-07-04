import _ from 'lodash'
import { formatIssue, formatSummary, TestCaseCollector } from './helpers'
import Formatter from './'
import Status from '../status'

export default class SummaryFormatter extends Formatter {
  constructor(options) {
    super(options)
    this.testCaseCollector = new TestCaseCollector({
      eventBroadcaster: options.eventBroadcaster
    })
    options.eventBroadcaster.on('test-run-finished', ::this.logSummary)
  }

  isTestCaseFailure(testCase) {
    return _.includes([Status.AMBIGUOUS, Status.FAILED], testCase.result.status)
  }

  isTestCaseWarning(testCase) {
    return _.includes(
      [Status.PENDING, Status.UNDEFINED],
      testCase.result.status
    )
  }

  logSummary(testRun) {
    const failures = []
    const warnings = []
    _.each(this.testCaseCollector.testCaseMap, testCase => {
      if (this.isTestCaseFailure(testCase)) {
        failures.push(testCase)
      } else if (this.isTestCaseWarning(testCase)) {
        warnings.push(testCase)
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
        testCaseMap: this.testCaseCollector.testCaseMap,
        testRun
      })
    )
  }

  logIssues({ issues, title }) {
    this.log(title + ':\n\n')
    issues.forEach((testCase, index) => {
      const {
        gherkinDocument,
        pickle
      } = this.testCaseCollector.getTestCaseData(testCase.sourceLocation)
      this.log(
        formatIssue({
          colorFns: this.colorFns,
          gherkinDocument,
          number: index + 1,
          pickle,
          snippetBuilder: this.snippetBuilder,
          testCase
        })
      )
    })
  }
}
