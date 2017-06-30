import AttachmentManager from './attachment_manager'
import Hook from '../models/hook'
import Promise from 'bluebird'
import ScenarioResult from '../models/scenario_result'
import Status from '../status'
import StepResult from '../models/step_result'
import StepRunner from './step_runner'

export default class ScenarioRunner {
  constructor({ eventManager, options, scenario, supportCodeLibrary }) {
    this.attachmentManager = new AttachmentManager()
    this.eventManager = eventManager
    this.options = options
    this.scenario = scenario
    this.supportCodeLibrary = supportCodeLibrary
    this.scenarioResult = new ScenarioResult(scenario)
    this.world = new supportCodeLibrary.World({
      attach: ::this.attachmentManager.create,
      parameters: options.worldParameters
    })
  }

  invokeStep(step, stepDefinition) {
    return StepRunner.run({
      attachmentManager: this.attachmentManager,
      defaultTimeout: this.supportCodeLibrary.defaultTimeout,
      scenarioResult: this.scenarioResult,
      step,
      stepDefinition,
      parameterTypeRegistry: this.supportCodeLibrary.parameterTypeRegistry,
      world: this.world
    })
  }

  isSkippingSteps() {
    return this.scenarioResult.status !== Status.PASSED
  }

  async run() {
    const beforeHookDefinitions = this.supportCodeLibrary.beforeHookDefinitions.filter(
      hookDefinition => {
        return hookDefinition.appliesToScenario(this.scenario)
      }
    )
    const afterHookDefinitions = this.supportCodeLibrary.afterHookDefinitions.filter(
      hookDefinition => {
        return hookDefinition.appliesToScenario(this.scenario)
      }
    )
    this.eventManager.emit('test-case-prepared', {
      steps: beforeHookDefinitions.concat(
        this.scenario.steps,
        afterHookDefinitions
      )
    })
    this.eventManager.emit('test-case-started')
    await this.runHooks({
      hookDefinitions: beforeHookDefinitions,
      hookKeyword: Hook.AFTER_STEP_KEYWORD
    })
    await this.runSteps()
    await this.runHooks({
      hookDefinitions: afterHookDefinitions,
      hookKeyword: Hook.AFTER_STEP_KEYWORD
    })
    this.eventManager.emit('test-case-finished')
    return this.scenarioResult
  }

  async runHook(hook, hookDefinition) {
    if (this.options.dryRun) {
      return new StepResult({
        step: hook,
        stepDefinition: hookDefinition,
        status: Status.SKIPPED
      })
    } else {
      return await this.invokeStep(hook, hookDefinition)
    }
  }

  async runHooks({ hookDefinitions, hookKeyword }) {
    await Promise.each(hookDefinitions, async hookDefinition => {
      const hook = new Hook({ keyword: hookKeyword, scenario: this.scenario })
      this.eventManager.emit('test-step-started')
      const stepResult = await this.runHook(hook, hookDefinition)
      this.eventManager.emit('test-step-finished')
      this.scenarioResult.witnessStepResult(stepResult)
    })
  }

  async runStep(step) {
    const stepDefinitions = this.supportCodeLibrary.stepDefinitions.filter(
      stepDefinition => {
        return stepDefinition.matchesStepName({
          stepName: step.name,
          parameterTypeRegistry: this.supportCodeLibrary.parameterTypeRegistry
        })
      }
    )
    if (stepDefinitions.length === 0) {
      return new StepResult({
        step,
        status: Status.UNDEFINED
      })
    } else if (stepDefinitions.length > 1) {
      return new StepResult({
        ambiguousStepDefinitions: stepDefinitions,
        step,
        status: Status.AMBIGUOUS
      })
    } else if (this.options.dryRun || this.isSkippingSteps()) {
      return new StepResult({
        step,
        stepDefinition: stepDefinitions[0],
        status: Status.SKIPPED
      })
    } else {
      return await this.invokeStep(step, stepDefinitions[0])
    }
  }

  async runSteps() {
    await Promise.each(this.scenario.steps, async step => {
      this.eventManager.emit('test-step-started')
      const stepResult = await this.runStep(step)
      this.eventManager.emit('test-step-started', { result: stepResult })
      this.scenarioResult.witnessStepResult(stepResult)
    })
  }
}
