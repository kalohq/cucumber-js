import Status from '../status'
import StackTraceFilter from './stack_trace_filter'
import TestCaseRunner from './test_case_runner'
import Promise from 'bluebird'

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
    const testCaseRunner = new TestCaseRunner({
      eventBroadcaster: this.eventBroadcaster,
      options: this.options,
      supportCodeLibrary: this.supportCodeLibrary,
      testCase
    })
    const testCaseResult = await testCaseRunner.run()
    if (testCaseResult.duration) {
      this.result.duration += testCaseResult.duration
    }
    if (testCaseResult.status !== Status.PASSED) {
      this.result.success = false
    }
  }

  async start() {
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.filter()
    }
    this.eventBroadcaster.emit('test-run-started')
    await Promise.each(this.testCases, ::this.runTestCase)
    this.eventBroadcaster.emit('test-run-finished', {result: this.result})
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.unfilter()
    }
    return this.result.success
  }
}
