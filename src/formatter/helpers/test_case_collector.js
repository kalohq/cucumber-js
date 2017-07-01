export default class TestCaseCollector {
  constructor({ eventBroadcaster }) {
    eventBroadcaster
      .on('gherkin-document', ::this.storeGherkinDocument)
      .on('pickle-accepted', ::this.storePickle)
      .on('test-case-prepared', ::this.storeTestCase)
      .on('test-step-finished', ::this.storeTestStepResult)
      .on('test-case-finished', ::this.storeTestCaseResult)
    this.gherkinDocumentMap = new Map() // uri to gherkinDocument
    this.pickleMap = new Map() // uri:line to {pickle, uri}
    this.testCaseMap = new Map() // uri:line to {sourceLocation, steps, result}
  }

  getTestCaseKey({ sourceLocation: { uri, line } }) {
    return `${uri}:${line}`
  }

  getTestCaseData(testCase) {
    return {
      gherkinDocument: this.gherkinDocumentMap.get(testCase.sourceLocation.uri),
      pickle: this.pickleMap.get(this.getTestCaseKey(testCase))
    }
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
}
