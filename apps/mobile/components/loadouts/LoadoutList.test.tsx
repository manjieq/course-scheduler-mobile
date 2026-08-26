import { render, screen } from '@testing-library/react-native';

import type { Course } from '@course-scheduler/shared-types';

import type { LoadoutRow } from '../../lib/loadouts';
import { LoadoutList } from './LoadoutList';

const noop = jest.fn();

describe('LoadoutList', () => {
  it('shows the empty-state message when there are no loadouts', async () => {
    await render(
      <LoadoutList
        loadouts={[]}
        coursesById={new Map()}
        maxCredits={18}
        compareSelectedIds={new Set()}
        onLoad={noop}
        onDelete={noop}
        onToggleCompare={noop}
      />
    );
    expect(screen.getByText(/No loadouts saved yet/)).toBeTruthy();
  });

  it('renders one card per loadout, and no empty-state message', async () => {
    const course: Course = {
      id: 'course-1',
      departmentId: 'dept-1',
      code: 'CS 101',
      name: 'Intro to Computer Science',
      credits: 3,
      category: 'core',
      schedule: [],
    };
    const loadouts: LoadoutRow[] = [
      {
        id: 'loadout-1',
        name: 'Fall option A',
        universityId: 'uni-1',
        departmentId: 'dept-1',
        totalCredits: 3,
        createdAt: new Date().toISOString(),
        courseIds: ['course-1'],
      },
      {
        id: 'loadout-2',
        name: 'Fall option B',
        universityId: 'uni-1',
        departmentId: 'dept-1',
        totalCredits: 0,
        createdAt: new Date().toISOString(),
        courseIds: [],
      },
    ];

    await render(
      <LoadoutList
        loadouts={loadouts}
        coursesById={new Map([['course-1', course]])}
        maxCredits={18}
        compareSelectedIds={new Set()}
        onLoad={noop}
        onDelete={noop}
        onToggleCompare={noop}
      />
    );

    expect(screen.getByText('Fall option A')).toBeTruthy();
    expect(screen.getByText('Fall option B')).toBeTruthy();
    expect(screen.queryByText(/No loadouts saved yet/)).toBeNull();
  });
});
