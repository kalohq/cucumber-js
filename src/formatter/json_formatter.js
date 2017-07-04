import _ from 'lodash'
import Formatter from './'
import Status from '../status'
import util from 'util'
import { TestCaseCollector } from './helpers'

export default class JsonFormatter extends Formatter {
  constructor(options) {
    super(options)
    this.testCaseCollector = new TestCaseCollector({
      eventBroadcaster: options.eventBroadcaster
    })
    options.eventBroadcaster.on('test-run-finished', ::this.onTestRunFinished)
  }

  convertNameToId(obj) {
    return obj.name.replace(/ /g, '-').toLowerCase()
  }

  formatAttachments(attachments) {
    return attachments.map(function(attachment) {
      return {
        data: attachment.data,
        mime_type: attachment.mimeType
      }
    })
  }

  formatDataTable(dataTable) {
    return {
      rows: dataTable.raw().map(function(row) {
        return { cells: row }
      })
    }
  }

  formatDocString(docString) {
    return _.pick(docString, ['content', 'contentType', 'line'])
  }

  formatStepArguments(stepArguments) {
    return _.map(stepArguments, arg => {
      if (arg instanceof DataTable) {
        return this.formatDataTable(arg)
      } else if (arg instanceof DocString) {
        return this.formatDocString(arg)
      } else {
        throw new Error(`Unknown argument type: ${util.inspect(arg)}`)
      }
    })
  }

  onTestRunFinished() {
    const groupedTestCases = {}
    _.each(this.testCaseCollector.testCaseMap, testCase => {
      const { sourceLocation: { uri } } = testCase
      if (!groupedTestCases[uri]) {
        groupedTestCases[uri] = []
      }
      groupedTestCases[uri].push(testCase)
    })
    const features = _.map(groupedTestCases, (group, uri) => {
      const { feature } = this.testCaseCollector.gherkinDocumentMap[uri]
      const featureData = this.getFeatureData(feature, uri)
      const stepLineToKeywordMapping = _.chain(feature.children)
        .map('steps')
        .flatten()
        .map(step => [step.location.line, step.keyword])
        .fromPairs()
        .value()
      const scenarioLineToDescriptionMapping = _.chain(feature.children)
        .map(element => [element.location.line, element.description])
        .fromPairs()
        .value()
      featureData.elements = group.map(testCase => {
        const { pickle } = this.testCaseCollector.getTestCaseData(
          testCase.sourceLocation
        )
        const scenarioData = this.getScenarioData({
          featureId: featureData.id,
          pickle,
          scenarioLineToDescriptionMapping
        })
        const stepLineToPickledStepMapping = _.chain(pickle.steps)
          .map(step => [step.locations[0].line, step])
          .fromPairs()
          .value()
        scenarioData.steps = testCase.steps.map(testStep => {
          return this.getStepData({
            stepLineToKeywordMapping,
            stepLineToPickledStepMapping,
            testStep
          })
        })
        return scenarioData
      })
      return featureData
    })
    this.log(JSON.stringify(features, null, 2))
  }

  getFeatureData(feature, uri) {
    return {
      description: feature.description,
      keyword: feature.keyword,
      name: feature.name,
      line: feature.location.line,
      id: this.convertNameToId(feature),
      tags: this.getTags(feature),
      uri
    }
  }

  getScenarioData({ featureId, pickle, scenarioLineToDescriptionMapping }) {
    const description = _.chain(pickle.locations)
      .map(({ line }) => scenarioLineToDescriptionMapping[line])
      .compact()
      .first()
      .value()
    return {
      description,
      id: featureId + ';' + this.convertNameToId(pickle),
      keyword: 'Scenario',
      line: pickle.locations[0].line,
      name: pickle.name,
      tags: this.getTags(pickle)
    }
  }

  getStepData({
    stepLineToKeywordMapping,
    stepLineToPickledStepMapping,
    testStep
  }) {
    const data = {}
    if (testStep.sourceLocation) {
      const { line } = testStep.sourceLocation
      const pickledStep = stepLineToPickledStepMapping[line]
      data.arguments = pickledStep.arguments
      data.keyword = _.chain(pickledStep.locations)
        .map(location => stepLineToKeywordMapping[location.line])
        .compact()
        .first()
        .value()
      data.line = line
      data.name = pickledStep.text
    } else {
      data.hidden = true
    }
    if (testStep.result) {
      const { result: { exception, status } } = testStep
      data.result = { status }
      if (testStep.result.duration) {
        data.result.duration = testStep.result.duration
      }
      if (status === Status.FAILED && exception) {
        data.result.error_message = exception.stack || exception
      }
    }
    return data
  }

  getTags(obj) {
    return _.map(obj.tags, tagData => {
      return { name: tagData.name, line: tagData.location.line }
    })
  }

  handleStepResult(stepResult) {
    const step = stepResult.step
    const status = stepResult.status

    const currentStep = {
      arguments: this.formatStepArguments(step.arguments),
      keyword: step.keyword,
      name: step.name,
      result: { status }
    }

    if (step.isBackground) {
      currentStep.isBackground = true
    }

    if (step.constructor.name === 'Hook') {
      currentStep.hidden = true
    } else {
      currentStep.line = step.line
    }

    if (status === Status.PASSED || status === Status.FAILED) {
      currentStep.result.duration = stepResult.duration
    }

    if (_.size(stepResult.attachments) > 0) {
      currentStep.embeddings = this.formatAttachments(stepResult.attachments)
    }

    if (status === Status.FAILED && stepResult.failureException) {
      currentStep.result.error_message =
        stepResult.failureException.stack || stepResult.failureException
    }

    if (stepResult.stepDefinition) {
      const location =
        stepResult.stepDefinition.uri + ':' + stepResult.stepDefinition.line
      currentStep.match = { location }
    }

    this.currentScenario.steps.push(currentStep)
  }
}
