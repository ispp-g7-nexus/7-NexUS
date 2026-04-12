import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

type MetricInfoProps = {
  title?: string;
  description: string;
};

export const MetricInfo = ({ title, description }: MetricInfoProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={title ? `Info sobre ${title}` : "Info"}
          className="p-1.5 rounded-full hover:bg-muted-foreground/10 focus:outline-none"
          title={title}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 8v4" />
            </svg>
          </div>
          <div>
            {title && <div className="font-semibold text-sm">{title}</div>}
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MetricInfo;
