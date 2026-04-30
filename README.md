# cssText IntelliSense

Write inline CSS in `HTMLElement.style.cssText` template literals with syntax highlighting and focused IntelliSense in VS Code.

```ts
element.style.cssText = `
  display: flex;
  position: absolute;
  inset: 0;
  color: inherit;
`
```

## What it does

`cssText IntelliSense` makes direct `style.cssText` assignments easier to read and edit in JavaScript and TypeScript projects.

- Highlights CSS inside `style.cssText` template literals.
- Suggests common CSS properties such as `display`, `position`, `inset`, `width`, `height`, `color`, `background`, `overflow`, and `cursor`.
- Suggests common values for supported properties such as `display`, `position`, `overflow`, `pointer-events`, `user-select`, `white-space`, `color`, `background`, and `opacity`.
- Works in JavaScript, TypeScript, JSX, and TSX files.

## Example

```ts
const panel = document.createElement('section')

panel.style.cssText = `
  display: grid;
  position: fixed;
  inset: 0;
  overflow: auto;
  background: transparent;
`
```

Place the cursor inside the template literal and start typing a CSS property or value.

## Supported Pattern

The extension targets direct assignments to `HTMLElement.style.cssText`:

```ts
element.style.cssText = `display: flex;`
```

Template interpolation is highlighted as part of the CSS text. The extension does not try to evaluate JavaScript expressions inside the template literal.

## Why use it

VS Code already has excellent CSS tooling, but inline `cssText` strings are usually treated like plain JavaScript strings. This extension brings lightweight CSS editing support to that small but useful pattern without changing your runtime code.

## Requirements

VS Code 1.90.0 or newer.

## Repository

Source code and issues:

https://github.com/sovereignbase/vscode-csstext-intellisense

## License

Apache-2.0
