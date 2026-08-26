import { render, screen } from '@testing-library/react-native';

import type { Course, TimeSlot } from '@course-scheduler/shared-types';

import { EventBlock } from './EventBlock';

const course: Course = {
  id: 'course-1',
  departmentId: 'dept-1',
  code: 'CS 101',
  name: 'Intro to Computer Science',
  credits: 3,
  category: 'core',
  schedule: [],
};

const slot: TimeSlot = { day: 'MON', start: '09:00', end: '10:30' };

const position = { top: 0, height: 60, left: '0%', width: '100%' } as const;

type ToJSON = Awaited<ReturnType<typeof render>>['toJSON'];

function className(toJSON: ToJSON) {
  const node = toJSON();
  return Array.isArray(node) ? node[0]?.props.className : node?.props.className;
}

describe('EventBlock', () => {
  it("renders the course code and the slot's formatted time range", async () => {
    await render(<EventBlock course={course} slot={slot} color="#336699" conflicted={false} position={position} />);
    expect(screen.getByText('CS 101')).toBeTruthy();
    expect(screen.getByText('9:00 AM-10:30 AM')).toBeTruthy();
  });

  it('applies no border by default', async () => {
    const { toJSON } = await render(
      <EventBlock course={course} slot={slot} color="#336699" conflicted={false} position={position} />
    );
    expect(className(toJSON)).not.toContain('border');
  });

  it('applies the solid conflict border when conflicted', async () => {
    const { toJSON } = await render(
      <EventBlock course={course} slot={slot} color="#336699" conflicted position={position} />
    );
    expect(className(toJSON)).toContain('border-2 border-red-500');
  });

  it('applies the dashed "differs" border when differs is set', async () => {
    const { toJSON } = await render(
      <EventBlock course={course} slot={slot} color="#336699" conflicted={false} differs position={position} />
    );
    expect(className(toJSON)).toContain('border-dashed');
  });

  it('lets a real conflict win over "differs" when both are true', async () => {
    const { toJSON } = await render(
      <EventBlock course={course} slot={slot} color="#336699" conflicted differs position={position} />
    );
    const cls = className(toJSON);
    expect(cls).toContain('border-red-500');
    expect(cls).not.toContain('border-dashed');
  });
});
