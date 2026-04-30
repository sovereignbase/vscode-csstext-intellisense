# cssText IntelliSense

CSS syntax highlighting and completions for `HTMLElement.style.cssText` template literals in JavaScript, TypeScript, JSX, and TSX files.

```ts
element.style.cssText = `
  display: flex;
  position: absolute;
  inset: 0;
`
```

## Features

- CSS TextMate injection inside direct `style.cssText` template literal assignments.
- CSS property completions for common layout, box, text, and interaction properties.
- Value completions for common properties such as `display`, `position`, `overflow`, `cursor`, `color`, and `opacity`.

## Installation

Install the packaged `.vsix` from VS Code:

```sh
code --install-extension vscode-csstext-intellisense-0.0.1.vsix
```

Or install it from the Visual Studio Marketplace after publication.

## Development

```sh
npm install
npm run build
npm run package
```

Press F5 in VS Code to run the extension host from this repository.

## Scope

This extension intentionally targets the direct assignment form first:

```ts
element.style.cssText = `display: flex;`
```

Template interpolation inside `cssText` is highlighted as CSS text, not parsed as JavaScript.

## License

Apache-2.0
