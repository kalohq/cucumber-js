import _ from 'lodash'
import { formatIssue, formatSummary } from './helpers'
import Status from '../status'
import Formatter from './'
import ProgressBar from 'progress'
import TestCaseCollector from './helpers/test_case_collector'

const statusToReport = [
  Status.AMBIGUOUS,
  Status.FAILED,
  Status.PENDING,
  Status.UNDEFINED
]

// Inspired by https://github.com/thekompanee/fuubar and https://github.com/martinciu/fuubar-cucumber
export default class ProgressBarFormatter extends Formatter {
  constructor(options) {
    super(options)
    this.testCaseCollector = new TestCaseCollector({
      eventBroadcaster: options.eventBroadcaster
    })
    options.eventBroadcaster
      .on('pickle-accepted', ::this.incrementStepCount)
      .once('test-case-started', ::this.initializeProgressBar)
      .on('test-step-finished', ::this.logProgress)
      .on('test-case-finished', ::this.logErrorIfNeeded)
      .on('test-run-finished', ::this.logSummary)
    this.numberOfSteps = 0
    this.issueCount = 0
  }

  incrementStepCount({ pickle }) {
    this.numberOfSteps += pickle.steps.length
  }

  initializeProgressBar() {
    this.progressBar = new ProgressBar(':current/:total steps [:bar] ', {
      clear: true,
      incomplete: ' ',
      stream: this.stream,
      total: this.numberOfSteps,
      width: this.stream.columns || 80
    })
  }

  logProgress({ index, testCase: { sourceLocation } }) {
    const { testCase } = this.testCaseCollector.getTestCaseData(sourceLocation)
    if (testCase.steps[index].sourceLocation) {
      this.progressBar.tick()
    }
  }

  logErrorIfNeeded({ sourceLocation, result }) {
    if (_.includes(statusToReport, result.status)) {
      this.issueCount += 1
      const {
        gherkinDocument,
        pickle,
        testCase
      } = this.testCaseCollector.getTestCaseData(sourceLocation)
      this.progressBar.interrupt(
        formatIssue({
          colorFns: this.colorFns,
          gherkinDocument,
          number: this.issueCount,
          pickle,
          snippetBuilder: this.snippetBuilder,
          testCase
        })
      )
    }
  }

  logSummary(testRun) {
    this.log(
      formatSummary({
        colorFns: this.colorFns,
        testCaseMap: this.testCaseCollector.testCaseMap,
        testRun
      })
    )
  }
}
