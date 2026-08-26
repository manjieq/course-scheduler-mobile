import { useState } from 'react';
import { ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

import type { LoadoutRow } from '../../lib/loadouts';
import { useComparisonLayout } from '../../lib/loadout-compare';
import { ComparisonPanel } from './ComparisonPanel';

const MIN_PANEL_WIDTH = 170;
const PANEL_GAP = 12;

interface LoadoutComparisonViewProps {
  loadouts: LoadoutRow[];
  coursesById: Map<string, Course>;
  maxCredits: number;
  colorFor: (courseId: string) => string;
}

// Phase 6 refinement: this used to stack a full ScheduleGrid per loadout
// vertically (the prototype's side-by-side row only worked on the web's
// wider viewport — see the old comment this replaces), which meant
// portrait never actually showed loadouts *side by side*, only the
// landscape-only app/loadout-compare.tsx did. ComparisonPanel — built for
// that landscape screen, and deliberately not ScheduleGrid, because it
// never scrolls itself (see ComparisonPanel.tsx's own comment) — turns out
// to be exactly as safe to nest in *this* screen's outer vertical
// ScrollView (app/(tabs)/loadouts.tsx), just narrower. Same even-width-
// then-horizontal-scroll approach as the landscape screen, just with a
// smaller floor to fit a phone's portrait width; that screen stays the
// place for a bigger, full-detail comparison.
export function LoadoutComparisonView({ loadouts, coursesById, maxCredits, colorFor }: LoadoutComparisonViewProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  // One shared hour range/day set across every panel, plus which courses
  // are actually common to every loadout shown — see lib/loadout-compare.ts.
  // ComparisonPanel uses the latter to dash-outline a course that isn't in
  // every loadout, so a reader can spot what differs without eyeballing
  // multiple grids against each other.
  const { loadoutCourses, startHour, endHour, days, sharedCourseIds } = useComparisonLayout(loadouts, coursesById);

  if (loadouts.length < 2) return null;

  const count = loadouts.length;
  const evenWidth = containerWidth ? (containerWidth - PANEL_GAP * (count - 1)) / count : 0;
  const fitsEven = evenWidth >= MIN_PANEL_WIDTH;
  const panelWidth = fitsEven ? evenWidth : MIN_PANEL_WIDTH;

  function renderPanels() {
    return loadouts.map((loadout, i) => (
      <ComparisonPanel
        key={loadout.id}
        name={loadout.name}
        totalCredits={loadout.totalCredits}
        courses={loadoutCourses[i]}
        maxCredits={maxCredits}
        colorFor={colorFor}
        width={panelWidth}
        startHour={startHour}
        endHour={endHour}
        days={days}
        sharedCourseIds={sharedCourseIds}
      />
    ));
  }

  return (
    <View className="mt-4 gap-2" onLayout={handleLayout}>
      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        Comparing {count} loadouts
      </Text>
      <Text className="text-[11px] text-neutral-500 dark:text-neutral-400">
        Dashed outline = not in every loadout shown ({sharedCourseIds.size} course
        {sharedCourseIds.size === 1 ? '' : 's'} shared by all)
      </Text>
      {fitsEven ? (
        <View className="flex-row gap-3">{renderPanels()}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="flex-row gap-3">
          {renderPanels()}
        </ScrollView>
      )}
    </View>
  );
}
