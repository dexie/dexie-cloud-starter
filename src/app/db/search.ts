'use client'

import lunr from 'lunr'

// Use Lunr's pipeline to tokenize content into keywords
const lunrBuilder = lunr(function () {
  this.field('content')
})

export function extractLunrKeywords(html: string) {
  const text = preprocessHtml(html)
  // Tokenize content
  const tokenizedWords: string[] = []
  //@ts-ignore
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
  const div = document.createElement('div')
  div.innerHTML = html

  function extractText(node: Node): string {
    let text = ''
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        text += extractText(child)
        const computedStyle = getComputedStyle(child as Element)
        if (['block', 'flex', 'grid'].includes(computedStyle.display)) {
          text += ' '
        }
      }
    }
    return text.trim()
  }

  return extractText(div)
}
