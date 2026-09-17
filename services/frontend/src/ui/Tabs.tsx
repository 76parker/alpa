import { Tabs as PatternFlyTabs, type TabProps, type TabsProps } from '@patternfly/react-core';
import { Children, cloneElement, isValidElement } from 'react';

/** PatternFly tabs with a single tab stop and automatic arrow-key activation. */
export function Tabs({ children, activeKey, onKeyDown, ...props }: Omit<TabsProps, 'ref'>) {
  return <PatternFlyTabs {...props} activeKey={activeKey} onKeyDown={(event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'tab') return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled]):not([aria-disabled="true"])'));
    const current = tabs.indexOf(event.target as HTMLButtonElement);
    if (current < 0 || !tabs.length) return;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length : -1;
    if (target < 0) return;
    event.preventDefault();
    tabs[target].focus();
    tabs[target].click();
  }}>
    {Children.map(children, (child) => isValidElement<TabProps>(child) ? cloneElement(child, { tabIndex: child.props.eventKey === activeKey ? 0 : -1 }) : child) as TabsProps['children']}
  </PatternFlyTabs>;
}
