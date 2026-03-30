"use client";

import { type SVGProps, useId, useState, useEffect } from "react";
import { cx } from "@/utils/cx";

export const UntitledLogoMinimal = (props: SVGProps<SVGSVGElement>) => {
    const reactId = useId();
    const [id, setId] = useState("uui-logo");
    useEffect(() => setId(reactId), [reactId]);

    return (
        <svg viewBox="0 0 36 36" fill="none" {...props} className={cx("size-8", props.className)} suppressHydrationWarning>
            <g clipPath={`url(#clip0-${id})`}>
                <rect width="36" height="36" rx="9" fill="#22262F" />
                <rect width="36" height="36" fill={`url(#paint0-${id})`} />
                <g filter={`url(#filter0-${id})`}>
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.91304 18C12.867 18 18 12.867 18 3.91304C18 12.867 23.133 18 32.087 18C23.133 18 18 23.133 18 32.087C18 23.133 12.867 18 3.91304 18Z"
                        fill={`url(#paint1-${id})`}
                    />
                </g>
            </g>
            <rect
                x="1.125"
                y="1.125"
                width="33.75"
                height="33.75"
                rx="7.875"
                stroke={`url(#paint2-${id})`}
                strokeWidth="2.25"
            />
            <defs>
                <filter
                    id={`filter0-${id}`}
                    x="0.53804"
                    y="3.06929"
                    width="34.9239"
                    height="34.9239"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feMorphology radius="1.6875" operator="erode" in="SourceAlpha" result="effect1_dropShadow" />
                    <feOffset dy="2.53125" />
                    <feGaussianBlur stdDeviation="2.53125" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"
                    />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
                </filter>
                <linearGradient id={`paint0-${id}`} x1="18" y1="0" x2="19.5" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0" />
                    <stop offset="1" stopColor="white" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id={`paint1-${id}`} x1="18" y1="3.91304" x2="18" y2="32.087" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.8" />
                    <stop offset="1" stopColor="white" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id={`paint2-${id}`} x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.12" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <clipPath id={`clip0-${id}`}>
                    <rect width="36" height="36" rx="9" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
};
