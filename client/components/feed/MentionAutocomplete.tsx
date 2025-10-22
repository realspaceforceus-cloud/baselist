import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface MentionSuggestion {
  id: string;
  username: string;
  avatarUrl?: string;
  lastInteracted?: string;
}

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  isTextarea?: boolean;
  userId?: string; // Current user ID for smart filtering
}

export function MentionAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  onFocus,
  onBlur,
  onKeyPress,
  isTextarea = false,
  userId,
}: MentionAutocompleteProps): JSX.Element {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract current word being typed after @
  const getCurrentMentionWord = () => {
    if (!inputRef.current) return null;
    const text = value;
    const cursorPos = inputRef.current.selectionStart || text.length;

    // Find the last @ before cursor
    const lastAtPos = text.lastIndexOf("@", cursorPos - 1);
    if (lastAtPos === -1) return null;

    // Get text after @ until cursor
    const word = text.substring(lastAtPos + 1, cursorPos);

    // Only show suggestions if word doesn't contain space or special chars
    if (/\s/.test(word)) return null;

    return {
      word,
      startPos: lastAtPos,
      endPos: cursorPos,
    };
  };

  // Fetch suggestions
  useEffect(() => {
    const mention = getCurrentMentionWord();
    if (!mention || mention.word.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          `/.netlify/functions/feed-mentions?q=${encodeURIComponent(mention.word)}`,
          { credentials: "include" },
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(data.suggestions?.length > 0);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error("Error fetching mention suggestions:", error);
      }
    };

    fetchSuggestions();
  }, [value, userId]);

  const insertMention = (username: string) => {
    if (!inputRef.current) return;

    const mention = getCurrentMentionWord();
    if (!mention) return;

    const newValue =
      value.substring(0, mention.startPos) +
      `@${username} ` +
      value.substring(mention.endPos);

    onChange(newValue);
    setShowSuggestions(false);

    // Move cursor after mention
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = mention.startPos + username.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mentions autocomplete
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          return;
        case "Enter":
          if (selectedIndex >= 0) {
            e.preventDefault();
            insertMention(suggestions[selectedIndex].username);
            return;
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          return;
      }
    }

    // Pass other key events through
    onKeyPress?.(e);
  };

  const Component = isTextarea ? "textarea" : "input";

  return (
    <div className="relative w-full">
      <Component
        ref={inputRef as any}
        type={isTextarea ? undefined : "text"}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => insertMention(suggestion.username)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition ${
                index === selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <img
                src={
                  suggestion.avatarUrl ||
                  "https://api.dicebear.com/7.x/initials/svg?seed=user"
                }
                alt={suggestion.username}
                className="h-5 w-5 rounded-full object-cover"
              />
              <span className="flex-1">@{suggestion.username}</span>
              {suggestion.lastInteracted && (
                <span className="text-xs text-muted-foreground">recent</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
