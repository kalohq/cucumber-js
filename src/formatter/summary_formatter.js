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
      .on('test-case-prepared', ::this.storeTestCase)
      .on('test-step-finished', ::this.storeTestStepResult)
      .on('test-case-finished', ::this.storeTestCaseResult)
      .on('test-run-finished', ::this.logSummary)
    this.gherkinDocumentMap = new Map() // uri to gherkinDocument
    this.pickleMap = new Map() // uri:line to {pickle, uri}
    this.testCaseMap = new Map() // uri:line to {sourceLocation, steps, result}
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

  getTestCaseKey({ sourceLocation: { uri, line } }) {
    return `${uri}:${line}`
  }

  storeGherkinDocument({ document, uri }) {
    this.gherkinDocumentMap.set(uri, document)
  }

  storePickle({ pickle, uri }) {
    this.pickleMap.set(uri + ':' + pickle.locations[0].line, pickle)
  }

  storeTestCase({ sourceLocation, steps }) {
    const key = this.getTestCaseKey({ sourceLocation })
    this.testCaseMap.set(key, { sourceLocation, steps })
  }

  storeTestStepResult({ index, testCase, result }) {
    const key = this.getTestCaseKey(testCase)
    this.testCaseMap.get(key).steps[index].result = result
  }

  storeTestCaseResult({ sourceLocation, result }) {
    const key = this.getTestCaseKey({ sourceLocation })
    this.testCaseMap.get(key).result = result
  }

  logSummary(testRun) {
    const failures = []
    const warnings = []
    this.testCaseMap.forEach(testCase => {
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
        testCaseMap: this.testCaseMap,
        testRun
      })
    )
  }

  logIssues({ issues, title }) {
    this.log(title + ':\n\n')
    issues.forEach((testCase, index) => {
      this.log(
        formatIssue({
          colorFns: this.colorFns,
          gherkinDocument: this.gherkinDocumentMap.get(
            testCase.sourceLocation.uri
          ),
          number: index + 1,
          pickle: this.pickleMap.get(this.getTestCaseKey(testCase)),
          snippetBuilder: this.snippetBuilder,
          testCase
        })
      )
    })
  }
}
