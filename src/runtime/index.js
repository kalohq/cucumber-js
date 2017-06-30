import Status from '../status'
import StackTraceFilter from './stack_trace_filter'
import TestCaseRunner from './test_case_runner'

export default class Runtime {
  // options - {dryRun, failFast, filterStacktraces, strict}
  constructor({ eventBroadcaster, options, supportCodeLibrary, testCases }) {
    this.eventBroadcaster = eventBroadcaster
    this.options = options || {}
    this.stackTraceFilter = new StackTraceFilter()
    this.supportCodeLibrary = supportCodeLibrary
    this.testCases = testCases || []
    this.eventBroadcaster.on('test-case-finished', ::this.onTestCaseFinished)
    this.success = true
  }

  onTestCaseFinished({ result }) {
    if (result.status !== Status.PASSED) {
      this.success = false
    }
  }

  async runTestCase(testCase) {
    const testCaseRunner = new TestCaseRunner({
      eventBroadcaster: this.eventBroadcaster,
      options: this.options,
      supportCodeLibrary: this.supportCodeLibrary,
      testCase
    })
    await testCaseRunner.run()
  }

  async start() {
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.filter()
    }
    this.eventBroadcaster.emit('test-run-started')
    await Promise.each(this.testCases, ::this.runTestCase)
    this.eventBroadcaster.emit('test-run-finished')
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.unfilter()
    }
    return this.success
  }
}
