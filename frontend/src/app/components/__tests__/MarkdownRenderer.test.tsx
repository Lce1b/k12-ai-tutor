/**
 * Tests for MarkdownRenderer component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MarkdownRenderer from '../MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders plain text', () => {
    render(<MarkdownRenderer content="Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders bold markdown', () => {
    const { container } = render(<MarkdownRenderer content="**bold text**" />)
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('bold text')
  })

  it('renders italic markdown', () => {
    const { container } = render(<MarkdownRenderer content="*italic text*" />)
    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em?.textContent).toBe('italic text')
  })

  it('renders inline code', () => {
    const { container } = render(<MarkdownRenderer content="Use `console.log()` to debug" />)
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code?.textContent).toBe('console.log()')
  })

  it('renders code blocks', () => {
    const { container } = render(<MarkdownRenderer content={'```python\nprint("hello")\n```'} />)
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()
    const code = pre?.querySelector('code')
    expect(code).not.toBeNull()
  })

  it('renders unordered lists', () => {
    // react-markdown + remark-gfm requires blank line before list start
    const md = '\n- Item 1\n- Item 2\n- Item 3'
    const { container } = render(<MarkdownRenderer content={md} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    const items = ul?.querySelectorAll('li')
    expect(items?.length).toBe(3)
  })

  it('renders ordered lists', () => {
    const md = '\n1. First\n2. Second'
    const { container } = render(<MarkdownRenderer content={md} />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const items = ol?.querySelectorAll('li')
    expect(items?.length).toBe(2)
  })

  it('renders links with target=_blank', () => {
    const { container } = render(<MarkdownRenderer content="[Click here](https://example.com)" />)
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toBe('https://example.com')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders headings', () => {
    // react-markdown + remark-gfm requires blank line between heading and next element
    const md = '# Heading 1\n\n## Heading 2'
    const { container } = render(<MarkdownRenderer content={md} />)
    const h1 = container.querySelector('h1')
    const h2 = container.querySelector('h2')
    expect(h1).not.toBeNull()
    expect(h1?.textContent).toBe('Heading 1')
    expect(h2).not.toBeNull()
    expect(h2?.textContent).toBe('Heading 2')
  })

  it('renders empty string without crashing', () => {
    const { container } = render(<MarkdownRenderer content="" />)
    expect(container).not.toBeNull()
  })

  it('renders Chinese text', () => {
    render(<MarkdownRenderer content="人工智能是计算机科学的一个分支。" />)
    expect(screen.getByText('人工智能是计算机科学的一个分支。')).toBeInTheDocument()
  })

  it('wraps content in message-content class', () => {
    const { container } = render(<MarkdownRenderer content="test" />)
    const wrapper = container.querySelector('.message-content')
    expect(wrapper).not.toBeNull()
  })
})
