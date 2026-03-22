"use client";

import { Button } from "../../base/buttons/button";
import { CloseButton } from "../../base/buttons/close-button";
import { ProgressBar } from "../../base/progress-indicators/progress-indicators";
import { cx } from "../../../utils/cx";

export interface FeaturedCardCommonProps {
    title: string;
    description: string;
    confirmLabel?: string;
    className?: string;
    showButtons?: boolean;
    onDismiss?: () => void;
    onConfirm?: () => void;
}

export const FeaturedCardProgressBar = ({
    title,
    description,
    confirmLabel,
    progress,
    className,
    showButtons = true,
    onDismiss,
    onConfirm,
}: FeaturedCardCommonProps & {
    progress: number;
}) => {
    return (
        <div className={cx("relative flex flex-col rounded-xl bg-secondary p-(--spacing-xl)", className)}>
            <p className="text-sm font-semibold text-primary">{title}</p>
            <p className="mt-1 text-sm text-tertiary">{description}</p>
            {showButtons && (
                <div className="absolute top-2 right-2">
                    <CloseButton onClick={onDismiss} size="sm" />
                </div>
            )}
            <div className="mt-4 flex">
                <ProgressBar value={progress} progressClassName="bg-fg-brand-primary_alt" />
            </div>
            {showButtons && (
                <div className="mt-4 flex gap-3">
                    <Button onClick={onDismiss} color="link-gray" size="sm">
                        Dismiss
                    </Button>
                    <Button onClick={onConfirm} color="link-color" size="sm">
                        {confirmLabel}
                    </Button>
                </div>
            )}
        </div>
    );
};
