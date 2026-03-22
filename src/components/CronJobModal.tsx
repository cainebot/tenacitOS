"use client";

import { useState, useEffect } from "react";
import { X, Clock, Calendar, ChevronDown, Zap } from "lucide-react";
import { Button, Input, TextArea, Modal, ModalHeader, ModalBody, ModalFooter, Badge } from "@openclaw/ui";
import { cronToHuman, getNextRuns, isValidCron, CRON_PRESETS } from "@/lib/cron-parser";
import type { CronJob } from "./CronJobCard";

interface CronJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Partial<CronJob>) => void;
  editingJob?: CronJob | null;
}

const TIMEZONES = [
  "UTC", "Europe/Madrid", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Singapore", "Australia/Sydney",
];

// Visual builder modes
type FrequencyMode = "every-minutes" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

const FREQUENCY_MODES: Array<{ id: FrequencyMode; label: string; emoji: string }> = [
  { id: "every-minutes", label: "Every N minutes", emoji: "⏱️" },
  { id: "hourly", label: "Hourly", emoji: "🕐" },
  { id: "daily", label: "Daily", emoji: "☀️" },
  { id: "weekly", label: "Weekly", emoji: "📅" },
  { id: "monthly", label: "Monthly", emoji: "🗓️" },
  { id: "custom", label: "Custom cron", emoji: "⚙️" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Template presets
const TEMPLATES = [
  { label: "Daily backup at 3 AM", cron: "0 3 * * *" },
  { label: "Weekday morning report (9 AM)", cron: "0 9 * * 1-5" },
  { label: "Hourly health check", cron: "0 * * * *" },
  { label: "Every 15 minutes", cron: "*/15 * * * *" },
  { label: "Weekly cleanup (Sunday midnight)", cron: "0 0 * * 0" },
  { label: "First of month report", cron: "0 8 1 * *" },
  { label: "Every 5 minutes", cron: "*/5 * * * *" },
  { label: "Twice daily (9 AM & 9 PM)", cron: "0 9,21 * * *" },
];

function buildCron(mode: FrequencyMode, opts: Record<string, number | number[]>): string {
  switch (mode) {
    case "every-minutes":
      return `*/${opts.minutes || 5} * * * *`;
    case "hourly":
      return `${opts.minute || 0} * * * *`;
    case "daily":
      return `${opts.minute || 0} ${opts.hour || 9} * * *`;
    case "weekly": {
      const days = Array.isArray(opts.days) && opts.days.length > 0 ? opts.days.join(",") : "1";
      return `${opts.minute || 0} ${opts.hour || 9} * * ${days}`;
    }
    case "monthly":
      return `${opts.minute || 0} ${opts.hour || 9} ${opts.day || 1} * *`;
    default:
      return "0 9 * * *";
  }
}

export function CronJobModal({ isOpen, onClose, onSave, editingJob }: CronJobModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("0 9 * * *");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>("daily");
  const [showPresets, setShowPresets] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Visual builder state
  const [everyMinutes, setEveryMinutes] = useState(15);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(1);

  useEffect(() => {
    if (isOpen) {
      if (editingJob) {
        setName(editingJob.name);
        setDescription(editingJob.description);
        setSchedule(typeof editingJob.schedule === "string" ? editingJob.schedule : String(editingJob.schedule));
        setTimezone(editingJob.timezone);
        setFrequencyMode("custom");
      } else {
        setName("");
        setDescription("");
        setSchedule("0 9 * * *");
        setTimezone("Europe/Madrid");
        setFrequencyMode("daily");
      }
      setErrors({});
    }
  }, [isOpen, editingJob]);

  // Update schedule when visual builder changes
  useEffect(() => {
    if (frequencyMode === "custom") return;
    const newSchedule = buildCron(frequencyMode, {
      minutes: everyMinutes,
      minute: selectedMinute,
      hour: selectedHour,
      days: selectedDays,
      day: selectedDayOfMonth,
    });
    setSchedule(newSchedule);
  }, [frequencyMode, everyMinutes, selectedHour, selectedMinute, selectedDays, selectedDayOfMonth]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!schedule.trim()) newErrors.schedule = "Schedule is required";
    else if (!isValidCron(schedule)) newErrors.schedule = "Invalid cron expression";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave({
        id: editingJob?.id,
        name: name.trim(),
        description: description.trim(),
        schedule: schedule.trim(),
        timezone,
        enabled: editingJob?.enabled ?? true,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const nextRuns = isValidCron(schedule) ? getNextRuns(schedule, 5) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mx-4 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-100 shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-gray-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">
            {editingJob ? "✏️ Edit Cron Job" : "➕ Create Cron Job"}
          </h2>
          <Button variant="ghost" size="sm" onPress={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Name */}
          <Input
            label="Job Name *"
            value={name}
            onChange={(v) => { setName(v); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
            placeholder="e.g., Daily Backup"
            isInvalid={!!errors.name}
            hint={errors.name || undefined}
          />

          {/* Description */}
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="What does this job do?"
            rows={2}
          />

          {/* Frequency Builder */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Frequency
            </label>

            {/* Mode selector */}
            <div className="mb-4 flex flex-wrap gap-2">
              {FREQUENCY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setFrequencyMode(mode.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    frequencyMode === mode.id
                      ? "border-[#FF3B30]/40 bg-[#FF3B30]/15 text-[#FF3B30]"
                      : "border-white/10 bg-white/5 text-gray-700 hover:border-white/20"
                  }`}
                >
                  {mode.emoji} {mode.label}
                </button>
              ))}
            </div>

            {/* Visual controls per mode */}
            {frequencyMode === "every-minutes" && (
              <div className="rounded-xl bg-white/5 p-4">
                <label className="mb-2 block text-sm text-gray-700">Every</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={60} value={everyMinutes}
                    onChange={(e) => setEveryMinutes(Number(e.target.value))}
                    className="flex-1 accent-[#FF3B30]"
                  />
                  <span className="min-w-16 text-center font-bold text-[#FF3B30]">
                    {everyMinutes} min
                  </span>
                </div>
              </div>
            )}

            {frequencyMode === "hourly" && (
              <div className="rounded-xl bg-white/5 p-4">
                <label className="mb-2 block text-sm text-gray-700">At minute</label>
                <div className="flex flex-wrap gap-2">
                  {MINUTES.map((m) => (
                    <button key={m} type="button" onClick={() => setSelectedMinute(m)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selectedMinute === m
                          ? "border-transparent bg-[#FF3B30] text-black"
                          : "border-white/10 bg-white/5 text-gray-700"
                      }`}>
                      :{String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(frequencyMode === "daily" || frequencyMode === "weekly" || frequencyMode === "monthly") && (
              <div className="flex flex-col gap-4 rounded-xl bg-white/5 p-4">
                <div>
                  <label className="mb-2 block text-sm text-gray-700">At time</label>
                  <div className="flex items-center gap-2">
                    <select value={selectedHour} onChange={(e) => setSelectedHour(Number(e.target.value))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none">
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                      ))}
                    </select>
                    <span className="text-gray-600">:</span>
                    <select value={selectedMinute} onChange={(e) => setSelectedMinute(Number(e.target.value))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none">
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {frequencyMode === "weekly" && (
                  <div>
                    <label className="mb-2 block text-sm text-gray-700">On days</label>
                    <div className="flex gap-1.5">
                      {WEEKDAYS.map((day, i) => (
                        <button key={day} type="button" onClick={() => toggleDay(i)}
                          className={`flex-1 rounded-lg border py-2 text-xs ${
                            selectedDays.includes(i)
                              ? "border-transparent bg-[#FF3B30] font-bold text-black"
                              : "border-white/10 bg-white/5 text-gray-700"
                          }`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequencyMode === "monthly" && (
                  <div>
                    <label className="mb-2 block text-sm text-gray-700">On day of month</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={1} max={28} value={selectedDayOfMonth}
                        onChange={(e) => setSelectedDayOfMonth(Number(e.target.value))}
                        className="flex-1 accent-[#FF3B30]"
                      />
                      <span className="min-w-12 text-center font-bold text-[#FF3B30]">
                        Day {selectedDayOfMonth}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom cron input */}
            {frequencyMode === "custom" && (
              <div className="relative">
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => { setSchedule(e.target.value); if (errors.schedule) setErrors((p) => ({ ...p, schedule: "" })); }}
                  placeholder="* * * * *"
                  className={`w-full rounded-lg border bg-white/5 px-4 py-3 pr-24 font-mono text-sm text-white outline-none ${
                    errors.schedule ? "border-red-500" : "border-white/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-700"
                >
                  Presets <ChevronDown className={`h-3 w-3 transition-transform ${showPresets ? "rotate-180" : ""}`} />
                </button>

                {showPresets && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-gray-100 shadow-2xl">
                    {CRON_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => { setSchedule(preset.value); setShowPresets(false); }}
                        className="flex w-full items-center justify-between border-b border-white/5 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                      >
                        <span className="text-sm text-white">{preset.label}</span>
                        <code className="text-xs text-gray-600">{preset.value}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {errors.schedule && <p className="mt-1 text-sm text-red-400">{errors.schedule}</p>}

            {/* Generated cron expression display */}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/5 p-3">
              <code className="font-mono text-base font-bold text-[#FF3B30]">
                {schedule}
              </code>
              {isValidCron(schedule) && (
                <span className="text-sm text-gray-700">
                  → {cronToHuman(schedule)}
                </span>
              )}
            </div>
          </div>

          {/* Templates */}
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 border-none bg-transparent text-sm font-medium text-gray-700"
            >
              <Zap className="h-4 w-4" />
              Templates
              <ChevronDown className={`h-4 w-4 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
            </button>

            {showTemplates && (
              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.cron}
                    type="button"
                    onClick={() => { setSchedule(t.cron); setFrequencyMode("custom"); setShowTemplates(false); }}
                    className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-gray-700 transition-all hover:border-[#FF3B30]/40 hover:text-[#FF3B30]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Preview Next Runs */}
          {nextRuns.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">
                  Preview: Next 5 executions
                </span>
              </div>
              <div className="space-y-2">
                {nextRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-bold text-purple-400">
                      {i + 1}
                    </span>
                    {run.toLocaleString("es-ES", {
                      weekday: "short", year: "numeric", month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit", hour12: false,
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <Button variant="ghost" onPress={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSaving}
              isDisabled={isSaving}
              onPress={() => handleSubmit(new Event("submit") as unknown as React.FormEvent)}
            >
              {editingJob ? "Update Job" : "Create Job"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
