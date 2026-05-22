import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/components/church/ui";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
}

export function EventCalendar({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: CalendarEvent[];
  selectedDate?: Date;
  onSelectDate: (date: Date | undefined) => void;
}) {
  const eventDates = new Set(events.map((e) => e.date));

  const modifiers = {
    hasEvent: (date: Date) => {
      const key = date.toISOString().slice(0, 10);
      return eventDates.has(key);
    },
  };

  const modifiersClassNames = {
    hasEvent: "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[hsl(174,55%,42%)]",
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onSelectDate}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      className={cn("rounded-lg border p-3 pointer-events-auto")}
    />
  );
}
