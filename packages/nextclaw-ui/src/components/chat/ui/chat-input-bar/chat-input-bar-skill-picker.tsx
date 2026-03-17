import { useEffect, useId, useMemo, useRef, useState, type KeyboardEventHandler } from 'react';
import { useActiveItemScroll } from '@/components/chat/hooks/use-active-item-scroll';
import type { ChatSkillPickerOption, ChatSkillPickerProps } from '@/components/chat/view-models/chat-ui.types';
import { ChatUiPrimitives } from '@/components/chat/ui/primitives/chat-ui-primitives';
import { BrainCircuit, Check, ExternalLink, Puzzle, Search } from 'lucide-react';

function filterOptions(options: ChatSkillPickerOption[], query: string): ChatSkillPickerOption[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) {
    return options;
  }
  return options.filter((option) => {
    const haystack = [option.label, option.key, option.description]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

export function ChatInputBarSkillPicker(props: { picker: ChatSkillPickerProps }) {
  const { Input, Popover, PopoverContent, PopoverTrigger } = ChatUiPrimitives;
  const { picker } = props;
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedSet = useMemo(() => new Set(picker.selectedKeys), [picker.selectedKeys]);
  const selectedCount = picker.selectedKeys.length;
  const filteredOptions = useMemo(() => filterOptions(picker.options, query), [picker.options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) {
        return 0;
      }
      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions.length]);

  useActiveItemScroll({
    containerRef: listRef,
    activeIndex,
    itemCount: filteredOptions.length,
    isEnabled: filteredOptions.length > 0,
    getItemSelector: (index) => `[data-skill-index="${index}"]`
  });

  const onToggleOption = (optionKey: string) => {
    if (selectedSet.has(optionKey)) {
      picker.onSelectedKeysChange(picker.selectedKeys.filter((item) => item !== optionKey));
      return;
    }
    picker.onSelectedKeysChange([...picker.selectedKeys, optionKey]);
  };

  const onSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (filteredOptions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const activeOption = filteredOptions[activeIndex];
      if (activeOption) {
        onToggleOption(activeOption.key);
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <BrainCircuit className="h-4 w-4" />
          <span>{picker.title}</span>
          {selectedCount > 0 ? (
            <span className="ml-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {selectedCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[360px] p-0">
        <div className="space-y-2 border-b border-gray-100 px-4 py-3">
          <div className="text-sm font-semibold text-gray-900">{picker.title}</div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={picker.searchPlaceholder}
              role="combobox"
              aria-controls={listId}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-activedescendant={filteredOptions[activeIndex] ? `${listId}-option-${activeIndex}` : undefined}
              className="h-8 rounded-lg pl-8 text-xs"
            />
          </div>
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="custom-scrollbar max-h-[320px] overflow-y-auto"
        >
          {picker.isLoading ? (
            <div className="p-4 text-xs text-gray-500">{picker.loadingLabel}</div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">{picker.emptyLabel}</div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option, index) => {
                const isSelected = selectedSet.has(option.key);
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.key}
                    type="button"
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    data-skill-index={index}
                    onClick={() => onToggleOption(option.key)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Puzzle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-gray-900">{option.label}</span>
                        {option.badgeLabel ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {option.badgeLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">{option.description || option.key}</div>
                    </div>
                    <div className="ml-3 shrink-0">
                      <span
                        className={
                          isSelected
                            ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white'
                            : 'inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white'
                        }
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {picker.manageHref && picker.manageLabel ? (
          <div className="border-t border-gray-100 px-4 py-2.5">
            <a
              href={picker.manageHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              {picker.manageLabel}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
