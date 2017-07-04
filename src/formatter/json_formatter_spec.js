import _ from 'lodash'
import JsonFormatter from './json_formatter'
import Status from '../status'
import EventEmitter from 'events'
import Gherkin from 'gherkin'

describe('JsonFormatter', function() {
  beforeEach(function() {
    this.eventBroadcaster = new EventEmitter()
    this.output = ''
    const logFn = data => {
      this.output += data
    }
    this.jsonFormatter = new JsonFormatter({
      eventBroadcaster: this.eventBroadcaster,
      log: logFn
    })
  })

  describe('no features', function() {
    beforeEach(function() {
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs an empty array', function() {
      expect(JSON.parse(this.output)).to.eql([])
    })
  })

  describe('one scenario with one step', function() {
    beforeEach(function() {
      const events = Gherkin.generateEvents(
        '@tag1 @tag2\n' +
          'Feature: my feature\n' +
          'my feature description\n' +
          'Scenario: my scenario\n' +
          'my scenario description\n' +
          'Given my step',
        'a.feature'
      )
      events.forEach(event => {
        this.eventBroadcaster.emit(event.type, event)
        if (event.type === 'pickle') {
          this.eventBroadcaster.emit('pickle-accepted', {
            type: 'pickle-accepted',
            pickle: event.pickle,
            uri: event.uri
          })
        }
      })
      this.testCase = { sourceLocation: { uri: 'a.feature', line: 4 } }
    })

    describe('passed', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
              actionLocation: { uri: 'steps.js', line: 10 }
            }
          ]
        })
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: { duration: 1, status: Status.PASSED }
        })
        this.eventBroadcaster.emit('test-case-finished', {
          sourceLocation: this.testCase.sourceLocation,
          result: { duration: 1, status: Status.PASSED }
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs the feature', function() {
        expect(JSON.parse(this.output)).to.eql([
          {
            description: 'my feature description',
            elements: [
              {
                description: 'my scenario description',
                id: 'my-feature;my-scenario',
                keyword: 'Scenario',
                line: 4,
                name: 'my scenario',
                steps: [
                  {
                    arguments: [],
                    line: 6,
                    keyword: 'Given ',
                    name: 'my step',
                    result: {
                      status: 'passed',
                      duration: 1
                    }
                  }
                ],
                tags: [{ name: '@tag1', line: 1 }, { name: '@tag2', line: 1 }]
              }
            ],
            id: 'my-feature',
            keyword: 'Feature',
            line: 2,
            name: 'my feature',
            tags: [{ name: '@tag1', line: 1 }, { name: '@tag2', line: 1 }],
            uri: 'a.feature'
          }
        ])
      })
    })

    describe('failed', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
              actionLocation: { uri: 'steps.js', line: 10 }
            }
          ]
        })
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: { duration: 1, exception: 'my error', status: Status.FAILED }
        })
        this.eventBroadcaster.emit('test-case-finished', {
          sourceLocation: this.testCase.sourceLocation,
          result: { duration: 1, status: Status.FAILED }
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('includes the error message', function() {
        const features = JSON.parse(this.output)
        expect(features[0].elements[0].steps[0].result).to.eql({
          status: 'failed',
          error_message: 'my error',
          duration: 1
        })
      })
    })

    describe('with a hook', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              actionLocation: { uri: 'steps.js', line: 10 }
            },
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
              actionLocation: { uri: 'steps.js', line: 11 }
            }
          ]
        })
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: { duration: 1, status: Status.PASSED }
        })
        this.eventBroadcaster.emit('test-case-finished', {
          sourceLocation: this.testCase.sourceLocation,
          result: { duration: 1, status: Status.PASSED }
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('does not output a line attribute and outputs a hidden attribute', function() {
        const features = JSON.parse(this.output)
        const step = features[0].elements[0].steps[0]
        expect(step).to.not.have.ownProperty('line')
        expect(step.hidden).to.be.true
      })
    })

    // describe('with a doc string', function() {
    //   beforeEach(function() {
    //     const docString = Object.create(DocString.prototype)
    //     _.assign(docString, {
    //       content: 'This is a DocString',
    //       contentType: null,
    //       line: 2
    //     })
    //     this.step.arguments = [docString]
    //     this.jsonFormatter.handleStepResult(this.stepResult)
    //     this.jsonFormatter.handleAfterFeatures({})
    //   })
    //
    //   it('outputs the doc string as a step argument', function() {
    //     const features = JSON.parse(this.output)
    //     expect(features[0].elements[0].steps[0].arguments).to.eql([
    //       {
    //         line: 2,
    //         content: 'This is a DocString',
    //         contentType: null
    //       }
    //     ])
    //   })
    // })

    //       describe('with a data table', function() {
    //         beforeEach(function() {
    //           const dataTable = Object.create(DataTable.prototype)
    //           _.assign(
    //             dataTable,
    //             createMock({
    //               raw: [
    //                 ['a:1', 'a:2', 'a:3'],
    //                 ['b:1', 'b:2', 'b:3'],
    //                 ['c:1', 'c:2', 'c:3']
    //               ]
    //             })
    //           )
    //           this.step.arguments = [dataTable]
    //           this.jsonFormatter.handleStepResult(this.stepResult)
    //           this.jsonFormatter.handleAfterFeatures()
    //         })
    //
    //         it('outputs the data table as a step argument', function() {
    //           const features = JSON.parse(this.output)
    //           expect(features[0].elements[0].steps[0].arguments).to.eql([
    //             {
    //               rows: [
    //                 { cells: ['a:1', 'a:2', 'a:3'] },
    //                 { cells: ['b:1', 'b:2', 'b:3'] },
    //                 { cells: ['c:1', 'c:2', 'c:3'] }
    //               ]
    //             }
    //           ])
    //         })
    //       })
    //
    //       describe('with an unknown argument type', function() {
    //         beforeEach(function() {
    //           this.step.arguments = [{ some: 'data' }]
    //         })
    //
    //         it('throws an arror', function() {
    //           expect(() => {
    //             this.jsonFormatter.handleStepResult(this.stepResult)
    //           }).to.throw("Unknown argument type: { some: 'data' }")
    //         })
    //       })
    //
    //       describe('with attachments', function() {
    //         beforeEach(function() {
    //           const attachment1 = {
    //             mimeType: 'first mime type',
    //             data: 'first data'
    //           }
    //           const attachment2 = {
    //             mimeType: 'second mime type',
    //             data: 'second data'
    //           }
    //           this.stepResult.attachments = [attachment1, attachment2]
    //           this.jsonFormatter.handleStepResult(this.stepResult)
    //           this.jsonFormatter.handleAfterFeatures({})
    //         })
    //
    //         it('outputs the step with embeddings', function() {
    //           const features = JSON.parse(this.output)
    //           expect(features[0].elements[0].steps[0].embeddings).to.eql([
    //             { data: 'first data', mime_type: 'first mime type' },
    //             { data: 'second data', mime_type: 'second mime type' }
    //           ])
    //         })
    //       })
    //
    //       describe('with a step definition', function() {
    //         beforeEach(function() {
    //           const stepDefinition = {
    //             line: 2,
    //             uri: 'path/to/stepDef'
    //           }
    //           this.stepResult.stepDefinition = stepDefinition
    //           this.jsonFormatter.handleStepResult(this.stepResult)
    //           this.jsonFormatter.handleAfterFeatures({})
    //         })
    //
    //         it('outputs the step with a match attribute', function() {
    //           const features = JSON.parse(this.output)
    //           expect(features[0].elements[0].steps[0].match).to.eql({
    //             location: 'path/to/stepDef:2'
    //           })
    //         })
    //       })
    //     })
    //   })
  })
})
