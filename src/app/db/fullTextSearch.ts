'use client'

import lunr from 'lunr'

// Use Lunr's pipeline to tokenize content into keywords
const lunrBuilder = new lunr.Builder()
lunrBuilder.field('content')

export function extractLunrKeywords(html: string) {
  const text = preprocessHtml(html)
  // Tokenize content
  const tokenizedWords: string[] = []
  lunrBuilder.pipeline.run(lunr.tokenizer(text)).forEach((token) => {
    tokenizedWords.push(token.toString())
  })

  return tokenizedWords
}

/** Traverse the HTML and extract its text.
 *
 * (We cannot just use div.innerText because it will not respect the whitespace between elements)
 *
 */
export function preprocessHtml(html: string) {
  const texts: string[] = []
  const div = document.createElement('div')
  div.innerHTML = html

  function extractText(node: Node) {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const trimmed = child.textContent?.trim()
        if (trimmed) texts.push(trimmed)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        extractText(child)
      }
    }
  }

  extractText(div)
  return texts.join(' ')
}
