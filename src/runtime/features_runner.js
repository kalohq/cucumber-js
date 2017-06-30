import FeaturesResult from '../models/features_result'
import Promise from 'bluebird'
import ScenarioResult from '../models/scenario_result'
import ScenarioRunner from './scenario_runner'
import Status from '../status'

export default class FeaturesRunner {
  constructor({ eventManager, features, options, supportCodeLibrary }) {
    this.eventManager = eventManager
    this.features = features
    this.options = options
    this.supportCodeLibrary = supportCodeLibrary
    this.featuresResult = new FeaturesResult(options.strict)
  }

  async run() {
    this.eventManager.emit('test-run-started')
    await Promise.each(this.features, ::this.runFeature)
    this.eventManager.emit('test-run-finished')
    return this.featuresResult.success
  }

  async runFeature(feature) {
    await Promise.each(feature.scenarios, async scenario => {
      const scenarioResult = await this.runScenario(scenario)
      this.featuresResult.witnessScenarioResult(scenarioResult)
    })
  }

  async runScenario(scenario) {
    if (!this.featuresResult.success && this.options.failFast) {
      return new ScenarioResult(scenario, Status.SKIPPED)
    }
    const scenarioRunner = new ScenarioRunner({
      eventBroadcaster: this.eventBroadcaster,
      options: this.options,
      scenario,
      supportCodeLibrary: this.supportCodeLibrary
    })
    return await scenarioRunner.run()
  }
}
