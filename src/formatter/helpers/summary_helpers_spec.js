import getColorFns from '../get_color_fns'
import { formatSummary } from './summary_helpers'
import Status from '../../status'

describe('SummaryHelpers', function() {
  describe('formatSummary', function() {
    beforeEach(function() {
      this.testCaseMap = new Map()
      this.testRun = { result: { duration: 0 } }
      this.options = {
        colorFns: getColorFns(false),
        testCaseMap: this.testCaseMap,
        testRun: this.testRun
      }
    })

    describe('with no test cases', function() {
      beforeEach(function() {
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '0 scenarios\n' + '0 steps\n' + '0m00.000s\n'
        )
      })
    })

    describe('with one passing scenario with one passing step', function() {
      beforeEach(function() {
        this.testCaseMap.set('a.feature:1', {
          steps: [{ result: { status: Status.PASSED } }],
          result: { status: Status.PASSED }
        })
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '1 scenario (1 passed)\n' + '1 step (1 passed)\n' + '0m00.000s\n'
        )
      })
    })

    describe('with one passing scenario with multiple passing step', function() {
      beforeEach(function() {
        this.testCaseMap.set('a.feature:1', {
          steps: [
            { result: { status: Status.PASSED } },
            { result: { status: Status.PASSED } }
          ],
          result: { status: Status.PASSED }
        })
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '1 scenario (1 passed)\n' + '2 steps (2 passed)\n' + '0m00.000s\n'
        )
      })
    })

    describe('with one of every kind of scenario', function() {
      beforeEach(function() {
        this.testCaseMap.set('a.feature:1', {
          steps: [{ result: { status: Status.AMBIGUOUS } }],
          result: { status: Status.AMBIGUOUS }
        })
        this.testCaseMap.set('a.feature:2', {
          steps: [{ result: { status: Status.FAILED } }],
          result: { status: Status.FAILED }
        })
        this.testCaseMap.set('a.feature:3', {
          steps: [{ result: { status: Status.PENDING } }],
          result: { status: Status.PENDING }
        })
        this.testCaseMap.set('a.feature:4', {
          steps: [{ result: { status: Status.PASSED } }],
          result: { status: Status.PASSED }
        })
        this.testCaseMap.set('a.feature:5', {
          steps: [{ result: { status: Status.SKIPPED } }],
          result: { status: Status.SKIPPED }
        })
        this.testCaseMap.set('a.feature:6', {
          steps: [{ result: { status: Status.UNDEFINED } }],
          result: { status: Status.UNDEFINED }
        })
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '6 scenarios (1 failed, 1 ambiguous, 1 undefined, 1 pending, 1 skipped, 1 passed)\n' +
            '6 steps (1 failed, 1 ambiguous, 1 undefined, 1 pending, 1 skipped, 1 passed)\n' +
            '0m00.000s\n'
        )
      })
    })

    describe('with a duration of 123 milliseconds', function() {
      beforeEach(function() {
        this.testRun.result.duration = 123
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '0 scenarios\n' + '0 steps\n' + '0m00.123s\n'
        )
      })
    })

    describe('with a duration of 12.3 seconds', function() {
      beforeEach(function() {
        this.testRun.result.duration = 123 * 100
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '0 scenarios\n' + '0 steps\n' + '0m12.300s\n'
        )
      })
    })

    describe('with a duration of 120.3 seconds', function() {
      beforeEach(function() {
        this.testRun.result.duration = 123 * 1000
        this.result = formatSummary(this.options)
      })

      it('outputs step totals, scenario totals, and duration', function() {
        expect(this.result).to.contain(
          '0 scenarios\n' + '0 steps\n' + '2m03.000s\n'
        )
      })
    })
  })
})
