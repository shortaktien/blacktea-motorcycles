import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './App';

export function render(pathname: string): string {
  return renderToStaticMarkup(<App initialPath={pathname} />);
}
