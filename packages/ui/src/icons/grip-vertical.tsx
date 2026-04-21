import * as React from 'react'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

const GripVertical: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) =>
  React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      stroke: color,
      strokeWidth: '2',
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      ...props,
    },
    React.createElement('path', {
      d: 'M9 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    }),
  )

GripVertical.displayName = 'GripVertical'

export { GripVertical }
