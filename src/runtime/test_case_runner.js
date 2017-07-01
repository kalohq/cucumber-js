import _ from 'lodash'
import AttachmentManager from './attachment_manager'
import Hook from '../models/hook'
import Promise from 'bluebird'
import Status from '../status'
import StepRunner from './step_runner'

export default class TestCaseRunner {
  constructor({ eventBroadcaster, options, testCase, supportCodeLibrary }) {
    this.attachmentManager = new AttachmentManager()
    this.eventBroadcaster = eventBroadcaster
    this.options = options
    this.testCase = testCase
    this.supportCodeLibrary = supportCodeLibrary
    this.world = new supportCodeLibrary.World({
      attach: ::this.attachmentManager.create,
      parameters: options.worldParameters
    })
    this.beforeHookDefinitions = this.getBeforeHookDefinitions()
    this.afterHookDefinitions = this.getAfterHookDefinitions()
    this.testStepIndex = 0
    this.result = { status: Status.PASSED }
  }

  emit(name, data) {
    this.eventBroadcaster.emit(name, {
      ...data,
      testCase: {
        uri: this.testCase.uri,
        line: this.testCase.pickle.locations[0].line
      }
    })
  }

  emitPrepared() {
    const steps = []
    this.beforeHookDefinitions.forEach(definition => {
      const actionLocation = { uri: definition.uri, line: definition.line }
      steps.push({ actionLocation })
    })
    this.testCase.pickle.steps.forEach(step => {
      const actionLocations = this.getStepDefinitions(step).map(definition => {
        return { uri: definition.uri, line: definition.line }
      })
      const sourceLocation = {
        uri: this.testCase.uri,
        line: step.locations[0].line
      }
      const data = { sourceLocation }
      if (actionLocations.length === 1) {
        data.actionLocation = actionLocations[0]
      }
      steps.push(data)
    })
    this.afterHookDefinitions.forEach(definition => {
      const actionLocation = { uri: definition.uri, line: definition.line }
      steps.push({ actionLocation })
    })
    this.emit('test-case-prepared', { steps })
  }

  getAfterHookDefinitions() {
    return this.supportCodeLibrary.afterHookDefinitions.filter(
      hookDefinition => {
        return hookDefinition.appliesToScenario(this.testCase)
      }
    )
  }

  getBeforeHookDefinitions() {
    return this.supportCodeLibrary.beforeHookDefinitions.filter(
      hookDefinition => {
        return hookDefinition.appliesToScenario(this.testCase)
      }
    )
  }

  getStepDefinitions(step) {
    return this.supportCodeLibrary.stepDefinitions.filter(stepDefinition => {
      return stepDefinition.matchesStepName({
        stepName: step.name,
        parameterTypeRegistry: this.supportCodeLibrary.parameterTypeRegistry
      })
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
    return this.result.status !== Status.PASSED
  }

  shouldUpdateStatus(testStepResult) {
    switch (testStepResult.status) {
      case Status.FAILED:
        return true
      case Status.AMBIGUOUS:
      case Status.PENDING:
      case Status.SKIPPED:
      case Status.UNDEFINED:
        return this.result.status === Status.PASSED
      default:
        return false
    }
  }

  async aroundTestStep(runStepFn) {
    this.emit('test-step-started', { index: this.testStepIndex })
    const testStepResult = await runStepFn()
    if (this.shouldUpdateStatus(testStepResult)) {
      this.result = _.pick(testStepResult, 'status')
    }
    this.emit('test-step-finished', {
      index: this.testStepIndex,
      result: testStepResult
    })
    this.testStepIndex += 1
  }

  async run() {
    this.emitPrepared()
    this.emit('test-case-started', {})
    await this.runHooks({
      hookDefinitions: this.beforeHookDefinitions,
      hookKeyword: Hook.AFTER_STEP_KEYWORD
    })
    await this.runSteps()
    await this.runHooks({
      hookDefinitions: this.afterHookDefinitions,
      hookKeyword: Hook.AFTER_STEP_KEYWORD
    })
    this.emit('test-case-finished', { result: this.result })
  }

  async runHook(hook, hookDefinition) {
    if (this.options.dryRun) {
      return { status: Status.SKIPPED }
    } else {
      return await this.invokeStep(hook, hookDefinition)
    }
  }

  async runHooks({ hookDefinitions, hookKeyword }) {
    await Promise.each(hookDefinitions, async hookDefinition => {
      await this.aroundTestStep(() => {
        const hook = new Hook({ keyword: hookKeyword, scenario: this.scenario })
        return this.runHook(hook, hookDefinition)
      })
    })
  }

  async runStep(step) {
    const stepDefinitions = this.getStepDefinitions(step)
    if (stepDefinitions.length === 0) {
      return { status: Status.UNDEFINED }
    } else if (stepDefinitions.length > 1) {
      return {
        matches: stepDefinitions.map(d =>
          _.pick(d, ['pattern', 'line', 'uri'])
        ),
        status: Status.AMBIGUOUS
      }
    } else if (this.options.dryRun || this.isSkippingSteps()) {
      return { status: Status.SKIPPED }
    } else {
      return await this.invokeStep(step, stepDefinitions[0])
    }
  }

  async runSteps() {
    await Promise.each(this.testCase.pickle.steps, async step => {
      await this.aroundTestStep(() => {
        return this.runStep(step)
      })
    })
  }
}
