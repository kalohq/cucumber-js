import HookDefinition from '../models/hook_definition'
import Promise from 'bluebird'
import TestCaseRunner from './test_case_runner'
import Status from '../status'
import StepRunner from './step_runner'
import { EventEmitter } from 'events'

describe('TestCaseRunner', function() {
  beforeEach(function() {
    this.onTestCasePrepared = sinon.stub()
    this.onTestCaseStarted = sinon.stub()
    this.onTestStepStarted = sinon.stub()
    this.onTestStepFinished = sinon.stub()
    this.onTestCaseFinished = sinon.stub()
    this.eventBroadcaster = new EventEmitter()
    this.eventBroadcaster.on('test-case-prepared', this.onTestCasePrepared)
    this.eventBroadcaster.on('test-case-started', this.onTestCaseStarted)
    this.eventBroadcaster.on('test-step-started', this.onTestStepStarted)
    this.eventBroadcaster.on('test-step-finished', this.onTestStepFinished)
    this.eventBroadcaster.on('test-case-finished', this.onTestCaseFinished)
    this.testCase = {
      pickle: {
        steps: [],
        locations: [{ line: 1 }]
      },
      uri: 'path/to/feature'
    }
    this.supportCodeLibrary = {
      afterHookDefinitions: [],
      beforeHookDefinitions: [],
      defaultTimeout: 5000,
      stepDefinitions: [],
      parameterTypeRegistry: {},
      World() {}
    }
    this.options = {}
    sinon.stub(StepRunner, 'run')
    this.scenarioRunner = new TestCaseRunner({
      eventBroadcaster: this.eventBroadcaster,
      options: this.options,
      testCase: this.testCase,
      supportCodeLibrary: this.supportCodeLibrary
    })
  })

  afterEach(function() {
    StepRunner.run.restore()
  })

  describe('run()', function() {
    describe('with no steps or hooks', function() {
      beforeEach(async function() {
        await this.scenarioRunner.run()
      })

      it('emits test-case-prepared', function() {
        expect(this.onTestCasePrepared).to.have.been.calledOnce
        expect(this.onTestCasePrepared).to.have.been.calledWith({
          steps: [],
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-case-started', function() {
        expect(this.onTestCaseStarted).to.have.been.calledOnce
        expect(this.onTestCaseStarted).to.have.been.calledWith({
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-case-finished', function() {
        expect(this.onTestCaseFinished).to.have.been.calledOnce
        expect(this.onTestCaseFinished).to.have.been.calledWith({
          result: { status: Status.PASSED },
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })
    })

    describe('with a passing step', function() {
      beforeEach(async function() {
        this.step = { uri: 'path/to/feature', locations: [{ line: 2 }] }
        this.stepResult = {
          duration: 1,
          status: Status.PASSED
        }
        const stepDefinition = {
          uri: 'path/to/steps',
          line: 3,
          matchesStepName: sinon.stub().returns(true)
        }
        StepRunner.run.resolves(this.stepResult)
        this.supportCodeLibrary.stepDefinitions = [stepDefinition]
        this.testCase.pickle.steps = [this.step]
        await this.scenarioRunner.run()
      })

      it('emits test-case-prepared', function() {
        expect(this.onTestCasePrepared).to.have.been.calledOnce
        expect(this.onTestCasePrepared).to.have.been.calledWith({
          steps: [
            {
              actionLocation: { line: 3, uri: 'path/to/steps' },
              sourceLocation: { line: 2, uri: 'path/to/feature' }
            }
          ],
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-case-started', function() {
        expect(this.onTestCaseStarted).to.have.been.calledOnce
        expect(this.onTestCaseStarted).to.have.been.calledWith({
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-step-started', function() {
        expect(this.onTestStepStarted).to.have.been.calledOnce
        expect(this.onTestStepStarted).to.have.been.calledWith({
          index: 0,
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-step-started', function() {
        expect(this.onTestStepFinished).to.have.been.calledOnce
        expect(this.onTestStepFinished).to.have.been.calledWith({
          index: 0,
          testCase: { line: 1, uri: 'path/to/feature' },
          result: { duration: 1, status: Status.PASSED }
        })
      })

      it('emits test-case-finished', function() {
        expect(this.onTestCaseFinished).to.have.been.calledOnce
        expect(this.onTestCaseFinished).to.have.been.calledWith({
          result: { status: Status.PASSED },
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })
    })

    describe('with a failing step', function() {
      beforeEach(async function() {
        this.step = { uri: 'path/to/feature', locations: [{ line: 2 }] }
        this.error = new Error('a')
        this.stepResult = {
          duration: 1,
          status: Status.FAILED,
          exception: this.error
        }
        const stepDefinition = {
          uri: 'path/to/steps',
          line: 3,
          matchesStepName: sinon.stub().returns(true)
        }
        StepRunner.run.resolves(this.stepResult)
        this.supportCodeLibrary.stepDefinitions = [stepDefinition]
        this.testCase.pickle.steps = [this.step]
        await this.scenarioRunner.run()
      })

      it('emits test-case-prepared', function() {
        expect(this.onTestCasePrepared).to.have.been.calledOnce
        expect(this.onTestCasePrepared).to.have.been.calledWith({
          steps: [
            {
              actionLocation: { line: 3, uri: 'path/to/steps' },
              sourceLocation: { line: 2, uri: 'path/to/feature' }
            }
          ],
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-case-started', function() {
        expect(this.onTestCaseStarted).to.have.been.calledOnce
        expect(this.onTestCaseStarted).to.have.been.calledWith({
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-step-started', function() {
        expect(this.onTestStepStarted).to.have.been.calledOnce
        expect(this.onTestStepStarted).to.have.been.calledWith({
          index: 0,
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })

      it('emits test-step-started', function() {
        expect(this.onTestStepFinished).to.have.been.calledOnce
        expect(this.onTestStepFinished).to.have.been.calledWith({
          index: 0,
          testCase: { line: 1, uri: 'path/to/feature' },
          result: {
            duration: 1,
            status: Status.FAILED,
            exception: this.error
          }
        })
      })

      it('emits test-case-finished', function() {
        expect(this.onTestCaseFinished).to.have.been.calledOnce
        expect(this.onTestCaseFinished).to.have.been.calledWith({
          result: {
            status: Status.FAILED,
            exception: this.error
          },
          testCase: { line: 1, uri: 'path/to/feature' }
        })
      })
    })
    //
    // describe('with an ambiguous step', function() {
    //   beforeEach(async function() {
    //     this.step = {}
    //     const stepDefinition = createMock({ matchesStepName: true })
    //     this.supportCodeLibrary.stepDefinitions = [
    //       stepDefinition,
    //       stepDefinition
    //     ]
    //     this.scenario.steps = [this.step]
    //     this.scenarioResult = await this.scenarioRunner.run()
    //   })
    //
    //   it('broadcasts the expected events', function() {
    //     expectToHearEvents(this.listener, [
    //       ['BeforeScenario', this.scenario],
    //       ['BeforeStep', this.step],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.AMBIGUOUS)
    //         }
    //       ],
    //       ['AfterStep', this.step],
    //       ['ScenarioResult', this.scenarioResult],
    //       ['AfterScenario', this.scenario]
    //     ])
    //   })
    //
    //   it('returns a failed result', function() {
    //     expect(this.scenarioResult.status).to.eql(Status.AMBIGUOUS)
    //   })
    // })
    //
    // describe('with an undefined step', function() {
    //   beforeEach(async function() {
    //     this.step = {}
    //     this.scenario.steps = [this.step]
    //     this.scenarioResult = await this.scenarioRunner.run()
    //   })
    //
    //   it('broadcasts the expected events', function() {
    //     expectToHearEvents(this.listener, [
    //       ['BeforeScenario', this.scenario],
    //       ['BeforeStep', this.step],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.UNDEFINED)
    //         }
    //       ],
    //       ['AfterStep', this.step],
    //       ['ScenarioResult', this.scenarioResult],
    //       ['AfterScenario', this.scenario]
    //     ])
    //   })
    //
    //   it('returns a failed result', function() {
    //     expect(this.scenarioResult.status).to.eql(Status.UNDEFINED)
    //   })
    // })
    //
    // describe('with a step in dry run mode', function() {
    //   beforeEach(async function() {
    //     this.options.dryRun = true
    //     this.step = {}
    //     const stepDefinition = createMock({ matchesStepName: true })
    //     this.supportCodeLibrary.stepDefinitions = [stepDefinition]
    //     this.scenario.steps = [this.step]
    //     this.scenarioResult = await this.scenarioRunner.run()
    //   })
    //
    //   it('broadcasts the expected events', function() {
    //     expectToHearEvents(this.listener, [
    //       ['BeforeScenario', this.scenario],
    //       ['BeforeStep', this.step],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.SKIPPED)
    //         }
    //       ],
    //       ['AfterStep', this.step],
    //       ['ScenarioResult', this.scenarioResult],
    //       ['AfterScenario', this.scenario]
    //     ])
    //   })
    //
    //   it('returns a skipped result', function() {
    //     expect(this.scenarioResult.status).to.eql(Status.SKIPPED)
    //   })
    // })
    //
    // describe('with an before hook and step in dry run mode', function() {
    //   beforeEach(async function() {
    //     this.options.dryRun = true
    //     const hookDefinition = new HookDefinition({
    //       code() {
    //         throw new Error('error')
    //       },
    //       options: {}
    //     })
    //     this.step = {}
    //     const stepDefinition = createMock({ matchesStepName: true })
    //     this.supportCodeLibrary.beforeHookDefinitions = [hookDefinition]
    //     this.supportCodeLibrary.stepDefinitions = [stepDefinition]
    //     this.scenario.steps = [this.step]
    //     this.scenarioResult = await this.scenarioRunner.run()
    //   })
    //
    //   it('broadcasts the expected events', function() {
    //     expectToHearEvents(this.listener, [
    //       ['BeforeScenario', this.scenario],
    //       [
    //         'BeforeStep',
    //         function(step) {
    //           expect(step.keyword).to.eql('Before')
    //         }
    //       ],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.SKIPPED)
    //         }
    //       ],
    //       [
    //         'AfterStep',
    //         function(step) {
    //           expect(step.keyword).to.eql('Before')
    //         }
    //       ],
    //       ['BeforeStep', this.step],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.SKIPPED)
    //         }
    //       ],
    //       ['AfterStep', this.step],
    //       ['ScenarioResult', this.scenarioResult],
    //       ['AfterScenario', this.scenario]
    //     ])
    //   })
    //
    //   it('returns a skipped result', function() {
    //     expect(this.scenarioResult.status).to.eql(Status.SKIPPED)
    //   })
    // })
    //
    // describe('with an after hook and step in dry run mode', function() {
    //   beforeEach(async function() {
    //     this.options.dryRun = true
    //     const hookDefinition = new HookDefinition({
    //       code() {
    //         throw new Error('error')
    //       },
    //       options: {}
    //     })
    //     this.step = {}
    //     const stepDefinition = createMock({ matchesStepName: true })
    //     this.supportCodeLibrary.afterHookDefinitions = [hookDefinition]
    //     this.supportCodeLibrary.stepDefinitions = [stepDefinition]
    //     this.scenario.steps = [this.step]
    //     this.scenarioResult = await this.scenarioRunner.run()
    //   })
    //
    //   it('broadcasts the expected events', function() {
    //     expectToHearEvents(this.listener, [
    //       ['BeforeScenario', this.scenario],
    //       ['BeforeStep', this.step],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.SKIPPED)
    //         }
    //       ],
    //       ['AfterStep', this.step],
    //       [
    //         'BeforeStep',
    //         function(step) {
    //           expect(step.keyword).to.eql('After')
    //         }
    //       ],
    //       [
    //         'StepResult',
    //         function(stepResult) {
    //           expect(stepResult.status).to.eql(Status.SKIPPED)
    //         }
    //       ],
    //       [
    //         'AfterStep',
    //         function(step) {
    //           expect(step.keyword).to.eql('After')
    //         }
    //       ],
    //       ['ScenarioResult', this.scenarioResult],
    //       ['AfterScenario', this.scenario]
    //     ])
    //   })
    //
    //   it('returns a skipped result', function() {
    //     expect(this.scenarioResult.status).to.eql(Status.SKIPPED)
    //   })
    //})
  })
})
