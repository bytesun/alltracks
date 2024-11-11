import React from 'react';
import "../styles/Group.css";

const DEFAULT_BADGE = '/assets/default-group-badge.png';

interface Group {
  id: string;
  name: string;
  description: string;
  calendarId: string;
  memberCount: number;
  groupBadge?: string;
}

export const GroupList = ({ groups }: { groups: Group[] }) => {
  return (
    <div className="group-list">
      {groups.map(group => (
        <div key={group.id} className="group-card">
          <div className="group-header">
            <img 
              src={group.groupBadge || DEFAULT_BADGE} 
              alt={`${group.name} badge`}
              className="group-badge"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_BADGE;
              }}
            />
            <h3 className="group-name">{group.name}</h3>
            <div className="group-member-count">
              <span className="material-icons">group</span>
              {group.memberCount}
            </div>
          </div>
          <p className="group-description">{group.description}</p>
          <a 
            href={`https://icevent.app/calendar/${group.calendarId}`}
            className="group-calendar"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Calendar
          </a>
        </div>
      ))}
    </div>
  );
};
