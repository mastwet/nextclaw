import { Input as DefaultInput } from '@/components/ui/input';
import {
  Popover as DefaultPopover,
  PopoverAnchor as DefaultPopoverAnchor,
  PopoverContent as DefaultPopoverContent,
  PopoverTrigger as DefaultPopoverTrigger
} from '@/components/ui/popover';
import {
  Select as DefaultSelect,
  SelectContent as DefaultSelectContent,
  SelectItem as DefaultSelectItem,
  SelectTrigger as DefaultSelectTrigger,
  SelectValue as DefaultSelectValue
} from '@/components/ui/select';
import {
  Tooltip as DefaultTooltip,
  TooltipContent as DefaultTooltipContent,
  TooltipProvider as DefaultTooltipProvider,
  TooltipTrigger as DefaultTooltipTrigger
} from '@/components/ui/tooltip';

// Centralized primitive adapter layer for chat UI.
export const ChatUiPrimitives = {
  Popover: DefaultPopover,
  PopoverAnchor: DefaultPopoverAnchor,
  PopoverContent: DefaultPopoverContent,
  PopoverTrigger: DefaultPopoverTrigger,
  Input: DefaultInput,
  Select: DefaultSelect,
  SelectContent: DefaultSelectContent,
  SelectItem: DefaultSelectItem,
  SelectTrigger: DefaultSelectTrigger,
  SelectValue: DefaultSelectValue,
  Tooltip: DefaultTooltip,
  TooltipContent: DefaultTooltipContent,
  TooltipProvider: DefaultTooltipProvider,
  TooltipTrigger: DefaultTooltipTrigger
};
