let instanceId = 1

export default class TestCaseCollector {
  constructor({ eventBroadcaster }) {
    this.id = instanceId += 1
    eventBroadcaster
      .on('gherkin-document', ::this.storeGherkinDocument)
      .on('pickle-accepted', ::this.storePickle)
      .on('test-case-prepared', ::this.storeTestCase)
      .on('test-step-finished', ::this.storeTestStepResult)
      .on('test-case-finished', ::this.storeTestCaseResult)
    this.gherkinDocumentMap = {} // uri to gherkinDocument
    this.pickleMap = {} // uri:line to {pickle, uri}
    this.testCaseMap = {} // uri:line to {sourceLocation, steps, result}
  }

  getTestCaseKey({ sourceLocation: { uri, line } }) {
    return `${uri}:${line}`
  }

  getTestCaseData(testCase) {
    return {
      gherkinDocument: this.gherkinDocumentMap[testCase.sourceLocation.uri],
      pickle: this.pickleMap[this.getTestCaseKey(testCase)]
    }
  }

  storeGherkinDocument({ document, uri }) {
    this.gherkinDocumentMap[uri] = document
  }

  storePickle({ pickle, uri }) {
    this.pickleMap[`${uri}:${pickle.locations[0].line}`] = pickle
  }

  storeTestCase({ sourceLocation, steps }) {
    const key = this.getTestCaseKey({ sourceLocation })
    this.testCaseMap[key] = { sourceLocation, steps }
  }

  storeTestStepResult({ index, testCase, result }) {
    const key = this.getTestCaseKey(testCase)
    this.testCaseMap[key].steps[index].result = result
  }

  storeTestCaseResult({ sourceLocation, result }) {
    const key = this.getTestCaseKey({ sourceLocation })
    this.testCaseMap[key].result = result
  }
}
