import type { EmojiReactionButtonVariants } from "./emoji-reaction-button.styles";
import type { ComponentPropsWithRef } from "react";
import { ToggleButton as ToggleButtonPrimitive } from "react-aria-components/ToggleButton";
interface EmojiReactionButtonRootProps extends ComponentPropsWithRef<typeof ToggleButtonPrimitive> {
    /** Size variant. @default "md" */
    size?: EmojiReactionButtonVariants["size"];
}
declare const EmojiReactionButtonRoot: ({ children, className, size, ...props }: EmojiReactionButtonRootProps) => import("react/jsx-runtime").JSX.Element;
interface EmojiReactionButtonEmojiProps extends ComponentPropsWithRef<"span"> {
}
declare const EmojiReactionButtonEmoji: ({ children, className, ...props }: EmojiReactionButtonEmojiProps) => import("react/jsx-runtime").JSX.Element;
interface EmojiReactionButtonCountProps extends ComponentPropsWithRef<"span"> {
}
declare const EmojiReactionButtonCount: ({ children, className, ...props }: EmojiReactionButtonCountProps) => import("react/jsx-runtime").JSX.Element;
export { EmojiReactionButtonRoot, EmojiReactionButtonEmoji, EmojiReactionButtonCount };
export type { EmojiReactionButtonRootProps, EmojiReactionButtonEmojiProps, EmojiReactionButtonCountProps, };
