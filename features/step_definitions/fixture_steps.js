/* eslint-disable babel/new-cap */

import { defineSupportCode } from '../../'
import { expect } from 'chai'
import fs from 'mz/fs'
import path from 'path'

defineSupportCode(function({ Then }) {
  Then('the output matches the fixture {stringInDoubleQuotes}', async function(
    filePath
  ) {
    const fixturePath = path.join(__dirname, '..', 'fixtures', filePath)
    const expected = await fs.readFile(fixturePath, 'utf8')
    const normalizedActual = this.lastRun.output
      .replace(/"duration":\d*/g, '"duration":0')
      .replace(path.sep, '/')
    expect(normalizedActual).to.eql(expected)
  })
})
