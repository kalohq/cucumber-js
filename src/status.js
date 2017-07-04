import _ from 'lodash'
import upperCaseFirst from 'upper-case-first'

const statuses = {
  AMBIGUOUS: 'ambiguous',
  FAILED: 'failed',
  PASSED: 'passed',
  PENDING: 'pending',
  SKIPPED: 'skipped',
  UNDEFINED: 'undefined'
}

export default statuses

export function addStatusPredicates(protoype) {
  _.each(statuses, status => {
    protoype['is' + upperCaseFirst(status)] = function() {
      return this.status === status
    }
  })
}

export function getStatusMapping(initialValue) {
  return _.chain(statuses)
    .map(status => [status, initialValue])
    .fromPairs()
    .value()
}

export const FAILING_STATUSES = [statuses.AMBIGUOUS, statuses.FAILED]
export const STRICT_FAILING_STATUSES = [statuses.PENDING, statuses.UNDEFINED]
