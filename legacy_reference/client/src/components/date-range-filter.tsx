import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

const PRESET_RANGES = [
  { id: '1m', labelEn: 'Last Month', labelAr: 'آخر شهر', months: 1 },
  { id: '3m', labelEn: 'Last 3 Months', labelAr: 'آخر 3 أشهر', months: 3 },
  { id: '6m', labelEn: 'Last 6 Months', labelAr: 'آخر 6 أشهر', months: 6 },
  { id: '1y', labelEn: 'Last Year', labelAr: 'آخر سنة', months: 12 },
  { id: 'ytd', labelEn: 'Year to Date', labelAr: 'من بداية العام', months: -1 },
  { id: 'all', labelEn: 'All Time', labelAr: 'كل الأوقات', months: -2 },
];

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: value?.start,
    to: value?.end,
  });

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    const end = new Date();
    let start: Date;

    if (preset.months === -1) {
      // Year to Date
      start = new Date(end.getFullYear(), 0, 1);
    } else if (preset.months === -2) {
      // All Time - clear filter
      onChange(undefined);
      setIsOpen(false);
      return;
    } else {
      // Last N months
      start = new Date();
      start.setMonth(start.getMonth() - preset.months);
    }

    onChange({ start, end });
    setTempRange({ from: start, to: end });
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange({
        start: tempRange.from,
        end: tempRange.to,
      });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setTempRange({ from: undefined, to: undefined });
    setIsOpen(false);
  };

  const displayText = value
    ? `${format(value.start, 'MMM dd, yyyy')} - ${format(value.end, 'MMM dd, yyyy')}`
    : language === 'ar' ? 'اختر الفترة' : 'Select date range';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            data-testid="button-date-range"
            variant="outline"
            className={cn(
              "justify-start text-start font-normal min-w-[200px]",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            {/* Preset buttons */}
            <div className="grid grid-cols-2 gap-2">
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.id}
                  data-testid={`button-preset-${preset.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="justify-start"
                >
                  {language === 'ar' ? preset.labelAr : preset.labelEn}
                </Button>
              ))}
            </div>

            <div className="border-t pt-4">
              <p className={`text-sm font-medium mb-2 ${language === 'ar' ? 'text-[15px] font-medium' : ''}`}>
                {language === 'ar' ? 'أو اختر فترة مخصصة:' : 'Or choose custom range:'}
              </p>
              <div className="flex gap-2">
                <div>
                  <p className={`text-xs text-muted-foreground mb-1 ${language === 'ar' ? 'text-[13px] font-medium' : ''}`}>
                    {language === 'ar' ? 'من' : 'From'}
                  </p>
                  <Calendar
                    mode="single"
                    selected={tempRange.from}
                    onSelect={(date) => setTempRange({ ...tempRange, from: date })}
                    initialFocus
                  />
                </div>
                <div>
                  <p className={`text-xs text-muted-foreground mb-1 ${language === 'ar' ? 'text-[13px] font-medium' : ''}`}>
                    {language === 'ar' ? 'إلى' : 'To'}
                  </p>
                  <Calendar
                    mode="single"
                    selected={tempRange.to}
                    onSelect={(date) => setTempRange({ ...tempRange, to: date })}
                    disabled={(date) => tempRange.from ? date < tempRange.from : false}
                    initialFocus
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4">
              <Button
                data-testid="button-clear-range"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                {language === 'ar' ? 'مسح' : 'Clear'}
              </Button>
              <Button
                data-testid="button-apply-range"
                size="sm"
                onClick={handleApply}
                disabled={!tempRange.from || !tempRange.to}
              >
                {language === 'ar' ? 'تطبيق' : 'Apply'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          data-testid="button-clear-filter"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
