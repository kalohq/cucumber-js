import getColorFns from '../get_color_fns'
import Status from '../../status'
import { formatIssue } from './issue_helpers'
import figures from 'figures'

describe('IssueHelpers', function() {
  beforeEach(function() {
    // stripped down version of gherkin document with only what is required
    this.gherkinDocument = {
      feature: {
        children: [
          {
            steps: [
              { location: { line: 3 }, keyword: 'Given ' },
              { location: { line: 4 }, keyword: 'When ' },
              { location: { line: 5 }, keyword: 'Then ' }
            ]
          }
        ]
      },
      comments: []
    }
    // stripped down version of pickle with only what is required
    this.pickle = {
      name: 'my scenario',
      locations: [{ line: 2 }],
      steps: [
        { text: 'step1', arguments: [], locations: [{ line: 3 }] },
        { text: 'step2', arguments: [], locations: [{ line: 4 }] },
        { text: 'step3', arguments: [], locations: [{ line: 5 }] }
      ]
    }
    this.testCase = {
      uri: 'a.feature',
      line: 2
    }
    this.steps = [
      {
        actionLocation: { line: 2, uri: 'steps.js' },
        sourceLocation: { line: 3, uri: 'a.feature' }
      },
      {},
      {
        actionLocation: { line: 4, uri: 'steps.js' },
        sourceLocation: { line: 5, uri: 'a.feature' }
      }
    ]
    this.options = {
      colorFns: getColorFns(false),
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
    describe('returns the formatted scenario', function() {
      beforeEach(function() {
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          actionLocation: { line: 3, uri: 'steps.js' },
          sourceLocation: { line: 4, uri: 'a.feature' },
          result: {
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

    describe('with an ambiguous step', function() {
      beforeEach(function() {
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          actionLocation: { line: 3, uri: 'steps.js' },
          sourceLocation: { line: 4, uri: 'a.feature' },
          result: {
            exception:
              'Multiple step definitions match:\n' +
              '  pattern1        - steps.js:5\n' +
              '  longer pattern2 - steps.js:6',
            status: Status.FAILED
          }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('returns the formatted scenario', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            `   ${figures.cross} When step2 # steps.js:3\n` +
            '       Multiple step definitions match:\n' +
            '         pattern1        - steps.js:5\n' +
            '         longer pattern2 - steps.js:6\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })

    describe('with an undefined step', function() {
      beforeEach(function() {
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          sourceLocation: { line: 4, uri: 'a.feature' },
          result: { status: Status.UNDEFINED }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('returns the formatted scenario', function() {
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
          actionLocation: { line: 3, uri: 'steps.js' },
          sourceLocation: { line: 4, uri: 'a.feature' },
          result: { status: Status.PENDING }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('returns the formatted scenario', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            `   ? When step2 # steps.js:3\n` +
            '       Pending\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })

    describe('step with data table', function() {
      beforeEach(function() {
        this.pickle.steps[0].arguments = [
          {
            rows: [
              { cells: [{ value: 'aaa' }, { value: 'b' }, { value: 'c' }] },
              { cells: [{ value: 'd' }, { value: 'e' }, { value: 'ff' }] },
              { cells: [{ value: 'gg' }, { value: 'h' }, { value: 'iii' }] }
            ]
          }
        ]
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          actionLocation: { line: 3, uri: 'steps.js' },
          sourceLocation: { line: 4, uri: 'a.feature' },
          result: { status: Status.PENDING }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('returns the formatted scenario', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            '       | aaa | b | c   |\n' +
            '       | d   | e | ff  |\n' +
            '       | gg  | h | iii |\n' +
            `   ? When step2 # steps.js:3\n` +
            '       Pending\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })

    describe('step with doc string', function() {
      beforeEach(function() {
        this.pickle.steps[0].arguments = [
          {
            location: { line: 5, column: 1 },
            content: 'this is a multiline\ndoc string\n\n:-)'
          }
        ]
        this.steps[0].result = this.passedStepResult
        this.steps[1] = {
          actionLocation: { line: 3, uri: 'steps.js' },
          sourceLocation: { line: 4, uri: 'a.feature' },
          result: { status: Status.PENDING }
        }
        this.steps[2].result = this.skippedStepResult
        this.formattedIssue = formatIssue(this.options)
      })

      it('returns the formatted scenario', function() {
        expect(this.formattedIssue).to.eql(
          '1) Scenario: my scenario # a.feature:2\n' +
            `   ${figures.tick} Given step1 # steps.js:2\n` +
            '       """\n' +
            '       this is a multiline\n' +
            '       doc string\n' +
            '\n' +
            '       :-)\n' +
            '       """\n' +
            `   ? When step2 # steps.js:3\n` +
            '       Pending\n' +
            '   - Then step3 # steps.js:4\n\n'
        )
      })
    })
  })
})
