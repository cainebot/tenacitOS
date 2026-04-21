import * as React from 'react'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

const Ban: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) =>
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
    React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
    React.createElement('path', { d: 'M4.929 4.929 19.07 19.071' }),
  )

Ban.displayName = 'Ban'

export { Ban }
