
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface CreatableSelectOption {
  value: string
  label: string
}

interface CreatableSelectProps {
  options: CreatableSelectOption[]
  value: string
  onChange: (value: string) => void
  onCreate: (inputValue: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyResultText?: string
  createText?: (inputValue: string) => string
}

export function CreatableSelect({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Select an option...",
  searchPlaceholder = "Search or create...",
  emptyResultText = "No results found.",
  createText = (inputValue) => `+ Create "${inputValue}"`,
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleCreate = () => {
    if (inputValue) {
      onCreate(inputValue)
      setInputValue("")
      setOpen(false)
    }
  }
  
  const showCreateOption =
    inputValue && !options.some((opt) => opt.label.toLowerCase() === inputValue.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                <div onMouseDown={(e) => { e.preventDefault(); handleCreate(); }} className="cursor-pointer p-2 text-sm text-center">
                    {createText && createText(inputValue)}
                </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                    setInputValue("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
