// remark-breaks@4 ships pure ESM (`export {default} from './lib/index.js'`),
// which Jest's CJS module loader can't parse. The mocked ReactMarkdown
// component (see reactMarkdownMock.tsx) never actually invokes
// remarkPlugins, so a no-op stand-in is enough to let anything importing
// this module load under Jest.
export default function remarkBreaks() {
  return (tree: unknown) => tree;
}
