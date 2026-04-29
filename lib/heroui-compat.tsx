"use client";
/**
 * HeroUI v2 → v3 compatibility shim.
 *
 * The Perchlead UI was built against HeroUI v2's API. v3 changed many
 * component shapes (compound modal, no `color`/`radius` on Button, no
 * `SelectItem`, renamed `Textarea` → `TextArea`, `Tab title` → children,
 * etc). To avoid rewriting every page in this migration, we expose
 * v2-shaped wrappers here that translate to v3 internally.
 *
 * For new code, prefer the native v3 imports from "@heroui/react" or the
 * Pro components from "@heroui-pro/react" directly.
 */

import * as React from "react";
import {
  Button as HButton,
  Input as HInput,
  TextArea as HTextArea,
  type ButtonRootProps,
  type InputRootProps,
  Modal as HModal,
  type ModalContainerProps,
  Select as HSelect,
  type SelectRootProps,
  ListBox as HListBox,
  Tabs as HTabs,
  type TabProps as V3TabProps,
  Tooltip as HTooltip,
  Popover as HPopover,
  Dropdown as HDropdown,
  type DropdownRootProps,
  Switch as HSwitch,
  type SwitchRootProps,
  Chip as HChip,
} from "@heroui/react";

// =============================================================================
// Button — translate v2 color="primary"/variant="bordered"/etc to v3 variant
// =============================================================================

type V2ButtonColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";
type V2ButtonVariant = "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";

export interface ButtonProps
  extends Omit<ButtonRootProps, "variant" | "color"> {
  color?: V2ButtonColor;
  variant?: V2ButtonVariant;
  radius?: "none" | "sm" | "md" | "lg" | "full";
  isLoading?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  as?: React.ElementType;
  href?: string;
  target?: string;
  rel?: string;
}

function mapButtonVariant(
  v2variant: V2ButtonVariant | undefined,
  color: V2ButtonColor | undefined,
): ButtonRootProps["variant"] {
  // Solid danger / secondary mapping
  if (color === "danger" && (v2variant === "solid" || v2variant === undefined || v2variant === "shadow")) {
    return "danger";
  }
  if (color === "danger" && (v2variant === "flat" || v2variant === "faded")) {
    return "danger-soft";
  }
  if (color === "primary" && (v2variant === "solid" || v2variant === undefined || v2variant === "shadow")) {
    return "primary";
  }
  if (color === "primary" && (v2variant === "flat" || v2variant === "faded")) {
    return "secondary";
  }
  // Variant-based (no color)
  switch (v2variant) {
    case "bordered":
      return "outline";
    case "light":
    case "ghost":
      return "ghost";
    case "flat":
    case "faded":
      return "secondary";
    case "shadow":
    case "solid":
      return "primary";
    default:
      return color === undefined ? "secondary" : "primary";
  }
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      color,
      variant,
      radius: _radius,
      isLoading,
      startContent,
      endContent,
      as: As,
      href,
      target,
      rel,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const v3variant = mapButtonVariant(variant, color);
    const inner = (
      <>
        {startContent}
        {children}
        {endContent}
      </>
    );
    if (As) {
      const Component = As as React.ElementType;
      return (
        <Component
          ref={ref}
          href={href}
          target={target}
          rel={rel}
          className={["button", `button--${v3variant}`, className].filter(Boolean).join(" ")}
          {...(rest as Record<string, unknown>)}
        >
          {inner}
        </Component>
      );
    }
    return (
      <HButton
        ref={ref as React.Ref<HTMLButtonElement>}
        variant={v3variant}
        isPending={isLoading}
        className={className}
        {...(rest as ButtonRootProps)}
      >
        {inner}
      </HButton>
    );
  },
);

// =============================================================================
// Input — accept v2 startContent, endContent, classNames, variant=bordered
// =============================================================================

export interface InputProps
  extends Omit<InputRootProps, "variant" | "size" | "className"> {
  variant?: "bordered" | "flat" | "underlined" | "faded" | "primary" | "secondary";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  /** v2 sizing — accepted but ignored by v3 (CSS handles it). */
  size?: "sm" | "md" | "lg" | number;
  /** Override to plain string (InputRootProps types it as ClassNameOrFunction). */
  className?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  classNames?: { inputWrapper?: string; input?: string };
  label?: React.ReactNode;
  isRequired?: boolean;
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  onValueChange?: (value: string) => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      variant,
      radius: _radius,
      size: _size,
      startContent,
      endContent,
      classNames,
      label,
      isRequired,
      errorMessage,
      isInvalid,
      onValueChange,
      onChange,
      className,
      ...rest
    },
    ref,
  ) {
    const v3variant: "primary" | "secondary" | undefined =
      variant === "primary" || variant === "secondary"
        ? variant
        : variant
          ? "secondary"
          : undefined;
    const wrapperCls = classNames?.inputWrapper;
    const inputCls = classNames?.input;

    // Build the inner field element — same wrapper div logic as before
    const inner = (startContent || endContent || wrapperCls) ? (
      <div className={["relative flex items-center", wrapperCls].filter(Boolean).join(" ")}>
        {startContent && <span className="pointer-events-none absolute left-3 shrink-0">{startContent}</span>}
        <HInput
          ref={ref as React.Ref<HTMLInputElement>}
          variant={v3variant}
          className={[startContent ? "pl-9" : "", endContent ? "pr-9" : "", inputCls].filter(Boolean).join(" ")}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.((e.target as HTMLInputElement).value);
          }}
          {...rest}
        />
        {endContent && <span className="absolute right-3 shrink-0">{endContent}</span>}
      </div>
    ) : (
      <HInput
        ref={ref as React.Ref<HTMLInputElement>}
        variant={v3variant}
        className={[inputCls].filter(Boolean).join(" ")}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.((e.target as HTMLInputElement).value);
        }}
        {...rest}
      />
    );

    // No label — same bare-field behaviour as before (for search inputs, topbar, etc.)
    if (!label) {
      if (className) {
        return <div className={className}>{inner}</div>;
      }
      return inner;
    }

    // Labeled variant: stack label → field → optional error
    return (
      <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
        <label className="text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
          {isRequired && <span className="ml-0.5 text-danger">*</span>}
        </label>
        {inner}
        {isInvalid && errorMessage && (
          <p className="text-xs text-danger-600 dark:text-danger-400">{String(errorMessage)}</p>
        )}
      </div>
    );
  },
);

// =============================================================================
// Textarea — capital-A in v3 (TextArea)
// =============================================================================

export interface TextareaProps {
  variant?: "bordered" | "flat" | "underlined" | "faded" | "primary" | "secondary";
  classNames?: { inputWrapper?: string; input?: string };
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  label?: React.ReactNode;
  isRequired?: boolean;
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  fullWidth?: boolean;
  isDisabled?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      variant,
      classNames,
      className,
      onValueChange,
      onChange,
      minRows,
      maxRows: _maxRows,
      rows,
      label,
      isRequired,
      errorMessage,
      isInvalid,
      ...rest
    },
    ref,
  ) {
    const v3variant: "primary" | "secondary" | undefined =
      variant === "primary" || variant === "secondary"
        ? variant
        : variant
          ? "secondary"
          : undefined;
    const inputCls = classNames?.input;
    const wrapperCls = classNames?.inputWrapper;

    const fieldEl = (
      <HTextArea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        variant={v3variant}
        rows={rows ?? minRows}
        className={[inputCls, wrapperCls, className].filter(Boolean).join(" ")}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.((e.target as HTMLTextAreaElement).value);
        }}
        {...rest}
      />
    );

    if (!label) return fieldEl;

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
          {isRequired && <span className="ml-0.5 text-danger">*</span>}
        </label>
        {fieldEl}
        {isInvalid && errorMessage && (
          <p className="text-xs text-danger-600 dark:text-danger-400">{String(errorMessage)}</p>
        )}
      </div>
    );
  },
);

// =============================================================================
// Modal — v2 expects <Modal isOpen onOpenChange><ModalContent>...</ModalContent></Modal>
// We expose ModalContent that renders Backdrop > Container > Dialog > children
// =============================================================================

type ModalPlacement = "auto" | "top" | "center" | "bottom";
type ModalScroll = "inside" | "outside";

interface ModalContextValue {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: ModalContainerProps["size"];
  backdrop?: "transparent" | "opaque" | "blur";
  scroll?: ModalScroll;
  placement?: ModalPlacement;
  isDismissable?: boolean;
}
const ModalCtx = React.createContext<ModalContextValue>({});

export interface ModalCompatProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: ModalContainerProps["size"] | "xs" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  backdrop?: "transparent" | "opaque" | "blur";
  /** v2 scrollBehavior → v3 scroll */
  scrollBehavior?: ModalScroll;
  placement?: ModalPlacement;
  classNames?: Record<string, string>;
  className?: string;
  isDismissable?: boolean;
  hideCloseButton?: boolean;
  children?: React.ReactNode;
}

function normalizeModalSize(size?: ModalCompatProps["size"]): ModalContainerProps["size"] {
  switch (size) {
    case "xl":
    case "2xl":
    case "3xl":
    case "4xl":
    case "5xl":
      return "lg";
    case "sm":
    case "md":
    case "lg":
    case "full":
    case "cover":
    case "xs":
      return size as ModalContainerProps["size"];
    default:
      return "md";
  }
}

export function Modal({
  isOpen,
  onOpenChange,
  size,
  backdrop,
  scrollBehavior,
  placement,
  classNames: _classNames,
  className: _className,
  isDismissable,
  hideCloseButton: _hideCloseButton,
  children,
}: ModalCompatProps) {
  const normSize = normalizeModalSize(size);
  return (
    <ModalCtx.Provider
      value={{
        isOpen,
        onOpenChange,
        size: normSize,
        backdrop,
        scroll: scrollBehavior,
        placement,
        isDismissable,
      }}
    >
      {children}
    </ModalCtx.Provider>
  );
}

export function ModalContent({ children }: { children?: React.ReactNode | ((onClose: () => void) => React.ReactNode) }) {
  const { isOpen, onOpenChange, size, backdrop, scroll, placement, isDismissable } = React.useContext(ModalCtx);
  const close = React.useCallback(() => onOpenChange?.(false), [onOpenChange]);
  const rendered = typeof children === "function" ? children(close) : children;
  return (
    <HModal.Backdrop
      variant={backdrop ?? "opaque"}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
    >
      <HModal.Container
        size={size ?? "md"}
        placement={placement ?? "center"}
        scroll={scroll}
      >
        <HModal.Dialog>
          {rendered}
        </HModal.Dialog>
      </HModal.Container>
    </HModal.Backdrop>
  );
}

export const ModalHeader = HModal.Header;
export const ModalBody = HModal.Body;
export const ModalFooter = HModal.Footer;

// =============================================================================
// Select — v2 expected <Select label items selectedKeys onSelectionChange>
// We map to v3 Select + Popover + ListBox
// =============================================================================

export interface SelectShimProps<T extends object = object> {
  variant?: "bordered" | "flat" | "underlined" | "faded" | "primary" | "secondary";
  label?: React.ReactNode;
  placeholder?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  classNames?: Record<string, string>;
  className?: string;
  size?: "sm" | "md" | "lg";
  radius?: string;
  selectedKey?: React.Key | null;
  defaultSelectedKey?: React.Key;
  /** v2 multi-mode: array of keys */
  selectedKeys?: Iterable<React.Key> | ReadonlyArray<unknown>;
  defaultSelectedKeys?: Iterable<React.Key> | ReadonlyArray<unknown>;
  selectionMode?: "single" | "multiple";
  /** v2 onSelectionChange (fires with key set) — accepts unknown for compat with various v2 typings */
  onSelectionChange?: (keys: unknown) => void;
  items?: Iterable<T>;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
  description?: React.ReactNode;
  name?: string;
  id?: string;
  "aria-label"?: string;
  fullWidth?: boolean;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
}

export function Select<T extends object = object>({
  variant,
  label,
  placeholder,
  startContent: _start,
  endContent: _end,
  classNames,
  className,
  size: _size,
  radius: _radius,
  selectedKey,
  defaultSelectedKey,
  selectedKeys,
  defaultSelectedKeys,
  selectionMode,
  onSelectionChange,
  items,
  isRequired: _isRequired,
  isDisabled,
  isInvalid: _isInvalid,
  errorMessage: _errorMessage,
  description: _description,
  name,
  id,
  fullWidth,
  children,
  ...rest
}: SelectShimProps<T>) {
  const v3variant: "primary" | "secondary" | undefined =
    variant === "primary" || variant === "secondary"
      ? variant
      : variant
        ? "secondary"
        : undefined;

  // Translate v2 selectedKeys/defaultSelectedKeys → v3 selectedKey/defaultSelectedKey
  const sKey = selectedKey ?? (selectedKeys ? Array.from(selectedKeys as Iterable<React.Key>)[0] ?? null : undefined);
  const dKey = defaultSelectedKey ?? (defaultSelectedKeys ? Array.from(defaultSelectedKeys as Iterable<React.Key>)[0] : undefined);

  const wrappedChange = onSelectionChange
    ? (key: React.Key | null) => {
        if (selectedKeys !== undefined || defaultSelectedKeys !== undefined) {
          // Caller expects iterable of keys
          onSelectionChange(key == null ? new Set() : new Set([key]));
        } else {
          onSelectionChange(key);
        }
      }
    : undefined;

  // We can't easily type-marshall T to v3 SelectRoot's items. Use any for the
  // forwarded props bag to keep this shim ergonomic.
  const selectProps = {
    selectedKey: sKey ?? undefined,
    defaultSelectedKey: dKey,
    onSelectionChange: wrappedChange,
    isDisabled,
    name,
    id,
    fullWidth,
    placeholder,
    items: items as Iterable<T> | undefined,
    ...rest,
  } as unknown as SelectRootProps<T>;

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      {label && (
        <label className="text-sm font-medium text-ink-700 dark:text-ink-300">{label}</label>
      )}
      <HSelect<T> variant={v3variant} {...selectProps}>
        <HSelect.Trigger className={classNames?.trigger}>
          <HSelect.Value className={classNames?.value} />
          <HSelect.Indicator />
        </HSelect.Trigger>
        <HSelect.Popover>
          <HListBox>
            {children as React.ReactElement}
          </HListBox>
        </HSelect.Popover>
      </HSelect>
    </div>
  );
}

export interface SelectItemProps {
  key?: React.Key;
  textValue?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  id?: string | number;
  isDisabled?: boolean;
}

export function SelectItem({ textValue, startContent, endContent, description, children, id, ...rest }: SelectItemProps) {
  // HListBox.Item accepts string|number for id (no bigint).
  const safeId = typeof id === "bigint" ? String(id) : id;
  return (
    <HListBox.Item id={safeId} textValue={textValue} {...rest}>
      <span className="flex items-center gap-2">
        {startContent}
        <span className="flex-1 min-w-0">
          <span className="block">{children}</span>
          {description && <span className="block text-[11px] text-ink-500">{description}</span>}
        </span>
        {endContent}
      </span>
    </HListBox.Item>
  );
}

// =============================================================================
// Tabs — v2 expected <Tabs><Tab key="x" title="Y" /></Tabs>; v3 uses children as label
//
// Two usage patterns supported:
//   1. Navigation tabs (no panel content):
//      <Tab key="all" title="All" />
//      → renders only HTabs.Tab, no HTabs.Panel
//
//   2. Content tabs (title + children = panel):
//      <Tab key="products" title="Products"><ProductsPanel /></Tab>
//      → renders HTabs.Tab (label) + HTabs.Panel (content)
// =============================================================================

export interface TabsCompatProps {
  "aria-label"?: string;
  selectedKey?: React.Key | null;
  defaultSelectedKey?: React.Key;
  onSelectionChange?: (key: React.Key) => void;
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  variant?: "solid" | "bordered" | "light" | "underlined" | "primary" | "secondary";
  color?: "default" | "primary" | "secondary";
  classNames?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
  isDisabled?: boolean;
  disableAnimation?: boolean;
  orientation?: "horizontal" | "vertical";
  isVertical?: boolean;
}

export interface TabCompatProps extends Omit<V3TabProps, "children" | "title" | "id"> {
  key?: React.Key;
  id?: React.Key;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Marker component — `Tabs` reads its props directly via React.Children.
 * Returns null because Tabs handles its own rendering.
 */
export function Tab(_: TabCompatProps): React.ReactElement | null {
  return null;
}

export function Tabs({
  variant,
  size,
  radius: _radius,
  color: _color,
  classNames,
  className,
  children,
  ...rest
}: TabsCompatProps) {
  const v3variant: "primary" | "secondary" | undefined =
    variant === "primary" || variant === "secondary"
      ? variant
      : undefined;

  // Collect Tab descriptor elements — each is a <Tab .../> marker
  const tabs = React.Children.toArray(children) as React.ReactElement<TabCompatProps>[];

  // If any Tab has both a title AND children, we need to render TabPanels
  const hasPanels = tabs.some((t) => Boolean(t.props.title) && Boolean(t.props.children));

  return (
    <HTabs
      variant={v3variant}
      className={[classNames?.base, className].filter(Boolean).join(" ")}
      {...(rest as Record<string, unknown>)}
    >
      {/* Tab list — labels only */}
      <HTabs.List
        className={[
          classNames?.tabList,
          "overflow-x-auto scrollbar-none",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tabs.map((tab) => {
          // React.Children.toArray prefixes original key with '.$'
          const id = String(tab.key ?? "").replace(/^\.\$/, "");
          const {
            title,
            children: _panel,
            id: _id,
            isDisabled,
            className: tabCls,
            ...tabRest
          } = tab.props as TabCompatProps & { isDisabled?: boolean; className?: string };
          return (
            <HTabs.Tab
              key={id}
              id={id}
              isDisabled={isDisabled}
              className={tabCls}
              {...(tabRest as Record<string, unknown>)}
            >
              {/* title is the tab button label; fall back to children if no title */}
              {title ?? (hasPanels ? null : tab.props.children)}
            </HTabs.Tab>
          );
        })}
      </HTabs.List>

      {/* Tab panels — only emitted when content tabs are present */}
      {hasPanels &&
        tabs.map((tab) => {
          const id = String(tab.key ?? "").replace(/^\.\$/, "");
          // Only emit a panel when there's explicit title + panel content
          if (!tab.props.title || !tab.props.children) return null;
          return (
            <HTabs.Panel key={id} id={id}>
              {tab.props.children}
            </HTabs.Panel>
          );
        })}
    </HTabs>
  );
}

// =============================================================================
// Tooltip — v2: <Tooltip content="..." placement="..."><child /></Tooltip>
// v3: <Tooltip><Trigger><child /></Trigger><Content>...</Content></Tooltip>
// =============================================================================

export interface TooltipShimProps {
  content?: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right" | string;
  delay?: number;
  closeDelay?: number;
  children?: React.ReactNode;
  isDisabled?: boolean;
  showArrow?: boolean;
  className?: string;
  classNames?: Record<string, string>;
}

export function Tooltip({ content, placement, delay, closeDelay, children, isDisabled, showArrow, className }: TooltipShimProps) {
  if (isDisabled || !content) {
    return <>{children}</>;
  }
  const v3placement = placement as "top" | "bottom" | "left" | "right" | undefined;
  return (
    <HTooltip delay={delay} closeDelay={closeDelay}>
      <HTooltip.Trigger>{children}</HTooltip.Trigger>
      <HTooltip.Content placement={v3placement} showArrow={showArrow} className={className}>
        {content}
      </HTooltip.Content>
    </HTooltip>
  );
}

// =============================================================================
// Popover — v2: <Popover isOpen onOpenChange placement><PopoverTrigger /><PopoverContent /></Popover>
// =============================================================================

export interface PopoverShimProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: string;
  showArrow?: boolean;
  children?: React.ReactNode;
  isDisabled?: boolean;
  classNames?: Record<string, string>;
  className?: string;
}

const PopoverPlacementCtx = React.createContext<string | undefined>(undefined);

export function Popover({ isOpen, onOpenChange, placement, children }: PopoverShimProps) {
  return (
    <PopoverPlacementCtx.Provider value={placement}>
      <HPopover isOpen={isOpen} onOpenChange={onOpenChange}>
        {children}
      </HPopover>
    </PopoverPlacementCtx.Provider>
  );
}

export function PopoverTrigger({ children }: { children?: React.ReactNode }) {
  return <HPopover.Trigger>{children}</HPopover.Trigger>;
}

export function PopoverContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  const placement = React.useContext(PopoverPlacementCtx);
  const v3placement = placement as "top" | "bottom" | "left" | "right" | undefined;
  return (
    <HPopover.Content placement={v3placement} className={className}>
      <HPopover.Dialog>{children}</HPopover.Dialog>
    </HPopover.Content>
  );
}

// =============================================================================
// Dropdown — v2: <Dropdown placement><DropdownTrigger /><DropdownMenu><DropdownItem /></...></Dropdown>
// =============================================================================

const DropdownPlacementCtx = React.createContext<string | undefined>(undefined);

export interface DropdownShimProps extends Omit<DropdownRootProps, "placement"> {
  placement?: string;
  shouldBlockScroll?: boolean;
}

export function Dropdown({ placement, children, ...rest }: DropdownShimProps) {
  return (
    <DropdownPlacementCtx.Provider value={placement}>
      <HDropdown {...(rest as DropdownRootProps)}>{children}</HDropdown>
    </DropdownPlacementCtx.Provider>
  );
}

export function DropdownTrigger({ children }: { children?: React.ReactNode }) {
  return <HDropdown.Trigger>{children}</HDropdown.Trigger>;
}

export interface DropdownMenuCompatProps {
  "aria-label"?: string;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Iterable<React.Key>;
  defaultSelectedKeys?: Iterable<React.Key>;
  onSelectionChange?: (keys: unknown) => void;
  onAction?: (key: React.Key) => void;
  classNames?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
  variant?: string;
  itemClasses?: Record<string, string>;
}

export function DropdownMenu({ classNames, className, children, ...rest }: DropdownMenuCompatProps) {
  const placement = React.useContext(DropdownPlacementCtx);
  const v3placement = placement as "top" | "bottom" | "left" | "right" | undefined;
  return (
    <HDropdown.Popover placement={v3placement}>
      <HDropdown.Menu
        className={[classNames?.base, className].filter(Boolean).join(" ")}
        {...(rest as Parameters<typeof HDropdown.Menu>[0])}
      >
        {children as React.ReactElement}
      </HDropdown.Menu>
    </HDropdown.Popover>
  );
}

export interface DropdownItemCompatProps {
  key?: React.Key;
  id?: React.Key;
  textValue?: string;
  description?: React.ReactNode;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  className?: string;
  classNames?: Record<string, string>;
  color?: string;
  children?: React.ReactNode;
  shortcut?: React.ReactNode;
  isDisabled?: boolean;
  onPress?: () => void;
  onAction?: () => void;
}

export function DropdownItem({ description, startContent, endContent, shortcut, children, ...rest }: DropdownItemCompatProps) {
  return (
    <HDropdown.Item textValue={rest.textValue ?? (typeof children === "string" ? children : undefined)} {...(rest as Record<string, unknown>)}>
      <span className="flex items-center gap-2 w-full">
        {startContent}
        <span className="flex-1 min-w-0">
          <span className="block">{children}</span>
          {description && <span className="block text-[11px] text-ink-500">{description}</span>}
        </span>
        {endContent}
        {shortcut && <span className="text-[10px] text-ink-400">{shortcut}</span>}
      </span>
    </HDropdown.Item>
  );
}

// =============================================================================
// Switch — v2: isSelected, onValueChange; v3: isSelected, onChange
// =============================================================================

export interface SwitchShimProps extends Omit<SwitchRootProps, "size" | "onChange"> {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onValueChange?: (selected: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: "sm" | "md" | "lg";
  color?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  thumbIcon?: React.ReactNode;
  classNames?: Record<string, string>;
  children?: React.ReactNode;
}

export function Switch({
  isSelected,
  defaultSelected,
  onValueChange,
  size,
  startContent: _start,
  endContent: _end,
  thumbIcon: _thumb,
  classNames,
  className,
  children,
  ...rest
}: SwitchShimProps) {
  return (
    <HSwitch
      isSelected={isSelected}
      defaultSelected={defaultSelected}
      size={size}
      onChange={(checked: boolean) => onValueChange?.(checked)}
      className={[classNames?.base, className].filter(Boolean).join(" ")}
      {...(rest as Omit<SwitchRootProps, "size" | "onChange">)}
    >
      {children}
    </HSwitch>
  );
}

// =============================================================================
// Chip — v2 props: color, variant, size
// v3 colors: accent | danger | default | success | warning
// v3 variants: primary | secondary | soft | tertiary
// =============================================================================

type V3ChipColor = "accent" | "danger" | "default" | "success" | "warning";
type V3ChipVariant = "primary" | "secondary" | "soft" | "tertiary";

function mapChipColor(v2?: V2ButtonColor): V3ChipColor {
  switch (v2) {
    case "primary": return "accent";
    case "success": return "success";
    case "warning": return "warning";
    case "danger": return "danger";
    default: return "default";
  }
}

function mapChipVariant(v2?: string): V3ChipVariant {
  switch (v2) {
    case "solid": case "shadow": return "primary";
    case "bordered": return "secondary";
    case "flat": case "faded": return "soft";
    case "light": case "ghost": return "tertiary";
    default: return "secondary";
  }
}

export interface ChipShimProps {
  color?: V2ButtonColor;
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "dot";
  size?: "sm" | "md" | "lg";
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  className?: string;
  classNames?: Record<string, string>;
  radius?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  as?: React.ElementType;
  onClick?: () => void;
  [key: string]: unknown;
}

export function Chip({
  color,
  variant,
  size,
  startContent,
  endContent,
  className,
  classNames,
  as: As,
  children,
  onClose: _onClose,
  ...rest
}: ChipShimProps) {
  if (As) {
    const Component = As as React.ElementType;
    return (
      <Component
        className={[classNames?.base, className].filter(Boolean).join(" ")}
        {...rest}
      >
        {startContent}
        {children}
        {endContent}
      </Component>
    );
  }
  return (
    <HChip
      className={[classNames?.base, className].filter(Boolean).join(" ")}
      size={size}
      color={mapChipColor(color)}
      variant={mapChipVariant(variant)}
    >
      {startContent}
      {children}
      {endContent}
    </HChip>
  );
}

// =============================================================================
// Re-export common components passthrough
// =============================================================================

export {
  Avatar,
  Card,
  Checkbox,
  CheckboxGroup,
  Spinner,
  Skeleton,
  ProgressBar as Progress,
  Badge,
  Kbd,
} from "@heroui/react";
