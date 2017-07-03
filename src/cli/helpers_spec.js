import { promisify } from 'bluebird'
import fs from 'fs-extra'
import { getTestCases } from './helpers'
import tmp from 'tmp'
import EventEmitter from 'events'
import path from 'path'

describe('helpers', function() {
  describe('getTestCases', function() {
    beforeEach(async function() {
      this.onSource = sinon.stub()
      this.onGherkinDocument = sinon.stub()
      this.onPickle = sinon.stub()
      this.onPickleAccepted = sinon.stub()
      this.onPickleRejected = sinon.stub()
      this.eventBroadcaster = new EventEmitter()
      this.eventBroadcaster.on('source', this.onSource)
      this.eventBroadcaster.on('gherkin-document', this.onGherkinDocument)
      this.eventBroadcaster.on('pickle', this.onPickle)
      this.eventBroadcaster.on('pickle-accepted', this.onPickleAccepted)
      this.eventBroadcaster.on('pickle-rejected', this.onPickleRejected)
    })

    describe('empty feature', function() {
      beforeEach(async function() {
        this.tmpDir = await promisify(tmp.dir)()
        this.relativeFeaturePath = path.join('features', 'a.feature')
        const featurePath = path.join(this.tmpDir, 'features', 'a.feature')
        await fs.outputFile(featurePath, '')
        this.result = await getTestCases({
          cwd: this.tmpDir,
          eventBroadcaster: this.eventBroadcaster,
          featurePaths: [featurePath]
        })
      })

      it('returns an empty array', function() {
        expect(this.result).to.eql([])
      })

      it('emits a source event', function() {
        expect(this.onSource).to.have.been.calledOnce
        expect(this.onSource).to.have.been.calledWith({
          data: '',
          media: { encoding: 'utf-8', type: 'text/vnd.cucumber.gherkin+plain' },
          type: 'source',
          uri: this.relativeFeaturePath
        })
      })

      it('emits a gherkin-document event', function() {
        expect(this.onGherkinDocument).to.have.been.calledOnce
        expect(this.onGherkinDocument).to.have.been.calledWith({
          document: {
            comments: [],
            feature: undefined,
            type: 'GherkinDocument'
          },
          type: 'gherkin-document',
          uri: this.relativeFeaturePath
        })
      })

      it('does not emit pickle events', function() {
        expect(this.onPickle).not.to.have.been.called
        expect(this.onPickleAccepted).not.to.have.been.called
        expect(this.onPickleRejected).not.to.have.been.called
      })
    })

    describe('feature with scenario that does not match the filter', function() {
      beforeEach(async function() {
        this.tmpDir = await promisify(tmp.dir)()
        this.relativeFeaturePath = path.join('features', 'a.feature')
        const featurePath = path.join(this.tmpDir, 'features', 'a.feature')
        await fs.outputFile(featurePath, 'Feature: a\nScenario: b\nGiven a step')
        this.result = await getTestCases({
          cwd: this.tmpDir,
          eventBroadcaster: this.eventBroadcaster,
          featurePaths: [featurePath],
          scenarioFilter: createMock({ matches: false })
        })
      })

      it('returns an empty array', function() {
        expect(this.result).to.eql([])
      })

      it('emits a source event', function() {
        expect(this.onSource).to.have.been.calledOnce
        expect(this.onSource).to.have.been.calledWith({
          data: 'Feature: a\nScenario: b\nGiven a step',
          media: { encoding: 'utf-8', type: 'text/vnd.cucumber.gherkin+plain' },
          type: 'source',
          uri: this.relativeFeaturePath
        })
      })

      it('emits a gherkin-document event', function() {
        expect(this.onGherkinDocument).to.have.been.calledOnce
        expect(this.onGherkinDocument).to.have.been.calledWith({
          document: {
            comments: [],
            feature: {
              children: [
                {
                  description: undefined,
                  keyword: 'Scenario',
                  location: { column: 1, line: 2 },
                  name: 'b',
                  steps: [
                    {
                      argument: undefined,
                      keyword: 'Given ',
                      location: { column: 1, line: 3 },
                      text: 'a step',
                      type: 'Step'
                    }
                  ],
                  tags: [],
                  type: 'Scenario'
                }
              ],
              description: undefined,
              keyword: 'Feature',
              language: 'en',
              location: { column: 1, line: 1 },
              name: 'a',
              tags: [],
              type: 'Feature'
            },
            type: 'GherkinDocument'
          },
          type: 'gherkin-document',
          uri: this.relativeFeaturePath
        })
      })

      it('emits a pickle and pickle-rejected event', function() {
        expect(this.onPickle).to.have.been.calledOnce
        expect(this.onPickle).to.have.been.calledWith({
          pickle: {
            language: 'en',
            locations: [{ column: 1, line: 2 }],
            name: 'b',
            steps: [
              {
                arguments: [],
                locations: [{ column: 7, line: 3 }],
                text: 'a step'
              }
            ],
            tags: []
          },
          type: 'pickle',
          uri: this.relativeFeaturePath
        })
        expect(this.onPickleAccepted).not.to.have.been.called
        expect(this.onPickleRejected).to.have.been.calledOnce
        expect(this.onPickleRejected).to.have.been.calledWith({
          pickle: {
            language: 'en',
            locations: [{ column: 1, line: 2 }],
            name: 'b',
            steps: [
              {
                arguments: [],
                locations: [{ column: 7, line: 3 }],
                text: 'a step'
              }
            ],
            tags: []
          },
          uri: this.relativeFeaturePath
        })
      })
    })

    describe('feature with scenario that matches the filter', function() {
      beforeEach(async function() {
        this.tmpDir = await promisify(tmp.dir)()
        this.relativeFeaturePath = path.join('features', 'a.feature')
        const featurePath = path.join(this.tmpDir, 'features', 'a.feature')
        await fs.outputFile(featurePath, 'Feature: a\nScenario: b\nGiven a step')
        this.result = await getTestCases({
          cwd: this.tmpDir,
          eventBroadcaster: this.eventBroadcaster,
          featurePaths: [featurePath],
          scenarioFilter: createMock({ matches: true })
        })
      })

      it('returns the test case', function() {
        expect(this.result).to.eql([
          {
            pickle: {
              language: 'en',
              locations: [{ column: 1, line: 2 }],
              name: 'b',
              steps: [
                {
                  arguments: [],
                  locations: [{ column: 7, line: 3 }],
                  text: 'a step'
                }
              ],
              tags: []
            },
            uri: this.relativeFeaturePath
          }
        ])
      })

      it('emits a source event', function() {
        expect(this.onSource).to.have.been.calledOnce
        expect(this.onSource).to.have.been.calledWith({
          data: 'Feature: a\nScenario: b\nGiven a step',
          media: { encoding: 'utf-8', type: 'text/vnd.cucumber.gherkin+plain' },
          type: 'source',
          uri: this.relativeFeaturePath
        })
      })

      it('emits a gherkin-document event', function() {
        expect(this.onGherkinDocument).to.have.been.calledOnce
        expect(this.onGherkinDocument).to.have.been.calledWith({
          document: {
            comments: [],
            feature: {
              children: [
                {
                  description: undefined,
                  keyword: 'Scenario',
                  location: { column: 1, line: 2 },
                  name: 'b',
                  steps: [
                    {
                      argument: undefined,
                      keyword: 'Given ',
                      location: { column: 1, line: 3 },
                      text: 'a step',
                      type: 'Step'
                    }
                  ],
                  tags: [],
                  type: 'Scenario'
                }
              ],
              description: undefined,
              keyword: 'Feature',
              language: 'en',
              location: { column: 1, line: 1 },
              name: 'a',
              tags: [],
              type: 'Feature'
            },
            type: 'GherkinDocument'
          },
          type: 'gherkin-document',
          uri: this.relativeFeaturePath
        })
      })

      it('emits a pickle and pickle-accepted event', function() {
        expect(this.onPickle).to.have.been.calledOnce
        expect(this.onPickle).to.have.been.calledWith({
          pickle: {
            language: 'en',
            locations: [{ column: 1, line: 2 }],
            name: 'b',
            steps: [
              {
                arguments: [],
                locations: [{ column: 7, line: 3 }],
                text: 'a step'
              }
            ],
            tags: []
          },
          type: 'pickle',
          uri: this.relativeFeaturePath
        })
        expect(this.onPickleAccepted).to.have.been.calledOnce
        expect(this.onPickleAccepted).to.have.been.calledWith({
          pickle: {
            language: 'en',
            locations: [{ column: 1, line: 2 }],
            name: 'b',
            steps: [
              {
                arguments: [],
                locations: [{ column: 7, line: 3 }],
                text: 'a step'
              }
            ],
            tags: []
          },
          uri: this.relativeFeaturePath
        })
        expect(this.onPickleRejected).not.to.have.been.called
      })
    })
  })
})
