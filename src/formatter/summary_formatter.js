import _ from 'lodash'
import { formatIssue, formatSummary } from './helpers'
import Formatter from './'
import Status from '../status'

export default class SummaryFormatter extends Formatter {
  constructor(options) {
    super(options)
    options.eventBroadcaster
      .on('gherkin-document', this.onGherkinDocument.bind(this))
      .on('test-case-started', this.onTestCaseStarted.bind(this))
      .on('test-step-finished', this.onTestStepFinished.bind(this))
      .on('test-case-finished', this.onTestCaseFinished.bind(this))
      .on('test-run-finished', this.onTestRunFinished.bind(this))
    this.gherkinDocuments = new Map()
    this.testCases = new Map()
    this.issues = []
  }

  onGherkinDocument({ document, uri }) {
    this.gherkinDocuments.set(uri, document)
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

  onTestRunFinished(featuresResult) {
    const failures = featuresResult.scenarioResults.filter(function(
      scenarioResult
    ) {
      return _.includes(
        [Status.AMBIGUOUS, Status.FAILED],
        scenarioResult.status
      )
    })
    if (failures.length > 0) {
      this.logIssues({ scenarioResults: failures, title: 'Failures' })
    }
    const warnings = featuresResult.scenarioResults.filter(function(
      scenarioResult
    ) {
      return _.includes(
        [Status.PENDING, Status.UNDEFINED],
        scenarioResult.status
      )
    })
    if (warnings.length > 0) {
      this.logIssues({ scenarioResults: warnings, title: 'Warnings' })
    }
    this.log(
      formatSummary({
        colorFns: this.colorFns,
        featuresResult
      })
    )
  }

  logIssues({ scenarioResults, title }) {
    this.log(title + ':\n\n')
    scenarioResults.forEach((scenarioResult, index) => {
      this.log(
        formatIssue({
          colorFns: this.colorFns,
          cwd: this.cwd,
          number: index + 1,
          snippetBuilder: this.snippetBuilder,
          scenarioResult
        })
      )
    })
  }
}
