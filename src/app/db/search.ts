"use client"

import lunr from "lunr"

export function extractLunrKeywords(html: string) {
  // Use Lunr's pipeline to tokenize content into keywords
  const lunrBuilder = lunr(function () {
    this.field("content")
  })
  const node = document.createElement("div")
  node.innerHTML = html
  const content = node.innerText

  // Tokenize content
  const tokenizedWords: string[] = []
  //@ts-ignore
  lunrBuilder.pipeline.run(lunr.tokenizer(content)).forEach((token) => {
    tokenizedWords.push(token.toString())
  })

  return tokenizedWords
}
