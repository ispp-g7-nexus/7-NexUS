import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

interface InteractiveDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
}

export function InteractiveDatePicker({
  value,
  onChange,
  minDate,
  className = "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  inputClassName = "flex-1 w-full",
  id,
}: InteractiveDatePickerProps) {
  const [inputDate, setInputDate] = useState(value);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const interactionType = useRef<'keyboard' | 'picker'>('keyboard');
  useEffect(() => {
    setInputDate(value);
  }, [value]);

  const handleDateCommit = (directDate?: string) => {
    const valueToEvaluate = typeof directDate === "string" ? directDate : inputDate;
    if (!valueToEvaluate) {
      setInputDate(value);
      return;
    }
    const year = parseInt(valueToEvaluate.split('-')[0], 10);
    const currentYear = new Date().getFullYear();

    if (year >= currentYear && year <= currentYear + 2) {
      if (minDate && valueToEvaluate < minDate) {
        setInputDate(value);
        return;
      }
      onChange(valueToEvaluate);
      setInputDate(valueToEvaluate);
    } else {
      setInputDate(value);
    }
  };

  return (
    <div className={className}>
      <CalendarDays 
        className="h-4 w-4 cursor-pointer text-muted-foreground transition-colors hover:text-foreground group-focus-within:text-[#4A7C59]" 
        onClick={() => {
          interactionType.current = 'picker';
          dateInputRef.current?.showPicker();
        }}
      />
      <input
        ref={dateInputRef}
        type="date"
        min={minDate}
        value={inputDate}
        required
        id={id}
        onClick={() => {
          interactionType.current = 'keyboard';
        }}
        onKeyDown={(e) => {
          interactionType.current = 'keyboard';
          if (e.key === "Enter") {
            e.preventDefault();
            handleDateCommit();
          }
        }}
        onChange={(event) => {
          const newValue = event.target.value;
          setInputDate(newValue);
          if (interactionType.current === 'picker' && newValue) {
            handleDateCommit(newValue);
            interactionType.current = 'keyboard';
          }
        }}
        onBlur={() => handleDateCommit()}
        className={`bg-transparent text-foreground outline-none border-none p-0 focus:ring-0 [&::-webkit-calendar-picker-indicator]:hidden cursor-text ${inputClassName}`}
      />
    </div>
  );
}