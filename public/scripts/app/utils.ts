
export function CloneNode<T extends HTMLElement>(source: T | DocumentFragment | undefined | null): T | undefined {
  if (source?.nodeName === 'TEMPLATE') {
    // unwrap template elements
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Typesafe cloning of HTML nodes doesnt' appear possible without updated d.ts defintitions...
    source = (source as unknown as HTMLTemplateElement).content
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Typesafe cloning of HTML nodes doesnt' appear possible without updated d.ts defintitions...
  const elem = (source?.cloneNode(true) as Element | undefined)?.firstElementChild as T | undefined
  return elem ?? undefined
}