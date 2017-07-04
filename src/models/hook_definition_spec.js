import HookDefinition from './hook_definition'

describe('HookDefinition', function() {
  describe('appliesToTestCase', function() {
    beforeEach(function() {
      this.input = {
        pickle: {
          tags: []
        },
        uri: ''
      }
    })

    describe('no tags', function() {
      beforeEach(function() {
        this.hookDefinition = new HookDefinition({ options: {} })
      })

      it('returns true', function() {
        expect(this.hookDefinition.appliesToTestCase(this.input)).to.be.true
      })
    })

    describe('tags match', function() {
      beforeEach(function() {
        this.input.pickle.tags = [{ name: '@tagA' }]
        this.hookDefinition = new HookDefinition({
          options: { tags: '@tagA' }
        })
      })

      it('returns true', function() {
        expect(this.hookDefinition.appliesToTestCase(this.input)).to.be.true
      })
    })

    describe('tags do not match', function() {
      beforeEach(function() {
        this.hookDefinition = new HookDefinition({
          options: { tags: '@tagA' }
        })
      })

      it('returns false', function() {
        expect(this.hookDefinition.appliesToTestCase(this.input)).to.be.false
      })
    })
  })
})
