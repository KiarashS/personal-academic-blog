import { Link } from 'react-router-dom';
import { MemberCard } from '../components/MemberCard';
import type { MemberCardSize } from '../components/MemberCard';
import { memberGroups } from '../lib/people';
import { openOpenings, openingsPageEnabled } from '../lib/openings';
import type { MemberGroup } from '../lib/people';

const sizeOf = (group: MemberGroup): MemberCardSize =>
  group.key === 'pi' ? 'lead' : group.key === 'alumni' ? 'alumni' : 'member';

/**
 * Everyone in the group, a section per role, then the alumni. The opening
 * line counts both, and points at the open positions when there are any: a
 * reader looking at who is in a group is often asking whether they could be.
 */
export function PeoplePage() {
  const groups = memberGroups();
  const alumni = groups.find((group) => group.key === 'alumni')?.members.length ?? 0;
  const current = groups
    .filter((group) => group.key !== 'alumni')
    .reduce((sum, group) => sum + group.members.length, 0);
  const hiring = openingsPageEnabled() && openOpenings().length > 0;

  return (
    <>
      <h1>People</h1>
      {groups.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        <>
          <p className="lede">
            {current} {current === 1 ? 'person' : 'people'} in the group
            {alumni > 0 ? `, and ${alumni} alumni` : ''}.
            {hiring ? (
              <>
                {' '}
                Positions are open: <Link to="/openings">see the openings</Link>.
              </>
            ) : null}
          </p>
          {groups.map((group) => (
            <section
              key={group.key}
              className="people-group"
              aria-labelledby={`people-${group.key}`}
            >
              <h2 className="section-heading" id={`people-${group.key}`}>
                {group.label}
                <span className="people-group__count">{group.members.length}</span>
              </h2>
              <ul className={`people-grid people-grid--${sizeOf(group)}`}>
                {group.members.map((member) => (
                  <li key={`${member.name}-${member.left ?? ''}`}>
                    <MemberCard member={member} size={sizeOf(group)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}
