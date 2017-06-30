import _ from 'lodash'
import ArgvParser from './argv_parser'
import fs from 'mz/fs'
import Gherkin from 'gherkin'
import ProfileLoader from './profile_loader'
import Promise from 'bluebird'

export async function getExpandedArgv({ argv, cwd }) {
  let { options } = ArgvParser.parse(argv)
  let fullArgv = argv
  const profileArgv = await new ProfileLoader(cwd).getArgv(options.profile)
  if (profileArgv.length > 0) {
    fullArgv = _.concat(argv.slice(0, 2), profileArgv, argv.slice(2))
  }
  return fullArgv
}

export async function getTestCases({
  eventBroadcaster,
  featurePaths,
  scenarioFilter
}) {
  const result = []
  await Promise.map(featurePaths, async featurePath => {
    const source = await fs.readFile(featurePath, 'utf8')
    const events = Gherkin.generateEvents(source, featurePath)
    eventBroadcaster.on('pickle', ({ pickle, uri }) => {
      if (scenarioFilter.matches(pickle)) {
        eventBroadcaster.emit('pickle-accepted', { pickle, uri })
        result.push({ pickle, uri })
      } else {
        eventBroadcaster.emit('pickle-rejected', { pickle, uri })
      }
    })
    events.forEach(event => {
      eventBroadcaster.emit(event.type, event)
    })
  })
  return result
}
