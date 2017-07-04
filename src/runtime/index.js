import Status from '../status'
import StackTraceFilter from './stack_trace_filter'
import TestCaseRunner from './test_case_runner'
import Promise from 'bluebird'
import _ from 'lodash'

export default class Runtime {
  // options - {dryRun, failFast, filterStacktraces, strict}
  constructor({ eventBroadcaster, options, supportCodeLibrary, testCases }) {
    this.eventBroadcaster = eventBroadcaster
    this.options = options || {}
    this.stackTraceFilter = new StackTraceFilter()
    this.supportCodeLibrary = supportCodeLibrary
    this.testCases = testCases || []
    this.result = {
      duration: 0,
      success: true
    }
  }

  async runTestCase(testCase) {
    const skip =
      this.options.dryRun || (this.options.failFast && !this.result.success)
    const testCaseRunner = new TestCaseRunner({
      eventBroadcaster: this.eventBroadcaster,
      skip,
      supportCodeLibrary: this.supportCodeLibrary,
      testCase,
      worldParameters: this.options.worldParameters
    })
    const testCaseResult = await testCaseRunner.run()
    if (testCaseResult.duration) {
      this.result.duration += testCaseResult.duration
    }
    if (this.shouldCauseFailure(testCaseResult.status)) {
      this.result.success = false
    }
  }

  async start() {
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.filter()
    }
    this.eventBroadcaster.emit('test-run-started')
    await Promise.each(this.testCases, ::this.runTestCase)
    this.eventBroadcaster.emit('test-run-finished', { result: this.result })
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.unfilter()
    }
    return this.result.success
  }

  shouldCauseFailure(status) {
    return (
      _.includes([Status.AMBIGUOUS, Status.FAILED], status) ||
      (_.includes([Status.PENDING, Status.UNDEFINED], status) &&
        this.options.strict)
    )
  }
}
