import getColorFns from '../get_color_fns'
import Status from '../../status'
import { formatIssue } from './issue_helpers'
import DataTable from '../../models/step_arguments/data_table'
import DocString from '../../models/step_arguments/doc_string'
import _ from 'lodash'
import figures from 'figures'

describe('IssueHelpers', function() {
  beforeEach(function() {
    this.gherkinDocument = {
      type: 'GherkinDocument',
      feature: {
        type: 'Feature',
        tags: [],
        location: { line: 1, column: 1 },
        language: 'en',
        keyword: 'Feature',
        name: 'my feature',
        description: undefined,
        children: [
          {
            type: 'Scenario',
            tags: [],
            location: { line: 2, column: 1 },
            keyword: 'Scenario',
            name: 'my scenario',
            description: undefined,
            steps: [
              {
                type: 'Step',
                location: { line: 3, column: 1 },
                keyword: 'Given ',
                text: 'step1',
                argument: undefined
              },
              {
                type: 'Step',
                location: { line: 4, column: 1 },
                keyword: 'When ',
                text: 'step2',
                argument: undefined
              },
              {
                type: 'Step',
                location: { line: 5, column: 1 },
                keyword: 'Then ',
                text: 'step3',
                argument: undefined
              }
            ]
          }
        ]
      },
      comments: []
    }
    this.pickle = {
      tags: [],
      name: 'my scenario',
      language: 'en',
      locations: [{ line: 2, column: 1 }],
      steps: [
        {
          text: 'step1',
          arguments: [],
          locations: [{ line: 3, column: 7 }]
        },
        {
          text: 'step2',
          arguments: [],
          locations: [{ line: 4, column: 6 }]
        },
        {
          text: 'step3',
          arguments: [],
          locations: [{ line: 5, column: 6 }]
        }
      ]
    }
    this.testCase = {
      uri: 'path/to/project/a.feature',
      line: 2
    }
    this.steps = [
      {
        actionLocation: {
          line: 2,
          uri: 'path/to/project/steps.js'
        },
        sourceLocation: {
          line: 3,
          uri: 'path/to/project/a.feature'
        }
      },
      {},
      {
        actionLocation: {
          line: 4,
          uri: 'path/to/project/steps.js'
        },
        sourceLocation: {
          line: 5,
          uri: 'path/to/project/a.feature'
        }
      }
    ]
    this.options = {
      colorFns: getColorFns(false),
      cwd: 'path/to/project',
      gherkinDocument: this.gherkinDocument,
      number: 1,
      pickle: this.pickle,
      snippetBuilder: createMock({ build: 'snippet' }),
      steps: this.steps,
      testCase: this.testCase
    }
    this.passedStepResult = { duration: 0, status: Status.PASSED }
    this.skippedStepResult = { status: Status.SKIPPED }
  })

  describe('formatIssue', function() {
    describe('with a failing step', function() {
      beforeEach(function() {
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          actionLocation: {
            line: 3,
            uri: 'path/to/project/steps.js'
          },
          sourceLocation: {
            line: 4,
            uri: 'path/to/project/a.feature'
          },
          result: {
            duration: 0,
            exception: 'error',
            status: Status.FAILED
          }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('prints the scenario', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            `   ${figures.cross} When step2 # steps.js:3\n` +
            '       error\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })

    // describe('with an ambiguous step', function() {
    //   beforeEach(function() {
    //     const stepResults = [
    //       this.passedStepResult,
    //       {
    //         ambiguousStepDefinitions: [
    //           {
    //             line: 5,
    //             pattern: 'pattern1',
    //             uri: 'path/to/project/steps.js'
    //           },
    //           {
    //             line: 6,
    //             pattern: 'longer pattern2',
    //             uri: 'path/to/project/steps.js'
    //           }
    //         ],
    //         duration: 0,
    //         status: Status.AMBIGUOUS,
    //         step: {
    //           arguments: [],
    //           keyword: 'keyword2 ',
    //           name: 'name2'
    //         }
    //       },
    //       this.skippedStepResult
    //     ]
    //     const scenario = {
    //       line: 1,
    //       name: 'name1',
    //       uri: 'path/to/project/a.feature'
    //     }
    //     this.options.scenarioResult = {
    //       scenario,
    //       stepResults
    //     }
    //     this.result = formatIssue(this.options)
    //   })
    //
    //   it('logs the issue', function() {
    //     expect(this.result).to.eql(
    //       '1) Scenario: name1 # a.feature:1\n' +
    //         '   ' +
    //         figures.tick +
    //         ' keyword1 name1 # steps.js:2\n' +
    //         '   ' +
    //         figures.cross +
    //         ' keyword2 name2\n' +
    //         '       Multiple step definitions match:\n' +
    //         '         pattern1        - steps.js:5\n' +
    //         '         longer pattern2 - steps.js:6\n' +
    //         '   - keyword3 name3 # steps.js:4\n\n'
    //     )
    //   })
    // })
    //
    describe('with an undefined step', function() {
      beforeEach(function() {
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          sourceLocation: {
            line: 4,
            uri: 'path/to/project/a.feature'
          },
          result: {
            status: Status.UNDEFINED
          }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('logs the issue', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            `   ? When step2\n` +
            '       Undefined. Implement with the following snippet:\n' +
            '\n' +
            '         snippet\n' +
            '\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })

    describe('with a pending step', function() {
      beforeEach(function() {
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          actionLocation: {
            line: 3,
            uri: 'path/to/project/steps.js'
          },
          sourceLocation: {
            line: 4,
            uri: 'path/to/project/a.feature'
          },
          result: {
            duration: 0,
            status: Status.PENDING
          }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('logs the issue', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            `   ? When step2 # steps.js:3\n` +
            '       Pending\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })
    //
    // describe('step with data table', function() {
    //   beforeEach(function() {
    //     const dataTable = Object.create(DataTable.prototype)
    //     _.assign(
    //       dataTable,
    //       createMock({
    //         raw: [
    //           ['cuk', 'cuke', 'cukejs'],
    //           ['c', 'cuke', 'cuke.js'],
    //           ['cu', 'cuke', 'cucumber']
    //         ]
    //       })
    //     )
    //     const stepResults = [
    //       {
    //         duration: 0,
    //         status: Status.PASSED,
    //         step: {
    //           arguments: [dataTable],
    //           keyword: 'keyword ',
    //           name: 'name'
    //         }
    //       }
    //     ]
    //     const scenario = {
    //       line: 1,
    //       name: 'name1',
    //       uri: 'path/to/project/a.feature'
    //     }
    //     this.options.scenarioResult = {
    //       scenario,
    //       stepResults
    //     }
    //     this.result = formatIssue(this.options)
    //   })
    //
    //   it('logs the keyword and name and data table', function() {
    //     expect(this.result).to.eql(
    //       '1) Scenario: name1 # a.feature:1\n' +
    //         '   ' +
    //         figures.tick +
    //         ' keyword name\n' +
    //         '       | cuk | cuke | cukejs   |\n' +
    //         '       | c   | cuke | cuke.js  |\n' +
    //         '       | cu  | cuke | cucumber |\n' +
    //         '\n'
    //     )
    //   })
    // })
    //
    // describe('step with doc string', function() {
    //   beforeEach(function() {
    //     const docString = Object.create(DocString.prototype)
    //     docString.content = 'this is a multiline\ndoc string\n\n:-)'
    //     const stepResults = [
    //       {
    //         duration: 0,
    //         status: Status.PASSED,
    //         step: {
    //           arguments: [docString],
    //           keyword: 'keyword ',
    //           name: 'name'
    //         }
    //       }
    //     ]
    //     const scenario = {
    //       line: 1,
    //       name: 'name1',
    //       uri: 'path/to/project/a.feature'
    //     }
    //     this.options.scenarioResult = {
    //       scenario,
    //       stepResults
    //     }
    //     this.result = formatIssue(this.options)
    //   })
    //
    //   it('logs the keyword and name and doc string', function() {
    //     expect(this.result).to.eql(
    //       '1) Scenario: name1 # a.feature:1\n' +
    //         '   ' +
    //         figures.tick +
    //         ' keyword name\n' +
    //         '       """\n' +
    //         '       this is a multiline\n' +
    //         '       doc string\n' +
    //         '\n' +
    //         '       :-)\n' +
    //         '       """\n' +
    //         '\n'
    //     )
    //   })
    // })
  })
})
