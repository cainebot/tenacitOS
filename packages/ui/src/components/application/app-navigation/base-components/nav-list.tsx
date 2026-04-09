"use client";

import { useState } from "react";
import { cx } from "../../../../utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
}

export const NavList = ({ activeUrl, items, className }: NavListProps) => {
    const activeItem = items.find((item) => !("divider" in item && item.divider) && (item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl)));

    const [openLabels, setOpenLabels] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        items.forEach((item) => {
            if (!("divider" in item && item.divider) && item.items?.some((sub) => sub.href === activeUrl)) {
                initial.add(item.label!);
            }
        });
        return initial;
    });

    const toggle = (label: string) => {
        setOpenLabels((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    return (
        <ul className={cx("mt-4 flex flex-col px-2 lg:px-4", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    if (item.label) {
                        return (
                            <li key={index} className="px-1 pb-1 pt-3 first:pt-0">
                                <span className="text-xs font-bold uppercase text-quaternary">{item.label}</span>
                            </li>
                        );
                    }
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                if (item.items?.length) {
                    const isOpen = openLabels.has(item.label!);
                    return (
                        <li key={item.label} className="py-0.5">
                            <NavItemBase href={item.href} badge={item.badge} icon={item.icon} type="collapsible" open={isOpen} onClick={() => toggle(item.label!)}>
                                {item.label}
                            </NavItemBase>

                            <div className={cx("grid transition-[grid-template-rows] duration-200 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                                <div className="overflow-hidden">
                                    <ul className="py-0.5">
                                        {item.items.map((childItem) => (
                                            <li key={childItem.label} className="py-0.5">
                                                <NavItemBase
                                                    href={childItem.href}
                                                    badge={childItem.badge}
                                                    icon={childItem.icon}
                                                    iconTrailing={childItem.iconTrailing}
                                                    type="collapsible-child"
                                                    current={activeUrl === childItem.href}
                                                >
                                                    {childItem.label}
                                                </NavItemBase>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </li>
                    );
                }

                return (
                    <li key={item.label} className="py-0.5" onMouseEnter={item.onMouseEnter} onMouseLeave={item.onMouseLeave}>
                        <NavItemBase
                            type={item.onClick ? "button" : "link"}
                            badge={item.badge}
                            icon={item.icon}
                            href={item.onClick ? undefined : item.href}
                            onClick={item.onClick ? () => item.onClick!() : undefined}
                            current={activeItem?.href === item.href || activeItem?.label === item.label}
                        >
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
