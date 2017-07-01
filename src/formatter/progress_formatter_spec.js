import getColorFns from './get_color_fns'
import Hook from '../models/hook'
import ProgressFormatter from './progress_formatter'
import Status from '../status'
import Step from '../models/step'
import SummaryFormatter from './summary_formatter'
import { EventEmitter } from 'events'

describe('ProgressFormatter', function() {
  beforeEach(function() {
    this.eventBroadcaster = new EventEmitter()
    this.output = ''
    const colorFns = getColorFns(false)
    const logFn = data => {
      this.output += data
    }
    this.progressFormatter = new ProgressFormatter({
      colorFns,
      eventBroadcaster: this.eventBroadcaster,
      log: logFn
    })
    sinon.stub(this.progressFormatter, 'logSummary').callsFake(() => {
      logFn('summary')
    })
  })

  describe('test step finished', function() {
    beforeEach(function() {
      this.testCase = { uri: 'path/to/feature', line: 1 }
      this.eventBroadcaster.emit('test-case-started', {
        testCase: this.testCase
      })
    })

    describe('ambiguous', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          result: { status: Status.AMBIGUOUS },
          testCase: this.testCase
        })
      })

      it('outputs A', function() {
        expect(this.output).to.eql('A')
      })
    })

    describe('failed', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          result: { status: Status.FAILED },
          testCase: this.testCase
        })
      })

      it('outputs F', function() {
        expect(this.output).to.eql('F')
      })
    })

    describe('passed', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          result: { status: Status.PASSED },
          testCase: this.testCase
        })
      })

      it('outputs .', function() {
        expect(this.output).to.eql('.')
      })
    })

    describe('pending', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          result: { status: Status.PENDING },
          testCase: this.testCase
        })
      })

      it('outputs P', function() {
        expect(this.output).to.eql('P')
      })
    })

    describe('skipped', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          result: { status: Status.SKIPPED },
          testCase: this.testCase
        })
      })

      it('outputs -', function() {
        expect(this.output).to.eql('-')
      })
    })

    describe('undefined', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          result: { status: Status.UNDEFINED },
          testCase: this.testCase
        })
      })

      it('outputs U', function() {
        expect(this.output).to.eql('U')
      })
    })
  })

  describe(' result', function() {
    beforeEach(function() {
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs two newlines before the summary', function() {
      expect(this.output).to.eql('\n\nsummary')
    })
  })
})
