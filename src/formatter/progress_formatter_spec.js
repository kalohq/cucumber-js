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
    sinon
      .stub(SummaryFormatter.prototype, 'onTestRunFinished')
      .callsFake(() => {
        logFn('summary')
      })
  })

  afterEach(function() {
    SummaryFormatter.prototype.onTestRunFinished.restore()
  })

  describe('test step finished', function() {
    describe('ambiguous', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          result: { status: Status.AMBIGUOUS }
        })
      })

      it('outputs A', function() {
        expect(this.output).to.eql('A')
      })
    })

    describe('failed', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          result: { status: Status.FAILED }
        })
      })

      it('outputs F', function() {
        expect(this.output).to.eql('F')
      })
    })

    describe('passed', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          result: { status: Status.PASSED }
        })
      })

      it('does not output', function() {
        expect(this.output).to.eql('')
      })
    })

    describe('pending', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          result: { status: Status.PENDING }
        })
      })

      it('outputs P', function() {
        expect(this.output).to.eql('P')
      })
    })

    describe('skipped', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          result: { status: Status.SKIPPED }
        })
      })

      it('outputs -', function() {
        expect(this.output).to.eql('-')
      })
    })

    describe('undefined', function() {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-step-finished', {
          result: { status: Status.UNDEFINED }
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
