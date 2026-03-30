"use client";

import { Map01, SearchLg, Settings01 } from "@untitledui/icons";
import { Input } from "../../../base/input/input";
import { UntitledLogo } from "../../../foundations/logo/untitledui-logo";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemDividerType, NavItemType } from "../config";
import { FeaturedCardProgressBar } from "../../featured-cards/featured-cards";

export interface FeaturedCardData {
    title: string;
    description: string;
    progress: number;
}

interface SidebarNavigationSectionDividersProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
    /** Live node cards to display in the sidebar footer. When omitted or empty, renders nothing. */
    featuredCards?: FeaturedCardData[];
    /** When true, renders only the sidebar content without fixed positioning or placeholder. Used by AnimatedSidebar. */
    bare?: boolean;
}

export const SidebarNavigationSectionDividers = ({ activeUrl, items, featuredCards, bare }: SidebarNavigationSectionDividersProps) => {
    const MAIN_SIDEBAR_WIDTH = 292;

    const content = (
        <aside
            style={
                {
                    "--width": `${MAIN_SIDEBAR_WIDTH}px`,
                } as React.CSSProperties
            }
            className="flex h-full w-full max-w-full flex-col justify-between overflow-auto border-secondary bg-primary pt-4 shadow-xs md:border-r lg:w-(--width) lg:overflow-hidden lg:rounded-xl lg:border lg:pt-5"
        >
            <div className="flex flex-col gap-5 px-4 lg:px-5">
                <UntitledLogo className="h-8" />
                <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} />
            </div>

            <NavList activeUrl={activeUrl} items={items} className="mt-5 pb-5 lg:flex-1 lg:overflow-y-auto" />

            <div className="mt-auto flex flex-col gap-5 border-t border-secondary px-2 py-4 lg:shrink-0 lg:gap-6 lg:px-4 lg:py-4">
                <div className="flex flex-col gap-0.5">
                    <NavItemBase type="link" href="/office" icon={Map01} current={activeUrl === "/office"}>
                        Office
                    </NavItemBase>
                    <NavItemBase type="link" href="/settings" icon={Settings01} current={activeUrl === "/settings"}>
                        Settings
                    </NavItemBase>
                </div>
                <div className="-mx-2 px-2 lg:-mx-4 lg:px-4 flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {(featuredCards ?? []).map((card) => (
                        <FeaturedCardProgressBar
                            key={card.title}
                            title={card.title}
                            description={card.description}
                            progress={card.progress}
                            showButtons={false}
                            className="w-[14.875rem] shrink-0"
                        />
                    ))}
                </div>
                <NavAccountCard />
            </div>
        </aside>
    );

    if (bare) return content;

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{content}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:py-1 lg:pl-1">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH + 4, // Add 4px to account for the padding in the sidebar wrapper
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
