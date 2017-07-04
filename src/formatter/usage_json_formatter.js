import { getUsage, TestCaseCollector } from './helpers'
import Formatter from './'

export default class UsageJsonFormatter extends Formatter {
  constructor(options) {
    super(options)
    this.testCaseCollector = new TestCaseCollector({
      eventBroadcaster: options.eventBroadcaster
    })
    options.eventBroadcaster.on('test-run-finished', ::this.logUsage)
  }

  logUsage() {
    const usage = getUsage({
      stepDefinitions: this.supportCodeLibrary.stepDefinitions,
      testCaseCollector: this.testCaseCollector
    })
    this.log(JSON.stringify(usage, null, 2))
  }
}
