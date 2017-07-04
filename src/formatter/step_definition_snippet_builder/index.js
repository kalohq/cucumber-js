import _ from 'lodash'
import { CucumberExpressionGenerator } from 'cucumber-expressions'
import KeywordType from '../../keyword_type'

export default class StepDefinitionSnippetBuilder {
  constructor({ snippetSyntax, parameterTypeRegistry }) {
    this.snippetSyntax = snippetSyntax
    this.cucumberExpressionGenerator = new CucumberExpressionGenerator(
      parameterTypeRegistry
    )
  }

  build(step) {
    const functionName = this.getFunctionName(step)
    const generatedExpression = this.cucumberExpressionGenerator.generateExpression(
      step.text,
      true
    )
    const pattern = generatedExpression.source
    const parameters = this.getParameters(
      step,
      generatedExpression.parameterNames
    )
    const comment =
      'Write code here that turns the phrase above into concrete actions'
    return this.snippetSyntax.build(functionName, pattern, parameters, comment)
  }

  getFunctionName(step) {
    switch (step.keywordType) {
      case KeywordType.EVENT:
        return 'When'
      case KeywordType.OUTCOME:
        return 'Then'
      case KeywordType.PRECONDITION:
        return 'Given'
    }
  }

  getParameters(step, expressionParameterNames) {
    return _.concat(
      expressionParameterNames,
      this.getStepArgumentParameters(step),
      'callback'
    )
  }

  getStepArgumentParameters(step) {
    return step.arguments.map(function(arg) {
      if (arg.rows) {
        return 'table'
      } else if (arg.content) {
        return 'string'
      } else {
        throw new Error(`Unknown argument type: ${arg}`)
      }
    })
  }
}
