import _ from 'lodash'

export default class EventDataCollector {
  constructor(eventBroadcaster) {
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

  getTestCaseKey({ uri, line }) {
    return `${uri}:${line}`
  }

  getTestCaseData(sourceLocation) {
    return {
      gherkinDocument: this.gherkinDocumentMap[sourceLocation.uri],
      pickle: this.pickleMap[this.getTestCaseKey(sourceLocation)],
      testCase: this.testCaseMap[this.getTestCaseKey(sourceLocation)]
    }
  }

  getTestStepData({ testCase: { sourceLocation }, index }) {
    const { gherkinDocument, pickle, testCase } = this.getTestCaseData(
      sourceLocation
    )
    const result = {}
    result.testStep = testCase.steps[index]
    if (result.testStep.sourceLocation) {
      const { line } = result.testStep.sourceLocation
      const stepLineToPickledStepMapping = _.chain(pickle.steps)
        .map(step => [_.last(step.locations).line, step])
        .fromPairs()
        .value()
      result.pickledStep = stepLineToPickledStepMapping[line]
      const stepLineToKeywordMapping = _.chain(gherkinDocument.feature.children)
        .map('steps')
        .flatten()
        .map(step => [step.location.line, step.keyword])
        .fromPairs()
        .value()
      result.gherkinKeyword = stepLineToKeywordMapping[line]
    }
    return result
  }

  storeGherkinDocument({ document, uri }) {
    this.gherkinDocumentMap[uri] = document
  }

  storePickle({ pickle, uri }) {
    this.pickleMap[`${uri}:${pickle.locations[0].line}`] = pickle
  }

  storeTestCase({ sourceLocation, steps }) {
    const key = this.getTestCaseKey(sourceLocation)
    this.testCaseMap[key] = { sourceLocation, steps }
  }

  storeTestStepResult({ index, testCase, result }) {
    const key = this.getTestCaseKey(testCase.sourceLocation)
    this.testCaseMap[key].steps[index].result = result
  }

  storeTestCaseResult({ sourceLocation, result }) {
    const key = this.getTestCaseKey(sourceLocation)
    this.testCaseMap[key].result = result
  }
}
