import ScenarioFilter from '../scenario_filter'
import StepDefinition from './step_definition'

export default class TestCaseHookDefinition extends StepDefinition {
  constructor(data) {
    super(data)
    this.scenarioFilter = new ScenarioFilter({
      tagExpression: this.options.tags
    })
  }

  appliesToTestCase({ pickle, uri }) {
    return this.scenarioFilter.matches({ pickle, uri })
  }

  getInvalidCodeLengthMessage() {
    return this.buildInvalidCodeLengthMessage('0 or 1', '2')
  }

  getInvocationParameters({ scenarioResult }) {
    return [scenarioResult]
  }

  getValidCodeLengths() {
    return [0, 1, 2]
  }
}
