'use client'

import * as runtime from 'react/jsx-runtime'

const useMDXComponent = (code: string) => {
  const fn = new Function(code)
  return fn({ ...runtime }).default
}

interface MDXContentProps {
  code: string
  components?: React.ComponentProps<'div'> &
    Record<string, React.ComponentType<Record<string, unknown>>>
}

export function MDXContent({ code, components }: MDXContentProps) {
  const Component = useMDXComponent(code)
  return <Component components={components} />
}
