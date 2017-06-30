import Gherkin from 'gherkin'
import TestCase from '../models/test_case'

const gherkinCompiler = new Gherkin.Compiler()
const gherkinParser = new Gherkin.Parser()

export default class Parser {
  static parse({ scenarioFilter, source, uri }) {
    let gherkinDocument
    try {
      gherkinDocument = gherkinParser.parse(source)
    } catch (error) {
      error.message += '\npath: ' + uri
      throw error
    }

    return gherkinCompiler
      .compile(gherkinDocument)
      .filter(pickle => scenarioFilter.matches(pickle))
      .map(pickle => new TestCase({ pickle, uri }))
  }
}
